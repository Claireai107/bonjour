"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Boni from "@/components/Boni";
import PageHeader from "@/components/PageHeader";
import TabBar from "@/components/TabBar";
import { useBonJour } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { simulate } from "@/lib/predict";

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

  if (!hydrated || !result) return null;

  const before = result.boneScore;
  const improved = sim.boneScore - before;
  const gradeChanged = sim.grade !== result.grade && improved > 0;

  // 게이지 마커 위치: 위험(왼쪽) → 안전(오른쪽), 뼈 점수 %와 동일
  const nowPct = Math.max(4, Math.min(96, before)); // 지금(현재 점수)
  const expectedPct = Math.max(4, Math.min(96, sim.boneScore)); // 예상(시뮬레이션)

  const proceed = () => {
    setSimTarget({ weight: baseWeight, strengthDays: strength });
    router.push("/routine");
  };

  return (
    <div className="h-dvh bg-ivory flex flex-col">
      <PageHeader title="무엇을 바꾸면 좋아질까요?" back />

      {/* 콘텐츠 스크롤 */}
      <div className="flex-1 overflow-y-auto px-gutter pb-4 flex flex-col [&>*]:shrink-0">
      {/* 예상 위험도 게이지 */}
      <div className="mt-[20px] bg-white rounded-card pt-[18px] px-[24px] pb-[16px] shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between mb-[10px]">
          <span className="text-[18px] font-bold text-charcoal">
            예상 위험도
          </span>
          <span className="text-[13px] font-bold text-graytext bg-lightgreen rounded-chip px-[12px] py-[4px]">
            슬라이더를 움직여보세요
          </span>
        </div>
        <div className="relative pt-[24px] pb-[22px]">
          {/* 예상 — 화살표 마커 (게이지 위) */}
          <div
            className="absolute top-0 flex flex-col items-center -translate-x-1/2 transition-all duration-300"
            style={{ left: `${expectedPct}%` }}
          >
            <span className="text-[10px] font-bold text-forest whitespace-nowrap">
              예상
            </span>
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderTop: "7px solid #3E7A4E",
              }}
            />
          </div>
          <div
            className="h-[12px] rounded-chip"
            style={{
              background:
                "linear-gradient(90deg,#D96B4B,#D9A441,#5B9A6B,#3E7A4E)",
            }}
          />
          {/* 지금 — 선 마커 (게이지 관통, 게이지 아래 라벨) */}
          <div
            className="absolute bottom-0 flex flex-col items-center -translate-x-1/2"
            style={{ left: `${nowPct}%` }}
          >
            <div className="w-[2px] h-[18px] -mt-[14px] bg-charcoal/70 rounded-full" />
            <span className="text-[10px] font-bold text-graytext whitespace-nowrap">
              지금
            </span>
          </div>
        </div>
        <div className="flex justify-between text-[14px] text-graytext mt-[2px]">
          <span>위험</span>
          <span>안전</span>
        </div>
      </div>

      {/* 슬라이더 카드 (통제 가능 변수만) */}
      <div className="mt-[16px] bg-white rounded-card py-[22px] px-[24px] flex flex-col gap-[24px] shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
        <SliderRow
          label="주간 근력운동"
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

      {/* 결과 카드 */}
      {improved > 0 && (
        <div className="mt-[16px] bg-lightgreen rounded-card py-[22px] px-[24px] flex items-center gap-[16px]">
          <div className="flex-1">
            <p className="text-[22px] font-bold text-forest">
              골절 위험이 크게 줄어요!
            </p>
            {gradeChanged && (
              <div className="mt-[8px] flex items-center gap-[8px] text-[18px]">
                <span
                  className="font-bold"
                  style={{ color: GRADE_COLOR[result.grade] }}
                >
                  {result.grade}군{" "}
                  <span
                    className="text-[26px]"
                    style={{ verticalAlign: "-3px" }}
                  >
                    😟
                  </span>
                </span>
                <span className="text-graytext font-bold">→</span>
                <span
                  className="font-bold"
                  style={{ color: GRADE_COLOR[sim.grade] }}
                >
                  {sim.grade}군{" "}
                  <span
                    className="text-[26px]"
                    style={{ verticalAlign: "-3px" }}
                  >
                    😊
                  </span>
                </span>
              </div>
            )}
            <p className="mt-[6px] text-[15px] text-graytext">
              위험도가 약 {improved}% 낮아졌어요
            </p>
          </div>
          <Boni pose="aha" size={66} className="shrink-0" />
        </div>
      )}

      </div>

      {/* 하단 고정: CTA */}
      <div className="shrink-0 px-gutter pt-3 pb-8">
        <button onClick={proceed} className="btn-primary">
          이 계획으로 실천하기
        </button>
        <p className="mt-[10px] text-[13px] text-graytext text-center leading-[1.5]">
          예상 수치는 참고용이에요.
          <br />
          실제 건강 상태는 의사와 확인해 주세요.
        </p>
      </div>
      <TabBar />
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
  display,
  leftLabel,
  rightLabel,
  onChange,
}: {
  label: string;
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
  return (
    <div>
      <div className="flex justify-between text-[18px] font-bold text-charcoal mb-[12px]">
        <span>{label}</span>
        <span className="text-forest">{display}</span>
      </div>
      <div className="relative h-[12px] rounded-chip bg-lightgreen">
        <div
          className="h-full rounded-chip bg-forest"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute -top-[10px] w-[32px] h-[32px] rounded-full bg-forest border-4 border-white shadow-[0_2px_6px_rgba(0,0,0,0.25)] pointer-events-none"
          style={{
            left: `calc(${pct}% + ${(0.5 - pct / 100) * 32}px)`,
            transform: "translateX(-50%)",
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute -top-[14px] left-0 w-full h-[40px] opacity-0 cursor-pointer"
        />
      </div>
      <div className="flex justify-between text-[15px] text-graytext mt-[10px]">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}
