"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Boni from "@/components/Boni";
import TabBar from "@/components/TabBar";
import { useBonJour } from "@/lib/store";

// 분석 단계 — 디자인(5 AI분석): 완료=그린 체크, 진행 중=흰 원 + "…중" 라벨
const STAGES = ["데이터 확인", "위험 요인 분석", "리포트 생성"];

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

const TOTAL_MS = 2900; // 전체 분석 연출 시간

export default function AnalysisScreen() {
  const router = useRouter();
  const runAnalysis = useBonJour((s) => s.runAnalysis);
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0); // 0~100, 링이 점점 채워짐
  const analysisStarted = useRef(false);

  useEffect(() => {
    // React Strict Mode가 개발 환경에서 effect를 재실행해도 이력은 1건만 저장
    if (!analysisStarted.current) {
      analysisStarted.current = true;
      runAnalysis();
    }
    const start = Date.now();
    const tick = setInterval(() => {
      setProgress(Math.min(100, ((Date.now() - start) / TOTAL_MS) * 100));
    }, 50);
    const timers = [
      setTimeout(() => setStage(1), 700),
      setTimeout(() => setStage(2), 1500),
      setTimeout(() => setStage(3), 2300),
      setTimeout(() => router.replace("/report"), TOTAL_MS),
    ];
    return () => {
      clearInterval(tick);
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 진행 링 — 12시부터 시계 방향으로 호가 점점 길어진다
  const R = 96;
  const CIRC = 2 * Math.PI * R;

  return (
    <div className="h-dvh bg-ivory flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-gutter">
      {/* 본이 + 진행 링 */}
      <div className="relative w-[170px] h-[170px] rounded-full bg-lightgreen flex items-center justify-center">
        <Boni pose="think" size={122} />
        <svg
          viewBox="0 0 200 200"
          className="absolute -inset-[15px] w-[200px] h-[200px] -rotate-90"
          aria-hidden
        >
          <circle
            cx="100"
            cy="100"
            r={R}
            fill="none"
            stroke="#E8F0E3"
            strokeWidth="4"
          />
          <circle
            cx="100"
            cy="100"
            r={R}
            fill="none"
            stroke="#3E7A4E"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - progress / 100)}
            style={{ transition: "stroke-dashoffset 80ms linear" }}
          />
        </svg>
      </div>

      <h1 className="mt-10 text-[24px] font-bold text-charcoal text-center leading-[1.45]">
        본이가 뼈 건강을
        <br />
        분석하고 있어요
      </h1>

      <div className="mt-9 flex flex-col gap-[14px] w-full max-w-[300px]">
        {STAGES.map((s, i) => {
          const done = stage > i;
          const active = stage === i;
          return (
            <div key={s} className="flex items-center gap-3">
              {done ? (
                <div className="w-8 h-8 rounded-full bg-forest flex items-center justify-center flex-none">
                  <CheckIcon />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-white border-2 border-borderline box-border flex-none" />
              )}
              <span
                className={`text-[18px] font-medium ${
                  done ? "text-charcoal" : "text-graytext"
                }`}
              >
                {active ? `${s} 중…` : s}
              </span>
            </div>
          );
        })}
      </div>
      </div>
      <TabBar />
    </div>
  );
}
