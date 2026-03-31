import type { NextRequest } from "next/server";

/** `CHAT_ALLOWED_ORIGINS` — 쉼표로 구분한 오리진, 예: https://app.example.com,http://localhost:5173 */
export function parseChatAllowedOrigins(): string[] {
  const raw = process.env.CHAT_ALLOWED_ORIGINS?.trim();
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export function corsHeadersForRequest(req: NextRequest): Headers {
  const h = new Headers();
  const origin = req.headers.get("origin");
  const allowed = parseChatAllowedOrigins();
  if (origin && allowed.includes(origin)) {
    h.set("Access-Control-Allow-Origin", origin);
    h.set("Access-Control-Allow-Credentials", "true");
    h.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    h.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    );
    h.set("Access-Control-Expose-Headers", "Retry-After");
    h.set("Access-Control-Max-Age", "86400");
  }
  return h;
}
