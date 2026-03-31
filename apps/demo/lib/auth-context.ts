import { getServerSession } from "next-auth/next";
import type { NextRequest } from "next/server";
import { authOptions } from "./auth-options";
import { verifyAccessToken } from "./jwt";

/**
 * 1) NextAuth 세션 쿠키(JWT) — 브라우저에서 same-origin fetch 시 기본
 * 2) Authorization: Bearer — 외부 클라이언트·레거시 데모 JWT
 * 3) CHAT_AUTH_DISABLED — 로컬 전용
 */
export async function requireChatAuth(
  req: NextRequest
): Promise<{ sub: string } | Response> {
  if (process.env.CHAT_AUTH_DISABLED === "true") {
    return { sub: "dev-anonymous" };
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    return { sub: session.user.id };
  }
  if (session?.user?.email) {
    return { sub: session.user.email };
  }

  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7).trim();
    const verified = await verifyAccessToken(token);
    if (verified) return verified;
  }

  return Response.json({ error: "AUTH_ERROR" }, { status: 401 });
}
