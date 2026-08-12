import { NextResponse } from "next/server";
import { select, usingRealDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * DB 깨우기
 *
 * Supabase 무료 플랜은 7일간 요청이 없으면 프로젝트를 일시 정지한다.
 * 정지 판정은 '대시보드 접속'이 아니라 '실제 쿼리' 기준이라, 가볍게 한 번 조회한다.
 * vercel.json 의 cron 이 하루 한 번 이 경로를 호출한다.
 */
export async function GET() {
  if (!usingRealDb) {
    return NextResponse.json({ ok: true, mode: "memory" });
  }
  try {
    await select("audit_logs", {}, 1);
    return NextResponse.json({ ok: true, mode: "supabase" });
  } catch (e) {
    console.error("[keep-alive]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
