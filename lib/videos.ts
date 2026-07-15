import type { VideoResource } from "./types";

// ============================================================
// 운동 영상 리소스 라이브러리 (매핑테이블 시트 3_영상리소스)
// 한국건강증진개발원(KHEPI) 공식 영상 · 유튜브 임베드 방식
// 저작권: 공공누리 제4유형(출처표시+상업금지+변경금지)
//  → 원본 그대로 임베드만, 편집/재호스팅 금지. 카드 하단 출처 표기 필수.
// ============================================================

export const VIDEOS: Record<string, VideoResource> = {
  adapt: {
    id: "adapt",
    category: "어운완",
    title: "적응 운동 (2주 적응)",
    parts: "준비·기본 동작 · 전 대상 워밍업",
    youtubeId: "0Hg6Ctkecsk",
  },
  type1: {
    id: "type1",
    category: "어운완",
    title: "유형1 · 의자 운동",
    parts: "앉아서 하는 근력 (입문용)",
    youtubeId: "g2mfv_gAkpc",
  },
  type2: {
    id: "type2",
    category: "어운완",
    title: "유형2 · 짝 운동",
    parts: "둘이서 하는 균형운동",
    youtubeId: "TWL3gFBh5_8",
  },
  type3: {
    id: "type3",
    category: "어운완",
    title: "유형3 · 서서 운동",
    parts: "서서 하는 하체 근력",
    youtubeId: "KgDS6abT1CU",
  },
  walk: {
    id: "walk",
    category: "KHEPI",
    title: "걷기 가이드라인",
    parts: "빠르게 걷기 유산소",
    youtubeId: "cERLDsQ-Yho",
  },
  stretch1: {
    id: "stretch1",
    category: "KHEPI",
    title: "짬짬이 스트레칭 1탄",
    parts: "목·허리·다리·팔·등·배",
    youtubeId: "dXTI2YDpPAw",
  },
  stretch2: {
    id: "stretch2",
    category: "KHEPI",
    title: "짬짬이 스트레칭 2탄",
    parts: "목·손목·등·어깨·허리",
    youtubeId: "XeJLeyAsAFE",
  },
  stretch3: {
    id: "stretch3",
    category: "KHEPI",
    title: "짬짬이 스트레칭 3탄",
    parts: "어깨·엉덩이·다리·등·전신",
    youtubeId: "A32mFR6wtCE",
  },
};

export const VIDEO_SOURCE_CREDIT = "출처: 보건복지부·한국건강증진개발원";

export function youtubeThumb(youtubeId: string): string {
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}

export function youtubeEmbed(youtubeId: string): string {
  return `https://www.youtube.com/embed/${youtubeId}`;
}

export function youtubeWatch(youtubeId: string): string {
  return `https://www.youtube.com/watch?v=${youtubeId}`;
}
