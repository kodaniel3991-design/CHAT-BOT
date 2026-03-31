import { NextRequest } from "next/server";
import { requireChatAuth } from "@/lib/auth-context";
import { reloadConfigsAsync } from "@/lib/config-registry";

export const runtime = "nodejs";

/**
 * POST /api/config/reload
 * services.json을 다시 읽어들여 설정을 갱신합니다.
 * 인증 필요 (관리자용).
 */
export async function POST(req: NextRequest) {
  const auth = await requireChatAuth(req);
  if (auth instanceof Response) return auth;

  const result = await reloadConfigsAsync();
  return Response.json(result);
}
