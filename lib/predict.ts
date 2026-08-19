// ============================================================
// 예측 엔진 — 데이터팀 재분석 최종판 (2026-08-20 인계)
//
// 데이터팀 bonjour_backend.py 를 그대로 TS로 옮긴 것.
// 회귀 테스트(tests/newModel.test.mjs)가 파이썬 출력과 수치 일치를 검증한다.
//
// v1(08-17) 대비 바뀐 것 (개발서버/개발팀_인계_2026-08-18/변경사항_안내.md):
//   · 3트랙 — 폐경전(신설, AUROC 0.888) / 설문11 / 전체16, 내부 자동 선택
//   · 폐경후경과(나이-폐경연령) 파생 변수 — 폐경연령 입력이 실제로 반영된다
//   · 점수·등급이 트랙 공통 기준 — 트랙 경계에서 점수가 튀지 않는다
//     (점수: 전 트랙 공통 분포 백분위 / 등급: 절대 확률 주의 0.15·위험 0.35)
//   · 적용 대상 관문 — 만 20~89세 여성만. 그 외에는 안내만 (분기 화면 없음)
//   · 또래 비교 6개 밴드(20대~70대이상) + 표본 30명 미만이면 순위를 말하지 않음
//   · normalize — 문자열·범위 밖 값을 계산 전에 정리
//
// 최종판(08-20)에서 바뀐 것:
//   · 확률 보정 isotonic → Platt(sigmoid) — isotonic이 저위험자를 확률 0에 뭉쳐
//     전원 99점·슬라이더 무반응을 만들던 버그의 근본 수정 (인계 문서 §12)
//   · 백분위 동점은 중간 순위로 — bisect_left 단독의 맨앞 순위 부여 방지
//   · 파라미터는 데이터팀 JS_모델파라미터.json 그대로 (파이썬과 오차 0, 400건 검증)
// ============================================================

import MODEL from "./model/newModelParams";
import type {
  CheckupInputs,
  FactorContribution,
  PredictionResult,
  RiskGrade,
  SurveyAnswers,
} from "./types";

export type TrackName = "설문11" | "전체16" | "폐경전";

type UserRecord = Record<string, number | string | null>;
type NumRecord = Record<string, number | null>;

interface Fold {
  imputerMedian: number[];
  scalerMean: number[];
  scalerScale: number[];
  coef: number[];
  intercept: number;
  plattA: number;
  plattB: number;
}

interface Track {
  cols: string[];
  medians: Record<string, number>;
  folds: Fold[];
}

const RAW = MODEL as unknown as {
  등급_경계_공통: { 주의: number; 위험: number };
  점수기준_공통분포: number[];
  연도내표준화_기준_2024: Record<string, { mean: number; std: number }>;
  트랙: Record<string, Track>;
  또래분포_2024기준: Record<string, Record<string, { 분포: number[]; n: number }>>;
};

const M = {
  gradeCuts: RAW.등급_경계_공통,
  scoreRef: RAW.점수기준_공통분포,
  checkupOnly: ["alp", "wc", "pth", "fev1fvc", "sbp"],
  yearStdTargets: Object.keys(RAW.연도내표준화_기준_2024),
  yearStdRef: RAW.연도내표준화_기준_2024,
  tracks: RAW.트랙,
  peerDist: RAW.또래분포_2024기준,
};

// ── 입력 정리 (normalize) — 문자열·불가능한 값을 계산 전에 걸러낸다 ──────
const NUMERIC = new Set([
  "age", "wt", "ht", "meno_age", "mens_age", "edu", "preg_n",
  "hormone", "exercise", "drink_ever", "drink_age",
  "alp", "wc", "pth", "fev1fvc", "sbp",
]);

// 사람 몸으로 가능한 범위. 벗어나면 잘못 입력한 것으로 보고 결측 처리.
// 검진 3종은 원본값과 표준화값(±6)을 모두 받는다.
const PLAUSIBLE: Record<string, [number, number]> = {
  age: [18, 110], wt: [25, 200], ht: [120, 210],
  meno_age: [20, 70], mens_age: [8, 25], edu: [1, 4],
  preg_n: [0, 25], hormone: [0, 1], exercise: [0, 7],
  drink_ever: [0, 1], drink_age: [5, 90],
  alp: [-6, 2000], wc: [-6, 180], pth: [-6, 1500],
  fev1fvc: [0.1, 1.5], sbp: [50, 300],
};

