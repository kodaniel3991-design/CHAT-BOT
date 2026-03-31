import { beforeEach, describe, expect, it } from "vitest";
import { resetChatRateLimitCache } from "./chat-rate-limit";
import {
  consumePendingTool,
  peekPendingTool,
  registerPendingTool,
} from "./pending-tool-registry";
import { resetUpstashRedisCache } from "./redis";

beforeEach(() => {
  process.env.UPSTASH_REDIS_REST_URL = "";
  process.env.UPSTASH_REDIS_REST_TOKEN = "";
  resetUpstashRedisCache();
  resetChatRateLimitCache();
});

describe("pending-tool-registry (memory)", () => {
  it("registers, peeks, and consumes", async () => {
    await registerPendingTool(
      "550e8400-e29b-41d4-a716-446655440000",
      "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "esg-on",
      "demo_risk_action"
    );
    const peek = await peekPendingTool(
      "550e8400-e29b-41d4-a716-446655440000",
      "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "esg-on"
    );
    expect(peek.ok && peek.toolName).toBe("demo_risk_action");

    const consumed = await consumePendingTool(
      "550e8400-e29b-41d4-a716-446655440000",
      "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "esg-on"
    );
    expect(consumed.ok && consumed.toolName).toBe("demo_risk_action");

    const again = await peekPendingTool(
      "550e8400-e29b-41d4-a716-446655440000",
      "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "esg-on"
    );
    expect(again.ok).toBe(false);
  });

  it("rejects mismatched session", async () => {
    await registerPendingTool(
      "550e8400-e29b-41d4-a716-446655440001",
      "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "esg-on",
      "demo_risk_action"
    );
    const peek = await peekPendingTool(
      "550e8400-e29b-41d4-a716-446655440001",
      "00000000-0000-0000-0000-000000000001",
      "esg-on"
    );
    expect(peek.ok).toBe(false);
  });
});
