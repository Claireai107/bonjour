"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BoneScoreGauge from "@/components/BoneScoreGauge";
import FactorBar, { FactorBarLegend } from "@/components/FactorBar";
import TextScaleToggle from "@/components/TextScaleToggle";
import Boni from "@/components/Boni";
import TabBar from "@/components/TabBar";
import { useBonJour } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import PageHeader from "@/components/PageHeader";
import EmptyAnalysis from "@/components/EmptyAnalysis";
import reportHistory from "@/lib/reportHistory";
import { useTextScale } from "@/lib/textScale";
import type { RiskGrade, SurveyAnswers, ReportEntry } from "@/lib/types";

const { buildReportHistory, clampReportSelection } = reportHistory;

// 등급 → 배지 표기/색. 라벨은 재분석 반영판 그대로 안심/주의/위험.
// "위험"만 크게 띄우면 놀라시므로, 화면에서는 한마디(comment)가 주인공이고 등급은 보조.
const GRADE_BADGE: Record<
  RiskGrade,
  { label: string; bg: string; color: string }
> = {
  안심: { label: "안심", bg: "#E8F0E3", color: "#3E7A4E" },
  주의: { label: "주의", bg: "#F6ECD5", color: "#D9A441" },
  위험: { label: "위험", bg: "#F6E3DF", color: "#C7503A" },
};

function CheckIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

