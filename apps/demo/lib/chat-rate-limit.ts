import { Ratelimit } from "@upstash/ratelimit";
import { MemoryRateLimiter } from "@company/chatbot-core";
import { getUpstashRedis } from "./redis";

const perMinute = Math.max(
  5,
  Number(process.env.CHAT_RATE_LIMIT_PER_MINUTE ?? 30)
);

const memoryLimiter = new MemoryRateLimiter(perMinute, 60_000);

let upstashRatelimit: Ratelimit | null | undefined;

function getUpstashRatelimit(): Ratelimit | null {
  if (upstashRatelimit !== undefined) return upstashRatelimit;
  const redis = getUpstashRedis();
  if (!redis) {
    upstashRatelimit = null;
    return null;
  }
  upstashRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(perMinute, "1 m"),
    prefix: "luon:chat:ratelimit",
  });
  return upstashRatelimit;
}

/**
 * 분당 `CHAT_RATE_LIMIT_PER_MINUTE` — Upstash 설정 시 인스턴스 간 공유.
 */
export async function checkChatRateLimit(
  key: string
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const rl = getUpstashRatelimit();
  if (rl) {
    const result = await rl.limit(key);
    if (!result.success) {
      const retryAfterMs = Math.max(0, result.reset - Date.now());
      const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
      return { ok: false, retryAfterSec };
    }
    return { ok: true };
  }
  return memoryLimiter.check(key);
}

/** 단위 테스트에서 Ratelimit 싱글톤 초기화용 */
export function resetChatRateLimitCache(): void {
  upstashRatelimit = undefined;
}
