# 검진 체중·신장 덮어쓰기 + 설문 나이 문항 제거 설계

날짜: 2026-07-14
상태: 사용자 승인됨

## A. 검진표 체중·신장 → 설문 값 덮어쓰기

### 데이터
- `lib/types.ts` `CheckupInputs`에 추가: `weight?: number; // 체중(kg)`, `height?: number; // 신장(cm)`

### OCR 경로 (`app/checkup/page.tsx`, `app/api/ocr/route.ts`)
- `OCR_ROWS`에 신장 행 추가(체중 다음): `{ key: "height", label: "신장", unit: "cm" }`
- `OCR_PATTERNS.height = { kw: /신장|키|height/i, min: 100, max: 210 }`
- ocr state 초기값에 `height: ""` 추가
- `app/api/ocr/route.ts`: 두 추출 스키마(Anthropic·Gemini)와 프롬프트 항목 목록에 `height`(신장, cm, nullable) 추가, required 배열에도 포함
- `submitOcr`: `setCheckup({ weight: ocr.weight ? Number(ocr.weight) : undefined, height: ocr.height ? Number(ocr.height) : undefined, alp: ocr.alp ? Number(ocr.alp) : undefined })` — 기존에 버려지던 체중을 저장하고 신장 추가

### 직접 입력 경로 (`app/checkup/page.tsx` manual form)
- form state에 `weight: ""`, `height: ""` 추가, 입력 필드 2개 추가(기존 waist/alp/sbp 필드와 동일 스타일, 라벨 "체중(kg)"·"신장(cm)")
- `submitManual`: `weight`/`height`도 setCheckup에 포함

### 예측·시뮬레이터 (`lib/predict.ts`, `app/simulator/page.tsx`)
- `toModelVars`: `const weight = ov?.weight ?? c.weight ?? a.weight;` / `const height = c.height ?? a.height;` — 검진 값이 설문 값에 우선(시뮬레이터 오버라이드는 최우선 유지)
- 시뮬레이터 기준 체중: `answers.weight ?? 58` → `checkup.weight ?? answers.weight ?? 58` (checkup을 스토어에서 구독)
- 설문의 체중(step)·신장 문항은 유지

## B. 설문 나이 문항 제거

### 문항 (`lib/survey.ts`)
- `key: "age"` 문항 삭제, 나머지 9문항 step을 1~9로 재번호, `TOTAL_STEPS = 9` (TOTAL_STEPS가 상수면 9로, 파생이면 자동)

### 나이 계산 (`lib/age.ts` 신규)
- `export function ageFromBirth(birth?: string): number | undefined` — "YYYY-MM-DD" 파싱, 만 나이(생일 안 지났으면 -1), 무효/누락이면 undefined
- `app/profile-add/page.tsx`의 `koreanAge`/`daysInMonth` 중 koreanAge 로직을 이 헬퍼로 대체(동작 동일, profile-add는 year/month/day 숫자로 호출하므로 내부에 숫자 오버로드 또는 문자열 조립 후 호출 — 구현 단순성을 위해 `ageFromParts(y, m, d)`와 `ageFromBirth(str)` 둘 다 export 허용)

### 주입 (`app/analysis/page.tsx`)
- runAnalysis 시작 시: `const age = ageFromBirth(profile.birth); if (age != null) setAnswer("age", age);` 그리고 predict에는 `{ ...answers, age: age ?? answers.age }`로 전달 — 스토어에 저장돼 마이페이지("N세")·리포트 백분위 밴드 등 기존 소비처가 그대로 동작
- birth 없는(구버전) 프로필은 age undefined 허용 — predict는 이미 optional 처리

### 설문 화면 정리 (`app/survey/page.tsx`)
- age 전용 `WheelPicker` 분기 제거(`q.key === "age"` 조건), 사용처 없어진 `WheelPicker`·관련 상수(WHEEL_ITEM 등) 삭제
- number형 문항(height/weight 등)은 기존 NumberStepper 그대로

## C. 검진 탭바 계약 테스트 정정

- `tests/pageContracts.test.mjs` "eligible pages render exactly one bottom tab bar": eligible 목록에서 `app/checkup/page.tsx` 제거, 같은 테스트(또는 인접 테스트)에 검진은 의도적으로 탭바 없음을 고정: `assert.equal((read("app/checkup/page.tsx").match(/<TabBar\s*\/>/g) ?? []).length, 0)`
- 결과: 테스트 스위트 전체 green (pre-existing 실패 소멸)

## 범위 밖

- 설문의 체중·신장 문항 제거(유지함), 검진 waist/sbp 등 다른 항목 변경, 나이 표시 UI 변경

## 검증

- `npx tsc --noEmit`, `npm run build`, `npm test` **전체 green**
- E2E: 설문이 9문항(첫 문항이 신장)으로 완주되는지, 진행바 N/9, 검진 직접 입력에 체중·신장 필드, 분석 후 리포트에 "60대 여성 중 ..."(가입 생년월일 기반) 표시, 마이페이지 나이 표시
- 덮어쓰기 확인: 설문 체중과 다른 값을 검진에 입력 후 분석 → 시뮬레이터 기준 체중이 검진 값인지
- 과거 리포트 이력(answers.age 저장분) 호환 — 이력 조회 무영향
