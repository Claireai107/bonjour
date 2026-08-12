/**
 * 앱 버전 관리 — 단일 기준점
 *
 * 기획서 「치명 오류 대비 – 롤백 가능하도록 버전 관리」 대응
 *
 * 배포 절차
 *  1. APP_VERSION 을 올린다 (기능 추가 v1.1.0 / 버그 수정 v1.0.1)
 *  2. CHANGELOG 맨 위에 한 줄 남긴다
 *  3. 커밋 후 같은 번호로 태그를 단다 →  git tag v1.1.0 && git push --tags
 *  4. 장애 시 롤백 →  git checkout v1.0.0 후 재배포
 *     (복구 중에는 MAINTENANCE_MODE=1 로 '점검 중' 화면을 노출한다)
 *
 * MIN_SUPPORTED_VERSION 보다 낮은 버전이 기기에 캐시돼 있으면
 * 앱이 사용자에게 새로고침(업데이트)을 안내한다.
 */

export const APP_VERSION = "1.5.1";
export const MIN_SUPPORTED_VERSION = "1.0.0";
export const RELEASED_AT = "2026-08-10";

export const CHANGELOG: { version: string; date: string; summary: string }[] = [
  {
    version: "1.5.1",
    date: "2026-08-10",
    summary:
      "음성 모드 화면 정리 — 눌리지 않는 안내 박스와 마이크 버튼이 겹쳐 헷갈리던 문제 수정. 안내를 마이크 버튼 하나로 모으고 인식 결과 표시도 합침",
  },
  {
    version: "1.5.0",
    date: "2026-08-10",
    summary:
      "답변 방식 선택 화면(/onboarding)을 주 동선에 복구 — 홈 시작 버튼이 설문으로 직행하며 빠져 있었다. 설문 안 전환 버튼과 함께 두 경로 모두 유지",
  },
  {
    version: "1.4.1",
    date: "2026-08-10",
    summary:
      "직접 사용 중 발견 — 음성 모드 진입 버튼 추가(들어갈 방법이 없었음), 또래 비교 표시 방향 정정, 시뮬레이터 '여기' 표시 가독성 개선, 생년월일 '돌려서 고르기' 문구 교체",
  },
  {
    version: "1.4.0",
    date: "2026-08-10",
    summary:
      "모델 변수 정정 — LW_pr_1 라벨을 '출산 횟수'에서 '임신 횟수'로 바로잡고, 임신 횟수·음주 시작 나이 문항 추가 (그동안 학습 중앙값으로 대체되던 값)",
  },
  {
    version: "1.3.0",
    date: "2026-08-10",
    summary:
      "1차 UT 반영 — 글자 크기 조절(100/115/130%)·확대 허용, 리포트 부정-0-긍정 막대, 시뮬레이터 점수 표시·코치마크, 권한 사전 안내, 생년월일 직접 입력, 검진 용어 툴팁",
  },
  {
    version: "1.2.0",
    date: "2026-08-10",
    summary:
      "1차 UT 반영 — 음성 자연어 표현 인식 사전 확장, 인식 실패와 무관하게 선택 버튼 상시 노출, 녹음 상태 3단계 표시",
  },
  {
    version: "1.1.0",
    date: "2026-08-06",
    summary:
      "동의 항목을 개인정보·건강정보(민감정보)·위치정보로 분리, 미동의 시 위치 수집 차단",
  },
  {
    version: "1.0.3",
    date: "2026-08-06",
    summary: "개인정보 보호책임자 문의처 실제 주소로 반영",
  },
  {
    version: "1.0.2",
    date: "2026-08-06",
    summary: "문서·주석의 '처방' 표현을 '추천'으로 통일 (팀 용어 결정 반영)",
  },
  {
    version: "1.0.1",
    date: "2026-08-06",
    summary:
      "개인정보 수집·이용 동의 전문 페이지 추가, 회원가입 동의 영역 정리",
  },
  {
    version: "1.0.0",
    date: "2026-08-06",
    summary:
      "회원가입 DB 연동, 휴대폰 인증번호, 로그인·계정 잠금, 앱 버전 관리·점검 화면 추가",
  },
  {
    version: "0.1.0",
    date: "2026-07-13",
    summary:
      "MVP — 설문·검진 OCR·AI 예측·리포트·시뮬레이터·맞춤 루틴·우리동네 연계",
  },
];

/** "1.2.10" 비교 — a가 b보다 낮으면 음수 */
export function compareVersion(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}
