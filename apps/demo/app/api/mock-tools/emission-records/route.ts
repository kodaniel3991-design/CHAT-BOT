import { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * Mock: 직원별 통근 배출량 CRUD API
 * 실제 ESG_On 서비스에서는 자체 DB로 구현합니다.
 * 이 mock은 스펙 정의 + 테스트 용도입니다.
 */

type EmissionRecord = {
  id: string;
  name: string;
  department: string;
  transport: string;
  distanceKm: number;
  dailyEmission: number; // kgCO2e
};

// 인메모리 Mock DB
const mockDb: EmissionRecord[] = [
  { id: "ER-001", name: "최용묵", department: "생산3본부", transport: "자가용 (휘발유)", distanceKm: 9.4, dailyEmission: 3.94 },
  { id: "ER-002", name: "양성규", department: "생산3본부", transport: "자가용 (휘발유)", distanceKm: 49.0, dailyEmission: 20.563 },
  { id: "ER-003", name: "고성남", department: "품질본부", transport: "자가용 (휘발유)", distanceKm: 23.8, dailyEmission: 10.013 },
  { id: "ER-004", name: "양영석", department: "연구소", transport: "자가용 (휘발유)", distanceKm: 35.0, dailyEmission: 14.704 },
  { id: "ER-005", name: "양미일", department: "생산3본부", transport: "자가용 (휘발유)", distanceKm: 17.7, dailyEmission: 7.442 },
  { id: "ER-006", name: "최인혁", department: "생산3본부", transport: "자가용 (휘발유)", distanceKm: 6.2, dailyEmission: 2.604 },
  { id: "ER-007", name: "최인혁", department: "경영본부", transport: "자가용 (휘발유)", distanceKm: 25.6, dailyEmission: 10.769 },
];

/** GET — 조회 (Read) */
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") ?? "";
  const department = req.nextUrl.searchParams.get("department") ?? "";
  const id = req.nextUrl.searchParams.get("id") ?? "";

  let results = [...mockDb];

  if (id) {
    results = results.filter((r) => r.id === id);
  }
  if (name) {
    results = results.filter((r) => r.name.includes(name));
  }
  if (department) {
    results = results.filter((r) => r.department.includes(department));
  }

  const totalEmission = results.reduce((sum, r) => sum + r.dailyEmission, 0);

  return Response.json({
    count: results.length,
    totalDailyEmission: +totalEmission.toFixed(3),
    unit: "kgCO2e",
    records: results,
  });
}

/** POST — 등록/수정/삭제 (Create/Update/Delete) */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = body.action as string;

  switch (action) {
    case "create": {
      const newId = `ER-${String(mockDb.length + 1).padStart(3, "0")}`;
      const distanceKm = Number(body.distanceKm) || 0;
      const record: EmissionRecord = {
        id: newId,
        name: (body.name as string) ?? "",
        department: (body.department as string) ?? "",
        transport: (body.transport as string) ?? "자가용 (휘발유)",
        distanceKm,
        dailyEmission: +(distanceKm * 0.42).toFixed(3), // 간이 배출계수
      };
      mockDb.push(record);
      return Response.json({
        message: `"${record.name}"님의 통근 배출량 데이터가 등록되었습니다.`,
        record,
      });
    }

    case "update": {
      const idx = mockDb.findIndex((r) => r.id === body.id || r.name === body.name);
      if (idx === -1) {
        return Response.json({ error: "해당 직원을 찾을 수 없습니다." }, { status: 404 });
      }
      if (body.distanceKm !== undefined) {
        mockDb[idx].distanceKm = Number(body.distanceKm);
        mockDb[idx].dailyEmission = +(Number(body.distanceKm) * 0.42).toFixed(3);
      }
      if (body.department) mockDb[idx].department = body.department as string;
      if (body.transport) mockDb[idx].transport = body.transport as string;
      return Response.json({
        message: `"${mockDb[idx].name}"님의 데이터가 수정되었습니다.`,
        record: mockDb[idx],
      });
    }

    case "delete": {
      const delIdx = mockDb.findIndex((r) => r.id === body.id || r.name === body.name);
      if (delIdx === -1) {
        return Response.json({ error: "해당 직원을 찾을 수 없습니다." }, { status: 404 });
      }
      const deleted = mockDb.splice(delIdx, 1)[0];
      return Response.json({
        message: `"${deleted.name}"님의 통근 배출량 데이터가 삭제되었습니다.`,
        deletedRecord: deleted,
      });
    }

    default:
      return Response.json({ error: "action은 create/update/delete 중 하나여야 합니다." }, { status: 400 });
  }
}
