"use client";

import Boni, { BoniPose } from "./Boni";

// 원형 아바타 — 이미지를 원보다 크게(1.4배) 넣고 위쪽 정렬해 머리~상반신 크롭.
// ring: 선택/활성 테두리(포레스트 2.5px)
export default function Avatar({
  pose,
  size,
  ring = false,
  className = "",
}: {
  pose: BoniPose;
  size: number; // 원 지름(px)
  ring?: boolean;
  className?: string;
}) {
  return (
    <span
      style={{ width: size, height: size }}
      className={`rounded-full bg-lightgreen box-border overflow-hidden flex items-start justify-center flex-none ${
        ring ? "border-[2.5px] border-forest" : ""
      } ${className}`}
    >
      {/* max-w-none: 기본 max-width:100%가 가로만 눌러 비율을 찌그러뜨리는 것 방지
          — 원보다 넓은 부분은 overflow-hidden이 좌우로 잘라낸다 */}
      <Boni
        pose={pose}
        size={Math.round(size * 1.4)}
        className="max-w-none shrink-0"
      />
    </span>
  );
}
