import type { FactorContribution } from "@/lib/types";

// 위험 요인 막대 — 디자인(6 AI리포트 · 왜 이런가요).
// 라벨 + 영향 태그(큼/중간) + 12px 트랙(#F0EEE6) 위 채움 막대.
// 막대 길이 = 영향도(절대값) 비율. 전문용어(SHAP) 노출 금지.
export default function FactorBar({
  factor,
  maxAbs,
}: {
  factor: FactorContribution;
  maxAbs: number;
}) {
  const ratio = Math.abs(factor.contribution) / maxAbs;
  const width = Math.max(12, Math.round(ratio * 100));
  const major = ratio >= 0.7; // 영향 큼 / 중간

  return (
    <div>
      <div className="flex justify-between text-[16px] font-medium text-charcoal mb-[5px]">
        <span>{factor.label}</span>
        {major ? (
          <span className="font-bold text-forest">영향 큼</span>
        ) : (
          <span className="text-graytext">영향 중간</span>
        )}
      </div>
      <div className="h-3 rounded-chip bg-[#F0EEE6]">
        <div
          className="h-full rounded-chip"
          style={{
            width: `${width}%`,
            backgroundColor: major ? "#3E7A4E" : "#A5C9AB",
          }}
        />
      </div>
    </div>
  );
}
