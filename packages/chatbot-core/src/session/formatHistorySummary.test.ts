import { describe, expect, it } from "vitest";
import { formatHistorySummary } from "./memorySessionStore";

describe("formatHistorySummary", () => {
  it("returns undefined for empty history", () => {
    expect(formatHistorySummary([])).toBeUndefined();
  });

  it("formats recent messages", () => {
    const s = formatHistorySummary(
      [{ role: "user", content: "안녕" }],
      6
    );
    expect(s).toContain("사용자");
    expect(s).toContain("안녕");
  });
});
