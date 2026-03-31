import type { ChatbotConfig } from "../types";

/**
 * 실제 LLM 스트리밍 어댑터 — Anthropic/OpenAI 등 구현체가 이 인터페이스를 채우면
 * `createPlaceholderSseStream` 자리를 교체할 수 있습니다.
 */
export type LlmStreamChunk =
  | { type: "chunk"; content: string }
  | { type: "done" }
  | {
      type: "error";
      code: string;
      message: string;
      retryable?: boolean;
    };

export type LlmStreamAdapter = {
  streamChat(params: {
    config: Pick<ChatbotConfig, "projectId" | "systemPrompt">;
    userMessage: string;
    historySummary?: string;
    signal?: AbortSignal;
  }): AsyncIterable<LlmStreamChunk>;
};
