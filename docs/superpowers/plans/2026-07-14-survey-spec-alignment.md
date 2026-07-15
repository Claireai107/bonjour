# 설문 명세 정렬 + 검진 UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 설문을 입력변수 명세에 정렬(수면 삭제, 임신 횟수·음주 시작 연령 추가 → 10문항)하고, 검진 confirm에서 체중·신장 재질문을 없애며, choose 버튼 간격을 고정한다.

**Architecture:** `Question`에 `skip` 옵션을 추가해 '안 마셔요' 건너뛰기를 지원. `SurveyAnswers`에 `pregnancies`/`drinkStartAge` 추가·`sleepHours` 삭제 후 predict의 BD2/LW_pr_1 중앙값 대체를 실제 응답으로 교체. 스펙: `docs/superpowers/specs/2026-07-14-survey-spec-alignment-design.md`

**Tech Stack:** Next.js 14 + TypeScript, node --test 소스 계약 테스트

## Global Constraints

- **git 저장소 아님 → 커밋 없음.** 태스크 검증 `npx tsc --noEmit`, `npm test` 전체 green 유지
- 신규 문항: ⑥ pregnancies "임신을 몇 번 하셨어요?" (hint "출산하지 않았어도 임신 횟수로 답해 주세요", 회, 0~20, default 2) / ⑧ drinkStartAge "술을 몇 세부터\n드시기 시작했어요?" (hint "안 마시면 '안 마셔요'를 눌러 주세요", 세, 5~88, default 20, skip 라벨 **"술은 안 마셔요"** → 값 `"none"`)
- `TOTAL_STEPS = 10`, step 1~10 연속 (height1 weight2 menopause3 menopauseAge4 menarcheAge5 pregnancies6 hormone7 drinkStartAge8 strengthDays9 education10)
- 검진 confirm: weight·height 행은 `autoKeys.has(key)`일 때만 표시, 하나라도 숨겨지면 안내 "체중·신장은 설문에서 입력한 값을 사용해요"
- choose 화면 '검진표 없이 계속하기' 버튼(2곳 모두)에 `mt-6`
- 기존 계약 테스트 매치 문자열 유지

---

### Task 1: 타입·문항·모델 연결

**Files:**
- Modify: `lib/types.ts:10-22` (SurveyAnswers)
- Modify: `lib/survey.ts` (Question.skip, 문항 재구성, TOTAL_STEPS)
- Modify: `lib/predict.ts:83-84` (BD2/LW_pr_1)

**Interfaces:**
- Produces: `Question.skip?: { label: string; value: "none" }`, `SurveyAnswers.pregnancies?: number`, `SurveyAnswers.drinkStartAge?: number | "none"` — Task 2가 사용

- [ ] **Step 1: SurveyAnswers 교체**

`lib/types.ts`의 `sleepHours` 줄 삭제, 아래 2줄 추가 (menarcheAge와 hormone 사이/뒤 순서는 주석 번호에 맞춰):

```ts
  pregnancies?: number; // ⑥ 임신 횟수 (0~20, 출산 무관)
  drinkStartAge?: number | "none"; // ⑧ 음주 시작 연령 — "none"=비음주(모델 미입력)
```

주석 헤더 "필수 설문 10문항"으로, 각 문항 번호 주석을 새 순서(②키 ③체중 ④폐경 ⑤폐경연령 ⑥임신... 아님 — 실제 step 기준 ①키②체중③폐경④폐경연령⑤초경⑥임신횟수⑦호르몬⑧음주시작⑨근력⑩교육)로 정리.

- [ ] **Step 2: Question 타입에 skip 추가**

`lib/survey.ts` Question 인터페이스에:

```ts
  // number형 건너뛰기 보조 버튼 (예: '술은 안 마셔요' → "none" 저장)
  skip?: { label: string; value: "none" };
```

`step` 주석 "1~9" → "1~10".

- [ ] **Step 3: 문항 배열 재구성**

- `sleepHours` 문항 삭제
- `menarcheAge`(step 5) 다음에 삽입:

```ts
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
```

- `hormone`을 step 7로, 그 다음에 삽입:

```ts
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
```

- `strengthDays` step 9, `education` step 10, `TOTAL_STEPS = 10`, 파일 상단 주석 "설문 10문항"

- [ ] **Step 4: predict 연결**

`lib/predict.ts`:

```ts
    BD2: a.drinkStartAge === "none" ? undefined : a.drinkStartAge, // 비음주=미입력(학습 중앙값 대체)
    LW_pr_1: a.pregnancies,
```

(기존 `BD2: undefined, // 앱 미수집...`과 `LW_pr_1: undefined, ...` 2줄 대체)

- [ ] **Step 5: 검증**

Run: `npx tsc --noEmit` → 에러 없음 (survey 페이지가 `value as number` 캐스팅이라 union 추가로 깨질 수 있음 — 깨지면 해당 캐스팅은 Task 2 범위이므로 여기서는 `lib/`만 통과 확인이 목적. 전체 tsc가 survey 페이지에서 실패하면 그 에러 목록을 report에 기록하고 DONE_WITH_CONCERNS로 보고)
Run: `npm test 2>&1 | tail -3` → 21 pass 유지

---

