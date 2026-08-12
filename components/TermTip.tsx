"use client";

import { useState } from "react";
import { TERMS } from "@/lib/termGlossary";

/**
 * 검진 항목 옆의 (?) 버튼. 누르면 한 줄 설명이 펼쳐진다.
 * 새 화면으로 넘어가면 입력하던 값이 날아가므로 그 자리에서 편다.
 */
export default function TermTip({ termKey }: { termKey: string }) {
  const [open, setOpen] = useState(false);
  const term = TERMS[termKey];
  if (!term) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-label={`${term.short}이(가) 무엇인지 보기`}
        className="w-8 h-8 shrink-0 rounded-full bg-white border-2 border-borderline text-graytext text-[length:calc(16px*var(--ts))] font-bold flex items-center justify-center active:brightness-95"
      >
        ?
      </button>
      {open && (
        <p
          className="basis-full mt-2 bg-white border border-borderline rounded-field px-3.5 py-2.5 text-[length:calc(16px*var(--ts))] text-charcoal leading-[1.55]"
          role="note"
        >
          {term.full && (
            <b className="text-forest">
              {term.short} ({term.full})
            </b>
          )}
          {term.full ? " — " : ""}
          {term.desc}
        </p>
      )}
    </>
  );
}
