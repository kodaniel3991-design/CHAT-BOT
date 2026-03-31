"use client";

import { useCallback, useRef, useState } from "react";
import { Paperclip, Send } from "lucide-react";

type Props = {
  placeholder: string;
  disabled?: boolean;
  allowFileAttachment?: boolean;
  onSend: (text: string) => void;
};

export function MessageInput({
  placeholder,
  disabled,
  allowFileAttachment,
  onSend,
}: Props) {
  const [value, setValue] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  const submit = useCallback(() => {
    const t = value.trim();
    if (!t || disabled) return;
    onSend(t);
    setValue("");
    if (taRef.current) {
      taRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const onInput = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div
      className="flex shrink-0 items-end gap-2 border-t px-3 py-3"
      style={{
        borderColor: "var(--chat-footer-border)",
        background: "var(--chat-footer-bg)",
        minHeight: "var(--chat-input-min-height)",
      }}
    >
      {allowFileAttachment && (
        <button
          type="button"
          aria-label="파일 첨부"
          disabled={disabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition active:scale-[0.97] disabled:opacity-50 motion-reduce:transition-none"
          style={{
            background: "var(--bg-subtle)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-secondary)",
          }}
        >
          <Paperclip className="h-5 w-5" strokeWidth={2} />
        </button>
      )}
      <textarea
        ref={taRef}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onInput={onInput}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-label="메시지 입력"
        aria-disabled={disabled}
        className="min-h-[40px] max-h-[120px] w-full resize-none px-3 py-2 text-sm outline-none transition focus-visible:ring-2 disabled:opacity-60"
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 14,
          color: "var(--input-text)",
          background: "var(--input-bg)",
          border: "1.5px solid var(--input-border)",
          borderRadius: "var(--input-radius)",
          boxShadow: "none",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--input-border-focus)";
          e.target.style.boxShadow = "0 0 0 3px var(--input-shadow-focus)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "var(--input-border)";
          e.target.style.boxShadow = "none";
        }}
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="전송"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-white shadow transition active:scale-[0.97] disabled:opacity-40 motion-reduce:transition-none"
        style={{
          background: "var(--chat-fab-bg)",
          boxShadow: "0 2px 8px rgba(85,73,64,0.3)",
        }}
      >
        <Send className="h-5 w-5" strokeWidth={2} />
      </button>
    </div>
  );
}
