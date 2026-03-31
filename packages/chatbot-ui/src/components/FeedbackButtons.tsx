"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { ChatMessage } from "@company/chatbot-core";

type Props = {
  message: ChatMessage;
  onFeedback: (messageId: string, feedback: "up" | "down") => void;
};

export function FeedbackButtons({ message, onFeedback }: Props) {
  const active = message.feedback;
  return (
    <div className="mt-1 flex gap-1">
      <button
        type="button"
        aria-label="도움이 됐어요"
        aria-pressed={active === "up"}
        onClick={() => onFeedback(message.id, "up")}
        className="rounded p-1 transition hover:opacity-90"
        style={{
          color:
            active === "up" ? "var(--green-400)" : "var(--text-tertiary)",
        }}
      >
        <ThumbsUp className="h-4 w-4" strokeWidth={2} />
      </button>
      <button
        type="button"
        aria-label="아쉬워요"
        aria-pressed={active === "down"}
        onClick={() => onFeedback(message.id, "down")}
        className="rounded p-1 transition hover:opacity-90"
        style={{
          color:
            active === "down" ? "var(--color-error)" : "var(--text-tertiary)",
        }}
      >
        <ThumbsDown className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
