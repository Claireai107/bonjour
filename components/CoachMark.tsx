"use client";

import { useEffect, useState } from "react";

/**
 * 처음 한 번만 뜨는 조작 안내.
 *
 * 1차 UT에서 시뮬레이터 태스크 성공률이 40%였고, 5명 중 3명이
 * 슬라이더를 찾거나 움직이는 데 진행자 도움을 받아야 했다.
 * ("슬라이더를 움직여 보라고? 어떻게 하지?" — P4)
 *
 * 한 번 보고 닫으면 localStorage 에 기록해 다시 띄우지 않는다.
 */
export default function CoachMark({
  id,
  title,
  body,
  targetTop,
}: {
  /** 화면마다 다른 값. 이 값으로 '봤는지'를 기억한다 */
  id: string;
  title: string;
  body: string;
  /** 강조할 영역의 화면 상단 기준 위치(%) — 딤 처리에서 뚫어줄 자리 */
  targetTop?: number;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(`bonjour.coach.${id}`)) {
        const t = setTimeout(() => setOpen(true), 600);
        return () => clearTimeout(t);
      }
    } catch {
      /* localStorage 를 못 쓰면 그냥 띄우지 않는다 */
    }
  }, [id]);

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(`bonjour.coach.${id}`, "1");
    } catch {
      /* noop */
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-8"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={close}
    >
      <div className="absolute inset-0 bg-black/45" />
      <div
        className="relative w-full max-w-[320px] bg-white rounded-card px-6 py-6 shadow-xl"
        style={targetTop != null ? { marginTop: `${targetTop}%` } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[length:calc(20px*var(--ts))] font-bold text-charcoal leading-[1.4]">
          {title}
        </div>
        <p className="mt-2 text-[length:calc(17px*var(--ts))] text-graytext leading-[1.55]">
          {body}
        </p>
        <button
          onClick={close}
          className="mt-5 w-full h-touch rounded-btn bg-forest text-white text-[length:calc(20px*var(--ts))] font-bold active:brightness-95"
        >
          알겠어요
        </button>
      </div>
    </div>
  );
}
