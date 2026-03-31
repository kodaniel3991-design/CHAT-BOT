import type { ConversationConfig } from "../types";
import type { HistoryMessage, ISessionHistoryStore } from "./types";

type SessionEntry = {
  messages: HistoryMessage[];
  lastAt: number;
};

/**
 * 프로세스 메모리 세션 (개발·단일 인스턴스용).
 */
export class MemorySessionStore implements ISessionHistoryStore {
  private readonly sessions = new Map<string, SessionEntry>();

  private getOrCreate(sessionId: string): SessionEntry {
    let entry = this.sessions.get(sessionId);
    if (!entry) {
      entry = { messages: [], lastAt: Date.now() };
      this.sessions.set(sessionId, entry);
    }
    return entry;
  }

  private ensureFresh(
    entry: SessionEntry,
    sessionTimeoutMs: number
  ): void {
    if (sessionTimeoutMs <= 0) return;
    const now = Date.now();
    if (now - entry.lastAt > sessionTimeoutMs) {
      entry.messages = [];
      entry.lastAt = now;
    }
  }

  async getMessages(
    sessionId: string,
    conversation: Pick<ConversationConfig, "sessionTimeout">
  ): Promise<HistoryMessage[]> {
    const entry = this.getOrCreate(sessionId);
    this.ensureFresh(entry, conversation.sessionTimeout);
    return [...entry.messages];
  }

  async appendUser(
    sessionId: string,
    content: string,
    conversation: Pick<ConversationConfig, "maxHistoryLength" | "sessionTimeout">
  ): Promise<void> {
    const entry = this.getOrCreate(sessionId);
    this.ensureFresh(entry, conversation.sessionTimeout);
    entry.messages.push({ role: "user", content });
    entry.lastAt = Date.now();
    this.prune(entry, conversation.maxHistoryLength);
  }

  async appendAssistant(
    sessionId: string,
    content: string,
    conversation: Pick<ConversationConfig, "maxHistoryLength" | "sessionTimeout">
  ): Promise<void> {
    const entry = this.getOrCreate(sessionId);
    this.ensureFresh(entry, conversation.sessionTimeout);
    entry.messages.push({ role: "assistant", content });
    entry.lastAt = Date.now();
    this.prune(entry, conversation.maxHistoryLength);
  }

  private prune(entry: SessionEntry, maxHistoryLength: number): void {
    const max = Math.max(1, maxHistoryLength);
    while (entry.messages.length > max) {
      entry.messages.shift();
    }
  }
}

export const memorySessionStore = new MemorySessionStore();

export function formatHistorySummary(
  messages: HistoryMessage[],
  maxLines = 6
): string | undefined {
  if (messages.length <= 0) return undefined;
  const slice = messages.slice(-maxLines);
  return slice
    .map((m) =>
      `${m.role === "user" ? "사용자" : "어시스턴트"}: ${m.content.slice(0, 200)}${m.content.length > 200 ? "…" : ""}`
    )
    .join("\n");
}
