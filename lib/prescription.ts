import type {
  PrescriptionRule,
  PrescriptionCard,
  PredictionResult,
  SurveyAnswers,
} from "./types";
import { VIDEOS } from "./videos";

// ============================================================
// 처방 규칙 R1~R9 (매핑테이블 시트 1). 룰 기반 추천.
// 모델은 "위험 변수"만 짚고, 운동 처방은 이 규칙(의학 가이드)이 담당.
// ============================================================

export const RULES: Record<string, PrescriptionRule> = {
  R1: {
    id: "R1",
    riskVariable: "근력운동 일수 적음",
    interpretation: "근력 부족 → 뼈 자극 부족",
    exerciseType: "저항성 근력운동",
    videoIds: ["type1", "type3"],
    dose: "15회 × 3세트 · 주 3회",
    purpose: "하체·전신 근력 강화",
    note: "입문자는 유형1(의자)부터",
  },
  R2: {
    id: "R2",
    riskVariable: "저체중 (체중·BMI 낮음)",
    interpretation: "근육량 부족 → 골밀도 방어 약함",
    exerciseType: "하체 대근육 강화",
    videoIds: ["type3"],
    dose: "20분 · 주 3회",
    purpose: "대근육량 확보·골밀도 보호",
    note: "체중 +2kg 목표와 병행",
  },
  R3: {
    id: "R3",
    riskVariable: "고령 + 골밀도 낮음",
    interpretation: "낙상 시 골절 위험 급증",
    exerciseType: "균형·안정성 운동",
    videoIds: ["type2"],
    dose: "10분 · 매일",
    purpose: "낙상·골절 예방",
    note: "보호자·짝과 함께 권장",
  },
  R4: {
    id: "R4",
    riskVariable: "허리둘레↑ / 코어 약함",
    interpretation: "척추 지지력 부족",
    exerciseType: "코어·자세 교정",
    videoIds: ["stretch1"],
    dose: "15분 · 주 3회",
    purpose: "척추 안정성·자세 교정",
  },
  R5: {
    id: "R5",
    riskVariable: "활동량 전반 부족",
    interpretation: "전신 저활동",
    exerciseType: "유산소 + 스트레칭",
    videoIds: ["walk", "stretch1"],
    dose: "30분 · 주 5회",
    purpose: "전신 활력·혈류·유연성",
  },
  R6: {
    id: "R6",
    riskVariable: "폐경 (에스트로겐 감소)",
    interpretation: "골 소실 가속",
    exerciseType: "체중부하 + 하체 근력",
    videoIds: ["type1", "type3", "walk"],
    dose: "걷기 30분/주5회 + 근력 주3회",
    purpose: "골 소실 속도 완화",
  },
  R7: {
    id: "R7",
    riskVariable: "낙상 위험 (균형 저하)",
    interpretation: "낙상 → 고관절 골절 직결",
    exerciseType: "균형 감각 훈련",
    videoIds: ["type2"],
    dose: "10~15분 · 주 3회",
    purpose: "낙상·골절 예방",
  },
  R8: {
    id: "R8",
    riskVariable: "유연성 저하",
    interpretation: "관절 가동범위 감소",
    exerciseType: "스트레칭",
    videoIds: ["stretch1", "stretch2", "stretch3"],
    dose: "10분 · 매일",
    purpose: "관절 유연성·부상 예방",
  },
  R9: {
    id: "R9",
    riskVariable: "전반 양호 (정상군)",
    interpretation: "현 상태 유지 필요",
    exerciseType: "유지관리 스트레칭",
    videoIds: ["stretch1", "stretch2"],
    dose: "10~20분 · 주 3회",
    purpose: "현 골 건강 유지",
    note: "\"지금처럼 유지하세요\" 카드",
  },
};

// 처방 헤드라인 & BonTip (부록 B-3 시나리오)
const CARD_COPY: Record<
  string,
  { headline: string; checklist: string[]; bonTip: string }
