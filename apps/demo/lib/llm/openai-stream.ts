import OpenAI from "openai";
import type { ChatbotConfig, ToolDefinition } from "@company/chatbot-core";
import type { HistoryMessage } from "@company/chatbot-core";
import { mapUnknownError } from "@company/chatbot-core";
import { executeToolCall } from "../tool-executor";
import { encodeSseLine } from "./sse-encode";

type ChatMsg = OpenAI.Chat.ChatCompletionMessageParam;

/** ToolDefinition → OpenAI function tool 스키마 변환 */
function toOpenAiTools(
  tools?: ToolDefinition[],
): OpenAI.Chat.ChatCompletionTool[] | undefined {
  if (!tools || tools.length === 0) return undefined;
  const executable = tools.filter((t) => t.endpoint);
  if (executable.length === 0) return undefined;

  return executable.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters
        ? {
            type: "object" as const,
            properties: Object.fromEntries(
              Object.entries(t.parameters.properties).map(([k, v]) => [
                k,
                { type: v.type, description: v.description, enum: v.enum },
              ]),
            ),
            required: t.parameters.required ?? [],
          }
        : { type: "object" as const, properties: {} },
    },
  }));
}

export function createOpenAiSseStream(options: {
  config: ChatbotConfig;
  conversationMessages: HistoryMessage[];
  signal?: AbortSignal;
  onComplete: (fullReplyText: string) => void | Promise<void>;
}): ReadableStream<Uint8Array> {
  const { config, conversationMessages, signal, onComplete } = options;
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const openai = new OpenAI({ apiKey });
  const openAiTools = toOpenAiTools(config.tools);

  const chatMessages: ChatMsg[] = [
    { role: "system", content: config.systemPrompt },
    ...conversationMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  return new ReadableStream({
    async start(controller) {
      try {
        await streamWithToolLoop(
          openai,
          config,
          chatMessages,
          openAiTools,
          signal,
          controller,
          onComplete,
        );
        controller.close();
      } catch (err) {
        const mapped = mapUnknownError(err);
        controller.enqueue(encodeSseLine(mapped));
        controller.close();
      }
    },
  });
}

/** Tool Use 반복 루프 (최대 5회) */
async function streamWithToolLoop(
  openai: OpenAI,
  config: ChatbotConfig,
  messages: ChatMsg[],
  tools: OpenAI.Chat.ChatCompletionTool[] | undefined,
  signal: AbortSignal | undefined,
  controller: ReadableStreamDefaultController<Uint8Array>,
  onComplete: (text: string) => void | Promise<void>,
  depth = 0,
): Promise<void> {
  const MAX_TOOL_ROUNDS = 5;

  const stream = await openai.chat.completions.create(
    {
      model: config.llm.model,
      max_tokens: config.llm.maxTokens,
      temperature: config.llm.temperature,
      messages,
      stream: true,
      ...(tools ? { tools } : {}),
    },
    { signal },
  );

  let fullText = "";
  const toolCalls: Array<{
    id: string;
    name: string;
    args: string;
  }> = [];

  for await (const part of stream) {
    if (signal?.aborted) return;
    const choice = part.choices[0];
    if (!choice) continue;

    // 텍스트 청크
    const textPiece = choice.delta?.content;
    if (textPiece) {
      fullText += textPiece;
      controller.enqueue(
        encodeSseLine({ type: "chunk", content: textPiece }),
      );
    }

    // Tool call 청크 (점진적으로 쌓임)
    const deltaToolCalls = choice.delta?.tool_calls;
    if (deltaToolCalls) {
      for (const tc of deltaToolCalls) {
        const idx = tc.index;
        if (!toolCalls[idx]) {
          toolCalls[idx] = {
            id: tc.id ?? "",
            name: tc.function?.name ?? "",
            args: "",
          };
        }
        if (tc.id) toolCalls[idx].id = tc.id;
        if (tc.function?.name) toolCalls[idx].name = tc.function.name;
        if (tc.function?.arguments) toolCalls[idx].args += tc.function.arguments;
      }
    }
  }

  // tool_calls가 없으면 → 최종 텍스트 응답
  if (toolCalls.length === 0) {
    await Promise.resolve(onComplete(fullText));
    controller.enqueue(encodeSseLine({ type: "done" }));
    return;
  }

  if (depth >= MAX_TOOL_ROUNDS) {
    controller.enqueue(
      encodeSseLine({ type: "chunk", content: "\n\n(도구 호출 한도 초과)" }),
    );
    await Promise.resolve(onComplete(fullText + "\n\n(도구 호출 한도 초과)"));
    controller.enqueue(encodeSseLine({ type: "done" }));
    return;
  }

  // Tool 실행 알림
  controller.enqueue(
    encodeSseLine({
      type: "chunk",
      content: `\n\n🔧 *${toolCalls.map((t) => t.name).join(", ")}* 실행 중...\n`,
    }),
  );

  // assistant 메시지 + tool results 추가
  const assistantMsg: ChatMsg = {
    role: "assistant",
    content: fullText || null,
    tool_calls: toolCalls.map((tc) => ({
      id: tc.id,
      type: "function" as const,
      function: { name: tc.name, arguments: tc.args },
    })),
  };

  const updatedMessages: ChatMsg[] = [...messages, assistantMsg];

  for (const tc of toolCalls) {
    let parsedArgs: Record<string, unknown> = {};
    try {
      parsedArgs = JSON.parse(tc.args);
    } catch { /* use empty */ }

    const result = await executeToolCall(
      config.tools ?? [],
      { toolName: tc.name, args: parsedArgs },
      signal,
    );

    updatedMessages.push({
      role: "tool",
      tool_call_id: tc.id,
      content: result.ok
        ? JSON.stringify(result.result)
        : `Error: ${result.error}`,
    });
  }

  // 다시 LLM 호출
  await streamWithToolLoop(
    openai,
    config,
    updatedMessages,
    tools,
    signal,
    controller,
    onComplete,
    depth + 1,
  );
}
