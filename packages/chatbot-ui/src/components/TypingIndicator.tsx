"use client";

export function TypingIndicator() {
  return (
    <div
      className="flex items-center gap-1 px-4 py-3"
      style={{
        background: "var(--bubble-bot-bg)",
        borderRadius: "var(--radius-lg)",
        width: "fit-content",
      }}
      aria-label="AI가 응답 중입니다"
      aria-busy
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="animate-dot-bounce inline-block rounded-full"
          style={{
            width: 6,
            height: 6,
            background: "var(--green-400)",
            animationDelay: `${i * 150}ms`,
          }}
        />
      ))}
    </div>
  );
}
