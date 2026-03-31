import type { ChatbotConfig } from "../types";

function encodeSse(data: object): Uint8Array {
  return new TextEncoder().encode(
    `data: ${JSON.stringify(data)}\n\n`
  );
}

export type ToolConfirmPayload = {
  confirmId: string;
  toolName: string;
  summary: string;
  args?: Record<string, unknown>;
};

export type PlaceholderSseOptions = {
  config: Pick<ChatbotConfig, "projectId" | "ui" | "systemPrompt">;
  userMessage: string;
  /** 세션 히스토리 요약 (플레이스홀더 본문에만 포함) */
  historySummary?: string;
  signal?: AbortSignal;
  /** 스트림 본문만 기록 (세션 assistant) — done 직전에 호출 */
  onComplete?: (fullReplyText: string) => void | Promise<void>;
  /** 데모: 본문 스트림 후 클라이언트 확인 UI용 SSE 이벤트 */
  toolConfirm?: ToolConfirmPayload;
};

/**
 * LLM 미연결 시 SSE 스트리밍 플레이스홀더 (chunk → [tool_confirm] → done).
 * 이후 Anthropic 어댑터로 동일 인터페이스를 대체할 수 있음.
 */
export function createPlaceholderSseStream(
  options: PlaceholderSseOptions
): ReadableStream<Uint8Array> {
  const { config, userMessage, historySummary, signal, onComplete, toolConfirm } =
    options;

  const historyBlock =
    historySummary && historySummary.trim().length > 0
      ? `**이전 대화 (세션)**\n${historySummary}\n\n---\n\n`
      : "";

  const reply =
    `${historyBlock}` +
    `${config.ui.botName}입니다.\n\n` +
    `(${config.projectId}) 요청: 「${userMessage}」\n\n` +
    `_아직 LLM이 연결되지 않았습니다. 이 응답은 서버 플레이스홀더입니다._`;

  const chars = Array.from(reply);

  return new ReadableStream({
    async start(controller) {
      try {
        for (let i = 0; i < chars.length; i++) {
          if (signal?.aborted) {
            controller.close();
            return;
          }
          controller.enqueue(encodeSse({ type: "chunk", content: chars[i] }));
          await new Promise((r) => setTimeout(r, 3));
        }
        if (!signal?.aborted) {
          await Promise.resolve(onComplete?.(reply));
          if (toolConfirm) {
            controller.enqueue(
              encodeSse({
                type: "tool_confirm",
                confirmId: toolConfirm.confirmId,
                toolName: toolConfirm.toolName,
                summary: toolConfirm.summary,
                args: toolConfirm.args ?? {},
              })
            );
          }
          controller.enqueue(encodeSse({ type: "done" }));
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });
}
