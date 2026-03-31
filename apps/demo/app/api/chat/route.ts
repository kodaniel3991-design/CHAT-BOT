import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import {
  ChatRequestSchema,
  createPlaceholderSseStream,
  formatHistorySummary,
  mapUnknownError,
  promptGuard,
} from "@company/chatbot-core";
import { requireChatAuth } from "@/lib/auth-context";
import { checkChatRateLimit } from "@/lib/chat-rate-limit";
import { getChatbotConfigByProjectId } from "@/lib/config-registry";
import {
  canUseRealLlm,
  createAnthropicSseStream,
  createOpenAiSseStream,
} from "@/lib/llm";
import { logChat } from "@/lib/logger";
import { chatRateLimitKey } from "@/lib/rate-limit-key";
import { registerPendingTool } from "@/lib/pending-tool-registry";
import { getSessionStore } from "@/lib/session-store";
import { searchDocuments, formatRAGContext } from "@/lib/rag";

export const runtime = "nodejs";

function enableDemoToolConfirm(): boolean {
  return process.env.CHAT_DEMO_TOOL_CONFIRM !== "false";
}

export async function POST(req: NextRequest) {
  const auth = await requireChatAuth(req);
  if (auth instanceof Response) return auth;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const parsed = ChatRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const { message, sessionId, projectId } = parsed.data;

  const guard = promptGuard.validate(message);
  if (!guard.safe) {
    return Response.json(
      { error: "INVALID_INPUT", reason: guard.reason },
      { status: 400 }
    );
  }

  const config = getChatbotConfigByProjectId(projectId);
  if (!config) {
    return Response.json({ error: "UNKNOWN_PROJECT" }, { status: 400 });
  }

  const rateKey = chatRateLimitKey(req, auth.sub, projectId);
  const rate = await checkChatRateLimit(`chat:${rateKey}`);
  if (!rate.ok) {
    logChat("warn", "rate_limit", { projectId, sessionId, key: rateKey });
    return Response.json(
      { error: "RATE_LIMIT", retryAfter: rate.retryAfterSec },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSec),
        },
      }
    );
  }

  const store = getSessionStore(projectId);
  const prior = await store.getMessages(sessionId, config.conversation);
  await store.appendUser(sessionId, message, config.conversation);
  const conversationMessages = await store.getMessages(
    sessionId,
    config.conversation
  );
  const historySummary = formatHistorySummary(prior);

  // RAG: 관련 문서 검색 → systemPrompt에 컨텍스트 추가
  const ragResults = await searchDocuments(message, config.rag);
  const ragContext = formatRAGContext(ragResults);
  const enrichedConfig = ragContext
    ? { ...config, systemPrompt: config.systemPrompt + ragContext }
    : config;

  const confirmId = randomUUID();
  const toolName = "demo_risk_action";
  const useRealLlm = canUseRealLlm(enrichedConfig);
  const demoTool = enableDemoToolConfirm() && !useRealLlm;

  if (demoTool) {
    await registerPendingTool(confirmId, sessionId, projectId, toolName);
  }

  try {
    logChat("info", "chat_request", {
      projectId,
      sessionId,
      mode: useRealLlm ? "llm" : "placeholder",
      provider: config.llm.provider,
    });

    const onAssistantComplete = async (fullReplyText: string) => {
      await store.appendAssistant(
        sessionId,
        fullReplyText,
        config.conversation
      );
    };

    const stream = useRealLlm
      ? enrichedConfig.llm.provider === "openai"
        ? createOpenAiSseStream({
            config: enrichedConfig,
            conversationMessages,
            signal: req.signal,
            onComplete: onAssistantComplete,
          })
        : createAnthropicSseStream({
            config: enrichedConfig,
            conversationMessages,
            signal: req.signal,
            onComplete: onAssistantComplete,
          })
      : createPlaceholderSseStream({
          config: {
            projectId: enrichedConfig.projectId,
            ui: enrichedConfig.ui,
            systemPrompt: enrichedConfig.systemPrompt,
          },
          userMessage: message,
          historySummary,
          signal: req.signal,
          onComplete: onAssistantComplete,
          toolConfirm: demoTool
            ? {
                confirmId,
                toolName,
                summary:
                  "샘플 레코드 `sample-record-001` 삭제를 시뮬레이션합니다. 실제 DB에는 반영되지 않습니다.",
                args: { target: "sample-record-001" },
              }
            : undefined,
        });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const mapped = mapUnknownError(err);
    return new Response(
      new ReadableStream({
        start(controller) {
          const payload = `data: ${JSON.stringify(mapped)}\n\n`;
          controller.enqueue(new TextEncoder().encode(payload));
          controller.close();
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      }
    );
  }
}
