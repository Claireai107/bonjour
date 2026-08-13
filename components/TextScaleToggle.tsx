"use client";

import { TEXT_SCALES, useTextScale } from "@/lib/textScale";

/**
 * 글자 크기 [가 가 가] 토글.
 * 리포트 화면 상단과 마이페이지에 놓는다 — 글씨가 작다고 느끼는 순간
 * 바로 손이 닿는 자리여야 한다.
 */
export default function TextScaleToggle({
  className = "",
  showLabel = true,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { scale, change } = useTextScale();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className="text-[length:calc(16px*var(--ts))] text-graytext shrink-0">
          글자 크기
        </span>
      )}
      <div
        role="group"
        aria-label="글자 크기 조절"
        className="flex items-center gap-1.5"
      >
        {TEXT_SCALES.map((s, i) => {
          const selected = scale === s.key;
          return (
            <button
              key={s.key}
              onClick={() => change(s.key)}
              aria-pressed={selected}
              aria-label={`글자 크기 ${s.label}`}
              className={`w-[52px] h-[52px] rounded-field border-2 font-bold transition active:brightness-95 flex items-center justify-center ${
                selected
                  ? "bg-forest border-forest text-white"
                  : "bg-white border-borderline text-graytext"
              }`}
              style={{ fontSize: `${15 + i * 5}px` }}
            >
              {s.sample}
            </button>
          );
        })}
      </div>
    </div>
  );
}
