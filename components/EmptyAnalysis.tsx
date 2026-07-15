"use client";

import { useRouter } from "next/navigation";
import Boni from "./Boni";
import { useBonJour } from "@/lib/store";

// 분석 결과가 없을 때 공용 빈 상태 — 홈·AI 루틴·리포트 공통.
// 문구·동작은 홈의 기존 빈 상태와 동일 (reset 후 온보딩으로).
export default function EmptyAnalysis() {
  const router = useRouter();
  const reset = useBonJour((s) => s.reset);
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <Boni pose="point" size={130} />
      <p className="mt-6 text-[22px] font-bold text-charcoal">
        아직 측정한 데이터가 없어요
      </p>
      <p className="mt-2 text-[16px] text-graytext leading-[1.55]">
        30초 설문이면 내 뼈 건강을
        <br />
        확인할 수 있어요
      </p>
      <button
        onClick={() => {
          reset();
          router.push("/onboarding"); // 음성/손 입력 방식 선택으로
        }}
        className="btn-primary mt-8"
      >
        AI 뼈건강 분석 시작
      </button>
    </div>
  );
}
