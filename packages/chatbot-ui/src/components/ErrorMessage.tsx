"use client";

import { AlertTriangle } from "lucide-react";

type Props = {
  message: string;
  retryable?: boolean;
  onRetry?: () => void;
};

export function ErrorMessage({ message, retryable, onRetry }: Props) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col gap-2 px-3 py-3"
      style={{
        background: "var(--chat-error-bg)",
        border: "1px solid var(--chat-error-border)",
        borderRadius: "var(--radius-md)",
        color: "var(--chat-error-text)",
        fontFamily: "var(--font-body)",
        fontSize: 13,
      }}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
        <span>{message}</span>
      </div>
      {retryable && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="self-end rounded-md px-3 py-1.5 text-[13px] font-semibold transition active:scale-[0.97]"
          style={{
            background: "var(--taupe-50)",
            color: "var(--taupe-600)",
            fontFamily: "var(--font-body)",
          }}
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
