# 검진 체중·신장 덮어쓰기 + 설문 나이 제거 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 검진표의 체중·신장이 설문 값을 덮어쓰고, 설문에서 나이 문항을 제거해 가입 생년월일 기반 나이를 사용한다.

**Architecture:** `CheckupInputs`에 weight/height 추가 후 OCR·직접입력·예측 경로에 반영. `lib/age.ts`의 나이 계산 헬퍼를 신설해 스토어 `runAnalysis`에서 나이를 주입(스토어에 저장 → 기존 소비처 무수정). 설문은 9문항으로 재번호. checkup TabBar 계약 테스트를 의도에 맞게 정정. 스펙: `docs/superpowers/specs/2026-07-14-checkup-override-age-removal-design.md`

**Tech Stack:** Next.js 14 + zustand, node --test (lib 단위 테스트 + 소스 계약 테스트)

## Global Constraints

- **git 저장소 아님 → 커밋 없음.** 태스크 검증 `npx tsc --noEmit`
- 우선순위: 시뮬레이터 오버라이드 > **검진 값** > 설문 값 (체중), 검진 값 > 설문 값 (신장)
- 설문의 체중·신장 문항은 유지. 나이 문항만 제거 → **TOTAL_STEPS = 9**, step 1~9 연속 재번호
- OCR 신장 패턴: `{ kw: /신장|키|height/i, min: 100, max: 210 }`
- 이 작업 후 `npm test`는 **전체 green** (checkup TabBar pre-existing 실패가 테스트 정정으로 소멸)
- 계약 테스트 기존 매치 유지: survey 관련 `if (p === -1) router.push("/home")` 등 건드리지 않음

---

### Task 1: 나이 헬퍼 `lib/age.ts` (단위 테스트 TDD) + profile-add 공용화

**Files:**
- Create: `lib/age.ts`
- Test: `tests/age.test.mjs` (신규)
- Modify: `app/profile-add/page.tsx:18-26` (koreanAge 제거, 헬퍼 사용)

**Interfaces:**
- Produces: `ageFromParts(year: number, month: number, day: number): number`, `ageFromBirth(birth?: string): number | undefined` — Task 3(store)과 profile-add가 사용

- [ ] **Step 1: 실패하는 단위 테스트 작성**

`tests/age.test.mjs` 생성 (lib를 .ts로 직접 import 불가하므로 이 프로젝트의 lib 테스트 방식 확인: `tests/reportHistory.test.mjs`가 어떤 방식으로 lib를 로드하는지 먼저 읽고 동일 방식 사용. `lib/reportHistory`가 `.js`(CommonJS)라면 `lib/age.js`도 동일하게 CommonJS `.js` + JSDoc으로 작성한다):

```js
import test from "node:test";
import assert from "node:assert/strict";
import age from "../lib/age.js";
const { ageFromBirth, ageFromParts } = age;

test("ageFromBirth parses YYYY-MM-DD and computes 만 나이", () => {
  const now = new Date();
  const y = now.getFullYear();
  // 오늘이 생일인 사람: 만 나이 = 현재연도 - 출생연도
  const todayBirth = `${y - 65}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  assert.equal(ageFromBirth(todayBirth), 65);
});

