"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Boni from "@/components/Boni";
import TabBar from "@/components/TabBar";
import { useBonJour } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { simulate } from "@/lib/predict";
import CoachMark from "@/components/CoachMark";
import { useCountUp } from "@/lib/useCountUp";

// 설문 4단계(0~3) → 주당 일수 (모델 근력운동 변수는 실제 일수 0~7)
const STRENGTH_CAT_TO_DAYS = [0, 1.5, 3.5, 6];
const strengthLabel = (d: number) => (d <= 0 ? "안 함" : `주 ${Math.round(d)}회`);

// 등급 표기색 — 디자인: 정상=포레스트, 주의=#C25B2E, 높음=danger
const GRADE_COLOR: Record<string, string> = {
  정상: "#3E7A4E",
  주의: "#C25B2E",
  높음: "#C7503A",
};

export default function SimulatorScreen() {
  const router = useRouter();
  const answers = useBonJour((s) => s.answers);
  const checkup = useBonJour((s) => s.checkup);
  const result = useBonJour((s) => s.result);
  const setSimTarget = useBonJour((s) => s.setSimTarget);
  const hydrated = useHydrated();

  useEffect(() => {
    if (hydrated && !result) router.replace("/survey");
  }, [hydrated, result, router]);

  // 체중은 조절 대상이 아니라 고정값 — 예측과 동일하게 검진 실측값 > 설문 값 우선
  const baseWeight = checkup.weight ?? answers.weight ?? 58;
  const baseStrength = Math.round(
    STRENGTH_CAT_TO_DAYS[answers.strengthDays ?? 0]
  );

  const [strength, setStrength] = useState<number>(baseStrength);

  // persist 복원(하이드레이션) 후 실제 저장값으로 슬라이더 초기화
  useEffect(() => {
    if (hydrated) {
      setStrength(baseStrength);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // 슬라이더를 움직일 때마다 실제 모델로 위험을 다시 계산
  const sim = useMemo(
    () => simulate(answers, checkup, { weight: baseWeight, strengthDays: strength }),
    [answers, checkup, baseWeight, strength]
  );

  // 슬라이더를 끝까지 올렸을 때 몇 점까지 가는지 — 상한을 알려주기 위해
  const maxSim = useMemo(
    () =>
      simulate(answers, checkup, {
        weight: baseWeight,
        strengthDays: 7,
      }),
    [answers, checkup, baseWeight]
  );

  // 점수가 바뀌면 숫자가 굴러가고, 변화량 배지가 잠깐 떴다 사라진다
  const shownScore = useCountUp(sim.boneScore);
  const [deltaBadge, setDeltaBadge] = useState<number | null>(null);
  const prevScore = useRef(sim.boneScore);
  useEffect(() => {
    const diff = sim.boneScore - prevScore.current;
    prevScore.current = sim.boneScore;
    if (diff === 0) return;
    setDeltaBadge(diff);
    const t = setTimeout(() => setDeltaBadge(null), 800);
    return () => clearTimeout(t);
  }, [sim.boneScore]);

  if (!hydrated || !result) return null;

  const before = result.boneScore;
  const improved = sim.boneScore - before;
  const gradeChanged = sim.grade !== result.grade && improved > 0;
  // 이 두 항목만으로 올릴 수 있는 최대치
  const headroom = maxSim.boneScore - before;
  const ceilingNote =
    headroom <= 0
      ? "이미 좋은 상태라 이 항목으로는 더 올릴 여지가 적어요."
      : `근력운동을 늘리면 최대 ${maxSim.boneScore}점까지 올릴 수 있어요 (지금보다 +${headroom}점).`;

  // 게이지 마커 위치: 위험(왼쪽) → 안전(오른쪽), 뼈 점수 %와 동일
  const markerPct = Math.max(4, Math.min(96, sim.boneScore));

  const proceed = () => {
    setSimTarget({ strengthDays: strength });
    router.push("/routine");
  };

  return (
    <div className="h-dvh bg-ivory flex flex-col">
      {/* 상단 고정: 뒤로가기 + 페이지명 (한 줄) */}
      <div className="shrink-0 pt-safetop pb-3 px-gutter flex items-center gap-[12px]">
        <button
          onClick={() => router.back()}
          aria-label="뒤로 가기"
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
        <h1 className="flex-1 min-w-0 text-[length:calc(24px*var(--ts))] font-bold text-charcoal break-keep leading-[1.25]">
          무엇을 바꾸면 좋아질까요?
        </h1>
      </div>

      {/* 콘텐츠 스크롤 */}
      <div className="flex-1 overflow-y-auto px-gutter pb-4 flex flex-col [&>*]:shrink-0">
      {/* 지금 점수 — 숫자가 움직여야 바뀐 걸 알아챈다 (P1) */}
      <div className="mt-[20px] bg-white rounded-card pt-[18px] px-[24px] pb-[16px] shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between mb-[10px]">
          <span className="text-[length:calc(18px*var(--ts))] font-bold text-charcoal">
            바꿨을 때 뼈 건강 점수
          </span>
          <span className="text-[length:calc(15px*var(--ts))] font-bold text-graytext bg-lightgreen rounded-chip px-[12px] py-[4px]">
            아래 슬라이더를 움직여보세요
          </span>
        </div>

        <div className="flex items-end gap-3">
          <span className="text-[length:calc(52px*var(--ts))] font-bold leading-none text-forest tabular-nums">
            {shownScore}
          </span>
          <span className="text-[length:calc(20px*var(--ts))] font-bold text-graytext pb-1">
            점
          </span>
          {/* 값이 바뀐 순간 잠깐 뜨는 배지 */}
          {deltaBadge != null && (
            <span
              className="mb-1 rounded-chip px-2.5 py-[3px] text-[length:calc(16px*var(--ts))] font-bold text-white"
              style={{ backgroundColor: deltaBadge > 0 ? "#3E7A4E" : "#C7503A" }}
            >
              {deltaBadge > 0 ? `+${deltaBadge}` : deltaBadge}점
            </span>
          )}
          <span className="flex-1" />
          <span className="text-[length:calc(16px*var(--ts))] text-graytext pb-1">
            지금 {before}점
          </span>
        </div>

        <div className="relative pt-[34px]">
          {/*
            '여기' 표시 — 예전에는 글자가 그라데이션 위에 겹쳐 잘 안 보였고,
            양 끝으로 가면 화면 밖으로 잘렸다. 흰 배경 칩으로 띄우고
            위치를 6~94% 로 묶어 잘리지 않게 했다.
          */}
          <div
            className="absolute top-0 flex flex-col items-center -translate-x-1/2 transition-all duration-300"
            style={{ left: `${Math.max(6, Math.min(94, markerPct))}%` }}
          >
            <span className="whitespace-nowrap rounded-chip bg-white border-2 border-forest px-2.5 py-[3px] text-[length:calc(15px*var(--ts))] font-bold text-forest shadow-[0_1px_4px_rgba(0,0,0,0.15)]">
              여기
            </span>
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: "7px solid transparent",
                borderRight: "7px solid transparent",
                borderTop: "9px solid #3E7A4E",
                marginTop: "-1px",
              }}
            />
          </div>
          {/* 실제 값 위치를 막대 위에도 점으로 찍는다 */}
          <div
            className="absolute w-[16px] h-[16px] rounded-full bg-white border-[3px] border-forest -translate-x-1/2 transition-all duration-300 shadow-[0_1px_4px_rgba(0,0,0,0.25)]"
            style={{ left: `${markerPct}%`, top: "32px" }}
          />
          <div
            className="h-[12px] rounded-chip"
            style={{
              background:
                "linear-gradient(90deg,#D96B4B,#D9A441,#5B9A6B,#3E7A4E)",
            }}
          />
        </div>
        <div className="flex justify-between text-[length:calc(16px*var(--ts))] text-graytext mt-[6px]">
          <span>위험</span>
          <span>안전</span>
        </div>

        {/* 얼마까지 올릴 수 있는지 미리 알려준다 —
            아무리 움직여도 안 바뀐다고 느끼는 경우가 있었다(P1·P3) */}
        <p className="mt-[10px] text-[length:calc(16px*var(--ts))] text-graytext leading-[1.5]">
          {ceilingNote}
        </p>
      </div>

      {/* 슬라이더 카드 (통제 가능 변수만) */}
      <div className="mt-[16px] bg-white rounded-card py-[22px] px-[24px] flex flex-col gap-[24px] shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
        <SliderRow
          label="주간 근력운동"
          hint="직접 움직여서 바꿔보세요"
          value={strength}
          min={0}
          max={7}
          step={1}
          display={strengthLabel(strength)}
          leftLabel="0회"
          rightLabel="주 7회"
          onChange={(v) => setStrength(Math.round(v))}
        />
      </div>

      </div>

      {/* 하단 고정: 결과 + CTA
          결과가 스크롤 아래에 가려져 슬라이더와 같이 못 본다는 지적이 있었다(P2). */}
      <div className="shrink-0 px-gutter pt-3 pb-2 bg-ivory">
        {improved > 0 && (
          <div className="mb-3 bg-lightgreen rounded-card py-[14px] px-[18px] flex items-center gap-[14px]">
            <div className="flex-1">
              <p className="text-[length:calc(19px*var(--ts))] font-bold text-forest leading-[1.35]">
                골절 위험이 약 {improved}% 낮아져요
              </p>
              {gradeChanged && (
                <div className="mt-[6px] flex items-center gap-[8px] text-[length:calc(17px*var(--ts))]">
                  <span
                    className="font-bold"
                    style={{ color: GRADE_COLOR[result.grade] }}
                  >
                    {result.grade}군
                  </span>
                  <span className="text-graytext font-bold">→</span>
                  <span
                    className="font-bold"
                    style={{ color: GRADE_COLOR[sim.grade] }}
                  >
                    {sim.grade}군
                  </span>
                </div>
              )}
            </div>
            <Boni pose="praise" size={52} className="shrink-0" />
          </div>
        )}
        <button onClick={proceed} className="btn-primary">
          이 계획으로 실천하기
        </button>
        <p className="mt-[8px] text-[length:calc(15px*var(--ts))] text-graytext text-center leading-[1.4]">
          예상 수치는 참고용이에요.
          <br />
          실제 건강 상태는 의사와 확인해 주세요.
        </p>
      </div>
      <TabBar />

      {/* 처음 들어왔을 때 한 번만 — 5명 중 3명이 조작법을 몰라 도움을 받았다 */}
      <CoachMark
        id="simulator-slider"
        title="슬라이더를 좌우로 움직여 보세요"
        body="근력운동 횟수를 바꾸면 뼈 건강 점수가 어떻게 달라지는지 바로 보여드려요."
      />
    </div>
  );
}

// 디자인 슬라이더 — 트랙 12px 라이트그린 + 포레스트 채움 + 32px 흰테두리 썸.
// 실제 입력은 투명 range 인풋이 트랙 위를 덮어 처리한다.
function SliderRow({
  label,
  value,
  min,
  max,
  step,
  hint,
  display,
  leftLabel,
  rightLabel,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  leftLabel: string;
  rightLabel: string;
  onChange: (v: number) => void;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;

  // 화면에 들어오면 손잡이가 두 번 좌우로 흔들린다 — 여기가 움직인다는 신호
  const [nudge, setNudge] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setNudge(false), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div>
      <div className="flex justify-between items-baseline text-[length:calc(18px*var(--ts))] font-bold text-charcoal mb-[4px]">
        <span>{label}</span>
        <span className="text-forest">{display}</span>
      </div>
      {hint && (
        <p className="text-[length:calc(15px*var(--ts))] font-medium text-graytext mb-[12px]">
          {hint}
        </p>
      )}
      <div className="relative h-[12px] rounded-chip bg-lightgreen">
        <div
          className="h-full rounded-chip bg-forest"
          style={{ width: `${pct}%` }}
        />
        {/* 손잡이 — 44px 이상이어야 손가락으로 잡기 쉽다 */}
        <div
          className={`absolute -top-[16px] w-[44px] h-[44px] rounded-full bg-forest border-4 border-white shadow-[0_2px_8px_rgba(0,0,0,0.28)] pointer-events-none flex items-center justify-center ${
            nudge ? "animate-slider-nudge" : ""
          }`}
          style={{
            left: `calc(${pct}% + ${(0.5 - pct / 100) * 44}px)`,
            transform: "translateX(-50%)",
          }}
        >
          {/* 좌우 화살표 — 움직이는 것이라는 표시 */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 6l-4 6 4 6M15 6l4 6-4 6" />
          </svg>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={`${label} (좌우로 움직여 값을 바꿉니다)`}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute -top-[18px] left-0 w-full h-[48px] opacity-0 cursor-pointer"
        />
      </div>
      <div className="flex justify-between text-[length:calc(16px*var(--ts))] text-graytext mt-[10px]">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}
