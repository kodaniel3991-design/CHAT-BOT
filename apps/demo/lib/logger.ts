type Level = "info" | "warn" | "error";

const LEVEL_RANK: Record<Level, number> = {
  error: 0,
  warn: 1,
  info: 2,
};

function minLevelFromEnv(): Level {
  const raw = process.env.LOG_LEVEL?.toLowerCase();
  if (raw === "error" || raw === "warn" || raw === "info") return raw;
  return "info";
}

function shouldEmit(level: Level): boolean {
  return LEVEL_RANK[level] <= LEVEL_RANK[minLevelFromEnv()];
}

/**
 * JSON 한 줄 — 컨테이너/수집기에서 파싱하기 쉽게 유지.
 * `LOG_LEVEL`: `error` | `warn` | `info` (기본 `info`).
 */
export function logChat(
  level: Level,
  event: string,
  data: Record<string, unknown> = {}
): void {
  if (!shouldEmit(level)) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: "chat-api",
    event,
    ...data,
  });
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}
