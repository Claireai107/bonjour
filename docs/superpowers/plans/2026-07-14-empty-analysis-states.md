# 빈 상태 통일(EmptyAnalysis) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 분석 결과가 없을 때 루틴·리포트 탭이 홈과 동일한 빈 상태(본이+분석 시작 버튼)를 보여주고, 마이페이지 루틴 카드는 측정 유도 카드로 바뀐다.

**Architecture:** 홈의 빈 상태 블록을 `components/EmptyAnalysis.tsx`로 추출해 홈·루틴·리포트가 공유. 루틴·리포트의 `/survey` 리다이렉트 제거. 리포트는 본문을 같은 파일 내 `ReportBody` 컴포넌트로 추출해 단일 return을 유지. 스펙: `docs/superpowers/specs/2026-07-14-empty-analysis-states-design.md`

**Tech Stack:** Next.js 14 + React 18 + Tailwind, node --test 소스 계약 테스트

## Global Constraints

- **파일당 `<TabBar />` 소스에 정확히 1개** (계약 테스트가 정규식으로 검사) — 분기별 TabBar 중복 금지, 단일 return + 조건부 콘텐츠
- 빈 상태 문구·동작은 홈 기존 그대로: "아직 측정한 데이터가 없어요" / "30초 설문이면 내 뼈 건강을\n확인할 수 있어요" / 버튼 "AI 뼈건강 분석 시작" → `reset()` 후 `router.push("/onboarding")`
- 신규 문구는 마이페이지 2건만: "뼈건강 데이터를 측정하면 맞춤 루틴을 알려드려요", "분석 시작하기"
- `hydrated` 전 `return null` 유지 (플래시 방지)
- **git 저장소 아님 → 커밋 없음.** 태스크 검증 `npx tsc --noEmit`
- pre-existing 테스트 실패 2건 중 "empty home ..."은 Task 1에서 새 구조에 맞게 **갱신해 green으로 만든다** (홈 로직이 EmptyAnalysis로 이동하므로). "eligible pages ... tab bar"(checkup 0개)는 계속 범위 밖

---

### Task 1: `EmptyAnalysis` 컴포넌트 + 홈 교체 + 계약 테스트 갱신

**Files:**
- Create: `components/EmptyAnalysis.tsx`
- Modify: `app/home/page.tsx` (빈 상태 블록 교체, 불필요 import 정리)
- Test: `tests/pageContracts.test.mjs:45-50` ("empty home starts a fresh analysis..." 테스트 교체)

**Interfaces:**
- Produces: `EmptyAnalysis()` — props 없음. 내부에서 `useRouter`, `useBonJour((s) => s.reset)` 사용. Task 2·3이 이 컴포넌트를 렌더

- [ ] **Step 1: 계약 테스트를 새 구조에 맞게 교체 (RED)**

`tests/pageContracts.test.mjs`의 기존 테스트(45-50행 부근):

```js
test("empty home starts a fresh analysis at survey question one", () => {
  const home = read("app/home/page.tsx");
  assert.match(home, /const reset = useBonJour\(\(s\) => s\.reset\)/);
  assert.match(home, /reset\(\);\s*router\.push\("\/survey"\)/);
  assert.match(home, />\s*AI 뼈건강 분석 시작\s*</);
});
```

을 다음으로 교체:

```js
test("empty state offers to start a fresh analysis (shared component)", () => {
  const empty = read("components/EmptyAnalysis.tsx");
  assert.match(empty, /const reset = useBonJour\(\(s\) => s\.reset\)/);
  assert.match(empty, /reset\(\);\s*router\.push\("\/onboarding"\)/);
  assert.match(empty, />\s*AI 뼈건강 분석 시작\s*</);
  // 홈·루틴·리포트가 공용 빈 상태를 사용
  for (const file of ["app/home/page.tsx", "app/routine/page.tsx", "app/report/page.tsx"]) {
    assert.match(read(file), /<EmptyAnalysis\s*\/>/, `${file} should render EmptyAnalysis`);
  }
});
```

- [ ] **Step 2: RED 확인**

Run: `npm test 2>&1 | grep "shared component"`
Expected: `✖ empty state offers to start a fresh analysis (shared component)` (컴포넌트 파일 없음)

- [ ] **Step 3: `components/EmptyAnalysis.tsx` 생성**

```tsx
"use client";

import { useRouter } from "next/navigation";
import Boni from "./Boni";
import { useBonJour } from "@/lib/store";

// 분석 결과가 없을 때 공용 빈 상태 — 홈·AI 루틴·리포트 공통.
// 문구·동작은 홈의 기존 빈 상태와 동일 (reset 후 온보딩으로).
export default function EmptyAnalysis() {
  const router = useRouter();
  const reset = useBonJour((s) => s.reset);
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <Boni pose="point" size={130} />
      <p className="mt-6 text-[22px] font-bold text-charcoal">
        아직 측정한 데이터가 없어요
      </p>
      <p className="mt-2 text-[16px] text-graytext leading-[1.55]">
        30초 설문이면 내 뼈 건강을
        <br />
        확인할 수 있어요
      </p>
      <button
        onClick={() => {
          reset();
          router.push("/onboarding"); // 음성/손 입력 방식 선택으로
        }}
        className="btn-primary mt-8"
      >
        AI 뼈건강 분석 시작
      </button>
    </div>
  );
}
```