### Task 2: 설문 UI — 터치 skip 버튼 + 음성 매칭

**Files:**
- Modify: `app/survey/page.tsx`

**Interfaces:**
- Consumes: Task 1의 `Question.skip`, `drinkStartAge: number | "none"`

- [ ] **Step 1: 터치 모드 number 분기에 skip 버튼**

현재 number 분기 (`<NumberStepper key={q.key} q={q} value={hasNumber ? (value as number) : undefined} ... />`)를 다음으로 확장:

```tsx
      {q.type === "number" ? (
        <>
          <NumberStepper
            key={q.key}
            q={q}
            value={typeof value === "number" ? value : undefined}
            onChange={(v) =>
              setAnswer(q.key, v as SurveyAnswers[typeof q.key])
            }
          />
          {q.skip && (
            <button
              onClick={() =>
                setAnswer(q.key, q.skip!.value as SurveyAnswers[typeof q.key])
              }
              className={`mt-4 w-full h-touch rounded-btn border-2 text-btn flex items-center justify-center transition active:brightness-95 ${
                value === q.skip.value
                  ? "border-forest bg-lightgreen text-forest"
                  : "border-borderline bg-white text-graytext"
              }`}
            >
              {q.skip.label}
            </button>
          )}
        </>
      ) : (
```

주의: 기존 `hasNumber` 사용부가 있으면 `typeof value === "number"` 기준으로 정리. `answered`(다음 활성) 판정이 `value != null`류인지 확인 — `"none"`도 답변으로 인정되는 형태면 무변경, 숫자만 인정하면 `value != null`로 완화.

- [ ] **Step 2: 음성 모드 skip 매칭**

`matchChoice` 함수 최상단(choices 루프 전)에 추가:

```ts
  if (q.skip && has(["안마셔", "안마시", "안먹", "못마셔", "금주"])) {
    return q.skip.value;
  }
```

음성 모드에서 number형 문항의 응답 처리 경로를 확인해, 숫자 파싱 전에 matchChoice(또는 동일한 skip 검사)가 적용되도록 한다 — number형이 matchChoice를 거치지 않는 구조면 해당 핸들러에 같은 5개 키워드 검사를 추가하고 위치를 report에 기록.

- [ ] **Step 3: 검증**

Run: `npx tsc --noEmit` → 에러 없음 (Task 1의 잔여 에러 포함 전부 해소)
Run: `npm test 2>&1 | tail -3` → 21 pass

---

### Task 3: 검진 confirm 재질문 제거 + choose 버튼 간격

**Files:**
- Modify: `app/checkup/page.tsx` (confirm의 OCR_ROWS.map, choose의 버튼 2곳)

- [ ] **Step 1: confirm — weight·height 미인식 행 숨김**

`OCR_ROWS.map((row) => {` 직후에 가드 추가:

```tsx
          {OCR_ROWS.map((row) => {
            const auto = autoKeys.has(row.key);
            // 체중·신장은 OCR이 읽었을 때만 확인 대상 — 못 읽으면 설문 값 사용(재질문 없음)
            if (!auto && (row.key === "weight" || row.key === "height")) {
              return null;
            }
            const value = ocr[row.key];
            const isEditing = editing === row.key;
            const missing = !auto;
```

(기존 `const value/isEditing/auto/missing` 선언 순서를 위처럼 재배치 — auto를 먼저 계산)

- [ ] **Step 2: confirm — 안내 문구**

목록 div(`<div className="mt-2 flex flex-col gap-3">...</div>`) 바로 아래에:

```tsx
        {(!autoKeys.has("weight") || !autoKeys.has("height")) && (
          <p className="mt-3 text-[15px] text-graytext">
            체중·신장은 설문에서 입력한 값을 사용해요
          </p>
        )}
```

- [ ] **Step 3: choose — 버튼 간격**

'검진표 없이 계속하기' 버튼 **2곳 모두**(choose 분기 ~588행, manual 분기 ~644행)의 className 앞에 `mt-6 ` 추가:

```tsx
            className="mt-6 w-full h-touch rounded-btn bg-white border-2 border-forest text-forest text-btn flex items-center justify-center active:brightness-95 transition"
```

- [ ] **Step 4: 검증**

Run: `npx tsc --noEmit` → 에러 없음

---

### Task 4: 최종 검증 + 프로덕션 배포

**Files:** 없음

- [ ] **Step 1: 빌드 + 테스트**

Run: `npm run build && npm test` → 빌드 성공, 21+ pass / 0 fail

- [ ] **Step 2: E2E (playwright-core)**

1. 설문 진입 → 진행바 "1 / 10 단계"
2. 6번째 문항 "임신을 몇 번 하셨어요?" 스텝퍼 확인
3. 8번째 문항에서 "술은 안 마셔요" 버튼 탭 → 선택 하이라이트 + [다음] 활성 → 완주 가능
4. 검진 → 검진표 없이 계속하기 버튼과 위 요소 간격 (스크린샷)
5. 완주 후 리포트 정상

- [ ] **Step 3: 프로덕션 배포 + 스모크**

Run: `vercel --prod --yes` → READY 확인
Run: `curl -s https://bonjourver10.vercel.app/survey` 200, 배포본에서 "1 / 10" 렌더 확인(브라우저)
