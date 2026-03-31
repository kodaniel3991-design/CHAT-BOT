import { Redis } from "@upstash/redis";
import type {
  ConversationConfig,
  HistoryMessage,
  ISessionHistoryStore,
} from "@company/chatbot-core";

type Stored = {
  messages: HistoryMessage[];
  lastAt: number;
};

const PREFIX = "luon:chat:session:";

/**
 * Upstash Redis REST — 서버리스·다중 인스턴스에서 세션 공유.
 */
export class RedisSessionStore implements ISessionHistoryStore {
  constructor(private readonly redis: Redis) {}

  private key(sessionId: string): string {
    return `${PREFIX}${sessionId}`;
  }

  private ensureFresh(
    data: Stored,
    sessionTimeoutMs: number
  ): Stored {
    if (sessionTimeoutMs <= 0) return data;
    const now = Date.now();
    if (now - data.lastAt > sessionTimeoutMs) {
      return { messages: [], lastAt: now };
    }
    return data;
  }

  private prune(data: Stored, maxHistoryLength: number): void {
    const max = Math.max(1, maxHistoryLength);
    while (data.messages.length > max) {
      data.messages.shift();
    }
  }

  async getMessages(
    sessionId: string,
    conversation: Pick<ConversationConfig, "sessionTimeout">
  ): Promise<HistoryMessage[]> {
    const k = this.key(sessionId);
    const raw = await this.redis.get<string>(k);
    if (!raw) return [];
    let data: Stored;
    try {
      data = JSON.parse(raw) as Stored;
    } catch {
      return [];
    }
    const beforeLen = data.messages.length;
    data = this.ensureFresh(data, conversation.sessionTimeout);
    if (beforeLen > 0 && data.messages.length === 0) {
      await this.redis.del(k);
    }
    return [...data.messages];
  }

  async appendUser(
    sessionId: string,
    content: string,
    conversation: Pick<ConversationConfig, "maxHistoryLength" | "sessionTimeout">
  ): Promise<void> {
    const k = this.key(sessionId);
    const raw = await this.redis.get<string>(k);
    let data: Stored = raw
      ? (JSON.parse(raw) as Stored)
      : { messages: [], lastAt: Date.now() };
    data = this.ensureFresh(data, conversation.sessionTimeout);
    data.messages.push({ role: "user", content });
    data.lastAt = Date.now();
    this.prune(data, conversation.maxHistoryLength);
    const ttlSec = Math.ceil(
      (conversation.sessionTimeout || 86_400_000) / 1000
    );
    await this.redis.set(k, JSON.stringify(data), { ex: Math.min(ttlSec, 604_800) });
  }

  async appendAssistant(
    sessionId: string,
    content: string,
    conversation: Pick<ConversationConfig, "maxHistoryLength" | "sessionTimeout">
  ): Promise<void> {
    const k = this.key(sessionId);
    const raw = await this.redis.get<string>(k);
    let data: Stored = raw
      ? (JSON.parse(raw) as Stored)
      : { messages: [], lastAt: Date.now() };
    data = this.ensureFresh(data, conversation.sessionTimeout);
    data.messages.push({ role: "assistant", content });
    data.lastAt = Date.now();
    this.prune(data, conversation.maxHistoryLength);
    const ttlSec = Math.ceil(
      (conversation.sessionTimeout || 86_400_000) / 1000
    );
    await this.redis.set(k, JSON.stringify(data), { ex: Math.min(ttlSec, 604_800) });
  }
}
