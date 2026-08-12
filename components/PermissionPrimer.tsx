"use client";

import { useEffect, useState } from "react";

/**
 * 브라우저 권한 창을 띄우기 전에 먼저 보여주는 안내.
 *
 * 1차 UT에서 첫 진입 성공률이 40%였고, 권한이 가장 큰 병목이었다.
 *  - P2: 카메라·마이크 허용이 안 돼 가족 휴대폰으로 교체해 진행
 *  - P5: 차단 설정을 못 풀어 지인 휴대폰으로 교체해 진행
 *  - P4: 허용 창이 반복적으로 떠서 도움 3회, 첫 진입 195초
 *
 * 그래서 두 가지를 바꿨다.
 *  1) 무엇에 쓰는지 먼저 설명하고, 사용자가 [허용하러 가기]를 누른 뒤에만 요청한다.
 *  2) 이미 차단된 상태면 창을 또 띄우지 않고 해제 방법을 안내한다.
 */

export type PermissionKind = "microphone" | "camera" | "geolocation";

const COPY: Record<
  PermissionKind,
  { title: string; body: string; blocked: string }
> = {
  microphone: {
    title: "말로 답하려면 마이크가 필요해요",
    body: "다음 화면에서 '허용'을 눌러주세요. 허용하지 않아도 손으로 직접 고를 수 있어요.",
    blocked:
      "마이크가 차단되어 있어요. 주소창 왼쪽의 자물쇠(또는 ⓘ) → 마이크 → 허용으로 바꾼 뒤 새로고침해 주세요.",
  },
  camera: {
    title: "검진표를 찍으려면 카메라가 필요해요",
    body: "다음 화면에서 '허용'을 눌러주세요. 허용하지 않아도 앨범에서 사진을 고를 수 있어요.",
    blocked:
      "카메라가 차단되어 있어요. 주소창 왼쪽의 자물쇠(또는 ⓘ) → 카메라 → 허용으로 바꾼 뒤 새로고침해 주세요.",
  },
  geolocation: {
    title: "가까운 시설을 찾으려면 위치가 필요해요",
    body: "다음 화면에서 '허용'을 눌러주세요. 허용하지 않아도 주소를 직접 검색할 수 있어요.",
    blocked:
      "위치가 차단되어 있어요. 주소창 왼쪽의 자물쇠(또는 ⓘ) → 위치 → 허용으로 바꾼 뒤 새로고침해 주세요.",
  },
};

/** 이미 차단됐는지 미리 확인 — 확인이 안 되는 브라우저면 null */
export async function checkPermission(
  kind: PermissionKind
): Promise<"granted" | "denied" | "prompt" | null> {
  try {
    const q = (navigator as any)?.permissions?.query;
    if (!q) return null;
    const res = await (navigator as any).permissions.query({ name: kind });
    return res.state;
  } catch {
    return null;
  }
}

export default function PermissionPrimer({
  kind,
  open,
  onAllow,
  onSkip,
  skipLabel = "괜찮아요, 직접 할게요",
}: {
  kind: PermissionKind;
  open: boolean;
  /** 사용자가 허용하겠다고 했을 때 — 이 안에서 실제 권한을 요청한다 */
  onAllow: () => void;
  onSkip: () => void;
  skipLabel?: string;
}) {
  const [blocked, setBlocked] = useState(false);
  const copy = COPY[kind];

  useEffect(() => {
    if (!open) return;
    let alive = true;
    checkPermission(kind).then((state) => {
      if (alive) setBlocked(state === "denied");
    });
    return () => {
      alive = false;
    };
  }, [open, kind]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
    >
      <div className="absolute inset-0 bg-black/45" onClick={onSkip} />
      <div className="relative w-full max-w-frame bg-white rounded-t-[24px] px-6 pt-7 pb-8">
        <div className="text-[length:calc(22px*var(--ts))] font-bold text-charcoal leading-[1.4]">
          {copy.title}
        </div>
        <p className="mt-3 text-[length:calc(17px*var(--ts))] text-graytext leading-[1.6]">
          {blocked ? copy.blocked : copy.body}
        </p>

        {!blocked && (
          <button
            onClick={onAllow}
            className="mt-6 w-full h-touch rounded-btn bg-forest text-white text-[length:calc(20px*var(--ts))] font-bold active:brightness-95"
          >
            허용하러 가기
          </button>
        )}
        <button
          onClick={onSkip}
          className="mt-2.5 w-full h-14 rounded-btn text-graytext text-[length:calc(18px*var(--ts))] underline underline-offset-4"
        >
          {blocked ? "닫기" : skipLabel}
        </button>
      </div>
    </div>
  );
}