export function normalize(user: UserRecord): NumRecord & { sex?: string | null } {
  const out: Record<string, number | string | null> = {};
  for (const [k, v0] of Object.entries(user ?? {})) {
    if (!NUMERIC.has(k)) {
      out[k] = v0;
      continue;
    }
    let v: number | null = null;
    if (v0 == null) v = null;
    else if (typeof v0 === "string") {
      const t = v0.trim().replace(/,/g, "");
      if (["", "null", "None", "없음", "모름", "-"].includes(t)) v = null;
      else {
        const num = parseFloat(t.replace(/[^0-9.\-]/g, ""));
        v = Number.isFinite(num) ? num : null;
      }
    } else {
      v = Number.isFinite(v0) ? v0 : null;
    }
    if (v != null) {
      const [lo, hi] = PLAUSIBLE[k] ?? [-1e9, 1e9];
      if (v < lo || v > hi) v = null;
    }
    out[k] = v;
  }
  return out as NumRecord & { sex?: string | null };
}

// ── 적용 대상 관문 — 만 20~89세 여성. 그 밖에는 숫자를 만들지 않는다 ─────
export interface Eligibility {
  applicable: boolean;
  reason: "성별" | "나이없음" | "나이범위" | "폐경연령오류" | null;
  text: string;
}

export function checkEligible(raw: UserRecord): Eligibility {
  const u = normalize(raw);
  const age = u.age as number | null;
  const meno = u.meno_age as number | null;
  const sex = (u as { sex?: string | null }).sex ?? null;

  if (sex != null && sex !== "여") {
    return {
      applicable: false,
      reason: "성별",
      text: "이 검사는 여성의 뼈 건강을 보는 도구예요.",
    };
  }
  if (age == null) {
    return {
      applicable: false,
      reason: "나이없음",
      text: "나이를 알려주시면 결과를 보여드릴 수 있어요.",
    };
  }
  if (age < 20) {
    return {
      applicable: false,
      reason: "나이범위",
      text: "이 검사는 만 20세부터 봐드릴 수 있어요.",
    };
  }
  if (age > 89) {
    return {
      applicable: false,
      reason: "나이범위",
      text:
        "90세가 넘으시면 위험도를 따지기보다 병원에서 뼈 검사를 직접 받아보시는 게 좋아요. 나이만으로도 검사 대상이십니다.",
    };
  }
  if (meno != null && meno > age) {
    return {
      applicable: false,
      reason: "폐경연령오류",
      text: "폐경 나이가 지금 나이보다 많아요. 다시 확인해 주세요.",
    };
  }
  return { applicable: true, reason: null, text: "" };
}

// ── 파생값 (_derive) ─────────────────────────────────────────────────────
// ① 폐경후경과 = 나이 − 폐경연령 (모델 학습 변수 — 안 채우면 폐경연령이 무시된다)
// ② 검진 3종이 원본값(|v|>6)으로 들어오면 여기서 표준화 (정식 경로를 안 거쳐도 안전)
const RAW_CUT = 6.0;

function derive(u: NumRecord): NumRecord {
  const out: NumRecord = { ...u };
  const age = out.age;
  const meno = out.meno_age;
  if (out["폐경후경과"] == null && age != null && meno != null) {
    out["폐경후경과"] = Math.max(0, age - meno);
  }
  if (out.fev1fvc != null && out.fev1fvc > 1) out.fev1fvc = out.fev1fvc / 100;
  for (const k of M.yearStdTargets) {
    const v = out[k];
    if (v != null && Math.abs(v) > RAW_CUT && M.yearStdRef[k]) {
      const { mean, std } = M.yearStdRef[k];
      out[k] = (v - mean) / (std || 1);
    }
  }
  return out;
}

