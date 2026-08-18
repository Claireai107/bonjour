// ============================================================
// 예측 엔진 — 데이터팀 재분석 반영판 (2026-08-17 인계)
//
// 데이터팀 bonjour_backend.py 를 그대로 TS로 옮긴 것.
// 회귀 테스트(tests/newModel.test.mjs)가 파이썬 출력과 수치 일치를 검증한다.
//
// 구조: CalibratedClassifierCV(cv=5)
//   위험확률 = 5개 폴드 평균( isotonic( 로지스틱( 표준화(입력) ) ) )
//   각 폴드 = SimpleImputer(중앙값) → StandardScaler → LogisticRegression
//   isotonic 보정 = 구간 선형보간 (양끝 클립)
//
// 기존 대비 바뀐 것 (개발서버/개발팀_인계_2026-08-17/변경사항_안내.md):
//   · 확률 보정(isotonic) — "30%"가 실제로 30%를 뜻한다
//   · 진짜 두 트랙: 설문11(기본) / 전체16(검진값 있을 때) 자동 선택
//   · HE_BMI 제거, drink_ever 추가, hormone 1=있음/0=없음
//   · 등급 경계·중앙값·표준화기준·또래분포는 전부 JSON에서만 읽는다
//   · 점수 = 또래 위험도 백분위 기반 (확률 x100 아님)
//   · 또래 비교 = 2024년 분포 (구: 2008~2011 코호트)
//   · 행동 처방 = 모델기반(체중·등급이 바뀌는 근력운동만) + 지침기반 고정 카드
// ============================================================

import MODEL from "./model/newModelParams";
import type {
  CheckupInputs,
  FactorContribution,
  PredictionResult,
  RiskGrade,
  SurveyAnswers,
} from "./types";

export type TrackName = "설문11" | "전체16";

type UserRecord = Record<string, number | null>;

interface Fold {
  imputerMedians: number[];
  scalerMean: number[];
  scalerScale: number[];
  coef: number[];
  intercept: number;
  isoX: number[];
  isoY: number[];
}

interface Track {
  features: string[];
  folds: Fold[];
  medians: Record<string, number>;
  cuts: { 주의: number; 위험: number };
  peer: Record<string, number[]>;
  perf: Record<string, unknown>;
}

const TRACKS = (MODEL as { tracks: Record<string, Track> }).tracks;
const CHECKUP_ONLY: string[] = (MODEL as { checkupOnly: string[] }).checkupOnly;
const YEAR_STD: string[] = (MODEL as { yearStdTargets: string[] }).yearStdTargets;
const YEAR_REF = (
  MODEL as { yearStdRef: Record<string, { mean: number; std: number }> }
).yearStdRef;

// ── 입력 변환: 앱 답변 → 백엔드 계약 (변경사항_안내.md C-1) ──────────────
// hormone: 1=있음 / 0=없음 (구 코딩 1/2는 위험 방향이 반대로 나온다)
// drink_ever: 음주경험 0/1 신규. 비음주자의 drink_age는 null 그대로(중앙값 대체 금지)
// exercise: 실제 일수 [0, 1.5, 3.5, 6] — 앱 척도가 맞고 구 모델이 틀렸던 케이스
const STRENGTH_TO_DAYS = [0, 1.5, 3.5, 6] as const;

