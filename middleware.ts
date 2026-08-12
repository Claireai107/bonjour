import { NextRequest, NextResponse } from "next/server";

/**
 * 점검 모드 스위치
 *
 * 롤백·긴급 수정 중에는 Vercel 환경변수에 MAINTENANCE_MODE=1 을 넣고 재배포하면
 * 모든 화면이 '점검 중' 안내로 바뀐다. 되돌릴 때는 값을 지우면 된다.
 * /api/version 은 복구 여부 확인용이라 점검 중에도 살려 둔다.
 */
export function middleware(req: NextRequest) {
  if (process.env.MAINTENANCE_MODE !== "1") return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname === "/maintenance" || pathname === "/api/version") {
    return NextResponse.next();
  }
  return NextResponse.rewrite(new URL("/maintenance", req.url));
}

export const config = {
  // 정적 파일과 이미지는 그대로 통과
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|mp4|webmanifest)).*)"],
};
