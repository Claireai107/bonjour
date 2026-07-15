// ============================================================================
// 본주르 예측 엔진 — DA 최종 로지스틱 회귀 모델을 앱 내부에서 그대로 실행.
// modelParams.ts(joblib에서 추출한 계수)로 sklearn predict_proba와 동일하게 계산한다.
// 화면(리포트/시뮬레이터)이 쓰는 공개 함수: predict / simulate / optimalControllables.
// ============================================================================

import type {
  SurveyAnswers,
  CheckupInputs,
  ModelUsed,
  FactorContribution,
  RiskGrade,
  PredictionResult,
} from "./types";
import { MODEL } from "./modelParams";

// 설문 근력운동 4단계(0~3) → 주당 대표 일수 (모델 BE5_1은 0~7 실제 일수)
const STRENGTH_CAT_TO_DAYS = [0, 1.5, 3.5, 6];

// 모델 변수 → 화면 표기(쉬운 말). 전문 변수명 노출 금지.
const VAR_LABEL: Record<string, string> = {
  age: "나이",
  LW_mp_a: "폐경 시기",
  LW_ms_a: "초경 시기",
  edu: "교육 수준",
  BD2: "음주 시작 시기",
  LW_pr_1: "출산 횟수",
  LW_wh: "여성호르몬제",
  BE5_1: "근력운동",
  HE_wt: "체중",
  HE_ht: "키",
  HE_BMI: "체질량지수",
  HE_ALP: "혈액 뼈 지표",
  HE_wc: "허리둘레",
  HE_PTH: "부갑상선호르몬",
  HE_fev1fvc: "폐 기능",
  HE_sbp: "혈압",
};

// 시뮬레이터에서 사용자가 바꿀 수 있는 변수
const CONTROLLABLE = new Set(["HE_wt", "HE_BMI", "BE5_1"]);

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

// 시뮬레이터 오버라이드: 체중(kg), 근력운동(일/주 0~7)
interface Override {
  weight?: number;
  strengthDays?: number; // 실제 일수(0~7)
}

// 설문/검진 입력 → 모델 16변수 원본값(누락은 undefined). 검진 표준화·단위변환 포함.
function toModelVars(
  a: SurveyAnswers,
  c: CheckupInputs,
  ov?: Override
): Record<string, number | undefined> {
  const weight = ov?.weight ?? c.weight ?? a.weight;
  const height = c.height ?? a.height;
  const bmi =
    weight != null && height != null
      ? weight / (height / 100) ** 2
      : undefined;
  const days =
    ov?.strengthDays != null
      ? ov.strengthDays
      : a.strengthDays != null
      ? STRENGTH_CAT_TO_DAYS[a.strengthDays]
      : undefined;
  const lwWh =
    a.hormone === "yes" ? 1 : a.hormone === "no" ? 2 : undefined;
  const mpAge =
    a.menopause === "yes" && a.menopauseAge != null
      ? a.menopauseAge
      : undefined;

  const raw: Record<string, number | undefined> = {
    age: a.age,
    LW_mp_a: mpAge,
    LW_ms_a: a.menarcheAge,
    edu: a.education,
    BD2: a.drinkStartAge === "none" ? undefined : a.drinkStartAge, // 비음주=미입력(학습 중앙값 대체)
    LW_pr_1: a.pregnancies,
    LW_wh: lwWh,
    BE5_1: days,
    HE_wt: weight,
    HE_ht: height,
    HE_BMI: bmi,
    HE_ALP: c.alp,
    HE_wc: c.waist,
    HE_PTH: c.pth,
    HE_fev1fvc: c.fev1fvc,
    HE_sbp: c.sbp,
  };

  // 검진표 원본 → 모델 형태 변환 (DA from_health_report와 동일)
  if (raw.HE_fev1fvc != null && raw.HE_fev1fvc > 1) {
    raw.HE_fev1fvc = raw.HE_fev1fvc / 100;
  }
  for (const k of ["HE_ALP", "HE_wc"] as const) {
    const base = MODEL.conv[k]?.기준;
    if (raw[k] != null && base) {
      raw[k] = (raw[k]! - base.mean) / (base.std || 1);
    }
  }
  return raw;
}

interface Contrib {
  key: string;
  contribution: number; // 로그오즈 기여 (양수=위험↑, 음수=보호). 선형모델이라 SHAP과 동치.
  provided: boolean; // 사용자가 실제 입력한 값인지
}

// 로짓 계산 + 변수별 기여도. sklearn: sigmoid(intercept + Σ coef·(x-mean)/scale)
function computeLogit(
  a: SurveyAnswers,
  c: CheckupInputs,
  ov?: Override
): { logit: number; contribs: Contrib[] } {
  const raw = toModelVars(a, c, ov);
  let logit = MODEL.intercept;
  const contribs: Contrib[] = [];
  MODEL.cols.forEach((col, i) => {
    const provided = raw[col] != null;
    const v = provided ? (raw[col] as number) : MODEL.medians[i];
    const z = (v - MODEL.scalerMean[i]) / MODEL.scalerScale[i];
    const contribution = MODEL.coef[i] * z;
    logit += contribution;
    contribs.push({ key: col, contribution, provided });
  });
  return { logit, contribs };
}

