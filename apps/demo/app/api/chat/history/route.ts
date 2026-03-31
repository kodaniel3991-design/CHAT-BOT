import { NextRequest } from "next/server";
import { requireChatAuth } from "@/lib/auth-context";
import { getChatbotConfigByProjectId } from "@/lib/config-registry";
import { getSessionStore } from "@/lib/session-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireChatAuth(req);
  if (auth instanceof Response) return auth;

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const projectId = req.nextUrl.searchParams.get("projectId");

  if (!sessionId || !projectId) {
    return Response.json({ error: "INVALID_QUERY" }, { status: 400 });
  }

  const config = getChatbotConfigByProjectId(projectId);
  if (!config) {
    return Response.json({ error: "UNKNOWN_PROJECT" }, { status: 400 });
  }

  const store = getSessionStore(projectId);
  const messages = await store.getMessages(sessionId, config.conversation);

  return Response.json({ sessionId, projectId, messages });
}
