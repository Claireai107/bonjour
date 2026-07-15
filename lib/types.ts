// ============================================================
// 본주르 도메인 타입 정의
// 설문(SurveyAnswers) → 예측(PredictionResult) → 처방(Prescription)
// ============================================================

export type MenopauseStatus = "yes" | "no" | "unknown";
export type YesNoUnknown = "yes" | "no" | "unknown";

/** 설문 10문항 + 선택 검진 입력을 담는 통합 입력 */
export interface SurveyAnswers {
  // 필수 설문 10문항 (부록 A-1 순서 고정)
  age?: number; // 만 나이 — 설문 문항 아님, 분석 시 프로필 생년월일에서 주입
  height?: number; // ① 키(cm)
  weight?: number; // ② 체중(kg)
  menopause?: MenopauseStatus; // ③ 폐경 여부 (분기 트리거)
  menopauseAge?: number; // ④ 폐경 연령 (폐경='예'일 때만)
  menarcheAge?: number; // ⑤ 초경 연령
  pregnancies?: number; // ⑥ 임신 횟수 (0~20, 출산 무관)
  hormone?: YesNoUnknown; // ⑦ 여성호르몬제 복용
  drinkStartAge?: number | "none"; // ⑧ 음주 시작 연령 — "none"=비음주(모델 미입력)
  strengthDays?: 0 | 1 | 2 | 3; // ⑨ 주간 근력운동: 0=안함,1=1~2일,2=3~4일,3=5일+
  education?: 1 | 2 | 3 | 4; // ⑩ 교육수준: 1초졸 2중졸 3고졸 4대졸+
}

/** 선택 입력 — 건강검진표(Precision Check). 있으면 Model C, 없으면 Model B */
export interface CheckupInputs {
  weight?: number; // 체중(kg) — 검진표 값, 설문 값보다 우선
  height?: number; // 신장(cm) — 검진표 값, 설문 값보다 우선
  waist?: number; // 허리둘레(cm)
  alp?: number; // 알칼리성 인산분해효소
  sbp?: number; // 수축기 혈압
  pth?: number; // 부갑상선호르몬
  fev1fvc?: number; // 폐기능(1초율)
}

/** 어떤 모델 경로가 사용되었는지 */
export type ModelUsed = "B" | "A" | "C"; // B=설문전용, A=검진전용, C=설문+검진

/** SHAP 유사 기여도 (한 변수의 위험 방향 영향) */
export interface FactorContribution {
  key: string; // 변수 키 (age, weight ...)
  label: string; // 화면 표기 (쉬운 말)
  contribution: number; // 위험 기여도(양수=위험↑, 음수=보호). 정규화된 상대값
  controllable: boolean; // 시뮬레이터 슬라이더 대상 여부
}

export type RiskGrade = "정상" | "주의" | "높음";

export interface PredictionResult {
  modelUsed: ModelUsed;
  riskProbability: number; // 0~1 골다공증 위험 확률
  boneScore: number; // 0~100 (위험 낮을수록 높음)
  grade: RiskGrade;
  percentile: number; // 동년배 대비 상위 몇 % (낮을수록 건강)
  bestAchievableScore: number; // DiCE: 통제가능 변수 최적화 시 도달 가능 점수
  riskFactors: FactorContribution[]; // 위험요인 (contribution>0), 큰 순
  protectiveFactors: FactorContribution[]; // 보호요인 (contribution<0)
}

/** 처방 규칙 R1~R9 */
export interface PrescriptionRule {
  id: string; // R1..R9
  riskVariable: string; // ① 위험 변수
  interpretation: string; // ② 의학적 해석
  exerciseType: string; // ③ 처방 운동 유형
  videoIds: string[]; // ④ 연결 영상 (videos.ts 키)
  dose: string; // 권장량
  purpose: string; // 목적
  note?: string;
}

export interface VideoResource {
  id: string;
  category: "어운완" | "KHEPI";
  title: string; // 프로그램명
  parts: string; // 구성/부위
  youtubeId: string; // 유튜브 영상 ID (임베드용)
  duration?: string;
}

/** 최종 처방 카드 (화면 8) */
export interface PrescriptionCard {
  ruleId: string;
  headline: string; // 처방 헤드라인 한 줄
  checklist: string[]; // ☐ 항목들
  videos: VideoResource[];
  bonTip: string; // 격려 한 줄
}

// ============================================================
// 회원가입 · 가족 프로필 · 관심(하트) — 추가 화면용 타입
// ============================================================

/** 관심(하트)으로 담은 콘텐츠 */
export interface FavoriteItem {
  id: string; // 고유 키 (영상 id / 시설 id)
  kind: "video" | "place" | "program";
  title: string;
  subtitle?: string;
  youtubeId?: string; // kind==="video"일 때
}

/** 한 사용자(가족 구성원) 프로필 — 모든 화면 데이터의 주인 */
export interface ProfileData {
  id: string;
  name: string; // 표시 이름 (예: 엄마)
  relation: string; // 관계: 본인 / 어머니 / 아버지 / 배우자 / 기타
  gender?: "F" | "M";
  birth?: string; // 생년월일 YYYY-MM-DD (데모)
  region?: string; // 주소 표시용 (예: 순천시)
  avatar?: string; // 프로필 아바타 포즈 id (components/Boni의 AVATARS 중 하나)
  answers: SurveyAnswers;
  checkup: CheckupInputs;
  result: PredictionResult | null;
  simTarget: { weight?: number; strengthDays?: number } | null;
  favorites: FavoriteItem[];
  reports?: ReportEntry[]; // 분석 이력 (최신이 마지막)
}

/** 리포트 이력 한 건 — 날짜 드롭다운으로 과거 리포트 열람 */
export interface ReportEntry {
  date: string; // ISO 8601
  result: PredictionResult;
}
