"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 숫자가 바뀔 때 값이 굴러가듯 올라간다.
 *
 * 1차 UT에서 P1이 "슬라이더를 이동해도 왜 변화가 없지?"라고 했다.
 * 실제로는 계산이 다시 돌고 있었지만 화면에서 달라지는 게 거의 없어
 * 바뀐 걸 알아채지 못했다. 숫자가 움직이면 바로 눈에 들어온다.
 */
export function useCountUp(target: number, durationMs = 400) {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;

    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      // 끝에서 부드럽게 멈추도록
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target, durationMs]);

  return display;
}
