"use client";

import ProgressBar from "./ProgressBar";
import PageHeader from "./PageHeader";
import Boni, { BoniPose } from "./Boni";

// 모든 화면 공통 골격 — 헤더는 PageHeader(페이지명), 진행바는 헤더 아래 별도 줄.
// 본이는 진행바 줄 우측(52px)에만 표시.
export default function ScreenFrame({
  children,
  title,
  back = true,
  onBack,
  progress,
  boni,
  footer,
  scroll = true,
  bg = "ivory",
}: {
  children: React.ReactNode;
  title: string;
  back?: boolean;
  onBack?: () => void;
  progress?: { current: number; total: number };
  boni?: BoniPose;
  footer?: React.ReactNode; // 하단 고정 버튼 영역
  scroll?: boolean;
  bg?: "ivory" | "white";
}) {
  return (
    <div
      className={`flex flex-col h-dvh ${
        bg === "ivory" ? "bg-ivory" : "bg-white"
      }`}
    >
      {/* 상단 고정: 페이지명 헤더 */}
      <PageHeader title={title} back={back} onBack={onBack} />

      {/* 진행바 줄 — 헤더 아래, 본이는 우측 */}
      {progress && (
        <div className="shrink-0 flex items-center gap-3 px-gutter pb-2">
          <div className="flex-1">
            <ProgressBar current={progress.current} total={progress.total} />
          </div>
          {boni && <Boni pose={boni} size={52} className="shrink-0" />}
        </div>
      )}

      {/* 콘텐츠 스크롤 */}
      <div
        className={`flex-1 px-gutter pt-2 pb-4 ${
          scroll ? "overflow-y-auto" : ""
        }`}
      >
        {children}
      </div>

      {/* 하단 고정: CTA */}
      {footer && (
        <div className="shrink-0 px-gutter pb-10 pt-2 bg-transparent">
          {footer}
        </div>
      )}
    </div>
  );
}