// ── 트랙 선택 ────────────────────────────────────────────────────────────
//   폐경 전(폐경연령 없음) → 폐경전 / 폐경 후 + 검진값 → 전체16 / 그 외 → 설문11
export function chooseTrack(u: NumRecord): TrackName {
  if (u.meno_age == null) return "폐경전";
  return M.checkupOnly.some((k) => u[k] != null) ? "전체16" : "설문11";
}

// ── 확률: 5-fold Platt 보정 분류기 (계산순서는 JS_모델파라미터.json 그대로) ──
//   z = (x - scalerMean) / scalerScale
//   f = intercept + z·coef
//   p = 1 / (1 + exp(A·f + B)) — Platt(sigmoid). isotonic처럼 확률 0을 만들지 않는다
//   5폴드 평균
function probability(u0: NumRecord, track: TrackName): number {
  const T = M.tracks[track];
  const u = derive(u0);
  const row = T.cols.map((f) => (u[f] == null ? T.medians[f] : (u[f] as number)));
  let sum = 0;
  for (const fold of T.folds) {
    let f = fold.intercept;
    for (let i = 0; i < row.length; i++) {
      const x = (row[i] - fold.scalerMean[i]) / (fold.scalerScale[i] || 1);
      f += fold.coef[i] * x;
    }
    sum += 1 / (1 + Math.exp(fold.plattA * f + fold.plattB));
  }
  return sum / T.folds.length;
}

// ── 등급 — 트랙 공통 절대 확률 기준 (주의 0.15 / 위험 0.35) ──────────────
// '검사를 권할지'는 실제 위험이 정해야지, 같은 트랙 안에서의 순위가 정할 일이 아니다.
const GRADE_TEXT: Record<RiskGrade, { 한마디: string; 안내: string }> = {
  위험: {
    한마디: "뼈 검사를 한번 받아보세요",
    안내:
      "뼈가 약해져 있을 수 있어요. 병원에서 뼈 검사(골밀도 검사)를 받아보시길 권해요. 보건소나 동네 병원에서 받을 수 있어요.",
  },
  주의: {
    한마디: "아직 괜찮지만 신경 써주세요",
    안내:
      "지금 당장 걱정할 정도는 아니에요. 다만 뼈는 조용히 약해지니까, 1년 안에 뼈 검사를 한 번 받아보시면 좋아요.",
  },
  안심: {
    한마디: "지금처럼만 하시면 돼요",
    안내:
      "뼈 건강이 또래보다 좋은 편이에요. 지금 하시는 대로 유지하시고, 건강검진 받으실 때 한 번씩 확인해 보세요.",
  },
};

// 폐경 전은 유병률이 6%로 낮다 — 지금 결과보다 '앞으로'가 중요하다.
const PRE_MENO_NOTE =
  " 폐경 후 5~10년이 뼈가 가장 빨리 약해지는 시기예요. 지금 챙겨두시면 그때 큰 차이가 납니다.";

function gradeOf(p: number): RiskGrade {
  return p >= M.gradeCuts.위험 ? "위험" : p >= M.gradeCuts.주의 ? "주의" : "안심";
}

function 사람수로(p: number): string {
  const n = Math.round(p * 10);
  if (n <= 0) return "10명 중 1명이 안 돼요";
  if (n >= 10) return "10명 중 9명이 넘어요";
  return `10명 중 ${n}명 정도예요`;
}

function 몇명(p: number): string {
  const n = Math.min(9, Math.max(1, Math.round(p * 10)));
  return `10명 중 ${n}명`;
}

// ── 점수 — 트랙 공통 분포 백분위 (높을수록 좋음) ─────────────────────────
// 또래별 순위로 매기면 밴드 경계에서 점수가 튄다. 전체 분포 기준이라
// 확률이 오르면 점수는 반드시 내려간다 — 트랙이 바뀌어도.
// 기준 분포에서 p의 백분위. 동점은 중간 순위 — bisect_left만 쓰면
// 동점 그룹 전원이 그룹 맨 앞 순위를 받는다 (§12에서 98명 전원 99점의 한 원인)
function pctileOf(dist: number[], p: number): number {
  let lo = 0;
  let hi = dist.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (dist[mid] < p) lo = mid + 1;
    else hi = mid;
  }
  let hi2 = dist.length;
  let lo2 = lo;
  while (lo2 < hi2) {
    const mid = (lo2 + hi2) >> 1;
    if (dist[mid] <= p) lo2 = mid + 1;
    else hi2 = mid;
  }
  return ((lo + lo2) / 2 / dist.length) * 100; // 0=가장 안전 … 100=가장 위험
}

