"use client";

import { useRouter } from "next/navigation";

// 모든 화면 공통 헤더 — 체계: [뒤로가기?] [페이지명 24px] [우측 슬롯?] + 보조줄?
// 페이지명 자리에는 "화면 이름"만. 진행바 등 보조 UI는 이 아래 별도 줄로 렌더할 것.
export default function PageHeader({
  title,
  back = false,
  onBack,
  subtitle,
  right,
}: {
  title: string;
  back?: boolean;
  onBack?: () => void; // 기본 router.back() 대체 (예: 회원가입 → "/")
  subtitle?: string; // 제목 아래 보조줄 (홈 인사말 등)
  right?: React.ReactNode; // 우측 슬롯 (사용자 전환, 모드 칩 등)
}) {
  const router = useRouter();
  return (
    <div className="shrink-0 px-gutter pt-safetop pb-3">
      <div className="flex items-center gap-3">
        {back && (
          <button
            onClick={() => (onBack ? onBack() : router.back())}
            aria-label="뒤로 가기"
            className="w-8 h-11 -ml-1 flex items-center justify-center text-charcoal shrink-0"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        <h1 className="flex-1 min-w-0 text-[24px] font-bold text-charcoal whitespace-nowrap truncate">
          {title}
        </h1>
        {right != null && <div className="shrink-0">{right}</div>}
      </div>
      {subtitle && (
        <p className="mt-1 text-[15px] text-graytext whitespace-nowrap">
          {subtitle}
        </p>
      )}
    </div>
  );
}
