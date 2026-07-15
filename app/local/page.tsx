"use client";

import { useState } from "react";
import TabBar from "@/components/TabBar";
import PageHeader from "@/components/PageHeader";
import LocalSection from "@/components/LocalSection";
import Boni from "@/components/Boni";

// 우리동네 탭 — "가까운 곳에서 시작해보세요" 섹션을 메인으로 보여주는 페이지
export default function LocalScreen() {
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  };

  return (
    <div className="h-dvh bg-ivory flex flex-col">
      <PageHeader title="우리동네" />

      {/* 콘텐츠 스크롤 */}
      <div className="flex-1 overflow-y-auto px-gutter pb-6">
        {/* LocalSection: 보건소(공공데이터 API) + 제휴 시설 카드 — 헤더 우측에 달리는 본이 */}
        <div className="-mt-2">
          <LocalSection
            onToast={showToast}
            headerRight={<Boni pose="run" size={76} className="shrink-0" />}
          />
        </div>
        <p className="mt-[8px] text-[13px] text-graytext text-center leading-[1.5]">
          시설 정보는 참고용이에요. 운영 시간은
          <br />
          방문 전에 전화로 확인해 주세요.
        </p>
      </div>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-[98px] left-1/2 -translate-x-1/2 z-50 bg-charcoal text-white text-[16px] font-bold rounded-pill py-[12px] px-[22px] shadow-[0_4px_12px_rgba(0,0,0,0.25)] whitespace-nowrap">
          {toast}
        </div>
      )}

      <TabBar />
    </div>
  );
}
