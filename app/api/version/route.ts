import { NextResponse } from "next/server";
import {
  APP_VERSION,
  CHANGELOG,
  MIN_SUPPORTED_VERSION,
  RELEASED_AT,
} from "@/lib/appVersion";

export const dynamic = "force-dynamic";

/**
 * 서버가 알려주는 현재 배포 버전.
 * 기기에 캐시된 화면이 구버전이면 클라이언트가 이 값과 비교해 업데이트를 안내한다.
 * 점검 화면에서도 이 엔드포인트로 복구 여부를 확인한다.
 */
export async function GET() {
  return NextResponse.json({
    version: APP_VERSION,
    minSupported: MIN_SUPPORTED_VERSION,
    releasedAt: RELEASED_AT,
    maintenance: process.env.MAINTENANCE_MODE === "1",
    latest: CHANGELOG[0],
  });
}