function scoreOf(p: number): number {
  const dist = M.scoreRef;
  if (!dist.length) return 50;
  return Math.round(Math.max(1, Math.min(99, 100 - pctileOf(dist, p))));
}

// ── 또래 비교 — 2024년 같은 연령대 (표본 30명 미만이면 순위를 말하지 않는다) ──
export interface PeerResult {
  band: string;
  n: number;
  reliable: boolean;
  /** 위험도 백분위: 0=또래 중 가장 안전, 100=가장 위험 */
  riskPercentile: number | null;
  text: string;
}

function peer(u: NumRecord, track: TrackName): PeerResult {
  const p = probability(u, track);
  const age = (u.age as number) ?? 60;
  const band =
    age < 30 ? "20대" : age < 40 ? "30대" : age < 50 ? "40대"
    : age < 60 ? "50대" : age < 70 ? "60대" : "70대이상";
  const spec = M.peerDist[track]?.[band];
  const dist = spec?.분포 ?? [];
  const n = spec?.n ?? 0;
  const MIN_N = 30;
  if (n < MIN_N) {
    return {
      band, n, reliable: false, riskPercentile: null,
      text: `${band} 또래와 비교할 자료가 아직 충분하지 않아요. 점수와 아래 안내를 봐주세요.`,
    };
  }
  const pctile = Math.round(pctileOf(dist, p));
  return {
    band, n, reliable: true, riskPercentile: pctile,
    text: `${band} 여성 100명이 있다면, 그중 ${pctile}명이 회원님보다 뼈가 튼튼해요.`,
  };
}

// ── 기여도 표시(리포트 '왜 이런가요') — 설명용, 처방 근거 아님 ────────────
const FACTOR_LABELS: Record<string, string> = {
  age: "나이",
  폐경후경과: "폐경 후 지난 기간",
  meno_age: "폐경 나이",
  mens_age: "초경 나이",
  edu: "교육 수준",
  drink_ever: "음주 경험",
  drink_age: "음주 시작 나이",
  preg_n: "임신 횟수",
  hormone: "여성호르몬제",
  exercise: "근력운동",
  wt: "체중",
  ht: "신장",
  alp: "알칼리성 인산분해효소",
  wc: "허리둘레",
  pth: "부갑상선호르몬",
  fev1fvc: "폐기능",
  sbp: "수축기 혈압",
};
const CONTROLLABLE = new Set(["wt", "exercise"]);

