import type { NextRequest } from "next/server";

/**
 * 인증된 사용자는 user:{sub}, 그 외는 ip:{ip} 로 분리해 Rate limit.
 * projectId를 접두어로 붙여 서비스별로 독립된 Rate limit 적용.
 */
export function chatRateLimitKey(
  req: NextRequest,
  authSub: string,
  projectId?: string
): string {
  const prefix = projectId ? `${projectId}:` : "";
  if (authSub && authSub !== "dev-anonymous") {
    return `${prefix}user:${authSub}`;
  }
  const xff = req.headers.get("x-forwarded-for");
  const ip = xff
    ? xff.split(",")[0]?.trim() || "unknown"
    : req.headers.get("x-real-ip") || "unknown";
  return `${prefix}ip:${ip}`;
}
