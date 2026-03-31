"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MessageCircle } from "lucide-react";
import type { ChatbotConfig, ChatWidgetConfig } from "@company/chatbot-core";
import { useChatStore } from "../store/chatStore";
import { useResolvedTheme } from "../hooks/useResolvedTheme";
import { cn } from "../lib/cn";
import { ChatWindow } from "./ChatWindow";

/** ChatbotConfig(풀) 또는 ChatWidgetConfig(경량) 모두 허용 */
type AcceptedConfig = ChatbotConfig | ChatWidgetConfig;

/** 경량 config에서 누락된 UI 필드에 기본값 적용 */
function resolveUi(cfg: AcceptedConfig) {
  return {
    theme: cfg.ui.theme ?? ("auto" as const),
    botName: cfg.ui.botName,
    position: cfg.ui.position ?? ("bottom-right" as const),
    primaryColor: cfg.ui.primaryColor,
    placeholder: cfg.ui.placeholder,
    allowFileAttachment: cfg.ui.allowFileAttachment,
  };
}

export type ChatWidgetProps = {
  config: AcceptedConfig;
  apiPath?: string;
  confirmPath?: string;
  getAccessToken?: () => string | null;
  onUnauthorized?: () => void;
  /** API 없이 UI 데모 */
  mockResponses?: boolean;
  /** 채팅창 표시 방식: slide(우측 슬라이드, 기본) | modal(화면 중앙 모달) */
  mode?: "slide" | "modal";
};

/** 모달 기본 크기 */
const MODAL_W = 480;
const MODAL_H = 600;

export function ChatWidget({
  config,
  apiPath,
  confirmPath,
  getAccessToken,
  onUnauthorized,
  mockResponses = false,
  mode = "slide",
}: ChatWidgetProps) {
  const { isOpen, setOpen, resetSession } = useChatStore();
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const ui = resolveUi(config);
  const resolvedTheme = useResolvedTheme(ui.theme);

  /** FAB 기준으로 계산된 모달 초기 위치 */
  const [fabAnchor, setFabAnchor] = useState<{ x: number; y: number } | null>(
    null,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const positionRight = ui.position !== "bottom-left";

  useEffect(() => {
    resetSession();
  }, [config.projectId, resetSession]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !ui.primaryColor) return;
    const c = ui.primaryColor;
    el.style.setProperty("--chat-fab-bg", c);
    el.style.setProperty("--bubble-user-bg", c);
    el.style.setProperty("--input-border-focus", c);
    return () => {
      el.style.removeProperty("--chat-fab-bg");
      el.style.removeProperty("--bubble-user-bg");
      el.style.removeProperty("--input-border-focus");
    };
  }, [config.ui.primaryColor]);

  /** FAB 클릭 → 위치 계산 후 열기 */
  const handleFabClick = useCallback(() => {
    if (!isOpen && mode === "modal" && fabRef.current) {
      const rect = fabRef.current.getBoundingClientRect();
      // 모달 오른쪽 끝 = FAB 왼쪽 끝 - 12px 간격, 모달 하단 = FAB 하단
      const x = rect.left - MODAL_W - 12;
      const y = rect.bottom - MODAL_H;
      // 화면 밖으로 나가지 않도록 clamp
      setFabAnchor({
        x: Math.max(8, Math.min(x, window.innerWidth - MODAL_W - 8)),
        y: Math.max(8, Math.min(y, window.innerHeight - MODAL_H - 8)),
      });
    }
    setOpen(!isOpen);
  }, [isOpen, mode, setOpen]);

  /* 모달/슬라이드 공통: 배경 오버레이 + ChatWindow */
  const chatPanel = isOpen && (
    <>
      <button
        type="button"
        aria-label="채팅 배경 닫기"
        className="fixed inset-0 border-0"
        style={{ background: "rgba(0,0,0,0.4)", zIndex: 9998 }}
        onClick={() => setOpen(false)}
      />
      <ChatWindow
        config={config}
        apiPath={apiPath}
        confirmPath={confirmPath}
        getAccessToken={getAccessToken}
        onUnauthorized={onUnauthorized}
        mockResponses={mockResponses}
        isMobile={isMobile}
        mode={mode}
        modalAnchor={fabAnchor}
        onClose={() => setOpen(false)}
      />
    </>
  );

  const tree = (
    <div
      ref={rootRef}
      className={`chat-widget ${resolvedTheme === "dark" ? "dark" : ""}`}
    >
      {chatPanel}

      <button
        ref={fabRef}
        type="button"
        onClick={handleFabClick}
        aria-label={isOpen ? "채팅 닫기" : "채팅 열기"}
        aria-expanded={isOpen}
        className={cn(
          "chat-widget__fab",
          positionRight ? "chat-widget__fab--end" : "chat-widget__fab--start",
        )}
      >
        <MessageCircle
          className="h-6 w-6 shrink-0"
          strokeWidth={2}
          aria-hidden
        />
      </button>
    </div>
  );

  if (typeof document === "undefined" || !mounted) {
    return null;
  }

  return createPortal(tree, document.body);
}