test("ageFromBirth subtracts 1 before birthday", () => {
  const now = new Date();
  const y = now.getFullYear();
  // 내일이 생일 → 아직 만 나이 -1 (연말 경계는 파츠 함수로 별도 확인)
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (t.getFullYear() === y) {
    const birth = `${y - 65}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    assert.equal(ageFromBirth(birth), 64);
  }
});

test("ageFromBirth returns undefined for missing/invalid", () => {
  assert.equal(ageFromBirth(undefined), undefined);
  assert.equal(ageFromBirth(""), undefined);
  assert.equal(ageFromBirth("abc"), undefined);
  assert.equal(ageFromBirth("2050-99-99"), undefined);
});
```

Run: `npm test 2>&1 | grep -c "ageFromBirth"` → 실패(모듈 없음)

- [ ] **Step 2: `lib/age.js` 구현 (reportHistory와 동일한 CommonJS + JSDoc 스타일)**

```js
// 만 나이 계산 — 회원가입/프로필의 생년월일("YYYY-MM-DD")에서 나이를 파생한다.
// (설문에서 나이 문항이 제거되어 분석 시 이 값을 주입)

/**
 * @param {number} year @param {number} month @param {number} day
 * @returns {number} 만 나이
 */
function ageFromParts(year, month, day) {
  const today = new Date();
  let age = today.getFullYear() - year;
  const beforeBirthday =
    today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day);
  if (beforeBirthday) age -= 1;
  return age;
}

/**
 * @param {string} [birth] "YYYY-MM-DD"
 * @returns {number | undefined} 만 나이 (무효/누락이면 undefined)
 */
function ageFromBirth(birth) {
  if (!birth) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth);
  if (!m) return undefined;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return undefined;
  return ageFromParts(y, mo, d);
}

module.exports = { ageFromParts, ageFromBirth };
```

TypeScript에서 쓰도록 `lib/age.d.ts` 생성:

```ts
declare const age: {
  ageFromParts(year: number, month: number, day: number): number;
  ageFromBirth(birth?: string): number | undefined;
};
export = age;
```

(만약 `lib/reportHistory`가 다른 방식(예: .ts + 별도 로더)이라면 그 방식을 그대로 따르고 테스트 import도 맞춘다 — 프로젝트 관례 우선)

- [ ] **Step 3: 테스트 GREEN 확인**

Run: `npm test 2>&1 | grep -E "age"` → 3건 ✔

- [ ] **Step 4: profile-add 공용화**

`app/profile-add/page.tsx`: 파일 내 `koreanAge` 함수 삭제, `import age from "@/lib/age";` 추가 후 사용처(`const age = koreanAge(year, month, day);`)를 `const ageValue = age.ageFromParts(year, month, day);`로 교체(기존 변수명 `age`와의 충돌 주의 — 사용처 변수명이 `age`라면 import를 `import ageLib from "@/lib/age";`로 하고 `ageLib.ageFromParts(...)` 사용, 화면 표기 등 나머지 무변경). `daysInMonth`는 그대로 둔다.

- [ ] **Step 5: 타입체크**

Run: `npx tsc --noEmit` → 에러 없음

---

### Task 2: 검진 weight/height — 타입·OCR·직접입력·저장

**Files:**
- Modify: `lib/types.ts:25-31` (CheckupInputs)
- Modify: `app/checkup/page.tsx` (OCR_ROWS·OCR_PATTERNS·ocr state·submitOcr·manual form)
- Modify: `app/api/ocr/route.ts` (두 스키마 + 프롬프트)

**Interfaces:**
- Produces: `CheckupInputs.weight?: number; height?: number` — Task 3(예측)이 사용

- [ ] **Step 1: 타입 추가**

`CheckupInputs`의 `waist` 위에:

```ts
  weight?: number; // 체중(kg) — 검진표 값, 설문 값보다 우선
  height?: number; // 신장(cm) — 검진표 값, 설문 값보다 우선
```

- [ ] **Step 2: OCR 행·패턴·state**

`app/checkup/page.tsx`:

```ts
const OCR_ROWS = [
  { key: "weight", label: "체중", unit: "kg" },
  { key: "height", label: "신장", unit: "cm" },
  { key: "chol", label: "총콜레스테롤", unit: "mg/dL" },
  { key: "alp", label: "ALP (뼈 관련 수치)", unit: "IU/L" },
  { key: "crea", label: "크레아티닌", unit: "mg/dL" },
] as const;
```

`OCR_PATTERNS`에 (weight 다음):

```ts
  height: { kw: /신장|키|height/i, min: 100, max: 210 },
```

ocr state 초기값에 `height: "",` 추가.

- [ ] **Step 3: 저장 로직**

```ts
  const submitManual = () => {
    setCheckup({
      weight: form.weight ? Number(form.weight) : undefined,
      height: form.height ? Number(form.height) : undefined,
      waist: form.waist ? Number(form.waist) : undefined,
      alp: form.alp ? Number(form.alp) : undefined,
      sbp: form.sbp ? Number(form.sbp) : undefined,
    });
    router.push("/analysis");
  };

  const submitOcr = () => {
    // 검진표 체중·신장은 설문 값을 덮어쓴다 (예측에서 우선 사용)
    setCheckup({
      weight: ocr.weight ? Number(ocr.weight) : undefined,
      height: ocr.height ? Number(ocr.height) : undefined,
      alp: ocr.alp ? Number(ocr.alp) : undefined,
    });
    router.push("/analysis");
  };
```

form state: `const [form, setForm] = useState({ weight: "", height: "", waist: "", alp: "", sbp: "" });`

- [ ] **Step 4: 직접 입력 필드 2개 추가**

manual 폼의 허리둘레 Field 위에:

```tsx
            <Field
              label="체중"
              unit="kg"
              value={form.weight}
              onChange={(v) => setForm({ ...form, weight: v })}
            />
            <Field
              label="신장"
              unit="cm"
              value={form.height}
              onChange={(v) => setForm({ ...form, height: v })}
            />
```

- [ ] **Step 5: OCR API 스키마·프롬프트**

`app/api/ocr/route.ts`:
- `SCHEMA.properties`에 `height: { anyOf: [{ type: "number" }, { type: "null" }] },` (weight 다음), `required`를 `["weight", "height", "chol", "alp", "crea"]`로
- PROMPT 항목 목록의 weight 줄 다음에 `- height: 신장/키 (cm)` 추가
- Gemini responseSchema에도 `height: { type: "NUMBER", nullable: true },` + required 동일 갱신

- [ ] **Step 6: 타입체크**

Run: `npx tsc --noEmit` → 에러 없음

---

### Task 3: 예측·시뮬레이터 우선순위 + runAnalysis 나이 주입

**Files:**
- Modify: `lib/predict.ts:59-60` (toModelVars)
- Modify: `app/simulator/page.tsx:35` (baseWeight)
- Modify: `lib/store.ts:133-145` (runAnalysis)

**Interfaces:**
- Consumes: Task 1 `age.ageFromBirth`, Task 2 `CheckupInputs.weight/height`

- [ ] **Step 1: toModelVars 우선순위**

`lib/predict.ts`:

```ts
  // 우선순위: 시뮬레이터 오버라이드 > 검진표 값 > 설문 값
  const weight = ov?.weight ?? c.weight ?? a.weight;
  const height = c.height ?? a.height;
```

- [ ] **Step 2: 시뮬레이터 기준 체중**

`app/simulator/page.tsx`: `const baseWeight = answers.weight ?? 58;` → `const baseWeight = checkup.weight ?? answers.weight ?? 58;` (`checkup`은 이미 구독 중)

- [ ] **Step 3: runAnalysis 나이 주입**

`lib/store.ts` 상단에 `import age from "./age";` 추가 후 runAnalysis 교체:

```ts
        runAnalysis: () => {
          const { answers: raw, checkup, profiles, activeId } = get();
          // 나이는 프로필 생년월일에서 파생 (설문에 나이 문항 없음)
          const birth = profiles.find((p) => p.id === activeId)?.birth;
          const answers = {
            ...raw,
            age: age.ageFromBirth(birth) ?? raw.age,
          };
          const result = predict(answers, checkup);
          const prev =
            profiles.find((p) => p.id === activeId)?.reports ?? [];
          // 분석 이력 적재 (최근 20개 유지) — 리포트 날짜 드롭다운용
          const reports = [
            ...prev,
            { date: new Date().toISOString(), result },
          ].slice(-20);
          patchActive({ answers, result, reports });
          return result;
        },
```

(patchActive에 `answers`가 추가돼 마이페이지 "N세"·리포트 밴드가 파생 나이를 사용)

- [ ] **Step 4: 타입체크**

Run: `npx tsc --noEmit` → 에러 없음

---

### Task 4: 설문 9문항 + 나이 휠피커 제거

**Files:**
- Modify: `lib/survey.ts` (age 문항 삭제, step 재번호, TOTAL_STEPS)
- Modify: `app/survey/page.tsx` (age 분기·WheelPicker 삭제)

- [ ] **Step 1: 문항 정리**

`lib/survey.ts`: `key: "age"` 문항 객체 전체 삭제. 나머지 문항 step을 순서대로 1~9로 수정 (height 1, weight 2, menopause 3, menopauseAge 4, menarcheAge 5, hormone 6, strengthDays 7, education 8, sleepHours 9). `export const TOTAL_STEPS = 10;` → `9`. 파일 상단 주석 "설문 10문항" → "설문 9문항".

- [ ] **Step 2: 설문 페이지 정리**

`app/survey/page.tsx`:
- 터치 모드의 number 분기에서 age 특수 처리 제거 — 기존:

```tsx
      {q.type === "number" ? (
        q.key === "age" ? (
          <WheelPicker ... /> 
        ) : (
          <NumberStepper ... />
        )
      ) : (
```

→ `q.type === "number" ? (<NumberStepper key={q.key} q={q} value={...} onChange={...} />) : (` 형태로 단순화 (NumberStepper 호출부의 기존 props 그대로).
- `WheelPicker` 함수와 `WHEEL_ITEM`/`WHEEL_HEIGHT` 상수 등 관련 데드코드 삭제 (파일 내 다른 사용처 없음 — grep으로 확인 후 삭제).

- [ ] **Step 3: 타입체크 + 설문 계약 확인**

Run: `npx tsc --noEmit` → 에러 없음
Run: `npm test 2>&1 | grep "first survey question"` → ✔ 유지 (`if (p === -1) router.push("/home")` 무변경)

---

### Task 5: checkup TabBar 계약 테스트 정정

**Files:**
- Test: `tests/pageContracts.test.mjs:9-28`

- [ ] **Step 1: eligible 목록에서 checkup 제거 + 의도 고정**

기존 테스트의 `eligible` 배열에서 `"app/checkup/page.tsx",` 줄 삭제. 같은 테스트 블록 끝(루프 뒤)에 추가:

```js
  // 검진 입력은 의도적으로 탭바 없는 몰입 플로우
  const checkup = read("app/checkup/page.tsx");
  assert.equal((checkup.match(/<TabBar\s*\/>/g) ?? []).length, 0);
```

- [ ] **Step 2: 전체 테스트 green 확인**

Run: `npm test 2>&1 | grep -E "^# (pass|fail)|✖"`
Expected: **실패 0건** (fail 0)

---

### Task 6: 최종 검증

**Files:** 없음

- [ ] **Step 1: 빌드 + 전체 테스트**

Run: `npm run build && npm test` → 빌드 성공, 전체 green

- [ ] **Step 2: E2E (playwright-core 스크립트)**

1. 설문 진입 → 첫 문항이 "키가 어떻게 되세요?", 진행바 "1 / 9 단계"
2. 9문항 완주 → 검진 선택 → **직접 입력하기** → 체중·신장 필드 존재, 체중에 설문과 다른 값(예: 70) 입력 → 분석
3. 리포트: "NN대 여성 중 ..." 밴드가 가입 생년월일 기반 나이로 표시 (기본 데모 birth 1968 → 50대)
4. 마이페이지: "N세" 표시 (파생 나이)
5. 시뮬레이터 진입 → 기준 체중이 검진 입력값(70)인지
