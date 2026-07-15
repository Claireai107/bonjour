import type { RiskGrade } from "@/lib/types";

// Bone Score 원형 게이지 — 디자인(6 AI리포트 · 핵심 요약).
// 110px SVG(viewBox 120), 트랙 연그린, 진행 호 = 등급색, 점수 텍스트 내장.
const gradeColor: Record<RiskGrade, string> = {
  정상: "#3E7A4E",
  주의: "#D9A441",
  높음: "#C7503A",
};

export default function BoneScoreGauge({
  score,
  grade,
  size = 110,
}: {
  score: number;
  grade: RiskGrade;
  size?: number;
}) {
  const color = gradeColor[grade];
  const c = 2 * Math.PI * 50; // ≈ 314
  const pct = Math.max(0, Math.min(100, score)) / 100;

  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="50" fill="none" stroke="#E8F0E3" strokeWidth="12" />
      <circle
        cx="60"
        cy="60"
        r="50"
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${Math.round(pct * c)} ${Math.ceil(c)}`}
        transform="rotate(-90 60 60)"
      />
      <text
        x="60"
        y="58"
        textAnchor="middle"
        fontSize="34"
        fontWeight="700"
        fill={color}
        fontFamily="Noto Sans KR"
      >
        {score}
      </text>
      <text
        x="60"
        y="80"
        textAnchor="middle"
        fontSize="14"
        fill="#6B6B6B"
        fontFamily="Noto Sans KR"
      >
        / 100점
      </text>
    </svg>
  );
}
