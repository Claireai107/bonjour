# 설문 명세 정렬 + 검진 UX 2건 설계

날짜: 2026-07-14
상태: 사용자 승인됨
근거 명세: `/Users/chaewon/bonjour/DA/골다공증_전체산출물/4_표_코드북/서비스_입력변수_명세.csv` (xlsx 동일본)

## ① OCR 미인식 시 체중·신장 재질문 제거 (`app/checkup/page.tsx` confirm 화면)

- 결과 확인 목록에서 **weight·height 행은 `autoKeys`에 있을 때만(=OCR이 실제로 읽었을 때만) 표시**. 못 읽은 경우 행 자체를 숨긴다 (직접 입력 유도 없음).
- weight·height 중 하나라도 숨겨졌으면 목록 아래에 안내 문구 1줄: `체중·신장은 설문에서 입력한 값을 사용해요` (15px graytext).
- chol/alp/crea 등 나머지 항목은 기존 동작(미인식 시 "직접 입력" 뱃지) 유지.
- 저장 로직 무변경 — 이미 빈 값은 저장 안 되고 예측이 설문 값으로 폴백.

## ② '검진표 없이 계속하기' 버튼 간격 (`app/checkup/page.tsx` choose 화면)

- 버튼에 고정 상단 여백 `mt-6` 부여 — `flex-1` 스페이서가 짧은 화면에서 0으로 접혀도 위 카드와 붙지 않게.

## ③ 설문 명세 정렬 (9문항 → 10문항)

### 문항 구성 (step 순서)

1. height 키 (유지)
2. weight 체중 (유지)
3. menopause 폐경 여부 (유지 — 4번 게이트)
4. menopauseAge 폐경 연령 (유지, `showIf: menopause === "yes"`)
5. menarcheAge 초경 연령 (유지)
6. **pregnancies 임신 횟수 (신규, number)** — title "임신을 몇 번 하셨어요?", hint "출산하지 않았어도 임신 횟수로 답해 주세요", unit "회", min 0, max 20, default 2
7. hormone 여성호르몬제 (유지)
8. **drinkStartAge 음주 시작 연령 (신규, number + 건너뛰기)** — title "술을 몇 세부터\n드시기 시작했어요?", hint "안 마시면 '안 마셔요'를 눌러 주세요", unit "세", min 5, max 88, default 20, **skip 선택지 "술은 안 마셔요"** → 값 `"none"` 저장(모델 미입력 처리)
9. strengthDays 근력운동 (유지 — 4단계 버튼, 명세의 0~7 슬라이더 대신 시니어 UX 우선. 모델 변환 `STRENGTH_CAT_TO_DAYS` 기존 유지)
10. education 교육 수준 (유지)

- **sleepHours 삭제** — 명세·모델 미사용. `SurveyAnswers`에서 필드 제거, 문항 제거. (기존 저장된 sleepHours 값은 무해하게 무시됨)
- `TOTAL_STEPS = 10`, step 1~10 연속.

### 타입 (`lib/types.ts`)

```ts
pregnancies?: number;          // ⑥ 임신 횟수 (0~20)
drinkStartAge?: number | "none"; // ⑧ 음주 시작 연령 — "none"=비음주(모델 미입력)
```

(sleepHours 제거)

### 설문 UI (`lib/survey.ts`, `app/survey/page.tsx`)

- Question 타입에 `skip?: { label: string; value: "none" }` 옵션 추가 — number형 문항에서 스텝퍼 아래 보조 버튼으로 렌더. 누르면 해당 값 저장 + [다음] 활성화. 스텝퍼 값을 다시 조작하면 숫자로 대체.
- 음성 모드: drinkStartAge 문항에서 "안 마셔", "안 먹", "금주", "못 마셔" 발화 → `"none"` 매칭. 숫자 발화는 기존 parseKoreanNumber.
- 임신 횟수는 기존 NumberStepper 그대로.

### 모델 연결 (`lib/predict.ts`)

```ts
BD2: a.drinkStartAge === "none" ? undefined : a.drinkStartAge, // 비음주=미입력(학습 중앙값 대체)
LW_pr_1: a.pregnancies,
```

(기존 `undefined // 앱 미수집` 주석 2줄 대체)

### 계약 테스트

- 설문 관련 기존 테스트 무변경 확인. `TOTAL_STEPS`가 10으로 바뀌므로 하드코딩된 "9" 검사되는 곳 없음(확인).

## 범위 밖

- 근력운동 슬라이더 전환, 검진 전용 변수(PTH·폐기능 등) 입력 UI 추가, 과거 저장 데이터 마이그레이션

## 검증

- `npx tsc --noEmit` / `npm run build` / `npm test` 전체 green
- E2E: 설문 10문항 완주(6번 임신 횟수 스텝퍼, 8번 '술은 안 마셔요' 건너뛰기 동작), 진행바 N/10
- 검진: OCR로 체중·신장 못 읽은 경우 확인 화면에 해당 행 없음 + 안내 문구, 저장 후 예측이 설문 체중·신장 사용
- choose 화면 버튼 간격 스크린샷 확인
- 리포트 요인에 "음주 시작 시기"/"출산 횟수"가 실제 응답 기반으로 반영되는지 (중앙값 대체 제거)
