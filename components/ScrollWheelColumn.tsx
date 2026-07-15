"use client";

import { useEffect, useRef, useState } from "react";

// 생년월일 휠 한 열 — 손가락/휠 스크롤로 값을 고른다 (회원가입·새 사용자 추가 공용).
// 가운데 행이 선택값. 행을 눌러도 그 값으로 이동한다.
const ITEM = 42; // 행 높이(px) — 하이라이트 바(h-[42px])와 동일
const VISIBLE = 3;
const HEIGHT = ITEM * VISIBLE;

export default function ScrollWheelColumn({
  value,
  min,
  max,
  format,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [centered, setCentered] = useState(value);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emitted = useRef(value); // 우리가 onChange로 내보낸 마지막 값

  const values: number[] = [];
  for (let v = min; v <= max; v++) values.push(v);

  const scrollTo = (v: number, smooth = false) => {
    ref.current?.scrollTo({
      top: (v - min) * ITEM,
      behavior: smooth ? "smooth" : "auto",
    });
  };

  // 최초: 현재 값 위치로
  useEffect(() => {
    scrollTo(value);
    return () => {
      if (settle.current) clearTimeout(settle.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 외부에서 값이 바뀌면(데모 채우기, 말일 보정 등) 그 위치로 재정렬
  useEffect(() => {
    if (value === emitted.current) return;
    emitted.current = value;
    setCentered(value);
    scrollTo(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const i = Math.max(
      0,
      Math.min(values.length - 1, Math.round(el.scrollTop / ITEM))
    );
    const v = values[i];
    setCentered(v);
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      emitted.current = v;
      onChange(v);
    }, 120);
  };

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      role="listbox"
      aria-label={`${format(min)}부터 ${format(max)}까지 선택`}
      className="relative overflow-y-auto snap-y snap-mandatory overscroll-contain [&::-webkit-scrollbar]:hidden"
      style={{ height: HEIGHT, scrollbarWidth: "none" }}
    >
      <div style={{ height: (HEIGHT - ITEM) / 2 }} />
      {values.map((v) => (
        <div
          key={v}
          role="option"
          aria-selected={v === centered}
          onClick={() => scrollTo(v, true)}
          className={`snap-center flex items-center justify-center cursor-pointer ${
            v === centered
              ? "text-[22px] font-bold text-charcoal"
              : "text-[16px] text-[#C9C5B8]"
          }`}
          style={{ height: ITEM }}
        >
          {format(v)}
        </div>
      ))}
      <div style={{ height: (HEIGHT - ITEM) / 2 }} />
    </div>
  );
}
