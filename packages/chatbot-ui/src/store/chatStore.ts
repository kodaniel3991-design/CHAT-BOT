import { create } from "zustand";
import type { ChatError, ChatMessage } from "@company/chatbot-core";

export type PendingToolConfirm = {
  confirmId: string;
  toolName: string;
  summary: string;
  args: Record<string, unknown>;
};

export interface ChatStoreState {
  messages: ChatMessage[];
  isStreaming: boolean;
  isOpen: boolean;
  sessionId: string;
  error: ChatError | null;
  abortController: AbortController | null;
  pendingToolConfirm: PendingToolConfirm | null;

  addMessage: (msg: ChatMessage) => void;
  updateLastMessage: (chunk: string) => void;
  finalizeLastAssistantMessage: () => void;
  setStreaming: (v: boolean) => void;
  setOpen: (v: boolean) => void;
  setError: (error: ChatError | null) => void;
  setAbortController: (ctrl: AbortController | null) => void;
  cancelStreaming: () => void;
  resetSession: () => void;
  setMessages: (messages: ChatMessage[]) => void;
  setMessageFeedback: (messageId: string, feedback: "up" | "down") => void;
  setPendingToolConfirm: (v: PendingToolConfirm | null) => void;
}

function newSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export const useChatStore = create<ChatStoreState>((set, get) => ({
  messages: [],
  isStreaming: false,
  isOpen: false,
  sessionId: newSessionId(),
  error: null,
  abortController: null,
  pendingToolConfirm: null,

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),

  setPendingToolConfirm: (pendingToolConfirm) => set({ pendingToolConfirm }),

  updateLastMessage: (chunk) =>
    set((s) => {
      const messages = [...s.messages];
      const last = messages[messages.length - 1];
      if (last?.role === "assistant") {
        messages[messages.length - 1] = {
          ...last,
          content: last.content + chunk,
          isStreaming: true,
        };
      }
      return { messages };
    }),

  finalizeLastAssistantMessage: () =>
    set((s) => {
      const messages = [...s.messages];
      const last = messages[messages.length - 1];
      if (last?.role === "assistant") {
        messages[messages.length - 1] = { ...last, isStreaming: false };
      }
      return { messages };
    }),

  setStreaming: (isStreaming) => set({ isStreaming }),
  setOpen: (isOpen) => set({ isOpen }),
  setError: (error) => set({ error }),
  setAbortController: (abortController) => set({ abortController }),

  cancelStreaming: () => {
    get().abortController?.abort();
    set({ isStreaming: false, abortController: null });
    get().finalizeLastAssistantMessage();
  },

  resetSession: () =>
    set({
      messages: [],
      sessionId: newSessionId(),
      error: null,
      isStreaming: false,
      abortController: null,
      pendingToolConfirm: null,
    }),

  setMessages: (messages) => set({ messages }),

  setMessageFeedback: (messageId, feedback) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === messageId ? { ...m, feedback } : m
      ),
    })),
}));
