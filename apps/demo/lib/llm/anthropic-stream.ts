import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, Tool } from "@anthropic-ai/sdk/resources/messages";
import type { ChatbotConfig, ToolDefinition } from "@company/chatbot-core";
import type { HistoryMessage } from "@company/chatbot-core";
import { mapUnknownError } from "@company/chatbot-core";
import { executeToolCall } from "../tool-executor";
import { encodeSseLine } from "./sse-encode";

function toParams(messages: HistoryMessage[]): MessageParam[] {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

/** ToolDefinition → Anthropic Tool 스키마 변환 */
function toAnthropicTools(tools?: ToolDefinition[]): Tool[] | undefined {
  if (!tools || tools.length === 0) return undefined;
  // endpoint가 있는 (실행 가능한) tool만 LLM에 전달
  const executable = tools.filter((t) => t.endpoint);
  if (executable.length === 0) return undefined;

  return executable.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters
      ? {
          type: "object" as const,
          properties: Object.fromEntries(
            Object.entries(t.parameters.properties).map(([k, v]) => [
              k,
              { type: v.type, description: v.description, enum: v.enum },
            ]),
          ),
          required: t.parameters.required,
        }
      : { type: "object" as const, properties: {} },
  }));
}

/**
 * Anthropic Messages API 스트리밍 + Tool Use 지원.
 *
 * 흐름:
 * 1. LLM에 메시지 + tool 정의 전송
 * 2. LLM이 text를 반환하면 → SSE chunk로 스트리밍
 * 3. LLM이 tool_use를 반환하면 → Tool Executor로 실행 → 결과를 LLM에 피드백 → 최종 답변 스트리밍
 */
export function createAnthropicSseStream(options: {
  config: ChatbotConfig;
  conversationMessages: HistoryMessage[];
  signal?: AbortSignal;
  onComplete: (fullReplyText: string) => void | Promise<void>;
}): ReadableStream<Uint8Array> {
  const { config, conversationMessages, signal, onComplete } = options;
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const client = new Anthropic({ apiKey });
  const messages = toParams(conversationMessages);
  const anthropicTools = toAnthropicTools(config.tools);

  return new ReadableStream({
    async start(controller) {
      try {
        await streamWithToolLoop(
          client,
          config,
          messages,
          anthropicTools,
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
  client: Anthropic,
  config: ChatbotConfig,
  messages: MessageParam[],
  tools: Tool[] | undefined,
  signal: AbortSignal | undefined,
  controller: ReadableStreamDefaultController<Uint8Array>,
  onComplete: (text: string) => void | Promise<void>,
  depth = 0,
): Promise<void> {
  const MAX_TOOL_ROUNDS = 5;

  const params: Anthropic.MessageCreateParams = {
    model: config.llm.model,
    max_tokens: config.llm.maxTokens,
    temperature: config.llm.temperature,
    system: config.systemPrompt,
    messages,
    ...(tools ? { tools } : {}),
  };

  const stream = client.messages.stream(params, { signal });

  let fullText = "";
  const toolUseCalls: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];

  for await (const event of stream) {
    if (signal?.aborted) return;

    if (event.type === "content_block_delta") {
      if (event.delta.type === "text_delta") {
        fullText += event.delta.text;
        controller.enqueue(
          encodeSseLine({ type: "chunk", content: event.delta.text }),
        );
      }
    }
  }

  // finalMessage에서 tool_use 블록 확인
  const final = await stream.finalMessage();
  for (const block of final.content) {
    if (block.type === "tool_use") {
      toolUseCalls.push({
        id: block.id,
        name: block.name,
        input: block.input as Record<string, unknown>,
      });
    }
  }

  // tool_use가 없으면 → 최종 텍스트 응답
  if (toolUseCalls.length === 0) {
    const textBlock = final.content.find((b) => b.type === "text");
    const resolved = textBlock?.type === "text" ? textBlock.text : fullText;
    await Promise.resolve(onComplete(resolved));
    controller.enqueue(encodeSseLine({ type: "done" }));
    return;
  }

  // 재귀 깊이 초과
  if (depth >= MAX_TOOL_ROUNDS) {
    controller.enqueue(
      encodeSseLine({ type: "chunk", content: "\n\n(도구 호출 한도 초과)" }),
    );
    await Promise.resolve(onComplete(fullText + "\n\n(도구 호출 한도 초과)"));
    controller.enqueue(encodeSseLine({ type: "done" }));
    return;
  }

  // Tool 실행 + 결과 알림
  controller.enqueue(
    encodeSseLine({
      type: "chunk",
      content: `\n\n🔧 *${toolUseCalls.map((t) => t.name).join(", ")}* 실행 중...\n`,
    }),
  );

  // assistant 메시지 (tool_use 포함)를 messages에 추가
  const assistantContent = final.content.map((block) => {
    if (block.type === "text") {
      return { type: "text" as const, text: block.text };
    }
    return {
      type: "tool_use" as const,
      id: block.id,
      name: (block as { name: string }).name,
      input: (block as { input: unknown }).input,
    };
  });

  const updatedMessages: MessageParam[] = [
    ...messages,
    { role: "assistant", content: assistantContent },
  ];

  // 각 tool_use에 대해 실행 + tool_result 추가
  const toolResults: MessageParam["content"] = [];
  for (const call of toolUseCalls) {
    const result = await executeToolCall(
      config.tools ?? [],
      { toolName: call.name, args: call.input },
      signal,
    );
    toolResults.push({
      type: "tool_result" as const,
      tool_use_id: call.id,
      content: result.ok
        ? JSON.stringify(result.result)
        : `Error: ${result.error}`,
    } as Anthropic.ToolResultBlockParam);
  }

  updatedMessages.push({ role: "user", content: toolResults });

  // 다시 LLM 호출 (tool 결과를 포함하여)
  await streamWithToolLoop(
    client,
    config,
    updatedMessages,
    tools,
    signal,
    controller,
    onComplete,
    depth + 1,
  );
}