- [ ] **Step 4: 홈 교체**

`app/home/page.tsx`에서 기존 빈 상태 블록:

```tsx
          /* 측정 데이터 없음 — 측정하러 가기 */
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Boni pose="point" size={130} />
            <p className="mt-6 text-[22px] font-bold text-charcoal">
              아직 측정한 데이터가 없어요
            </p>
            <p className="mt-2 text-[16px] text-graytext leading-[1.55]">
              30초 설문이면 내 뼈 건강을
              <br />
              확인할 수 있어요
            </p>
            <button
              onClick={() => {
                reset();
                router.push("/onboarding"); // 음성/손 입력 방식 선택으로
              }}
              className="btn-primary mt-8"
            >
              AI 뼈건강 분석 시작
            </button>
          </div>
```

을 다음으로 교체:

```tsx
          /* 측정 데이터 없음 — 측정하러 가기 */
          <EmptyAnalysis />
```

import 정리:
- 추가: `import EmptyAnalysis from "@/components/EmptyAnalysis";`
- 제거: `import Boni from "@/components/Boni";` (홈에서 유일한 사용처였음 — 제거 전 파일 내 `Boni` 잔여 사용 없음을 grep으로 확인)
- 제거: `const reset = useBonJour((s) => s.reset);` (홈에서 유일한 사용처였음 — 동일하게 확인)
- `router`는 다른 곳에서도 쓰므로 유지

- [ ] **Step 5: GREEN 확인 (홈까지만— 루틴·리포트 매치는 Task 2·3 후 통과)**

Run: `npm test 2>&1 | grep "shared component"`
Expected: 아직 ✖ (루틴·리포트가 EmptyAnalysis 미사용). `assert` 메시지가 `app/routine/page.tsx should render EmptyAnalysis`로 바뀌었는지 확인 — 컴포넌트·홈 부분은 통과했다는 뜻.
Run: `npx tsc --noEmit` → 에러 없음

---

### Task 2: AI 루틴 빈 상태

**Files:**
- Modify: `app/routine/page.tsx` (리다이렉트 제거, 조건부 콘텐츠)

**Interfaces:**
- Consumes: Task 1의 `EmptyAnalysis` (props 없음)

- [ ] **Step 1: 리다이렉트 effect 제거**

```tsx
  useEffect(() => {
    if (hydrated && !result) router.replace("/survey");
  }, [hydrated, result, router]);
```

블록 삭제. `useEffect` import가 이 파일에서 더 안 쓰이면 import 목록에서 `useEffect` 제거 (다른 사용처 있으면 유지 — grep으로 확인). `router`는 다른 곳에서 쓰면 유지.

- [ ] **Step 2: 가드 완화 + 조건부 콘텐츠**

`if (!hydrated || !result) return null;` → `if (!hydrated) return null;`

기존 콘텐츠 스크롤 div를 조건부로 감싼다:

```tsx
      {result ? (
        <div className="flex-1 overflow-y-auto px-gutter pb-6">
          {/* ...기존 내용 전체 그대로(cards.map ~ 하단 안내문)... */}
        </div>
      ) : (
        <EmptyAnalysis />
      )}
```

(기존 div 내부는 한 글자도 바꾸지 않고 그대로 둔다 — 들여쓰기만 조정. `<TabBar />`와 토스트는 조건 밖, 파일에 TabBar 1개 유지)

import 추가: `import EmptyAnalysis from "@/components/EmptyAnalysis";`

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit` → 에러 없음
Run: `npm test 2>&1 | grep "shared component"` → assert 메시지가 `app/report/page.tsx should render EmptyAnalysis`로 진행됐는지 확인

---

### Task 3: 리포트 빈 상태 (본문 추출 + 조건부)

**Files:**
- Modify: `app/report/page.tsx` (리다이렉트 제거, `ReportBody` 추출, 단일 return 유지)

**Interfaces:**
- Consumes: Task 1의 `EmptyAnalysis`
- Produces: 같은 파일 내 `function ReportBody({ history, sel, setSel, answers }: { history: ReturnType<typeof buildReportHistory>; sel: number; setSel: (n: number) => void; answers: SurveyAnswers })` — 외부 노출 없음

- [ ] **Step 1: 리다이렉트 effect 제거 + 가드 완화**

```tsx
  // 결과 없으면 설문으로 (새로고침/직접진입 방어)
  useEffect(() => {
    if (hydrated && !latestResult) router.replace("/survey");
  }, [hydrated, latestResult, router]);
  if (!hydrated || !latestResult || history.length === 0) return null;
