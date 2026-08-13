"use client";

/**
 * 글자 크기 조절 (보통 / 크게 / 아주 크게)
 *
 * 1차 UT에서 P4·P5가 '가장 불편했던 점'으로 글자 크기를 꼽았다.
 * P5는 개선 요청에서 "글자 크기 조절 기능"을 직접 언급했다.
 *
 * 동작 방식
 *  - <html> 의 --ts 변수만 바꾼다. 화면 전체가 이 배율을 함께 쓰므로
 *    글자만 커지고 버튼·터치 영역 크기는 그대로 유지된다.
 *  - 고른 값은 localStorage 에 남겨 다음에 열 때도 유지한다.
 */

import { useCallback, useEffect, useState } from "react";

export const TEXT_SCALES = [
  { key: "normal", label: "보통", value: 1, sample: "가" },
  { key: "large", label: "크게", value: 1.15, sample: "가" },
  { key: "xlarge", label: "아주 크게", value: 1.3, sample: "가" },
] as const;

export type TextScaleKey = (typeof TEXT_SCALES)[number]["key"];

const STORAGE_KEY = "bonjour.textScale";
// 같은 화면 안의 다른 컴포넌트도 배율 변경을 바로 알 수 있게 이벤트로 알린다
// (훅의 useState는 컴포넌트마다 따로라, 이벤트 없이는 토글을 누른 쪽만 갱신된다)
const CHANGE_EVENT = "bonjour-text-scale-change";

function apply(value: number) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--ts", String(value));
}

/** 첫 화면이 그려지기 전에 저장된 배율을 적용한다 (깜빡임 방지) */
export const TEXT_SCALE_BOOTSTRAP = `
(function(){try{
  var k=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
  var m={normal:1,large:1.15,xlarge:1.3};
  if(k&&m[k])document.documentElement.style.setProperty('--ts',String(m[k]));
}catch(e){}})();
`.trim();

export function useTextScale() {
  const [scale, setScale] = useState<TextScaleKey>("normal");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as TextScaleKey | null;
      if (saved && TEXT_SCALES.some((s) => s.key === saved)) {
        setScale(saved);
        apply(TEXT_SCALES.find((s) => s.key === saved)!.value);
      }
    } catch {
      /* localStorage 를 못 쓰는 환경이면 기본값으로 둔다 */
    }
    // 다른 컴포넌트(토글)가 배율을 바꾸면 함께 갱신
    const onChange = (e: Event) => {
      const key = (e as CustomEvent<TextScaleKey>).detail;
      if (TEXT_SCALES.some((s) => s.key === key)) setScale(key);
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  const change = useCallback((key: TextScaleKey) => {
    const found = TEXT_SCALES.find((s) => s.key === key);
    if (!found) return;
    setScale(key);
    apply(found.value);
    try {
      localStorage.setItem(STORAGE_KEY, key);
    } catch {
      /* noop */
    }
    window.dispatchEvent(new CustomEvent<TextScaleKey>(CHANGE_EVENT, { detail: key }));
  }, []);

  return { scale, change };
}
