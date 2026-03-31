import { NextRequest } from "next/server";

export const runtime = "nodejs";

/** Mock: 보고서 초안 생성 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const title = (body.title as string) ?? "ESG 배출량 보고서";
  const period = (body.period as string) ?? "2024-Q4";

  return Response.json({
    reportId: `RPT-${Date.now()}`,
    title,
    period,
    status: "draft",
    sections: [
      { name: "Scope 1 직접배출", status: "generated" },
      { name: "Scope 2 간접배출", status: "generated" },
      { name: "Scope 3 기타배출", status: "pending_data" },
    ],
    message: `"${title}" 초안이 생성되었습니다. Scope 3 항목은 추가 데이터가 필요합니다.`,
  });
}
