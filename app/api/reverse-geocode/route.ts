import { NextResponse } from "next/server";

// ============================================================
// GET /api/reverse-geocode?lat=..&lng=..
// 브라우저 위치(위도/경도)를 사람이 읽는 주소로 변환.
// 카카오 로컬 "좌표로 주소 변환(coord2address)" API를 서버에서 호출.
// 키가 없으면 데모 기본값("전남 순천시")을 반환 (source:"fallback").
// ============================================================

export const runtime = "nodejs";

interface KakaoAddr {
  address_name: string; // 지번 전체 주소
  region_1depth_name: string; // 시도
  region_2depth_name: string; // 시군구
  region_3depth_name: string; // 읍면동
}
interface KakaoDoc {
  address: KakaoAddr | null;
  road_address: { address_name: string } | null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "lat, lng 쿼리 파라미터가 필요합니다." },
      { status: 400 }
    );
  }

  const key = process.env.KAKAO_REST_API_KEY;

  if (key) {
    try {
      const url =
        "https://dapi.kakao.com/v2/local/geo/coord2address.json?" +
        new URLSearchParams({ x: String(lng), y: String(lat) }).toString();

      const res = await fetch(url, {
        headers: { Authorization: `KakaoAK ${key}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`kakao ${res.status}`);
      const data: { documents: KakaoDoc[] } = await res.json();
      const doc = data.documents?.[0];
      const a = doc?.address;

      // 화면 표시용: 시도 + 시군구 + 읍면동 (없으면 전체 주소)
      const short = a
        ? [a.region_1depth_name, a.region_2depth_name, a.region_3depth_name]
            .filter(Boolean)
            .join(" ")
        : doc?.road_address?.address_name || "";

      if (!short) throw new Error("no address");
      return NextResponse.json({ source: "kakao", address: short });
    } catch (e) {
      console.error("[reverse-geocode] kakao 실패, 폴백:", e);
    }
  }

  return NextResponse.json({ source: "fallback", address: "전남 순천시" });
}
