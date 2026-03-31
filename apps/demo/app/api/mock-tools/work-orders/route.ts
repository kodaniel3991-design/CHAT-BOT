import { NextRequest } from "next/server";

export const runtime = "nodejs";

/** Mock: 작업지시 조회 */
export async function GET(req: NextRequest) {
  const line = req.nextUrl.searchParams.get("line") ?? "";
  const status = req.nextUrl.searchParams.get("status") ?? "";

  const mockOrders = [
    { id: "WO-2024-0891", line: "LINE-A", product: "PCB-TypeA", qty: 500, status: "in_progress", startTime: "08:00" },
    { id: "WO-2024-0892", line: "LINE-A", product: "PCB-TypeB", qty: 300, status: "waiting", startTime: "14:00" },
    { id: "WO-2024-0893", line: "LINE-B", product: "Motor-X1", qty: 150, status: "completed", startTime: "06:00" },
    { id: "WO-2024-0894", line: "LINE-B", product: "Motor-X2", qty: 200, status: "in_progress", startTime: "10:00" },
    { id: "WO-2024-0895", line: "LINE-C", product: "Sensor-S3", qty: 1000, status: "waiting", startTime: "09:00" },
  ];

  let filtered = mockOrders;
  if (line) filtered = filtered.filter((o) => o.line.toLowerCase().includes(line.toLowerCase()));
  if (status) filtered = filtered.filter((o) => o.status === status);

  return Response.json({
    count: filtered.length,
    orders: filtered,
  });
}
