import { NextResponse } from "next/server";
import { haversineMeters, walkMinutes } from "@/lib/geo";

// ============================================================
// GET /api/health-centers?lat=..&lng=..
// 브라우저 위치(위도/경도)를 받아 가까운 보건소 목록을 반환.
//
// 실동작(권장): 환경변수 KAKAO_REST_API_KEY 가 있으면 카카오 로컬
//   "키워드로 장소 검색" API를 서버에서 호출해 실제 데이터를 돌려줌.
//   (REST 키는 서버에서만 사용 → 키 노출/CORS 문제 없음)
// 폴백: 키가 없거나 호출 실패 시, 발표가 끊기지 않도록 순천 인근
//   예시 시설 목록을 사용자 좌표 기준 거리 계산해 반환 (source:"fallback").
// ============================================================

export const runtime = "nodejs";

interface Place {
  id: string;
  name: string;
  category: string;
  distanceM: number;
  walkMin: number;
  roadAddress: string;
  address: string;
  phone: string;
  url: string;
  lat: number;
  lng: number;
}

// 카카오 응답의 한 항목(필요한 필드만)
interface KakaoDoc {
  id: string;
  place_name: string;
  category_name: string;
  distance: string; // m (문자열)
  road_address_name: string;
  address_name: string;
  phone: string;
  place_url: string;
  x: string; // 경도
  y: string; // 위도
}

// 폴백용 순천 인근 예시 시설 (좌표는 대략값 · 데모 표시용)
const FALLBACK_FACILITIES = [
  { name: "순천시보건소", category: "공공기관 > 보건소", phone: "061-749-6500", lat: 34.9506, lng: 127.4875, road: "전남 순천시 장명로 30" },
  { name: "순천시 왕조보건지소", category: "공공기관 > 보건지소", phone: "061-749-4900", lat: 34.9607, lng: 127.5165, road: "전남 순천시 왕지2길 12" },
  { name: "순천시 해룡보건지소", category: "공공기관 > 보건지소", phone: "061-749-4930", lat: 34.9226, lng: 127.5442, road: "전남 순천시 해룡면 상성길 45" },
];

// 카카오 로컬 키워드 검색: query로 검색해 Place[]로 매핑. 실패 시 throw.
async function searchKakao(
  key: string,
  query: string,
  lat: number,
  lng: number
): Promise<Place[]> {
  const url =
    "https://dapi.kakao.com/v2/local/search/keyword.json?" +
    new URLSearchParams({
      query,
      x: String(lng), // 경도
      y: String(lat), // 위도
      radius: "20000", // 최대 20km 반경
      sort: "distance",
      size: "10",
    }).toString();

  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${key}` },
    // 실시간 위치 기반이므로 캐시하지 않음
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`kakao ${res.status}`);
  const data: { documents: KakaoDoc[] } = await res.json();

  return (data.documents ?? []).map((d) => {
    const distanceM = Number(d.distance) || 0;
    return {
      id: d.id,
      name: d.place_name,
      category: d.category_name?.split(" > ").pop() || "보건소",
      distanceM,
      walkMin: walkMinutes(distanceM),
      roadAddress: d.road_address_name,
      address: d.address_name,
      phone: d.phone,
      url: d.place_url,
      lat: Number(d.y),
      lng: Number(d.x),
    };
  });
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

  // ── 실동작 경로: 카카오 로컬 키워드 검색 ──────────────────
  if (key) {
    try {
      const [places, gyms] = await Promise.all([
        searchKakao(key, "보건소", lat, lng),
        searchKakao(key, "헬스장", lat, lng).catch(() => [] as Place[]),
      ]);
      return NextResponse.json({ source: "kakao", places, gyms });
    } catch (e) {
      // 키는 있으나 호출 실패 → 폴백으로 진행
      console.error("[health-centers] kakao 호출 실패, 폴백 사용:", e);
    }
  }

  // ── 폴백 경로: 예시 시설 + 실제 좌표로 거리 계산 ──────────
  const places: Place[] = FALLBACK_FACILITIES.map((f, i) => {
    const distanceM = Math.round(haversineMeters(lat, lng, f.lat, f.lng));
    return {
      id: `fallback-${i}`,
      name: f.name,
      category: f.category.split(" > ").pop() || "보건소",
      distanceM,
      walkMin: walkMinutes(distanceM),
      roadAddress: f.road,
      address: f.road,
      phone: f.phone,
      url: `https://map.kakao.com/?q=${encodeURIComponent(f.name)}`,
      lat: f.lat,
      lng: f.lng,
    };
  }).sort((a, b) => a.distanceM - b.distanceM);

  return NextResponse.json({ source: "fallback", places, gyms: [] });
}
