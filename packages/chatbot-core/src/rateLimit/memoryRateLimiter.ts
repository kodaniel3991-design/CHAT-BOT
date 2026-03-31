type Bucket = {
  count: number;
  windowStart: number;
};

/**
 * 인메모리 슬라이딩 윈도우 Rate limit (IP 등 키당).
 * 프로덕션 다중 인스턴스에서는 Upstash 등으로 교체.
 */
export class MemoryRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly defaultLimit: number,
    private readonly windowMs: number
  ) {}

  /**
   * @returns ok true 허용, false 이면 retryAfterSec
   */
  check(key: string): { ok: true } | { ok: false; retryAfterSec: number } {
    const now = Date.now();
    let b = this.buckets.get(key);
    if (!b || now - b.windowStart >= this.windowMs) {
      b = { count: 0, windowStart: now };
      this.buckets.set(key, b);
    }
    if (b.count >= this.defaultLimit) {
      const retryAfterMs = this.windowMs - (now - b.windowStart);
      const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
      return { ok: false, retryAfterSec };
    }
    b.count += 1;
    return { ok: true };
  }
}
