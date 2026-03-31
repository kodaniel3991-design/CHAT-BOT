import { nanoid } from "nanoid";
import { useCallback, useState } from "react";
import type { ChatbotConfig, ChatWidgetConfig, ChatErrorCode } from "@company/chatbot-core";
import { useChatStore } from "../store/chatStore";

export type UseChatbotOptions = {
  config: ChatbotConfig | ChatWidgetConfig;
  apiPath?: string;
  /** Tool 확인 제출 */
  confirmPath?: string;
  getAccessToken?: () => string | null;
  onUnauthorized?: () => void;
  mockResponses?: boolean;
};

function parseSSEChunk(
  buffer: string
): { events: Array<Record<string, unknown>>; rest: string } {
  const events: Array<Record<string, unknown>> = [];
  let rest = buffer;
  const parts = buffer.split("\n\n");
  rest = parts.pop() ?? "";
  for (const block of parts) {
    const line = block.trim();
    if (!line.startsWith("data:")) continue;
    const json = line.replace(/^data:\s*/, "");
    try {
      events.push(JSON.parse(json) as Record<string, unknown>);
    } catch {
      /* ignore */
    }
  }
  return { events, rest };
}

async function streamMockReply(
  fullText: string,
  onChunk: (c: string) => void,
  signal: AbortSignal
) {
  const chunks = fullText.split("");
  for (let i = 0; i < chunks.length; i++) {
    if (signal.aborted) return;
    onChunk(chunks[i]);
    await new Promise((r) => setTimeout(r, 8 + Math.random() * 8));
  }
}

