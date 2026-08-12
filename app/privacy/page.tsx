"use client";

import { useRouter } from "next/navigation";
import { PrivacyPolicyContent } from "@/components/PrivacyPolicy";

// 개인정보 처리방침 독립 페이지 — 마이페이지·푸터 등 가입 흐름 밖에서 여는 경로
export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-dvh bg-ivory">
      <div className="shrink-0 flex items-center gap-3 pt-safetop pb-3 px-gutter bg-ivory border-b border-borderline">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로가기"
          className="shrink-0 flex items-center justify-center"
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2B2B2B"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-[length:calc(21px*var(--ts))] font-bold text-charcoal">
          개인정보 처리방침
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-gutter py-5">
        <PrivacyPolicyContent />
        <div className="h-8" />
      </div>
    </div>
  );
}