// 위험확률 → 100점 (위험 낮을수록 높은 점수). DA to_score와 동일.
function toBoneScore(p: number): number {
  return Math.round(100 * (1 - p));
}

// 위험확률 → 등급. DA: 0.34↑ 위험, 0.20↑ 주의. 앱 표기는 '높음'.
function gradeFromProb(p: number): RiskGrade {
  if (p >= MODEL.threshold) return "높음";
  if (p >= 0.2) return "주의";
  return "정상";
}

// 또래 대비 건강 상위 %. DA peer_percentile와 동일(연령대 분포에서 이진탐색).
function computePercentile(p: number, age?: number): number {
  const band =
    age == null ? "50대" : age < 50 ? "40대" : age < 60 ? "50대" : "60대";
  const dist = MODEL.peer[band] || [];
  if (dist.length === 0) return 50;
  // bisect_left
  let lo = 0,
    hi = dist.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (dist[mid] < p) lo = mid + 1;
    else hi = mid;
  }
  const higher = dist.length - lo; // 나보다 위험 높은 사람 수
  return Math.max(1, Math.min(99, Math.round((higher / dist.length) * 100)));
}

function hasCheckup(c: CheckupInputs): boolean {
  return (
    c.waist != null ||
    c.alp != null ||
    c.sbp != null ||
    c.pth != null ||
    c.fev1fvc != null
  );
}

// ============================================================================
// 메인 예측
// ============================================================================
export function predict(
  answers: SurveyAnswers,
  checkup: CheckupInputs = {}
): PredictionResult {
  const modelUsed: ModelUsed = hasCheckup(checkup) ? "C" : "B";

  const { logit, contribs } = computeLogit(answers, checkup);
  const p = sigmoid(logit);
  const boneScore = toBoneScore(p);
  const grade = gradeFromProb(p);
  const percentile = computePercentile(p, answers.age);

  // 사용자가 실제 입력한 변수만, 기여도 있는 것만 요인으로 노출
  const factors: FactorContribution[] = contribs
    .filter((x) => x.provided && Math.abs(x.contribution) > 0.03)
    .map((x) => ({
      key: x.key,
      label: VAR_LABEL[x.key] ?? x.key,
      contribution: x.contribution,
      controllable: CONTROLLABLE.has(x.key),
    }));

  const sorted = [...factors].sort(
    (u, v) => Math.abs(v.contribution) - Math.abs(u.contribution)
  );
  const riskFactors = sorted.filter((f) => f.contribution > 0).slice(0, 4);
  const protectiveFactors = sorted
    .filter((f) => f.contribution < 0)
    .slice(0, 3);

  // DiCE: 통제가능 변수 최적화 시 도달 가능 최선 점수
  const best = simulate(answers, checkup, optimalControllables(answers, checkup));
  const bestAchievableScore = Math.max(boneScore, best.boneScore);

  return {
    modelUsed,
    riskProbability: p,
    boneScore,
    grade,
    percentile,
    bestAchievableScore,
    riskFactors,
    protectiveFactors,
  };
}

// ============================================================================
// 시뮬레이터 (DiCE 유사): 통제가능 변수 값을 바꿔 위험확률 재계산
// ============================================================================
export interface ControllableState {
  weight?: number; // kg
  strengthDays?: number; // 실제 일수 0~7
}

export function simulate(
  answers: SurveyAnswers,
  checkup: CheckupInputs,
  ctrl: ControllableState
): { riskProbability: number; boneScore: number; grade: RiskGrade } {
  const { logit } = computeLogit(answers, checkup, {
    weight: ctrl.weight,
    strengthDays: ctrl.strengthDays,
  });
  const p = sigmoid(logit);
  const boneScore = toBoneScore(p);
  return { riskProbability: p, boneScore, grade: gradeFromProb(p) };
}

/** 통제가능 변수의 '현실적 최선' 목표값 (DiCE 최적해 근사, 안전 범위 내).
 *  체중·신장은 예측과 동일하게 검진 값 > 설문 값 우선. */
export function optimalControllables(
  a: SurveyAnswers,
  c: CheckupInputs = {}
): ControllableState {
  const base = c.weight ?? a.weight ?? 55;
  const height = c.height ?? a.height;
  // 저체중이 위험요인 → BMI 23 목표 체중, 단 현실적으로 +5kg 이내
  const bmiTarget =
    height != null ? (height / 100) ** 2 * 23 : base + 5;
  const targetWeight = Math.max(base, Math.min(bmiTarget, base + 5));
  return {
    weight: Math.round(targetWeight * 10) / 10,
    strengthDays: 6, // 주 6회(현실적 상한) — 시뮬레이터 슬라이더 도달 범위와 일치
  };
}
