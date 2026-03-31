import { NextRequest } from "next/server";
import { z } from "zod";
import { ServiceEntrySchema } from "@company/chatbot-core";
import { requireChatAuth } from "@/lib/auth-context";
import {
  getAllServiceEntries,
  addServiceEntry,
  updateServiceEntry,
  deleteServiceEntry,
} from "@/lib/config-registry";

export const runtime = "nodejs";

/** GET — 전체 서비스 목록 (설정 포함) */
export async function GET(req: NextRequest) {
  const auth = await requireChatAuth(req);
  if (auth instanceof Response) return auth;

  return Response.json({ services: getAllServiceEntries() });
}

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    entry: ServiceEntrySchema,
  }),
  z.object({
    action: z.literal("update"),
    id: z.string().min(1),
    entry: ServiceEntrySchema,
  }),
  z.object({
    action: z.literal("delete"),
    id: z.string().min(1),
  }),
]);

/** POST — 등록 / 수정 / 삭제 */
export async function POST(req: NextRequest) {
  const auth = await requireChatAuth(req);
  if (auth instanceof Response) return auth;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const parsed = ActionSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "INVALID_INPUT", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  switch (data.action) {
    case "create": {
      const result = await addServiceEntry(data.entry);
      if (!result.ok) {
        return Response.json({ error: result.error }, { status: 409 });
      }
      return Response.json(result, { status: 201 });
    }
    case "update": {
      const result = await updateServiceEntry(data.id, data.entry);
      if (!result.ok) {
        return Response.json({ error: result.error }, { status: 404 });
      }
      return Response.json(result);
    }
    case "delete": {
      const result = await deleteServiceEntry(data.id);
      if (!result.ok) {
        return Response.json({ error: result.error }, { status: 404 });
      }
      return Response.json(result);
    }
  }
}
