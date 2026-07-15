"use client";

// 권한 온보딩(/permissions)과 앱 설정(/settings)이 공유하는 권한 카드 정의 + 순차 요청.

export type PermKey = "geolocation" | "camera" | "microphone";

export interface PermCard {
  key: PermKey;
  title: string;
  desc: string;
  icon: JSX.Element;
}

// 위치 → 카메라 → 마이크 순차 요청. 각 실패(거부)는 무시, 미디어 트랙 즉시 반납.
export async function requestAllPermissions(): Promise<void> {
  await new Promise<void>((resolve) => {
    if (!("geolocation" in navigator)) return resolve();
    navigator.geolocation.getCurrentPosition(
      () => resolve(),
      () => resolve(),
      { timeout: 8000 }
    );
  });
  for (const constraints of [{ video: true }, { audio: true }] as const) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      /* 거부/미지원 — 무시하고 진행 */
    }
  }
}

export const PERM_CARDS: PermCard[] = [
  {
    key: "geolocation",
    title: "위치",
    desc: "가까운 보건소를 찾아드려요",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3E7A4E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    key: "camera",
    title: "카메라",
    desc: "검진표를 찍어서 자동 인식해요",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3E7A4E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
  {
    key: "microphone",
    title: "마이크",
    desc: "설문을 음성으로 답할 수 있어요",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3E7A4E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
        <path d="M12 18v4" />
      </svg>
    ),
  },
];
