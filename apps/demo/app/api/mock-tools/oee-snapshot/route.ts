import { NextRequest } from "next/server";

export const runtime = "nodejs";

/** Mock: 설비 가동률(OEE) 스냅샷 */
export async function GET(req: NextRequest) {
  const line = req.nextUrl.searchParams.get("line") ?? "";

  const mockOee = [
    { line: "LINE-A", availability: 92.5, performance: 87.3, quality: 99.1, oee: 79.8, status: "normal" },
    { line: "LINE-B", availability: 78.2, performance: 91.0, quality: 98.5, oee: 70.1, status: "warning" },
    { line: "LINE-C", availability: 95.0, performance: 93.5, quality: 99.8, oee: 88.6, status: "normal" },
  ];

  const filtered = line
    ? mockOee.filter((o) => o.line.toLowerCase().includes(line.toLowerCase()))
    : mockOee;

  return Response.json({
    timestamp: new Date().toISOString(),
    lines: filtered,
    avgOee: +(filtered.reduce((s, o) => s + o.oee, 0) / filtered.length).toFixed(1),
  });
}
