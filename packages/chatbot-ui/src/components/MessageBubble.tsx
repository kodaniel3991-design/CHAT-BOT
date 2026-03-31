"use client";

import { Bot } from "lucide-react";
import type { ChatMessage } from "@company/chatbot-core";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { FeedbackButtons } from "./FeedbackButtons";

type Props = {
  message: ChatMessage;
  showFeedback?: boolean;
  onFeedback?: (messageId: string, feedback: "up" | "down") => void;
};

function formatTime(ts: number) {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ts));
  } catch {
    return "";
  }
}

export function MessageBubble({
  message,
  showFeedback,
  onFeedback,
}: Props) {
  const isUser = message.role === "user";
  const ts = formatTime(message.timestamp);

  if (isUser) {
    return (
      <div className="animate-message-appear flex justify-end">
        <div className="flex max-w-[75%] flex-col items-end gap-1">
          <div
            className="bubble-user px-4 py-3"
            style={{
              background: "var(--bubble-user-bg)",
              color: "var(--bubble-user-text)",
              borderRadius:
                "var(--radius-lg) var(--radius-lg) var(--radius-xs) var(--radius-lg)",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              lineHeight: 1.55,
            }}
            aria-label={`내 메시지: ${message.content}`}
          >
            {message.content}
          </div>
          <span
            className="text-xs"
            style={{
              color: "var(--chat-text-muted)",
              fontFamily: "var(--font-body)",
            }}
          >
            {ts}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-message-appear flex justify-start gap-2">
      <div
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
        style={{ background: "var(--taupe-500)" }}
        aria-hidden
      >
        <Bot className="h-3.5 w-3.5 text-white" strokeWidth={2} />
      </div>
      <div className="flex max-w-[85%] min-w-0 flex-col items-start gap-1">
        <div
          className="bubble-bot px-4 py-3"
          style={{
            background: "var(--bubble-bot-bg)",
            color: "var(--bubble-bot-text)",
            borderRadius:
              "var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-xs)",
            fontFamily: "var(--font-body)",
            fontSize: 14,
          }}
          aria-label={`AI 응답: ${message.content.slice(0, 200)}`}
        >
          {!message.content && message.isStreaming ? (
            <span
              className="inline-block h-4 w-2 animate-cursor-blink"
              style={{ background: "var(--green-400)" }}
            />
          ) : (
            <>
              <MarkdownRenderer content={message.content} />
              {message.isStreaming && !!message.content && (
                <span
                  className="ml-0.5 inline-block h-4 w-2 animate-cursor-blink align-middle"
                  style={{ background: "var(--green-400)" }}
                  aria-hidden
                />
              )}
            </>
          )}
        </div>
        <div className="flex w-full items-center justify-between gap-2">
          <span
            className="text-xs"
            style={{
              color: "var(--chat-text-muted)",
              fontFamily: "var(--font-body)",
            }}
          >
            {ts}
          </span>
          {showFeedback && onFeedback && message.content && !message.isStreaming && (
            <FeedbackButtons message={message} onFeedback={onFeedback} />
          )}
        </div>
      </div>
    </div>
  );
}