// 드롭다운 표기용 날짜 (예: 7월 13일 15:02)
function formatReportDate(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${hh}:${mm}`;
}

export default function ReportScreen() {
  const hydrated = useHydrated();
  const latestResult = useBonJour((s) => s.result);
  const answers = useBonJour((s) => s.answers);
  const activeId = useBonJour((s) => s.activeId);
  const reports = useBonJour(
    (s) => s.profiles.find((p) => p.id === s.activeId)?.reports
  );
  // 최신이 위로 오도록 뒤집은 이력 (이력이 없으면 현재 결과 1건으로)
  const history = buildReportHistory(reports, latestResult);
  const [sel, setSel] = useState(0); // 0 = 최신 (디폴트)

  useEffect(() => {
    setSel(0);
  }, [activeId, reports?.length]);

  if (!hydrated) return null;

  const empty = !latestResult || history.length === 0;

  return (
    <div className="h-dvh bg-ivory flex flex-col">
      {/* 상단 고정: 페이지명 헤더 */}
      <PageHeader title="내 뼈 건강 리포트" />
      {empty ? (
        <div className="flex-1 px-gutter flex flex-col">
          <EmptyAnalysis />
        </div>
      ) : (
        <ReportBody history={history} sel={sel} setSel={setSel} answers={answers} />
      )}
      <TabBar />
    </div>
  );
}

function ReportBody({
  history,
  sel,
  setSel,
  answers,
}: {
  history: ReportEntry[];
  sel: number;
  setSel: (n: number) => void;
  answers: SurveyAnswers;
}) {
  const router = useRouter();
  const result = history[clampReportSelection(sel, history.length)].result;
  // 글자 크기를 키우면 핵심 요약 문구가 게이지 아래로 내려간다 → 그때는 중앙 정렬
  const { scale } = useTextScale();
  const stacked = scale !== "normal";

  const maxAbs = Math.max(
    0.01,
    ...result.riskFactors.map((f) => Math.abs(f.contribution)),
    ...result.protectiveFactors.map((f) => Math.abs(f.contribution))
  );

  const badge = GRADE_BADGE[result.grade];
  const markerLeft = result.percentile; // percentile은 클수록 건강 → 오른쪽(건강)에 가깝게
  const delta = result.bestAchievableScore - result.boneScore;

  return (
    <>
      {/* 글자가 커져 한 줄에 안 들어가면 토글이 아랫줄로 내려간다 (프레임 밖 넘침 방지) */}
      <div className="shrink-0 px-gutter pb-3 -mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="relative inline-block">
          <select
            value={sel}
            onChange={(e) => setSel(Number(e.target.value))}
            aria-label="리포트 날짜 선택"
            className="appearance-none bg-white border-[1.5px] border-borderline rounded-pill pl-3.5 pr-8 py-1.5 text-[14px] font-bold text-charcoal outline-none focus:border-forest"
          >
            {history.map((h, i) => (
              <option key={i} value={i}>
                {h.date ? formatReportDate(h.date) : "현재 리포트"}
                {i === 0 ? " (최신)" : ""}
              </option>
            ))}
          </select>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6B6B6B"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
        <TextScaleToggle className="ml-auto" />
      </div>

      {/* 콘텐츠 스크롤 + 하단 탭바 고정 */}
      <div className="flex-1 overflow-y-auto flex flex-col px-gutter pb-7">

        {/* 구역 A · 핵심 요약 (연그린 요약존) */}
        <div className="mt-4 bg-lightgreen rounded-[24px] pt-[18px] px-4 pb-4">
          <div className="text-[13px] font-bold text-forest tracking-[1px] px-[6px]">
            핵심 요약
          </div>

          {/* 점수 게이지 + 등급 — 보통 크기에선 게이지 옆에 문구,
              글자를 키우면(크게·아주 크게) 옆 폭이 모자라므로
              게이지 아래로 내려 세로 중앙 정렬로 보여준다 */}
          <div
            className={`mt-[10px] bg-white rounded-card px-5 py-[18px] flex items-center gap-4 ${
              stacked ? "flex-col text-center" : ""
            }`}
          >
            <BoneScoreGauge score={result.boneScore} grade={result.grade} />
            <div className={stacked ? "w-full" : "flex-1"}>
              <div
                className="inline-block text-[length:calc(16px*var(--ts))] font-bold rounded-chip px-3 py-[4px]"
                style={{ backgroundColor: badge.bg, color: badge.color }}
              >
                {badge.label}
              </div>
              {/* 한마디가 주인공, 등급 배지는 보조 (인계 문서 E) */}
              <div className="mt-2 text-[length:calc(19px*var(--ts))] font-bold text-charcoal leading-[1.4] break-keep">
                {result.comment}
              </div>
            </div>
          </div>

          {/* 등급 안내 — 안심 등급에도 정기검진 안내를 남긴다 (인계 문서 C-3) */}
          <div className="mt-[10px] bg-white rounded-card px-5 py-4">
            <p className="text-[length:calc(16px*var(--ts))] text-charcoal leading-[1.55] break-keep">
              {result.guidance}
            </p>
            <p className="mt-2 text-[length:calc(15px*var(--ts))] text-graytext leading-[1.5] break-keep">
              {result.easyExplain}
            </p>
          </div>

          {/* 또래 비교 */}
          <div className="mt-[10px] bg-white rounded-card pt-4 px-5 pb-3">
            <div className="text-[14px] font-bold text-graytext">
              같은 또래와 비교하면
            </div>
            {/* '상위 %'는 좋은 건지 나쁜 건지 헷갈려서 사람 수로 말한다 (인계 문서 E) */}
            <div className="mt-[2px] text-[length:calc(18px*var(--ts))] font-bold text-forest leading-[1.45] break-keep">
              {result.peerText}
            </div>
            <div className="relative pt-[30px] mt-1">
              <div
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
                style={{ left: `${markerLeft}%` }}
              >
                <Boni pose="face" size={22} className="block" />
                <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-forest" />
              </div>
              <div className="h-[10px] rounded-chip bg-[linear-gradient(90deg,#D8D8D0,#E8F0E3,#5B9A6B,#3E7A4E)]" />
            </div>
            <div className="flex justify-between text-[13px] text-graytext mt-[5px]">
              <span>관리 필요</span>
              <span>건강</span>
            </div>
            <div className="mt-[6px] text-center text-[13px] text-charcoal">
              {result.percentile >= 50
                ? "또래 평균보다 좋은 편이에요"
                : "또래 평균보다 관리가 필요해요"}
            </div>
          </div>
        </div>

        {/* 구역 B · 왜 이런가요 */}
        <div className="mt-7 flex items-center gap-[10px] px-[6px]">
          <span className="text-[13px] font-bold text-graytext tracking-[1px] whitespace-nowrap">
            왜 이런가요
          </span>
          <div className="flex-1 h-px bg-borderline" />
        </div>
        <div className="mt-3 bg-white rounded-card px-5 py-[18px] shadow-[0_1px_6px_rgba(0,0,0,.06)]">
          <div className="text-[18px] font-bold text-charcoal">
            뼈 건강을 위협하는 주요 요인
          </div>
          <FactorBarLegend />
          <div className="mt-3 flex flex-col gap-3">
            {result.riskFactors.length === 0 ? (
              <p className="text-[16px] text-graytext">
                뚜렷한 위험 요인이 없어요. 잘하고 계세요!
              </p>
            ) : (
              result.riskFactors.map((f) => (
                <FactorBar key={f.key} factor={f} maxAbs={maxAbs} />
              ))
            )}
          </div>
        </div>
        {result.protectiveFactors.length > 0 && (
          <div className="mt-[14px] bg-lightgreen rounded-card px-5 py-[14px] flex items-center gap-3">
            <div className="w-[30px] h-[30px] rounded-full bg-white flex items-center justify-center flex-none">
              <CheckIcon size={18} color="#3E7A4E" />
            </div>
            <div className="text-[16px] text-charcoal leading-[1.5]">
              <b className="text-forest">뼈건강 긍정요인</b> ·{" "}
              {result.protectiveFactors.map((f) => f.label).join(", ")}
            </div>
          </div>
        )}

        {/* 구역 C · 앞으로 */}
        {delta > 0 && (
          <>
            <div className="mt-7 flex items-center gap-[10px] px-[6px]">
              <span className="text-[13px] font-bold text-[#8C5A1E] tracking-[1px] whitespace-nowrap">
                앞으로
              </span>
              <div className="flex-1 h-px bg-[#E8C87A]" />
            </div>
            <div className="mt-3 bg-white border-[1.5px] border-[#E8C87A] rounded-card pt-4 px-5 pb-[14px] shadow-[0_1px_6px_rgba(0,0,0,.06)]">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-bold text-[#8C5A1E]">
                  지금 관리하면
                </span>
                <span className="text-[14px] font-bold text-white bg-gold rounded-chip px-3 py-[3px]">
                  +{delta}점 개선 가능
                </span>
              </div>
              <div className="mt-1 text-[20px] font-bold text-charcoal leading-[1.4]">
                뼈 점수를{" "}
                <span className="text-gold text-[24px]">
                  {result.bestAchievableScore}점
                </span>
                까지 올릴 수 있어요
              </div>
              <div className="mt-[10px] flex items-center gap-[10px]">
                <span className="text-[16px] font-bold text-graytext">
                  {result.boneScore}점
                </span>
                <div className="flex-1 h-3 rounded-chip bg-[#F0EEE6] relative overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-green"
                    style={{ width: `${result.boneScore}%` }}
                  />
                  <div
                    className="absolute top-0 h-full bg-[repeating-linear-gradient(45deg,#D9A441,#D9A441_4px,#E8C87A_4px,#E8C87A_8px)]"
                    style={{
                      left: `${result.boneScore}%`,
                      width: `${delta}%`,
                    }}
                  />
                </div>
                <span className="text-[19px] font-bold text-gold">
                  {result.bestAchievableScore}점
                </span>
              </div>
              <div className="mt-[6px] text-[14px] text-graytext">
                생활습관을 바꾸면 이만큼 좋아져요
              </div>
            </div>
          </>
        )}

        {/* CTA */}
        <button
          onClick={() => router.push("/simulator")}
          className="mt-4 h-touch flex-none rounded-btn bg-forest text-white text-[22px] font-bold flex items-center justify-center gap-[10px]"
        >
          어떻게 좋아질 수 있나요?
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        {/* 면책 안내 */}
        <div className="mt-3 flex-none flex items-start gap-2 px-[6px]">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6B6B6B"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="flex-none mt-[2px]"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <span className="text-[14px] text-graytext leading-[1.5]">
            이 결과는 건강관리를 돕는 참고 정보로, 의학적 진단이 아니에요. 뼈
            건강이 걱정되시면 의사와 상담해 주세요.
          </span>
        </div>
      </div>
    </>
  );
}
