import type { SurveyAnswers } from "./types";

// ============================================================
// 설문 10문항 정의 (부록 A-1). 한 문항 = 한 화면.
// type: number(입력+단위) / choice(큰 선택 버튼)
// branch: 조건부 노출 (부록 A-3)
// ============================================================

export type QuestionType = "number" | "choice";

export interface Choice {
  label: string;
  value: number | string;
}

export interface Question {
  key: keyof SurveyAnswers;
  step: number; // 1~10 (진행바 표기)
  type: QuestionType;
  title: string; // 화면 질문 (쉬운 말)
  hint?: string;
  unit?: string; // number형 단위
  min?: number;
  max?: number;
  default?: number; // number형 초기값 — 있으면 [다음]이 처음부터 활성화
  choices?: Choice[];
  // 이 문항을 보여줄지 판단 (조건부). 없으면 항상 표시
  showIf?: (a: SurveyAnswers) => boolean;

  // ── 음성 입력 관련 (1차 UT 개선) ──────────────────────────
  /** 마이크 버튼 옆에 띄우는 예시 문구. 어떻게 말해야 할지 미리 알려준다 */
  voiceHint?: string;
  /**
   * 음성에서 뽑아낸 숫자를 선택지 값으로 바꾼다.
   * "하루"라고 답하면 1이 나오는데, 선택지는 "1~2일"(value 1)이라 바로 못 맞춘다.
   */
  numberToChoice?: (n: number) => number | string | null;
  /** 라벨만으로는 안 잡히는 말들 (선택지 값 → 표현 목록) */
  voiceAliases?: Record<string, string[]>;
  /** 나이가 아니라 횟수를 묻는 숫자 문항 — "한 번", "없어요" 같은 말을 받는다 */
  countStyle?: boolean;
}

