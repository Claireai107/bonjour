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
  // number형 건너뛰기 보조 버튼 (예: '술은 안 마셔요' → "none" 저장)
  skip?: { label: string; value: "none" };
}

export const QUESTIONS: Question[] = [
  {
    key: "height",
    step: 1,
    type: "number",
    title: "키가 어떻게 되세요?",
    unit: "cm",
    min: 120,
    max: 200,
    default: 160,
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
  },
  {
    key: "pregnancies",
    step: 6,
    type: "number",
    title: "임신을 몇 번 하셨어요?",
    hint: "출산하지 않았어도 임신 횟수로 답해 주세요",
    unit: "회",
    min: 0,
    max: 20,
    default: 2,
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
  },
  {
    key: "drinkStartAge",
    step: 8,
    type: "number",
    title: "술을 몇 세부터\n드시기 시작했어요?",
    hint: "안 마시면 '안 마셔요'를 눌러 주세요",
    unit: "세",
    min: 5,
    max: 88,
    default: 20,
    skip: { label: "술은 안 마셔요", value: "none" },
  },
  {
    key: "strengthDays",
    step: 9,
    type: "choice",
    title: "일주일에 근력운동을\n며칠 하세요?",
    choices: [
      { label: "안 함", value: 0 },
      { label: "1~2일", value: 1 },
      { label: "3~4일", value: 2 },
      { label: "5일 이상", value: 3 },
    ],
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
  },
];

/** 현재 답변 상태에서 실제로 노출할 문항 목록 (분기 반영) */
export function visibleQuestions(a: SurveyAnswers): Question[] {
  return QUESTIONS.filter((q) => !q.showIf || q.showIf(a));
}

export const TOTAL_STEPS = 10;
