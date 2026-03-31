"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GripHorizontal, MessageCircle, RotateCcw, X } from "lucide-react";
import type { ChatbotConfig, ChatWidgetConfig } from "@company/chatbot-core";
import { useChatStore } from "../store/chatStore";
import { useScrollToBottom } from "../hooks/useScrollToBottom";
import { useChatbot } from "../hooks/useChatbot";
import { useWindowWidth } from "../hooks/useWindowWidth";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { ErrorMessage } from "./ErrorMessage";
import { TypingIndicator } from "./TypingIndicator";
import { ToolConfirmDialog } from "./ToolConfirmDialog";

type Props = {
  config: ChatbotConfig | ChatWidgetConfig;
  apiPath?: string;
  confirmPath?: string;
  getAccessToken?: () => string | null;
  onUnauthorized?: () => void;
  mockResponses?: boolean;
  isMobile: boolean;
  mode?: "slide" | "modal";
  /** FAB 기준 모달 초기 위치 */
  modalAnchor?: { x: number; y: number } | null;
  onClose: () => void;
};

export function ChatWindow({
  config,
  apiPath,
  confirmPath,
  getAccessToken,
  onUnauthorized,
  mockResponses,
  isMobile,
  mode = "slide",
  modalAnchor,
  onClose,
}: Props) {
  const {
    messages,
    sendMessage,
    cancelStreaming,
    resolveToolConfirmation,
    confirmLoading,
  } = useChatbot({
    config,
    apiPath,
    confirmPath,
    getAccessToken,
    onUnauthorized,
    mockResponses,
  });
  const {
    error,
    setError,
    isStreaming,
    setMessageFeedback,
    pendingToolConfirm,
  } = useChatStore();
  const { ref: logRef } = useScrollToBottom<HTMLDivElement>([
    messages.length,
    messages[messages.length - 1]?.content,
    isStreaming,
  ]);

  const welcome = config.conversation?.welcomeMessage;
  const showWelcome =
    welcome && messages.filter((m) => m.role !== "tool").length === 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const winW = useWindowWidth();
  const desktopW =
    winW >= 1024
      ? "var(--chat-widget-width)"
      : winW >= 768
        ? "360px"
        : "var(--chat-widget-width)";

  /* ─── Drag (modal only) ─── */
  const panelRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, origX: 0, origY: 0 });
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(modalAnchor ?? null);

  const onDragPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (mode !== "modal" || isMobile) return;
      const panel = panelRef.current;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      isDragging.current = true;
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        origX: rect.left,
        origY: rect.top,
      };
      // 헤더에 pointer capture → 마우스가 헤더 밖으로 나가도 추적
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [mode, isMobile],
  );

  const onDragPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setDragOffset({
      x: dragStart.current.origX + dx,
      y: dragStart.current.origY + dy,
    });
  }, []);

  const onDragPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  /* 오버레이(예: z-9998)보다 위에 두어 대화창이 보이게 함 */
  const isModal = mode === "modal" && !isMobile;

  const panelClass = isMobile
    ? "chat-window-mobile animate-chat-slide-up fixed inset-0 z-[10000] flex w-full flex-col"
    : isModal
      ? "fixed z-[10000] flex flex-col overflow-hidden rounded-2xl shadow-2xl"
      : "animate-chat-slide-in fixed top-0 z-[10000] flex h-full flex-col shadow-xl";

  const panelStyle: React.CSSProperties = isMobile
    ? {
        background: "var(--chat-bg)",
        maxWidth: "var(--chat-widget-width-mobile)",
        height: "var(--chat-widget-height-mobile)",
      }
    : isModal
      ? {
          background: "var(--chat-bg, #ffffff)",
          width: 480,
          height: 600,
          maxWidth: "90vw",
          maxHeight: "80vh",
          border: "1px solid #e5e5e5",
          ...(dragOffset
            ? { left: dragOffset.x, top: dragOffset.y }
            : { inset: 0, margin: "auto", animation: "message-appear 0.2s ease-out forwards" }),
        }
      : {
          background: "var(--chat-bg)",
          width: desktopW,
          maxWidth: "100vw",
          height: "var(--chat-widget-height)",
          right: 0,
          boxShadow: "var(--shadow-xl)",
        };

  const initial = config.ui.botName.slice(0, 1).toUpperCase();

  const onReset = () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("대화를 초기화할까요?")
    ) {
      return;
    }
    useChatStore.getState().resetSession();
    setError(null);
  };

  return (
    <div
      ref={panelRef}
      className={panelClass}
      style={panelStyle}
      role="dialog"
      aria-modal="true"
      aria-label="AI 채팅"
    >
      <header
        className="flex h-14 shrink-0 items-center justify-between border-b px-4"
        style={{
          background: "var(--chat-header-bg)",
          borderColor: "var(--chat-header-border)",
          cursor: isModal ? "grab" : undefined,
          userSelect: isModal ? "none" : undefined,
        }}
        onPointerDown={isModal ? onDragPointerDown : undefined}
        onPointerMove={isModal ? onDragPointerMove : undefined}
        onPointerUp={isModal ? onDragPointerUp : undefined}
        onPointerCancel={isModal ? onDragPointerUp : undefined}
      >
        <div className="flex min-w-0 items-center gap-3">
          {isModal && (
            <GripHorizontal
              className="h-4 w-4 shrink-0"
              strokeWidth={2}
              style={{ color: "var(--text-tertiary, #aaa)" }}
              aria-hidden
            />
          )}
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
            style={{
              background: "var(--taupe-500)",
              fontFamily: "var(--font-display)",
            }}
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2
                className="truncate text-sm font-semibold"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--text-primary)",
                }}
              >
                {config.ui.botName}
              </h2>
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: "var(--green-400)" }}
                title="온라인"
                aria-label="온라인"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onReset}
            aria-label="대화 초기화"
            className="flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-black/5 dark:hover:bg-white/10"
            style={{ color: "var(--text-secondary)" }}
          >
            <RotateCcw className="h-5 w-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="채팅 닫기"
            className="flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-black/5 dark:hover:bg-white/10"
            style={{ color: "var(--text-secondary)" }}
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      </header>

      <div
        ref={logRef}
        className="chat-widget min-h-0 flex-1 overflow-y-auto px-4 py-4"
        role="log"
        aria-live={isStreaming ? "off" : "polite"}
        aria-relevant="additions"
      >
        {showWelcome && (
          <div
            className="mb-4 flex gap-2"
            style={{ fontFamily: "var(--font-body)", fontSize: 14 }}
          >
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
              style={{ background: "var(--taupe-500)" }}
            >
              <MessageCircle className="h-3.5 w-3.5 text-white" />
            </div>
            <p style={{ color: "var(--text-secondary)" }}>{welcome}</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {messages.map((m) => {
            if (
              m.role === "assistant" &&
              m.isStreaming &&
              !m.content
            ) {
              return <TypingIndicator key={m.id} />;
            }
            return (
              <MessageBubble
                key={m.id}
                message={m}
                showFeedback={config.features?.feedback}
                onFeedback={(id, fb) => setMessageFeedback(id, fb)}
              />
            );
          })}
        </div>

        {error && (
          <div className="mt-4">
            <ErrorMessage
              message={error.message}
              retryable={error.retryable}
              onRetry={
                error.retryable
                  ? () => setError(null)
                  : undefined
              }
            />
          </div>
        )}
      </div>

      {isStreaming && (
        <div className="shrink-0 border-t px-4 py-2" style={{ borderColor: "var(--chat-footer-border)" }}>
          <button
            type="button"
            onClick={cancelStreaming}
            className="text-xs font-semibold underline"
            style={{
              color: "var(--text-secondary)",
              fontFamily: "var(--font-body)",
            }}
          >
            생성 중지
          </button>
        </div>
      )}

      <MessageInput
        placeholder={config.ui.placeholder ?? "메시지를 입력하세요"}
        disabled={isStreaming || !!pendingToolConfirm || confirmLoading}
        allowFileAttachment={config.features?.fileAttachment && config.ui.allowFileAttachment}
        onSend={sendMessage}
      />

      <ToolConfirmDialog
        open={!!pendingToolConfirm}
        toolName={pendingToolConfirm?.toolName ?? ""}
        summary={pendingToolConfirm?.summary ?? ""}
        args={pendingToolConfirm?.args}
        loading={confirmLoading}
        onApprove={() => void resolveToolConfirmation(true)}
        onCancel={() => void resolveToolConfirmation(false)}
      />
    </div>
  );
}
