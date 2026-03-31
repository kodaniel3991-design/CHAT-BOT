import { MemorySessionStore } from "@company/chatbot-core";
import type { ISessionHistoryStore } from "@company/chatbot-core";
import { RedisSessionStore } from "./redis-session-store";
import { getUpstashRedis } from "./redis";
import { DbSessionStore } from "./db-session-store";

function useDb(): boolean {
  return !!process.env.DATABASE_URL || !!process.env.DIRECT_URL;
}

/** 인메모리/Redis 스토어 (싱글턴) */
const fallbackStore: ISessionHistoryStore = (() => {
  const redis = getUpstashRedis();
  if (redis) return new RedisSessionStore(redis);
  return new MemorySessionStore();
})();

/**
 * projectId에 맞는 세션 스토어를 반환합니다.
 * DB 연결 시 → DbSessionStore (대화 기록 영속)
 * 그 외 → Redis 또는 인메모리
 */
export function getSessionStore(projectId?: string): ISessionHistoryStore {
  if (useDb()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { prisma } = require("./db");
      if (prisma) return new DbSessionStore(prisma, projectId);
    } catch { /* DB not available */ }
  }
  return fallbackStore;
}

/** 하위 호환용 (projectId 없이 사용하는 기존 코드) */
export const sessionStore: ISessionHistoryStore = fallbackStore;
