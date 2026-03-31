import { Redis } from "@upstash/redis";

let cached: Redis | null | undefined;

/** Upstash REST — 세션·pending·rate limit 공용 (환경 변수 없으면 null) */
export function getUpstashRedis(): Redis | null {
  if (cached !== undefined) return cached;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    cached = new Redis({ url, token });
  } else {
    cached = null;
  }
  return cached;
}

/** 단위 테스트에서 모듈 캐시 초기화용 */
export function resetUpstashRedisCache(): void {
  cached = undefined;
}
