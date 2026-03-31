"use client";

import { AlertTriangle } from "lucide-react";

type Props = {
  open: boolean;
  toolName: string;
  summary: string;
  args?: Record<string, unknown>;
  loading?: boolean;
  onApprove: () => void;
  onCancel: () => void;
};

export function ToolConfirmDialog({
  open,
  toolName,
  summary,
  args,
  loading,
  onApprove,
  onCancel,
}: Props) {
  if (!open) return null;

  const argsStr =
    args && Object.keys(args).length > 0
      ? JSON.stringify(args, null, 2)
      : null;

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="tool-confirm-title"
    >
      <div
        className="w-full max-w-md overflow-hidden shadow-xl"
        style={{
          background: "var(--bg-surface)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        <div
          className="flex items-start gap-3 border-b px-5 py-4"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <AlertTriangle
            className="h-5 w-5 shrink-0"
            style={{ color: "var(--color-warning)" }}
            strokeWidth={2}
            aria-hidden
          />
          <div>
            <h2
              id="tool-confirm-title"
              className="text-sm font-semibold"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--text-primary)",
              }}
            >
              다음 작업을 실행할까요?
            </h2>
            <p
              className="mt-1 font-mono text-[11px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {toolName}
            </p>
          </div>
        </div>
        <div className="max-h-[40vh] overflow-y-auto px-5 py-4">
          <p
            className="text-sm leading-relaxed"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--text-primary)",
            }}
          >
            {summary}
          </p>
          {argsStr && (
            <pre
              className="mt-3 overflow-x-auto rounded-md p-3 text-[13px]"
              style={{
                fontFamily: "var(--font-mono)",
                background: "var(--bg-subtle)",
                color: "var(--text-secondary)",
              }}
            >
              {argsStr}
            </pre>
          )}
        </div>
        <div
          className="flex justify-end gap-2 border-t px-5 py-4"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50"
            style={{
              fontFamily: "var(--font-body)",
              background: "transparent",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-default)",
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={onApprove}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
            style={{
              fontFamily: "var(--font-body)",
              background: "var(--taupe-500)",
            }}
          >
            {loading ? "처리 중…" : "확인 · 실행"}
          </button>
        </div>
      </div>
    </div>
  );
}
