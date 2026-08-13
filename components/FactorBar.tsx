import type { FactorContribution } from "@/lib/types";

/**
 * 위험·보호 요인 막대 (0을 가운데 두고 좌우로 뻗는다)
 *
 * 1차 UT에서 P1이 '영향 중간', '긍정 요인' 같은 표현의 뜻을 물었고,
 * "위협 주요 요인이 한눈에 들어오지 않는다"를 가장 불편한 점으로 꼽았다.
 * 개선 요청에서 부정-0-긍정 막대형을 직접 제안했고, 그대로 반영했다.
 *
 * 왼쪽(빨강) = 점수를 낮춘 항목, 오른쪽(초록) = 점수를 올려준 항목.
 * 'SHAP', '기여도' 같은 말은 화면에 쓰지 않는다.
 */
export default function FactorBar({
  factor,
  maxAbs,
}: {
  factor: FactorContribution;
  maxAbs: number;
}) {
  // contribution > 0 이면 위험을 키운 쪽 = 점수를 낮춘 항목
  const lowers = factor.contribution > 0;
  const ratio = maxAbs > 0 ? Math.abs(factor.contribution) / maxAbs : 0;
  const width = Math.max(6, Math.round(ratio * 50)); // 한쪽 최대 50%

  // 점수로 환산해 보여준다 — 숫자가 있어야 "얼마나"가 전달된다
  const points = Math.max(1, Math.round(Math.abs(factor.contribution) * 100));

  return (
    <div>
      {/* 글자가 커져 한 줄에 안 들어가면 라벨과 값이 각각 온전한 채로 줄이 나뉜다 */}
      <div className="flex flex-wrap justify-between items-baseline gap-x-2 text-[length:calc(16px*var(--ts))] mb-[6px]">
        <span className="font-medium text-charcoal whitespace-nowrap">
          {factor.label}
        </span>
        <span
          className="font-bold whitespace-nowrap ml-auto"
          style={{ color: lowers ? "#C7503A" : "#3E7A4E" }}
        >
          점수를 {points}점 {lowers ? "낮췄어요" : "올렸어요"}
        </span>
      </div>

      {/* 가운데 0 기준선, 좌우로 뻗는 막대 */}
      <div className="relative h-3 rounded-chip bg-[#F0EEE6]">
        <div
          className="absolute top-0 h-full rounded-chip transition-all"
          style={
            lowers
              ? { right: "50%", width: `${width}%`, backgroundColor: "#C7503A" }
              : { left: "50%", width: `${width}%`, backgroundColor: "#3E7A4E" }
          }
        />
        {/* 0 표시 */}
        <div className="absolute left-1/2 top-[-3px] h-[18px] w-[2px] -translate-x-1/2 bg-borderline" />
      </div>
    </div>
  );
}

/** 막대 위에 한 번만 붙이는 좌우 안내 (항목마다 반복하지 않는다) */
export function FactorBarLegend() {
  // 글자가 커져 한 줄에 안 들어가면 문구가 뒤엉키지 않게
  // 각 문구는 통째로 유지하고(줄바꿈 금지) 두 줄로 나눠 떨어지게 한다
  return (
    <div className="mt-1 flex flex-wrap justify-between gap-x-3 text-[length:calc(15px*var(--ts))] text-graytext">
      <span className="whitespace-nowrap">← 점수를 낮춘 항목</span>
      <span className="whitespace-nowrap ml-auto">점수를 올려준 항목 →</span>
    </div>
  );
}