> = {
  R1: {
    headline: "운동을 조금만 늘려도 크게 좋아져요",
    checklist: ["하체 근력 루틴 · 주 3회", "앉았다 일어서기 10회 · 매일"],
    bonTip: "허벅지 근육이 뼈를 지켜줘요",
  },
  R2: {
    headline: "회원님껜 특히 하체 근력 운동이 필요해요",
    checklist: ["서서 하는 하체 근력 · 주 3회", "단백질 챙겨 드시기"],
    bonTip: "근육이 있어야 뼈도 튼튼해져요",
  },
  R3: {
    headline: "넘어지지 않는 몸을 만드는 게 중요해요",
    checklist: ["균형 감각 훈련 · 매일 10분", "한 발 서기 · 하루 3번"],
    bonTip: "골절의 시작은 넘어짐이에요",
  },
  R4: {
    headline: "허리를 받쳐주는 코어를 길러요",
    checklist: ["코어·자세 스트레칭 · 주 3회"],
    bonTip: "바른 자세가 척추를 지켜줘요",
  },
  R5: {
    headline: "몸을 자주 움직이는 게 시작이에요",
    checklist: ["빠르게 걷기 30분 · 주 5회", "짬짬이 스트레칭 · 매일"],
    bonTip: "가벼운 걷기부터 시작해요",
  },
  R6: {
    headline: "체중부하 운동으로 골 소실을 늦춰요",
    checklist: ["빠르게 걷기 · 주 5회", "하체 근력 · 주 3회"],
    bonTip: "걷기와 근력이 폐경 후 뼈를 지켜요",
  },
  R7: {
    headline: "균형 운동으로 낙상을 예방해요",
    checklist: ["균형운동 · 주 3회", "계단 오르기 병행"],
    bonTip: "균형이 좋아지면 덜 넘어져요",
  },
  R8: {
    headline: "몸을 부드럽게 풀어주는 스트레칭을 해요",
    checklist: ["짬짬이 스트레칭 · 매일 10분"],
    bonTip: "유연할수록 부상이 줄어요",
  },
  R9: {
    headline: "지금처럼 잘 유지하세요!",
    checklist: ["유지관리 스트레칭 · 주 3회"],
    bonTip: "좋은 습관을 계속 이어가요",
  },
};

/**
 * 예측 결과의 위험요인(SHAP 상위) → 처방 규칙 매칭.
 * 실제 사용자는 위험요인이 2~3개 겹치므로 규칙을 조합해 카드 2~3개 노출.
 */
export function buildPrescription(
  result: PredictionResult,
  answers: SurveyAnswers
): PrescriptionCard[] {
  const matched = new Set<string>();

  // 위험요인 상위부터 규칙에 매핑
  for (const f of result.riskFactors) {
    // f.key는 모델 변수명 (predict.ts 참고)
    switch (f.key) {
      case "BE5_1": // 근력운동 부족
        matched.add("R1");
        break;
      case "HE_wt": // 저체중
      case "HE_BMI":
        matched.add("R2");
        break;
      case "age": // 고령 + 위험 높으면 균형운동
        if (result.grade === "높음") matched.add("R3");
        else matched.add("R7");
        break;
      case "HE_wc": // 허리둘레
        matched.add("R4");
        break;
      case "LW_mp_a": // 폐경 시기
      case "LW_ms_a": // 초경 시기
        matched.add("R6");
        break;
      default:
        break;
    }
  }

  // 정상군이면 유지관리 카드
  if (result.grade === "정상" && matched.size === 0) {
    matched.add("R9");
  }
  // 아무 것도 안 잡히면 활동량 카드 기본 제공
  if (matched.size === 0) matched.add("R5");

  // 최대 3개 카드로 제한 (화면 과부하 방지)
  const ids = Array.from(matched).slice(0, 3);

  return ids.map((id) => {
    const rule = RULES[id];
    const copy = CARD_COPY[id];
    return {
      ruleId: id,
      headline: copy.headline,
      checklist: copy.checklist,
      videos: rule.videoIds.map((vid) => VIDEOS[vid]),
      bonTip: copy.bonTip,
    };
  });
}
