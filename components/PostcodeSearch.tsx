"use client";

import { useEffect, useRef } from "react";

// 카카오(다음) 우편번호 서비스 — 키 없이 사용하는 표준 주소 검색.
// https://postcode.map.daum.net/guide
const SCRIPT_SRC =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

declare global {
  interface Window {
    daum?: { Postcode: new (opts: Record<string, unknown>) => { embed: (el: HTMLElement) => void } };
  }
}

export default function PostcodeSearch({
  open,
  onSelect,
  onClose,
}: {
  open: boolean;
  onSelect: (address: string) => void;
  onClose: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const launch = () => {
      if (cancelled || !window.daum?.Postcode || !boxRef.current) return;
      boxRef.current.innerHTML = "";
      new window.daum.Postcode({
        oncomplete: (data: { roadAddress?: string; jibunAddress?: string; sido?: string }) => {
          onSelect(data.roadAddress || data.jibunAddress || "");
          onClose();
        },
        width: "100%",
        height: "100%",
      }).embed(boxRef.current);
    };

    if (window.daum?.Postcode) {
      launch();
    } else {
      let script = document.querySelector<HTMLScriptElement>(
        `script[src="${SCRIPT_SRC}"]`
      );
      if (!script) {
        script = document.createElement("script");
        script.src = SCRIPT_SRC;
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", launch, { once: true });
    }
    return () => {
      cancelled = true;
    };
  }, [open, onSelect, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="주소 검색 닫기"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(43,43,43,0.45)]"
      />
      <div className="relative w-full max-w-frame h-[78dvh] bg-white rounded-t-[24px] overflow-hidden flex flex-col">
        <div className="shrink-0 flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-[20px] font-bold text-charcoal">주소 검색</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="w-9 h-9 rounded-full bg-lightgreen flex items-center justify-center"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3E7A4E"
              strokeWidth="2.8"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div ref={boxRef} className="flex-1" />
      </div>
    </div>
  );
}