export function toUser(a: SurveyAnswers, c: CheckupInputs = {}): UserRecord {
  const drink =
    a.drinkStartAge == null
      ? { ever: null, age: null } // 미응답
      : a.drinkStartAge === "none" || a.drinkStartAge <= 0
      ? { ever: 0, age: null } // 비음주
      : { ever: 1, age: a.drinkStartAge };

  const u: UserRecord = {
    age: a.age ?? null,
    wt: c.weight ?? a.weight ?? null, // 검진 실측값 > 설문 값
    ht: c.height ?? a.height ?? null,
    meno_age: a.menopause === "yes" ? a.menopauseAge ?? null : null,
    mens_age: a.menarcheAge ?? null,
    edu: a.education ?? null,
    drink_ever: drink.ever,
    drink_age: drink.age,
    preg_n: a.pregnancies ?? null,
    hormone: a.hormone === "yes" ? 1 : a.hormone === "no" ? 0 : null,
    exercise:
      a.strengthDays == null ? null : STRENGTH_TO_DAYS[a.strengthDays] ?? null,
  };

  // 검진표 원본값 → 모델 입력 (from_health_report와 동일)
  //  · 폐기능 78(%) → 0.78
  //  · alp/pth/wc 는 측정법이 시대별로 달라 2024 분포 기준 상대 위치로 표준화
  //    (구 코드는 pth 표준화가 빠져 모든 사용자의 위험이 낮게 나왔다)
  const checkupRaw: UserRecord = {
    alp: c.alp ?? null,
    wc: c.waist ?? null,
    pth: c.pth ?? null,
    fev1fvc: c.fev1fvc ?? null,
    sbp: c.sbp ?? null,
  };
  if (checkupRaw.fev1fvc != null && checkupRaw.fev1fvc > 1) {
    checkupRaw.fev1fvc = checkupRaw.fev1fvc / 100;
  }
  for (const k of YEAR_STD) {
    const v = checkupRaw[k];
    if (v != null && YEAR_REF[k]) {
      const { mean, std } = YEAR_REF[k];
      checkupRaw[k] = (v - mean) / (std || 1);
    }
  }
  return { ...u, ...checkupRaw };
}

// ── 트랙 선택: 검진표에서만 얻는 값이 하나라도 있으면 전체16 ─────────────
export function chooseTrack(u: UserRecord): TrackName {
  return CHECKUP_ONLY.some((k) => u[k] != null) ? "전체16" : "설문11";
}

// ── 확률: 5-fold 보정 분류기 (파이썬 predict_proba와 동일) ───────────────
function isotonic(fold: Fold, p: number): number {
  const X = fold.isoX;
  const Y = fold.isoY;
  if (p <= X[0]) return Y[0];
  if (p >= X[X.length - 1]) return Y[Y.length - 1];
  // np.interp — 구간 선형보간
  let lo = 0;
  let hi = X.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (X[mid] <= p) lo = mid;
    else hi = mid;
  }
  const t = (p - X[lo]) / (X[hi] - X[lo] || 1);
  return Y[lo] + t * (Y[hi] - Y[lo]);
}

function probability(u: UserRecord, track: TrackName): number {
  const T = TRACKS[track];
  // _prep: 빈칸은 처리규칙 학습 중앙값으로 채운다
  const row = T.features.map((f) => (u[f] == null ? T.medians[f] : (u[f] as number)));
  let sum = 0;
  for (const fold of T.folds) {
    let z = fold.intercept;
    for (let i = 0; i < row.length; i++) {
      const x = (row[i] - fold.scalerMean[i]) / (fold.scalerScale[i] || 1);
      z += fold.coef[i] * x;
    }
    // sklearn CalibratedClassifierCV는 decision_function(선형 점수 z) 위에서
    // isotonic을 학습한다 — 시그모이드를 거치면 안 된다 (isoX 범위가 ±3인 이유)
    sum += isotonic(fold, z);
  }
  return sum / T.folds.length;
}

// ── 등급 + 화면 문구 (백엔드 반환 문구를 그대로 출력한다) ────────────────
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

function gradeOf(p: number, track: TrackName): RiskGrade {
  const cuts = TRACKS[track].cuts;
  return p >= cuts.위험 ? "위험" : p >= cuts.주의 ? "주의" : "안심";
}

// 확률 → "10명 중 몇 명" (백분율보다 훨씬 잘 전달된다. 보정했으므로 실제와 맞다)
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

// ── 또래 비교 — 2024년 같은 연령대 분포 ──────────────────────────────────
export interface PeerResult {
  band: string;
  /** 위험도 백분위: 0=또래 중 가장 안전, 100=가장 위험 (나보다 안전한 비율) */
  riskPercentile: number;
  /** 화면 문구 — "상위 %" 대신 사람 수로 말한다 */
  text: string;
}

function peer(u: UserRecord, track: TrackName): PeerResult {
  const p = probability(u, track);
  const age = (u.age as number) ?? 60;
  const band = age < 50 ? "40대" : age < 60 ? "50대" : "60대";
  const dist = TRACKS[track].peer[band] ?? [];
  if (!dist.length) {
    return { band, riskPercentile: 50, text: "또래와 비교할 자료가 아직 없어요." };
  }
  // bisect_left — 나보다 위험이 낮은(더 튼튼한) 사람 수
  let lo = 0;
  let hi = dist.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (dist[mid] < p) lo = mid + 1;
    else hi = mid;
  }
  const pctile = Math.round((lo / dist.length) * 100);
  return {
    band,
    riskPercentile: pctile,
    text: `${band} 여성 100명이 있다면, 그중 ${pctile}명이 회원님보다 뼈가 튼튼해요.`,
  };
}

