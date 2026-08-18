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
  sex?: "여" | "남"; // 설문 문항 아님 — 프로필 성별에서 주입 (적용 대상 관문용)
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

/** 등급 — 재분석 반영판: 안심/주의/위험 (경계는 서비스_처리규칙 JSON에서만) */
export type RiskGrade = "안심" | "주의" | "위험";

export interface PredictionResult {
  /**
   * 적용 대상(만 20~89세 여성)인지. false면 숫자는 의미가 없고
   * guidance(안내 문구)만 화면에 보여준다 — 분기 화면은 만들지 않는다.
   */
  applicable: boolean;
  reason: "성별" | "나이없음" | "나이범위" | "폐경연령오류" | null;
  modelUsed: ModelUsed;
  /** 실제 사용 트랙 — 폐경전 / 설문11 / 전체16 (내부 자동 선택) */
  track: "설문11" | "전체16" | "폐경전";
  riskProbability: number; // 0~1 — isotonic 보정된 확률 (실제 유병 수준과 일치)
  boneScore: number; // 1~99 — 또래 위험도 백분위 기반 (높을수록 좋음)
  grade: RiskGrade;
  /**
   * 또래 중 "나보다 위험이 높은 사람"의 비율. 높을수록 건강하다.
   * 새 산식에서는 boneScore와 같은 값이다.
   */
  percentile: number;
  /** 또래 비교 문구 — "60대 여성 100명이 있다면, 그중 91명이 …" (화면에 그대로) */
  peerText: string;
  /** 또래 표본이 30명 미만이면 false — 순위 마커를 그리지 않는다 (20~30대 등) */
  peerReliable?: boolean;
  /** 등급 한마디 — 큰 제목용. "위험"만 크게 띄우지 말고 이게 주인공 */
  comment: string;
  /** 등급 안내 본문 */
  guidance: string;
  /** "회원님과 비슷한 분들 중에 뼈가 약한 분이 10명 중 N명 정도예요" */
  easyExplain: string;
  /** 위험 등급 → 골밀도 검사 권유 */
  needsExam: boolean;
  bestAchievableScore: number; // 근력운동 주 3회(지침 권고치) 기준 도달 가능 점수
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
