// 위치 계산 유틸 — 브라우저 위치와 시설 좌표 사이 거리/도보시간 추정.

/** 두 좌표(위도/경도) 사이 직선 거리(m). Haversine 공식. */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // 지구 반경(m)
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** 거리(m) → 보기 좋은 문자열. 1km 미만은 m, 이상은 km. */
export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

/** 거리(m) → 도보 분(중장년 보행속도 약 75m/분 가정). 최소 1분. */
export function walkMinutes(m: number): number {
  return Math.max(1, Math.round(m / 75));
}