// ── 점수: 또래 안에서의 위치 (높을수록 좋음) ─────────────────────────────
// (1-확률)x100은 대부분 80점대에 몰려 차이가 안 보인다.
// 위험도 백분위 91 → 91%가 나보다 안전 → 9점.
function scoreOf(pr: PeerResult): number {
  return Math.round(Math.max(1, Math.min(99, 100 - pr.riskPercentile)));
}

// ── 기여도 표시(리포트 '왜 이런가요') ────────────────────────────────────
// 폴드 평균 계수 x 표준화값. 설명용이지 처방 근거가 아니다(변경사항 A-9).
const FACTOR_LABELS: Record<string, string> = {
  age: "나이",
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

function contributions(u: UserRecord, track: TrackName): FactorContribution[] {
  const T = TRACKS[track];
  const out: FactorContribution[] = [];
  T.features.forEach((f, i) => {
    if (u[f] == null) return; // 실제로 입력한 값만 설명한다
    let c = 0;
    for (const fold of T.folds) {
      const x = ((u[f] as number) - fold.scalerMean[i]) / (fold.scalerScale[i] || 1);
      c += fold.coef[i] * x;
    }
    c /= T.folds.length;
    out.push({
      key: f,
      label: FACTOR_LABELS[f] ?? f,
      contribution: c,
      controllable: CONTROLLABLE.has(f),
    });
  });
  return out.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

// ── 메인: 화면이 쓰는 예측 결과 ──────────────────────────────────────────
export function predict(
  answers: SurveyAnswers,
  checkup: CheckupInputs = {}
): PredictionResult {
  const u = toUser(answers, checkup);
  const track = chooseTrack(u);
  const p = probability(u, track);
  const grade = gradeOf(p, track);
  const pr = peer(u, track);
  const score = scoreOf(pr);
  const all = contributions(u, track);

  // '앞으로' 카드: 근력운동 주 3회(지침 권고치) 기준 도달 가능 점수.
  // 주 6일 같은 목표는 학습 데이터 밖 외삽이라 쓰지 않는다(변경사항 A-8).
  const better = { ...u, exercise: Math.max((u.exercise as number) ?? 0, 3) };
  const bestScore = scoreOf(peer(better, track));

  return {
    modelUsed: track === "전체16" ? "C" : "B",
    track,
    riskProbability: Math.round(p * 1000) / 1000,
    boneScore: score,
    grade,
    // 기존 규약(클수록 건강)과 동일: 나보다 위험이 높은 또래의 비율
    percentile: Math.max(1, Math.min(99, 100 - pr.riskPercentile)),
    peerText: pr.text,
    comment: GRADE_TEXT[grade].한마디,
    guidance: GRADE_TEXT[grade].안내,
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
    boneScore: scoreOf(peer(u, track)),
    grade: gradeOf(p, track),
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

// ── 체중 민감도 — "지금 체중을 지키세요" (변경사항 A-10) ─────────────────
// 체중은 가장 강하고 안정적인 변수지만 증량은 권할 수 없다.
// 고령 여성의 의도치 않은 체중 감소는 골다공증의 알려진 위험 신호 —
// 감소 경고 방향으로 쓰면 임상적으로도 옳다.
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
      grade: gradeOf(p, track),
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

// ── 행동 처방 — 모델기반 + 지침기반 (변경사항 A-9) ───────────────────────
// 이 모델은 관찰 데이터로 학습했다. "운동하면 내려간다"는 인과 주장을 하지 않는다.
// 수치를 붙일 만큼 계수가 안정적인 것은 체중뿐이고, 그마저 증량 권고로는 못 쓴다.
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

// 임상 지침 고정 카드 — 단위(mg·IU) 대신 눈에 보이는 양으로 말한다
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
  const baseGrade = gradeOf(baseP, track);
  const modelBased: ModelAction[] = [];

  // ① 체중 — 방향은 사용자 상태에 따라: 저체중이면 회복, 아니면 유지
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
    const afterGrade = gradeOf(probability({ ...u, exercise: 3 }, track), track);
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
