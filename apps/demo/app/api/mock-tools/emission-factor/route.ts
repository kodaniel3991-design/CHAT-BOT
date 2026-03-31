import { NextRequest } from "next/server";

export const runtime = "nodejs";

/** Mock: 배출계수 조회 */
export async function GET(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get("scope") ?? "1";
  const category = req.nextUrl.searchParams.get("category") ?? "";

  const mockData: Record<string, { factor: number; unit: string; source: string }[]> = {
    "1": [
      { factor: 2.208, unit: "tCO2/kL", source: "경유 (Diesel)" },
      { factor: 2.176, unit: "tCO2/kL", source: "휘발유 (Gasoline)" },
      { factor: 2.743, unit: "tCO2/천Nm³", source: "도시가스 (LNG)" },
    ],
    "2": [
      { factor: 0.4594, unit: "tCO2/MWh", source: "전력 (한국 2024)" },
      { factor: 0.0578, unit: "tCO2/GJ", source: "증기 (Steam)" },
    ],
    "3": [
      { factor: 0.185, unit: "tCO2/톤", source: "폐기물 매립" },
      { factor: 0.137, unit: "tCO2/인·km", source: "항공 출장" },
    ],
  };

  const results = mockData[scope] ?? mockData["1"];
  const filtered = category
    ? results.filter((r) => r.source.includes(category))
    : results;

  return Response.json({
    scope: `Scope ${scope}`,
    count: filtered.length,
    factors: filtered,
  });
}