export const QUESTIONS: Question[] = [
  // 나이 문항은 없다 — 가입 생년월일에서 파생한다 (lib/age, 분석 시 주입)
  {
    key: "height",
    step: 1,
    type: "number",
    title: "키가 어떻게 되세요?",
    unit: "cm",
    min: 120,
    max: 200,
    default: 160,
    voiceHint: "예) 160, 백육십",
  },
  {
    key: "weight",
    step: 2,
    type: "number",
    title: "몸무게를 알려주세요",
    unit: "kg",
    min: 30,
    max: 150,
    default: 70,
    voiceHint: "예) 55, 쉰다섯",
  },
  {
    key: "menopause",
    step: 3,
    type: "choice",
    title: "폐경을 하셨나요?",
    choices: [
      { label: "예", value: "yes" },
      { label: "아니오", value: "no" },
      { label: "잘 모름", value: "unknown" },
    ],
    voiceHint: "예) 네 / 아니오 / 잘 모르겠어요",
    voiceAliases: {
      yes: ["했어", "했습니다", "끝났", "지났", "폐경했"],
      no: ["아직", "안했", "전이", "멀었"],
      unknown: ["모르", "글쎄", "기억이안", "헷갈"],
    },
  },
  {
    key: "menopauseAge",
    step: 4,
    type: "number",
    title: "몇 세에 폐경하셨어요?",
    unit: "세",
    min: 30,
    max: 70,
    default: 50,
    voiceHint: "예) 50세, 쉰",
    showIf: (a) => a.menopause === "yes", // 폐경 '예'일 때만
  },
  {
    key: "menarcheAge",
    step: 5,
    type: "number",
    title: "첫 생리를 몇 세에\n하셨어요?",
    hint: "기억이 안 나면 대략적인 나이도 괜찮아요",
    unit: "세",
    min: 8,
    max: 20,
    default: 14,
    voiceHint: "예) 14세, 열넷",
  },
  {
    // 모델 변수 LW_pr_1. 예전엔 이 값을 안 묻고 학습 중앙값(4회)으로 대체했다.
    // 임신 횟수 = 출산 + 유산 + 자궁외임신 등이라 출산 횟수와 같은 값을 쓰면 안 된다.
    key: "pregnancies",
    step: 6,
    type: "number",
    title: "임신은 몇 번\n하셨어요?",
    hint: "유산이나 자궁외임신도 함께 세어 주세요. 없으면 0이에요",
    unit: "번",
    min: 0,
    max: 15,
    default: 2,
    countStyle: true,
    voiceHint: "예) 없어요, 한 번, 세 번",
  },
  {
    key: "hormone",
    step: 7,
    type: "choice",
    title: "여성호르몬제(에스트로겐)를\n드신 적 있으세요?",
    choices: [
      { label: "예", value: "yes" },
      { label: "아니오", value: "no" },
      { label: "잘 모름", value: "unknown" },
    ],
    voiceHint: "예) 네 / 아니오 / 잘 모르겠어요",
    voiceAliases: {
      yes: ["먹었", "복용", "드셨", "드시고", "있어"],
      no: ["안먹", "안드", "없어", "한번도"],
      unknown: ["모르", "글쎄", "기억이안"],
    },
  },
  {
    key: "strengthDays",
    step: 8,
    type: "choice",
    title: "일주일에 근력운동을\n며칠 하세요?",
    choices: [
      { label: "안 함", value: 0 },
      { label: "1~2일", value: 1 },
      { label: "3~4일", value: 2 },
      { label: "5일 이상", value: 3 },
    ],
    // UT에서 가장 많이 막힌 문항. "안 해요 / 하루 / 한 번 / 5~7일" 모두 여기로 들어온다
    voiceHint: "예) 안 해요, 하루, 사흘, 매일",
    numberToChoice: (n) => (n <= 0 ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : 3),
    voiceAliases: {
      "0": ["운동안", "따로안", "쉬어"],
      "3": ["거의매일", "매일", "날마다"],
    },
  },
  {
    // 모델 변수 BD2. 예전엔 중앙값(35세)으로 대체했다.
    key: "drinkStartAge",
    step: 9,
    type: "choice",
    title: "술은 몇 살쯤부터\n드시기 시작했어요?",
    hint: "대략적인 시기면 괜찮아요",
    choices: [
      { label: "술을 안 마셔요", value: -1 },
      { label: "20세 이전", value: 18 },
      { label: "20대", value: 25 },
      { label: "30대", value: 35 },
      { label: "40세 이후", value: 45 },
    ],
    voiceHint: "예) 안 마셔요, 스무 살쯤, 서른 넘어서",
    // 나이를 그대로 말하면 해당 구간으로 넣는다
    numberToChoice: (n) =>
      n <= 0 ? -1 : n < 20 ? 18 : n < 30 ? 25 : n < 40 ? 35 : 45,
    voiceAliases: {
      "-1": ["안마", "못마", "안먹", "술은안", "전혀"],
      "18": ["고등학생때", "학생때", "일찍"],
      "45": ["나이들어", "늦게", "최근"],
    },
  },
  {
    key: "education",
    step: 10,
    type: "choice",
    title: "학교는 어디까지\n다니셨어요?",
    choices: [
      { label: "초등학교", value: 1 },
      { label: "중학교", value: 2 },
      { label: "고등학교", value: 3 },
      { label: "대학교 이상", value: 4 },
    ],
    voiceHint: "예) 중학교, 고등학교 졸업",
    voiceAliases: {
      "1": ["국민학교", "초졸", "초등"],
      "2": ["중졸", "중학"],
      "3": ["고졸", "고등", "여고", "상업고"],
      "4": ["대졸", "대학", "전문대", "대학원"],
    },
  },
  // 수면 문항은 없다 — 모델(16개 변수)이 쓰지 않는 값이라 설문에서 제외 (7/14 스펙 정렬)
];

/** 현재 답변 상태에서 실제로 노출할 문항 목록 (분기 반영) */
export function visibleQuestions(a: SurveyAnswers): Question[] {
  return QUESTIONS.filter((q) => !q.showIf || q.showIf(a));
}

/**
 * 진행바에 쓰는 총 문항 수.
 * 폐경 연령은 폐경 '예'일 때만 나오므로, 실제로 보는 화면 수는 이보다 하나 적을 수 있다.
 */
export const TOTAL_STEPS = 10;
