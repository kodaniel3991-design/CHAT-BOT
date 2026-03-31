import type { ChatErrorCode } from "../types";

export type MappedChatError = {
  type: "error";
  code: ChatErrorCode;
  message: string;
  retryable: boolean;
};

export function mapUnknownError(err: unknown): MappedChatError {
  const message =
    err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
  return {
    type: "error",
    code: "LLM_ERROR",
    message,
    retryable: true,
  };
}
