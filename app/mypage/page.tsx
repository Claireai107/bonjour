"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TabBar from "@/components/TabBar";
import PageHeader from "@/components/PageHeader";
import Avatar from "@/components/Avatar";
import { avatarPose } from "@/components/Boni";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import { useBonJour } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";

// 화면 9 · 마이페이지 — 상단 사용자 전환 + Bone Score 카드 + 오늘의 루틴 + 메뉴
export default function MyPageScreen() {
  const router = useRouter();
  const result = useBonJour((s) => s.result);
  const answers = useBonJour((s) => s.answers);
  const profile = useBonJour((s) => s.profile);
  const reset = useBonJour((s) => s.reset);
  const hydrated = useHydrated();
  const [sheetOpen, setSheetOpen] = useState(false);

  const gradeColor =
    result?.grade === "정상"
      ? "#3E7A4E"
      : result?.grade === "주의"
      ? "#D9A441"
      : "#C7503A";
  const gradeLabel =
    result?.grade === "정상" ? "좋음" : result?.grade ?? "";

  if (!hydrated) return null;

  const displayName = profile.name?.trim() || profile.relation || "사용자";

  return (
    <div className="flex flex-col h-dvh bg-ivory">
      <PageHeader
        title="마이페이지"
        subtitle="오늘도 실천해주셔서 멋져요!"
        right={
          <button
            onClick={() => setSheetOpen(true)}
            className="min-w-0 max-w-[180px] flex items-center gap-2 rounded-pill bg-white border border-borderline py-1.5 pl-1.5 pr-3 active:brightness-95"
          >
            <Avatar pose={avatarPose(profile.avatar)} size={30} />
            <span className="min-w-0 truncate text-[15px] font-bold text-charcoal">
              {displayName}님
            </span>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6B6B6B"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        }
      />

      {/* 콘텐츠 스크롤 */}
      <div className="flex-1 overflow-y-auto px-gutter pb-4 flex flex-col">
        {/* 프로필 카드 — 상단에서 선택된 프로필 = 화면 데이터 주인 */}
        <div className="mt-3 bg-white rounded-card px-5 py-4 shadow-[0_1px_6px_rgba(0,0,0,.06)]">
          <div className="flex items-center gap-3.5">
            <Avatar pose={avatarPose(profile.avatar)} size={52} />
            <div className="flex-1">
              <div className="text-[20px] font-bold text-charcoal">
                {displayName}님
              </div>
              <div className="mt-0.5 text-[15px] text-graytext">
                {profile.gender === "M" ? "남성" : "여성"} ·{" "}
                {answers.age ?? "-"}세 · {profile.region || "순천시"}
              </div>
            </div>
          </div>
          {result && (
            <div className="mt-3 bg-lightgreen rounded-chip px-4 py-2.5 flex items-center gap-3">
              <span className="text-[15px] font-bold text-graytext">
                Bone Score
              </span>
              <span
                className="flex-1 text-[26px] font-bold"
                style={{ color: gradeColor }}
              >
                {result.boneScore}점
              </span>
              <span
                className="bg-white text-[17px] font-bold rounded-chip px-3.5 py-[5px]"
                style={{ color: gradeColor }}
              >
                {gradeLabel}
              </span>
            </div>
          )}
        </div>

        {/* 오늘의 맞춤 루틴 — 결과 없으면 측정 유도 카드 */}
        {result ? (
          <div className="mt-2.5 bg-lightgreen rounded-card px-5 pt-3.5 pb-3">
            <div className="flex items-center gap-2.5">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3E7A4E"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18h6" />
                <path d="M10 22h4" />
                <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z" />
              </svg>
              <span className="flex-1 text-[19px] font-bold text-charcoal whitespace-nowrap">
                오늘의 맞춤 루틴
              </span>
              <button
                onClick={() => router.push("/routine")}
                className="flex items-center gap-0.5 text-[15px] font-bold text-forest whitespace-nowrap"
              >
                전체 보기{" "}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#3E7A4E"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
            <div className="mt-2.5 flex flex-col gap-2">
              <RoutineRow label="하체 근력" meta="· 주 3회" />
              <RoutineRow label="균형 운동" meta="· 매일 10분" />
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              reset();
              router.push("/onboarding");
            }}
            className="mt-2.5 bg-lightgreen rounded-card px-5 py-4 flex items-center gap-2.5 text-left active:brightness-95"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3E7A4E"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M9 18h6" />
              <path d="M10 22h4" />
              <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z" />
            </svg>
            <span className="flex-1 min-w-0 text-[16px] font-bold text-charcoal leading-[1.5] break-keep">
              뼈건강 데이터를 측정하면 맞춤 루틴을 알려드려요
            </span>
            <span className="shrink-0 flex items-center gap-0.5 text-[15px] font-bold text-forest whitespace-nowrap">
              분석 시작하기
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3E7A4E"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </span>
          </button>
        )}

        {/* 메뉴 리스트 */}
        <div className="mt-2.5 flex-none bg-white rounded-card shadow-[0_1px_6px_rgba(0,0,0,.06)] overflow-hidden">
          <MenuItem
            label="내 리포트 다시 보기"
            onClick={() => router.push("/report")}
          />
          <MenuItem
            label="관심 건강 관리"
            onClick={() => router.push("/favorites")}
          />
          <MenuItem label="앱 설정" onClick={() => router.push("/settings")} />
          <MenuItem label="도움말 & 문의" onClick={() => {}} />
          <MenuItem
            label="처음부터 다시 하기"
            last
            onClick={() => {
              reset();
              router.push("/");
            }}
          />
        </div>
      </div>

      <ProfileSwitcher open={sheetOpen} onClose={() => setSheetOpen(false)} />
      <TabBar />
    </div>
  );
}

function RoutineRow({ label, meta }: { label: string; meta: string }) {
  return (
    <div className="bg-white rounded-chip px-4 py-[9px] flex items-center gap-3">
      <span className="w-6 h-6 rounded-lg bg-white border-2 border-borderline box-border flex-none" />
      <span className="text-[18px] font-medium text-charcoal">
        {label} <span className="text-graytext text-[15px]">{meta}</span>
      </span>
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  last = false,
}: {
  label: string;
  onClick: () => void;
  last?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-5 py-3 text-left ${
        last ? "" : "border-b border-[#F0EEE6]"
      }`}
    >
      <span className="flex-1 text-[18px] text-charcoal">{label}</span>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#6B6B6B"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  );
}
