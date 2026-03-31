import { NextRequest } from "next/server";
import { z } from "zod";
import { canExecuteTool } from "@company/chatbot-core";
import { requireChatAuth } from "@/lib/auth-context";
import { logChat } from "@/lib/logger";
import {
  consumePendingTool,
  peekPendingTool,
} from "@/lib/pending-tool-registry";

export const runtime = "nodejs";

const BodySchema = z.object({
  confirmId: z.string().uuid(),
  sessionId: z.string().uuid(),
  projectId: z.string().min(1).max(50),
  approved: z.boolean(),
});

export async function POST(req: NextRequest) {
  const auth = await requireChatAuth(req);
  if (auth instanceof Response) return auth;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const { confirmId, sessionId, projectId, approved } = parsed.data;

  const peeked = await peekPendingTool(confirmId, sessionId, projectId);
  if (!peeked.ok) {
    return Response.json({ error: "INVALID_OR_EXPIRED_CONFIRM" }, { status: 400 });
  }

  if (approved) {
    if (!canExecuteTool(projectId, peeked.toolName)) {
      logChat("warn", "tool_confirm_denied_rbac", {
        projectId,
        toolName: peeked.toolName,
      });
      return Response.json({ error: "TOOL_NOT_ALLOWED" }, { status: 403 });
    }
    const consumed = await consumePendingTool(confirmId, sessionId, projectId);
    if (!consumed.ok) {
      return Response.json({ error: "INVALID_OR_EXPIRED_CONFIRM" }, { status: 400 });
    }
    logChat("info", "tool_confirm_approved", {
      projectId,
      toolName: consumed.toolName,
    });
    return Response.json({
      message:
        `도구 **${consumed.toolName}** 실행이 승인되어 처리되었습니다. (데모: 실제 DB/외부 호출 없음)`,
    });
  }

  await consumePendingTool(confirmId, sessionId, projectId);
  return Response.json({
    message: "요청하신 작업을 취소했습니다.",
  });
}