export function useChatbot(options: UseChatbotOptions) {
  const {
    config,
    apiPath = "/api/chat",
    confirmPath = "/api/chat/confirm",
    getAccessToken,
    onUnauthorized,
    mockResponses = false,
  } = options;

  const [confirmLoading, setConfirmLoading] = useState(false);

  const {
    messages,
    sessionId,
    addMessage,
    updateLastMessage,
    finalizeLastAssistantMessage,
    setStreaming,
    setError,
    setAbortController,
    setPendingToolConfirm,
    cancelStreaming,
  } = useChatStore();

  const buildAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const t = getAccessToken?.() ?? null;
    if (t) {
      headers.Authorization = `Bearer ${t}`;
    }
    return headers;
  }, [getAccessToken]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      setError(null);
      setPendingToolConfirm(null);
      addMessage({
        id: nanoid(),
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      });
      addMessage({
        id: nanoid(),
        role: "assistant",
        content: "",
        isStreaming: true,
        timestamp: Date.now(),
      });
      setStreaming(true);

      const ctrl = new AbortController();
      setAbortController(ctrl);

      if (mockResponses) {
        const demo =
          `${config.ui.botName}입니다. (데모 모드)\n\n` +
          `「${trimmed}」에 대해 ${config.projectId} 환경에서 도움을 드릴 수 있습니다. 실제 연동 시에는 서버 API가 응답합니다.`;
        try {
          await streamMockReply(demo, updateLastMessage, ctrl.signal);
        } catch {
          /* aborted */
        } finally {
          finalizeLastAssistantMessage();
          setStreaming(false);
          setAbortController(null);
        }
        return;
      }

      try {
        const response = await fetch(apiPath, {
          method: "POST",
          headers: buildAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({
            message: trimmed,
            sessionId,
            projectId: config.projectId,
          }),
          signal: ctrl.signal,
        });

        if (!response.ok) {
          let errMsg = `요청 실패 (${response.status})`;
          let code: ChatErrorCode = "LLM_ERROR";
          let retryable = response.status >= 500;
          try {
            const j = (await response.json()) as {
              error?: string;
              retryAfter?: number;
            };
            if (response.status === 401 || j.error === "AUTH_ERROR") {
              code = "AUTH_ERROR";
              errMsg = "로그인이 필요하거나 인증이 만료되었습니다.";
              retryable = false;
              onUnauthorized?.();
            }
            if (j.error === "INVALID_INPUT") {
              errMsg = "입력을 확인해 주세요.";
              retryable = false;
            }
            if (j.error === "UNKNOWN_PROJECT") {
              errMsg = "지원하지 않는 시스템(projectId)입니다.";
              retryable = false;
            }
            if (j.error === "RATE_LIMIT") {
              code = "RATE_LIMIT";
              errMsg = `요청이 많습니다. ${j.retryAfter ?? "?"}초 후 다시 시도해 주세요.`;
              retryable = true;
            }
          } catch {
            /* ignore */
          }
          setError({
            code,
            message: errMsg,
            retryable,
          });
          finalizeLastAssistantMessage();
          setStreaming(false);
          setAbortController(null);
          return;
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const data = (await response.json()) as { reply?: string };
          const reply = data.reply ?? "";
          updateLastMessage(reply);
          finalizeLastAssistantMessage();
          setStreaming(false);
          setAbortController(null);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("NO_BODY");
        }
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const { events, rest } = parseSSEChunk(buffer);
          buffer = rest;
          for (const data of events) {
            if (data.type === "chunk" && typeof data.content === "string") {
              updateLastMessage(data.content);
            }
            if (data.type === "tool_confirm") {
              setPendingToolConfirm({
                confirmId: String(data.confirmId ?? ""),
                toolName: String(data.toolName ?? ""),
                summary: String(data.summary ?? ""),
                args:
                  typeof data.args === "object" && data.args !== null
                    ? (data.args as Record<string, unknown>)
                    : {},
              });
            }
            if (data.type === "error") {
              setError({
                code: (data.code as ChatErrorCode) ?? "LLM_ERROR",
                message: String(data.message ?? "오류가 발생했습니다."),
                retryable: Boolean(data.retryable),
              });
            }
            if (data.type === "done") {
              finalizeLastAssistantMessage();
              setStreaming(false);
            }
          }
        }
        finalizeLastAssistantMessage();
        setStreaming(false);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setAbortController(null);
          return;
        }
        setError({
          code: "NETWORK_ERROR",
          message: "연결이 끊겼어요. 인터넷 연결을 확인해 주세요.",
          retryable: true,
        });
        finalizeLastAssistantMessage();
        setStreaming(false);
      } finally {
        setAbortController(null);
      }
    },
    [
      apiPath,
      buildAuthHeaders,
      config.projectId,
      config.ui.botName,
      mockResponses,
      onUnauthorized,
      sessionId,
      addMessage,
      updateLastMessage,
      finalizeLastAssistantMessage,
      setStreaming,
      setError,
      setAbortController,
      setPendingToolConfirm,
    ]
  );

  const resolveToolConfirmation = useCallback(
    async (approved: boolean) => {
      const pending = useChatStore.getState().pendingToolConfirm;
      if (!pending) return;

      setConfirmLoading(true);
      setError(null);

      try {
        const res = await fetch(confirmPath, {
          method: "POST",
          headers: buildAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({
            confirmId: pending.confirmId,
            sessionId,
            projectId: config.projectId,
            approved,
          }),
        });

        if (res.status === 401) {
          onUnauthorized?.();
          setError({
            code: "AUTH_ERROR",
            message: "인증이 만료되었습니다. 다시 로그인해 주세요.",
            retryable: false,
          });
          setPendingToolConfirm(null);
          return;
        }

        const data = (await res.json()) as { message?: string; error?: string };

        if (!res.ok) {
          let msg = data.error ?? "확인 처리에 실패했습니다.";
          let code: ChatErrorCode = "TOOL_ERROR";
          let retryable = res.status >= 500;
          if (res.status === 403 && data.error === "TOOL_NOT_ALLOWED") {
            code = "TOOL_NOT_ALLOWED";
            msg =
              "이 프로젝트에서 허용되지 않은 도구입니다. 관리자에게 문의하거나 새 대화를 시작해 주세요.";
            retryable = false;
          }
          setError({
            code,
            message: msg,
            retryable,
          });
          setPendingToolConfirm(null);
          return;
        }

        setPendingToolConfirm(null);

        if (data.message) {
          addMessage({
            id: nanoid(),
            role: "assistant",
            content: data.message,
            timestamp: Date.now(),
          });
        }
      } catch {
        setError({
          code: "NETWORK_ERROR",
          message: "확인 요청 중 오류가 발생했습니다.",
          retryable: true,
        });
      } finally {
        setConfirmLoading(false);
      }
    },
    [
      addMessage,
      buildAuthHeaders,
      confirmPath,
      config.projectId,
      onUnauthorized,
      sessionId,
      setError,
      setPendingToolConfirm,
    ]
  );

  return {
    messages,
    sessionId,
    sendMessage,
    cancelStreaming,
    resolveToolConfirmation,
    confirmLoading,
  };
}
