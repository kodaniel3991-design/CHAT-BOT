import { NextResponse } from "next/server";
import { getServiceCatalog } from "@/lib/config-registry";

export const runtime = "nodejs";

/**
 * 서버에 등록된 채팅 프로젝트 목록 (인증 없음).
 * config/services.json 에서 동적으로 로드됩니다.
 */
export async function GET() {
  const catalog = getServiceCatalog();
  const projects = catalog.services.map((s) => ({
    id: s.id,
    label: s.label,
    description: s.description,
    projectId: s.config.projectId,
  }));
  return NextResponse.json({ projects });
}
