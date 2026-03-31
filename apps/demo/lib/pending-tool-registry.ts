import { getUpstashRedis } from "./redis";

type Entry = {
  sessionId: string;
  projectId: string;
  toolName: string;
  expiresAt: number;
};

const memory = new Map<string, Entry>();
const TTL_MS = 5 * 60 * 1000;
const TTL_SEC = Math.ceil(TTL_MS / 1000);
const REDIS_PREFIX = "luon:chat:pending:";

function redisKey(confirmId: string): string {
  return `${REDIS_PREFIX}${confirmId}`;
}

export async function registerPendingTool(
  confirmId: string,
  sessionId: string,
  projectId: string,
  toolName: string
): Promise<void> {
  const redis = getUpstashRedis();
  if (redis) {
    const payload = JSON.stringify({ sessionId, projectId, toolName });
    await redis.set(redisKey(confirmId), payload, { ex: TTL_SEC });
    return;
  }
  memory.set(confirmId, {
    sessionId,
    projectId,
    toolName,
    expiresAt: Date.now() + TTL_MS,
  });
}

/** 토큰 유효성만 검사 (삭제 없음) — RBAC 등 선행 검증용 */
export async function peekPendingTool(
  confirmId: string,
  sessionId: string,
  projectId: string
): Promise<{ ok: true; toolName: string } | { ok: false }> {
  const redis = getUpstashRedis();
  if (redis) {
    const raw = await redis.get<string>(redisKey(confirmId));
    if (!raw) return { ok: false };
    let parsed: { sessionId: string; projectId: string; toolName: string };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      return { ok: false };
    }
    if (parsed.sessionId !== sessionId || parsed.projectId !== projectId) {
      return { ok: false };
    }
    return { ok: true, toolName: parsed.toolName };
  }

  const entry = memory.get(confirmId);
  if (!entry) return { ok: false };
  if (Date.now() > entry.expiresAt) {
    memory.delete(confirmId);
    return { ok: false };
  }
  if (entry.sessionId !== sessionId || entry.projectId !== projectId) {
    return { ok: false };
  }
  return { ok: true, toolName: entry.toolName };
}

export async function consumePendingTool(
  confirmId: string,
  sessionId: string,
  projectId: string
): Promise<{ ok: true; toolName: string } | { ok: false }> {
  const peeked = await peekPendingTool(confirmId, sessionId, projectId);
  if (!peeked.ok) return { ok: false };

  const redis = getUpstashRedis();
  if (redis) {
    await redis.del(redisKey(confirmId));
    return { ok: true, toolName: peeked.toolName };
  }

  memory.delete(confirmId);
  return { ok: true, toolName: peeked.toolName };
}
