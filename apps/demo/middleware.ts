import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { corsHeadersForRequest } from "@/lib/chat-cors";

/**
 * 채팅·프로젝트 메타 API에 대해 `CHAT_ALLOWED_ORIGINS`가 있으면 CORS 헤더 부착.
 * 다른 도메인에 임베드할 때 사용. 비우면 동일 오리진만(기본).
 */
export function middleware(request: NextRequest) {
  const cors = corsHeadersForRequest(request);

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: cors });
  }

  const res = NextResponse.next();
  cors.forEach((value, key) => {
    res.headers.set(key, value);
  });
  return res;
}

export const config = {
  matcher: ["/api/chat/:path*", "/api/config/:path*"],
};