function contributions(u0: NumRecord, track: TrackName): FactorContribution[] {
  const T = M.tracks[track];
  const u = derive(u0);
  const myScore = scoreOf(probability(u, track));
  const out: FactorContribution[] = [];
  for (const f of T.cols) {
    if (u[f] == null) continue; // 실제로 입력한 값만 설명한다
    if (f === "폐경후경과") continue; // meno_age에서 파생 — 별도 요인으로 세지 않는다
    // "이 값이 또래 평균(학습 중앙값)이었다면 점수가 몇 점이었을까"와의 차이.
    // 계수x표준화값(로짓)을 그대로 x100 하면 '190점' 같은 값이 나온다 —
    // 화면의 '점수를 N점 낮췄어요'는 실제 점수 눈금으로 말해야 한다.
    const scoreIfMedian = scoreOf(
      probability(
        f === "meno_age" ? { ...u, [f]: null, 폐경후경과: null } : { ...u, [f]: null },
        track
      )
    );
    const delta = scoreIfMedian - myScore; // >0 = 이 값 때문에 점수가 깎였다(위험)
    if (delta === 0) continue; // 점수 눈금에서 차이가 없으면 말하지 않는다
    out.push({
      key: f,
      label: FACTOR_LABELS[f] ?? f,
      contribution: delta / 100, // FactorBar가 x100 해서 'N점'으로 표기
      controllable: CONTROLLABLE.has(f),
    });
  }
  return out.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

// ── 앱 입력 → 백엔드 계약 ────────────────────────────────────────────────
const STRENGTH_TO_DAYS = [0, 1.5, 3.5, 6] as const;

export function toUser(a: SurveyAnswers, c: CheckupInputs = {}): NumRecord {
  const drink =
    a.drinkStartAge == null
      ? { ever: null, age: null }
      : a.drinkStartAge === "none" || a.drinkStartAge <= 0
      ? { ever: 0, age: null } // 비음주 — 중앙값으로 채우지 않는다
      : { ever: 1, age: a.drinkStartAge };

  const u: UserRecord = {
    age: a.age ?? null,
    sex: a.sex ?? null, // 프로필 성별 (여/남) — 관문 검사용
    wt: c.weight ?? a.weight ?? null,
    ht: c.height ?? a.height ?? null,
    // 폐경 '예'일 때만 폐경연령 — 없으면 폐경전 트랙으로 간다
    meno_age: a.menopause === "yes" ? a.menopauseAge ?? null : null,
    mens_age: a.menarcheAge ?? null,
    edu: a.education ?? null,
    drink_ever: drink.ever,
    drink_age: drink.age,
    preg_n: a.pregnancies ?? null,
    hormone: a.hormone === "yes" ? 1 : a.hormone === "no" ? 0 : null,
    exercise:
      a.strengthDays == null ? null : STRENGTH_TO_DAYS[a.strengthDays] ?? null,
    // 검진표 원본값 그대로 — derive()가 표준화한다 (pth 포함, 폐기능 % 변환)
    alp: c.alp ?? null,
    wc: c.waist ?? null,
    pth: c.pth ?? null,
    fev1fvc: c.fev1fvc ?? null,
    sbp: c.sbp ?? null,
  };
  return normalize(u);
}

// ── 메인: 화면이 쓰는 예측 결과 ──────────────────────────────────────────
export function predict(
  answers: SurveyAnswers,
  checkup: CheckupInputs = {}
): PredictionResult {
  const u = toUser(answers, checkup);
  const ok = checkEligible(u);
  if (!ok.applicable) {
    // 만 20~89세 여성이 아니면 숫자를 만들지 않는다 — 안내만
    return {
      applicable: false,
      reason: ok.reason,
      modelUsed: "B",
      track: "설문11",
      riskProbability: 0,
      boneScore: 0,
      grade: "안심",
      percentile: 50,
      peerText: "",
      comment: "결과를 보여드릴 수 없어요",
      guidance: ok.text,
      easyExplain: "",
      needsExam: false,
      bestAchievableScore: 0,
      riskFactors: [],
      protectiveFactors: [],
    };
  }

  const track = chooseTrack(u);
  const p = probability(u, track);
  const grade = gradeOf(p);
  const pr = peer(u, track);
  const score = scoreOf(p);
  const all = contributions(u, track);

  let guidance = GRADE_TEXT[grade].안내;
  if (track === "폐경전") guidance += PRE_MENO_NOTE;

  // '앞으로' 카드: 근력운동 주 3회(지침 권고치) 기준 도달 가능 점수
  const pBetter = probability(
    { ...u, exercise: Math.max((u.exercise as number) ?? 0, 3) },
    track
  );
  const bestScore = scoreOf(pBetter);

  return {
    applicable: true,
    reason: null,
    modelUsed: track === "전체16" ? "C" : "B",
    track,
    riskProbability: Math.round(p * 1000) / 1000,
    boneScore: score,
    grade,
    // 기존 규약(클수록 건강)의 마커 위치 — 공통 분포 기준 점수와 동일
    percentile: score,
    peerText: pr.text,
    peerReliable: pr.reliable,
    comment: GRADE_TEXT[grade].한마디,
    guidance,
    easyExplain: `회원님과 비슷한 분들 중에 뼈가 약한 분이 ${사람수로(p)}.`,
    needsExam: grade === "위험",
    bestAchievableScore: Math.max(bestScore, score),
    riskFactors: all.filter((f) => f.contribution > 0),
    protectiveFactors: all.filter((f) => f.contribution < 0),
  };
}

// ── What-if (시뮬레이터) ─────────────────────────────────────────────────
export interface ControllableState {
  weight?: number;
  strengthDays?: number; // 실제 일수 0~7
}

export function simulate(
  answers: SurveyAnswers,
  checkup: CheckupInputs = {},
  target: ControllableState = {}
): { boneScore: number; grade: RiskGrade; riskProbability: number } {
  const u = toUser(answers, checkup);
  const track = chooseTrack(u);
  if (target.weight != null) u.wt = target.weight;
  if (target.strengthDays != null) u.exercise = target.strengthDays;
  const p = probability(u, track);
  return {
    boneScore: scoreOf(p),
    grade: gradeOf(p),
    riskProbability: Math.round(p * 1000) / 1000,
  };
}

/** 현실적 목표: 근력운동 주 3회(지침 권고치). 체중은 조정 대상이 아니다. */
export function optimalControllables(
  a: SurveyAnswers,
  c: CheckupInputs = {}
): ControllableState {
  const u = toUser(a, c);
  return {
    weight: (u.wt as number) ?? undefined,
    strengthDays: Math.max((u.exercise as number) ?? 0, 3),
  };
}

// ── 체중 민감도 — "지금 체중을 지키세요" ─────────────────────────────────
export interface WeightSensitivity {
  available: boolean;
  summary: string;
  caution: string;
  curve: { weight: number; delta: number; risk: number; grade: RiskGrade }[];
}

export function weightSensitivity(
  answers: SurveyAnswers,
  checkup: CheckupInputs = {}
): WeightSensitivity {
  const u = toUser(answers, checkup);
  const wt = u.wt as number | null;
  if (wt == null) {
    return {
      available: false,
      summary: "몸무게를 입력하시면 알려드릴 수 있어요.",
      caution: "",
      curve: [],
    };
  }
  const track = chooseTrack(u);
  const baseP = probability(u, track);
  const curve: WeightSensitivity["curve"] = [];
  for (let delta = -8; delta <= 4; delta += 1) {
    const w = Math.round((wt + delta) * 10) / 10;
    if (w < 30) continue;
    const p = probability({ ...u, wt: w }, track);
    curve.push({
      weight: w,
      delta,
      risk: Math.round(p * 1000) / 1000,
      grade: gradeOf(p),
    });
  }
  const drop5 = curve.find((c) => c.delta === -5);
  return {
    available: true,
    summary: drop5
      ? `지금 몸무게를 지켜주세요. 5kg 빠지면 뼈가 약한 분이 ${몇명(
          baseP
        )}에서 ${몇명(drop5.risk)}으로 늘어나요.`
      : "지금 몸무게를 지켜주세요.",
    caution: "일부러 살을 찌우시라는 말이 아니에요. 지금을 지키시라는 뜻이에요.",
    curve,
  };
}

// ── 행동 처방 — 모델기반 + 지침기반 ─────────────────────────────────────
export interface ModelAction {
  item: string;
  kind: "유지" | "회복" | "증가";
  oneLine: string;
  message: string;
  caution?: string;
}

export interface GuidelineCard {
  item: string;
  oneLine: string;
  how: string;
  why: string;
}

export const GUIDELINE_CARDS: GuidelineCard[] = [
  {
    item: "칼슘 챙겨 먹기",
    oneLine: "하루에 우유 두세 잔 정도",
    how: "우유·두유 한 잔, 두부 반 모, 멸치나 뱅어포 한 줌, 시금치·깻잎",
    why: "칼슘은 뼈를 만드는 재료예요. 부족하면 몸이 뼈에서 꺼내 씁니다.",
  },
  {
    item: "햇볕 쬐기",
    oneLine: "하루 15분, 팔다리에 햇볕",
    how: "점심때 잠깐 산책 · 고등어·꽁치 같은 생선 · 달걀노른자 · 말린 표고버섯",
    why: "햇볕을 쬐면 몸이 비타민D를 만들어요. 이게 있어야 칼슘이 뼈로 갑니다.",
  },
  {
    item: "근육 쓰는 운동",
    oneLine: "일주일에 두세 번",
    how: "의자에 앉았다 일어서기 10번 · 벽 짚고 팔굽혀펴기 · 가벼운 아령이나 고무밴드",
    why: "뼈는 힘을 받아야 튼튼해져요. 걷기만으로는 조금 부족합니다.",
  },
  {
    item: "담배 끊고 술 줄이기",
    oneLine: "담배는 끊고, 술은 일주일에 두 번까지",
    how: "",
    why: "담배와 술은 뼈를 만드는 일을 방해해요.",
  },
  {
    item: "넘어지지 않게",
    oneLine: "집 안 미끄러운 곳부터 정리",
    how: "욕실 미끄럼 방지 매트 · 밤에 화장실 갈 때 켜지는 작은 등 · 바닥 전선 정리",
    why: "뼈가 약해도 넘어지지 않으면 부러지지 않아요.",
  },
];

export interface Recommendations {
  modelTitle: string;
  guidelineTitle: string;
  modelBased: ModelAction[];
  guideline: GuidelineCard[];
  intro: string;
  disclosure: string;
}

export function recommendActions(
  answers: SurveyAnswers,
  checkup: CheckupInputs = {}
): Recommendations {
  const u = toUser(answers, checkup);
  const track = chooseTrack(u);
  const baseP = probability(u, track);
  const baseGrade = gradeOf(baseP);
  const modelBased: ModelAction[] = [];

  // ① 체중 — 가장 강하고 안정적인 변수. 저체중이면 회복, 아니면 유지.
  const wt = u.wt as number | null;
  const ht = u.ht as number | null;
  if (wt && ht) {
    const bmi = wt / (ht / 100) ** 2;
    if (bmi < 18.5) {
      const target = Math.round(19.5 * (ht / 100) ** 2 * 10) / 10;
      modelBased.push({
        item: "체중 늘리기",
        kind: "회복",
        oneLine: `${target}kg까지 늘려보세요`,
        message: `키에 비해 몸무게가 적은 편이에요. ${target}kg 정도까지 올리면 뼈에 도움이 많이 됩니다. 살이 아니라 근육이 붙도록 단백질(고기·생선·두부·달걀)을 챙겨 드시는 게 좋아요.`,
      });
    } else {
      const pDrop = probability({ ...u, wt: Math.max(30, wt - 5) }, track);
      modelBased.push({
        item: "지금 몸무게 지키기",
        kind: "유지",
        oneLine: "지금 몸무게를 지켜주세요",
        message: `몸무게가 줄면 뼈도 같이 약해져요. 지금보다 5kg 빠지면, 뼈가 약한 분이 ${몇명(
          baseP
        )}에서 ${몇명(pDrop)}으로 늘어납니다. 나이 들면서 살이 저절로 빠지는 건 좋은 신호가 아니에요.`,
        caution: "일부러 살을 찌우시라는 말이 아니에요. 지금을 지키시라는 뜻이에요.",
      });
    }
  }

  // ② 근력운동 — 등급이 실제로 바뀔 때만, 수치 없이
  const curEx = (u.exercise as number) ?? 0;
  if (curEx < 3) {
    const afterGrade = gradeOf(probability({ ...u, exercise: 3 }, track));
    if (afterGrade !== baseGrade) {
      modelBased.push({
        item: "근육 쓰는 운동 늘리기",
        kind: "증가",
        oneLine: "일주일에 세 번으로 늘려보세요",
        message: `지금은 '${baseGrade}'인데, 일주일에 세 번 운동하시는 또래분들은 '${afterGrade}'예요. 의자에 앉았다 일어서기부터 시작하시면 됩니다.`,
      });
    }
  }

  return {
    modelTitle: "회원님께 맞춘 안내",
    guidelineTitle: "뼈 건강에 좋은 습관",
    modelBased,
    guideline: GUIDELINE_CARDS,
    intro: modelBased.length
      ? "생활습관으로 챙길 수 있는 부분이 있어요."
      : "생활습관만으로 바꾸기는 어려운 편이에요. 나이나 폐경처럼 타고난 부분의 영향이 큽니다. 그래도 아래 습관은 도움이 되니 챙겨보세요.",
    disclosure:
      "'뼈 건강에 좋은 습관'은 의사들이 권하는 내용이에요. 앱이 계산해서 만든 게 아니라 누구에게나 도움이 됩니다.",
  };
}