```

→ 리다이렉트 effect 삭제, 가드는 `if (!hydrated) return null;`로.

- [ ] **Step 2: 본문을 `ReportBody`로 추출하고 단일 return 구성**

`ReportScreen`의 return을 다음 골격으로 바꾼다:

```tsx
  const empty = !latestResult || history.length === 0;

  return (
    <div className="h-dvh bg-ivory flex flex-col">
      {/* 상단 고정: 페이지명 헤더 */}
      <PageHeader title="내 뼈 건강 리포트" />
      {empty ? (
        <EmptyAnalysis />
      ) : (
        <ReportBody history={history} sel={sel} setSel={setSel} answers={answers} />
      )}
      <TabBar />
    </div>
  );
```

`ReportBody`는 같은 파일 하단에 새 함수로 만들고, 다음을 **그대로 이동**한다(수정 금지, 이동만):
- 결과 계산부: `const result = history[clampReportSelection(sel, history.length)].result;` 부터 `const delta = ...`까지 (기존 80-95행 부근)
- JSX: 날짜 드롭다운 줄(`<div className="shrink-0 px-gutter pb-3 -mt-1">`...)부터 `<TabBar />` **직전**의 마지막 요소까지 전부
- `ReportBody` 내부에서 `router`가 필요하면 함수 안에서 `const router = useRouter();`로 새로 취득

시그니처:

```tsx
function ReportBody({
  history,
  sel,
  setSel,
  answers,
}: {
  history: ReturnType<typeof buildReportHistory>;
  sel: number;
  setSel: (n: number) => void;
  answers: SurveyAnswers;
}) {
```

`SurveyAnswers` 타입 import가 없으면 `import type { SurveyAnswers } from "@/lib/types";` 추가. `EmptyAnalysis` import 추가. `ReportScreen`에 남는 미사용 변수(예: 이동한 계산부가 쓰던 것)는 정리하되, `hydrated`/`latestResult`/`activeId` 등 아직 쓰는 것은 유지.

- [ ] **Step 3: 타입체크 + 테스트**

Run: `npx tsc --noEmit` → 에러 없음
Run: `npm test 2>&1 | grep -E "shared component|tab bar"`
Expected: `✔ empty state offers to start a fresh analysis (shared component)` (Task 1 테스트 완전 green). tab bar 테스트는 checkup 때문에 계속 ✖ (pre-existing, 무시)

---

### Task 4: 마이페이지 측정 유도 카드

**Files:**
- Modify: `app/mypage/page.tsx:107-147` 부근 ('오늘의 맞춤 루틴' 카드)

**Interfaces:**
- Consumes: 없음 (파일 내 기존 `result`, `reset`, `router` 사용)

- [ ] **Step 1: 카드를 조건부로 교체**

기존 카드 전체(`{/* 오늘의 맞춤 루틴 */}` 주석부터 해당 카드의 닫는 `</div>`까지)를 다음으로 교체.
**전구 svg와 기존 카드 내부는 원본 그대로** — 아래 "기존 카드 markup 그대로" 자리에 현재 코드를 그대로 둔다:

```tsx
        {/* 오늘의 맞춤 루틴 — 결과 없으면 측정 유도 카드 */}
        {result ? (
          <div className="mt-2.5 bg-lightgreen rounded-card px-5 pt-3.5 pb-3">
            {/* ...기존 카드 markup 그대로 (전구 svg + '오늘의 맞춤 루틴' + 전체 보기 + RoutineRow 2개)... */}
          </div>
        ) : (
          <button
            onClick={() => {
              reset();
              router.push("/onboarding");
            }}
            className="mt-2.5 bg-lightgreen rounded-card px-5 py-4 flex items-center gap-2.5 text-left active:brightness-95"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3E7A4E"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M9 18h6" />
              <path d="M10 22h4" />
              <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z" />
            </svg>
            <span className="flex-1 text-[17px] font-bold text-charcoal leading-[1.5]">
              뼈건강 데이터를 측정하면
              <br />
              맞춤 루틴을 알려드려요
            </span>
            <span className="flex items-center gap-0.5 text-[15px] font-bold text-forest whitespace-nowrap">
              분석 시작하기
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3E7A4E"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </span>
          </button>
        )}
```

(`reset`은 이 파일에 이미 있음 — '처음부터 다시 하기' 메뉴가 사용)

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit` → 에러 없음

---

### Task 5: 최종 검증

**Files:** 없음

- [ ] **Step 1: 빌드 + 테스트**

Run: `npm run build && npm test`
Expected: 빌드 성공. `✔ empty state offers to start a fresh analysis (shared component)` 포함 통과. 실패는 "eligible pages render exactly one bottom tab bar"(checkup, pre-existing) **1건만**.

- [ ] **Step 2: dev 서버 확인 (결과 없는 상태)**

- `/routine`, `/report` 직접 진입 → 리다이렉트 없이 [PageHeader + 본이 빈 상태 + AI 뼈건강 분석 시작 + 하단 탭바] 렌더
- `/mypage` → 연두 카드가 "뼈건강 데이터를 측정하면 맞춤 루틴을 알려드려요" + '분석 시작하기 ›', 탭하면 `/onboarding` 이동
- `/home` → 기존과 동일한 빈 상태 (시각 변화 없음)
- 빈 상태 버튼 클릭 → `/onboarding` 이동 확인
