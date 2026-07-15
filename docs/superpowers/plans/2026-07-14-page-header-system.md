# 앱 공통 헤더 체계(PageHeader) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모든 화면의 상단 첫 줄을 공통 `PageHeader` 컴포넌트로 통일하고, 설문 화면에 페이지명("건강 설문")을 부여하며 진행바를 헤더 아래 별도 줄로 분리한다.

**Architecture:** 신규 `components/PageHeader.tsx`(뒤로가기?+페이지명+우측슬롯?+보조줄?)를 만들고, `ScreenFrame`이 이를 사용하도록 개편한 뒤, 손으로 만든 각 페이지 헤더를 전부 PageHeader 호출로 교체한다. 스펙: `docs/superpowers/specs/2026-07-14-page-header-system-design.md`

**Tech Stack:** Next.js 14 (App Router) + React 18 + Tailwind CSS. 커스텀 토큰: `px-gutter`(28px), `pt-safetop`, `text-charcoal`, `text-graytext`, `rounded-chip`, `rounded-pill`.

## Global Constraints

- 페이지명: `text-[24px] font-bold text-charcoal whitespace-nowrap truncate` (기존 22px 사용처도 24px로 승격)
- 뒤로가기: 26px 셰브론 SVG, 터치영역 `w-8 h-11 -ml-1`, `aria-label="뒤로 가기"`
- 헤더 패딩: `px-gutter pt-safetop pb-3`
- 페이지명 자리에 단계·상태 표시 금지. 진행바 등 보조 UI는 헤더 아래 별도 줄
- **이 프로젝트는 git 저장소가 아님 → 커밋 단계 없음.** 각 태스크는 `npx tsc --noEmit`으로 검증
- UI 컴포넌트 테스트 인프라 없음(`tests/*.test.mjs`는 lib 로직 테스트). 검증은 타입체크 + 최종 육안 확인(Task 7)
- 기존 화면 문구(카피)는 그대로 유지. 유일한 신규 카피: 설문 "건강 설문", 검진 방법선택 "건강검진 입력"

---

### Task 1: `PageHeader` 컴포넌트 생성

**Files:**
- Create: `components/PageHeader.tsx`

**Interfaces:**
- Produces: `PageHeader({ title: string; back?: boolean; onBack?: () => void; subtitle?: string; right?: React.ReactNode })` — 이후 모든 태스크가 이 시그니처를 사용

- [ ] **Step 1: 컴포넌트 작성**

```tsx
"use client";

import { useRouter } from "next/navigation";

// 모든 화면 공통 헤더 — 체계: [뒤로가기?] [페이지명 24px] [우측 슬롯?] + 보조줄?
// 페이지명 자리에는 "화면 이름"만. 진행바 등 보조 UI는 이 아래 별도 줄로 렌더할 것.
export default function PageHeader({
  title,
  back = false,
  onBack,
  subtitle,
  right,
}: {
  title: string;
  back?: boolean;
  onBack?: () => void; // 기본 router.back() 대체 (예: 회원가입 → "/")
  subtitle?: string; // 제목 아래 보조줄 (홈 인사말 등)
  right?: React.ReactNode; // 우측 슬롯 (사용자 전환, 모드 칩 등)
}) {
  const router = useRouter();
  return (
    <div className="shrink-0 px-gutter pt-safetop pb-3">
      <div className="flex items-center gap-3">
        {back && (
          <button
            onClick={() => (onBack ? onBack() : router.back())}
            aria-label="뒤로 가기"
            className="w-8 h-11 -ml-1 flex items-center justify-center text-charcoal shrink-0"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        <h1 className="flex-1 min-w-0 text-[24px] font-bold text-charcoal whitespace-nowrap truncate">
          {title}
        </h1>
        {right != null && <div className="shrink-0">{right}</div>}
      </div>
      {subtitle && (
        <p className="mt-1 text-[15px] text-graytext whitespace-nowrap">
          {subtitle}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

---

### Task 2: `ScreenFrame` 개편 + 설문 터치 모드에 페이지명 적용

**Files:**
- Modify: `components/ScreenFrame.tsx` (전체 교체)
- Modify: `app/survey/page.tsx:318-321` (ScreenFrame 호출부)

**Interfaces:**
- Consumes: Task 1의 `PageHeader`
- Produces: `ScreenFrame({ title: string; ... })` — `title` prop이 **필수**로 추가됨. `progress`가 있으면 헤더 아래 `[ProgressBar flex-1][Boni 52px]` 줄 렌더. `boni`는 이제 진행바 줄에서만 표시

- [ ] **Step 1: ScreenFrame 전체 교체**

`components/ScreenFrame.tsx` 전체를 다음으로 교체:

```tsx
"use client";

import ProgressBar from "./ProgressBar";
import PageHeader from "./PageHeader";
import Boni, { BoniPose } from "./Boni";

// 모든 화면 공통 골격 — 헤더는 PageHeader(페이지명), 진행바는 헤더 아래 별도 줄.
// 본이는 진행바 줄 우측(52px)에만 표시.
export default function ScreenFrame({
  children,
  title,
  back = true,
  onBack,
  progress,
  boni,
  footer,
  scroll = true,
  bg = "ivory",
}: {
  children: React.ReactNode;
  title: string;
  back?: boolean;
  onBack?: () => void;
  progress?: { current: number; total: number };
  boni?: BoniPose;
  footer?: React.ReactNode; // 하단 고정 버튼 영역
  scroll?: boolean;
  bg?: "ivory" | "white";
}) {
  return (
    <div
      className={`flex flex-col h-dvh ${
        bg === "ivory" ? "bg-ivory" : "bg-white"
      }`}
    >
      {/* 상단 고정: 페이지명 헤더 */}
      <PageHeader title={title} back={back} onBack={onBack} />

      {/* 진행바 줄 — 헤더 아래, 본이는 우측 */}
      {progress && (
        <div className="shrink-0 flex items-center gap-3 px-gutter pb-2">
          <div className="flex-1">
            <ProgressBar current={progress.current} total={progress.total} />
          </div>
          {boni && <Boni pose={boni} size={52} className="shrink-0" />}
        </div>
      )}

      {/* 콘텐츠 스크롤 */}
      <div
        className={`flex-1 px-gutter pt-2 pb-4 ${
          scroll ? "overflow-y-auto" : ""
        }`}
      >
        {children}
      </div>

      {/* 하단 고정: CTA */}
      {footer && (
        <div className="shrink-0 px-gutter pb-10 pt-2 bg-transparent">
          {footer}
        </div>
      )}
    </div>
  );
}
```

주의: 기존 파일의 `useRouter` import와 뒤로가기 SVG는 PageHeader로 이동했으므로 제거됨.

- [ ] **Step 2: 설문 터치 모드 호출부에 title 추가**

`app/survey/page.tsx:318` — `<ScreenFrame` 호출에 `title="건강 설문"` 추가:

```tsx
    <ScreenFrame
      title="건강 설문"
      boni="point"
      onBack={goBack}
      progress={{ current: q.step, total: TOTAL_STEPS }}
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (title이 필수이므로 누락된 호출부가 있으면 여기서 잡힘 — ScreenFrame 사용처는 설문뿐)

---

### Task 3: 설문 음성 모드 헤더 교체

**Files:**
- Modify: `app/survey/page.tsx:204-229` (음성 모드 상단 고정 블록)

**Interfaces:**
- Consumes: Task 1의 `PageHeader`

- [ ] **Step 1: 음성 모드 헤더 블록 교체**

기존(뒤로가기 버튼 + ProgressBar + '음성 모드' 칩이 한 줄):

```tsx
        {/* 상단 고정: 뒤로가기 + 진행바 + '음성 모드' 칩 */}
        <div className="shrink-0 pt-safetop pb-2 px-gutter flex items-center gap-3">
          <button
            onClick={goBack}
            aria-label="뒤로 가기"
            className="w-8 h-11 -ml-1 flex items-center justify-center text-charcoal shrink-0"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="flex-1">
            <ProgressBar current={q.step} total={TOTAL_STEPS} />
          </div>
          <span className="text-[13px] font-bold text-forest bg-lightgreen rounded-chip px-3 py-1 shrink-0">
            음성 모드
          </span>
        </div>
```

교체(페이지명 헤더 + 진행바 별도 줄, '음성 모드' 칩은 우측 슬롯):

```tsx
        {/* 상단 고정: 페이지명 헤더('음성 모드' 칩 우측) + 진행바 줄 */}
        <PageHeader
          title="건강 설문"
          back
          onBack={goBack}
          right={
            <span className="text-[13px] font-bold text-forest bg-lightgreen rounded-chip px-3 py-1">
              음성 모드
            </span>
          }
        />
        <div className="shrink-0 px-gutter pb-2">
          <ProgressBar current={q.step} total={TOTAL_STEPS} />
        </div>
```

상단에 import 추가: `import PageHeader from "@/components/PageHeader";`
(음성 모드는 본이가 콘텐츠 영역에서 질문을 읽어주므로 진행바 줄에 본이 없음)

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

---

### Task 4: 탭 루트 4개 페이지 마이그레이션 (홈·AI 루틴·우리동네·마이페이지)

**Files:**
- Modify: `app/home/page.tsx:43-51`
- Modify: `app/routine/page.tsx:53-58`
- Modify: `app/local/page.tsx:17-22`
- Modify: `app/mypage/page.tsx:36-70` 부근 (헤더 블록)

**Interfaces:**
- Consumes: Task 1의 `PageHeader` (전부 back 없음)

각 파일 상단에 import 추가: `import PageHeader from "@/components/PageHeader";`

- [ ] **Step 1: 홈 — 인사말 title + subtitle**

기존:

```tsx
      {/* 상단 고정: 페이지명 (한 줄) */}
      <div className="shrink-0 pt-safetop pb-3 px-gutter">
        <h1 className="text-[24px] font-bold text-charcoal whitespace-nowrap truncate">
          {displayName}님, 안녕하세요!
        </h1>
        <p className="mt-1 text-[15px] text-graytext whitespace-nowrap">
          오늘도 뼈 건강 함께 챙겨요
        </p>
      </div>
```

교체:

```tsx
      <PageHeader
        title={`${displayName}님, 안녕하세요!`}
        subtitle="오늘도 뼈 건강 함께 챙겨요"
      />
```

- [ ] **Step 2: AI 루틴**

기존:

```tsx
      {/* 상단 고정: 페이지명 (한 줄) */}
      <div className="shrink-0 pt-safetop pb-3 px-gutter">
        <h1 className="text-[24px] font-bold text-charcoal whitespace-nowrap truncate">
          AI 루틴
        </h1>
      </div>
```

교체:

```tsx
      <PageHeader title="AI 루틴" />
```

- [ ] **Step 3: 우리동네**

기존(루틴과 동일 구조, 제목만 "우리동네") → 교체:

```tsx
      <PageHeader title="우리동네" />
```

- [ ] **Step 4: 마이페이지 — right=사용자 전환 버튼, subtitle 유지**

기존 헤더 블록(바깥 div + 안쪽 flex row + h1 + 사용자 전환 button + 보조줄 p)을 다음으로 교체.
사용자 전환 버튼 JSX는 **기존 코드 그대로** `right`로 이동:

```tsx
      <PageHeader
        title="마이페이지"
        subtitle="오늘도 실천해주셔서 멋져요!"
        right={
          <button
            onClick={() => setSheetOpen(true)}
            className="min-w-0 max-w-[180px] flex items-center gap-2 rounded-pill bg-white border border-borderline py-1.5 pl-1.5 pr-3 active:brightness-95"
          >
            <span className="w-[30px] h-[30px] shrink-0 rounded-full bg-lightgreen flex items-end justify-center overflow-hidden">
              <Boni pose="hello" size={24} />
            </span>
            <span className="min-w-0 truncate text-[15px] font-bold text-charcoal">
              {displayName}님
            </span>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6B6B6B"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        }
      />
```

- [ ] **Step 5: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

---

### Task 5: 하위 페이지 4개 마이그레이션 (즐겨찾기·시뮬레이터·프로필 추가·회원가입)

**Files:**
- Modify: `app/favorites/page.tsx:38-61`
- Modify: `app/simulator/page.tsx:72-96`
- Modify: `app/profile-add/page.tsx:87-112`
- Modify: `app/signup/page.tsx:119-143`

**Interfaces:**
- Consumes: Task 1의 `PageHeader` (전부 back 있음)

각 파일 상단에 import 추가: `import PageHeader from "@/components/PageHeader";`
각 파일의 기존 헤더 블록(주석 `{/* 상단 고정: 뒤로가기 + ... */}`부터 닫는 `</div>`까지, 인라인 뒤로가기 SVG 포함)을 아래 한 줄로 교체:

- [ ] **Step 1: 즐겨찾기** (22px → 24px 승격)

```tsx
      <PageHeader title="관심 건강 관리" back />
```

- [ ] **Step 2: 시뮬레이터**

```tsx
      <PageHeader title="무엇을 바꾸면 좋아질까요?" back />
```

- [ ] **Step 3: 프로필 추가** (22px → 24px 승격)

```tsx
      <PageHeader title="새 사용자 추가" back />
```

- [ ] **Step 4: 회원가입** (22px → 24px 승격, 뒤로가기는 홈으로)

```tsx
      <PageHeader title="회원가입" back onBack={() => router.push("/")} />
```

- [ ] **Step 5: 타입체크 + 미사용 코드 정리**

Run: `npx tsc --noEmit`
Expected: 에러 없음. 각 파일에서 헤더에만 쓰이던 import(예: 더 이상 안 쓰는 `useRouter`)가 남으면 정리 — 단 `router`를 다른 곳에서도 쓰는 파일(회원가입 등)은 유지.

---

### Task 6: 리포트 + 검진 입력 마이그레이션

**Files:**
- Modify: `app/report/page.tsx:95-99` (헤더 블록 상단)
- Modify: `app/checkup/page.tsx` — 3개 헤더(방법선택 ~517행, 촬영 ~300행, 결과확인 ~395행) + `BackArrow` 함수(653행) 삭제

**Interfaces:**
- Consumes: Task 1의 `PageHeader`

- [ ] **Step 1: 리포트 — 제목은 PageHeader, 날짜 드롭다운은 아래 줄 유지**

기존 블록은 `px-6`(24px)로 살짝 어긋나 있음 → `px-gutter`(28px)로 통일됨.

기존:

```tsx
      {/* 상단 고정: 페이지명(윗줄) + 날짜 드롭다운(아랫줄) — 제목이 잘리지 않도록 분리 */}
      <div className="shrink-0 pt-safetop pb-3 px-6">
        <h1 className="px-1 text-[24px] font-bold text-charcoal whitespace-nowrap">
          내 뼈 건강 리포트
        </h1>
        <div className="relative mt-2 inline-block">
```

교체 (select 블록 내용은 그대로 두고 감싸는 구조만 변경):

```tsx
      {/* 상단 고정: 페이지명 헤더 + 날짜 드롭다운(아랫줄) */}
      <PageHeader title="내 뼈 건강 리포트" />
      <div className="shrink-0 px-gutter pb-3 -mt-1">
        <div className="relative inline-block">
```

(기존 바깥 div의 닫는 태그 위치를 새 구조에 맞춰 조정 — select와 화살표 svg는 수정 없음)

- [ ] **Step 2: 검진 — 방법선택/직접입력 헤더** (신규 카피 "건강검진 입력" 부여)

기존(~516-527행):

```tsx
      {/* 상단 고정: 뒤로가기 + 선택입력 뱃지 */}
      <div className="shrink-0 pt-safetop pb-2 px-gutter flex items-center gap-3">
        <BackArrow
          onClick={() =>
            step === "manual" ? setStep("choose") : router.back()
          }
        />
        <div className="flex-1" />
        <span className="text-[14px] font-bold text-gold bg-white border-[1.5px] border-gold rounded-chip px-2.5 py-[2px]">
          선택 입력
        </span>
      </div>
```

교체:

```tsx
      <PageHeader
        title="건강검진 입력"
        back
        onBack={() => (step === "manual" ? setStep("choose") : router.back())}
        right={
          <span className="text-[14px] font-bold text-gold bg-white border-[1.5px] border-gold rounded-chip px-2.5 py-[2px]">
            선택 입력
          </span>
        }
      />
```

- [ ] **Step 3: 검진 — 촬영 헤더** (본이 46px는 우측 슬롯으로)

촬영 화면은 바깥 div가 패딩(`pt-safetop px-gutter`)을 갖고 있어 PageHeader와 겹침 → 바깥 div에서 패딩을 빼고 콘텐츠에 `px-gutter` 부여.

기존(~299-308행):

```tsx
      <div className="h-full bg-ivory flex flex-col pt-safetop px-gutter pb-6">
        <div className="shrink-0 flex items-center gap-3">
          <BackArrow onClick={() => setStep("choose")} />
          <span className="flex-1 text-[22px] font-bold text-charcoal whitespace-nowrap">
            검진표를 찍어주세요
          </span>
          <Boni pose="point" size={46} className="flex-none" />
        </div>
```

교체:

```tsx
      <div className="h-full bg-ivory flex flex-col pb-6">
        <PageHeader
          title="검진표를 찍어주세요"
          back
          onBack={() => setStep("choose")}
          right={<Boni pose="point" size={46} className="flex-none" />}
        />
```

그리고 이 화면의 나머지 형제 요소들(뷰파인더 `mt-5 flex-1 rounded-card ...`부터 하단 버튼까지)을 `<div className="flex-1 min-h-0 px-gutter flex flex-col">...</div>`로 감싸 좌우 패딩 유지 (뷰파인더가 `flex-1`이므로 래퍼에 `min-h-0` 필수).

- [ ] **Step 4: 검진 — 결과확인 헤더** (22px → 24px, 보조줄은 subtitle로)

기존(~394-405행):

```tsx
        {/* 상단 고정: 뒤로가기 + 페이지명 (한 줄) */}
        <div className="shrink-0 pt-safetop pb-2 px-gutter">
          <div className="flex items-center gap-3">
            <BackArrow onClick={() => setStep("camera")} />
            <span className="text-[22px] font-bold text-charcoal whitespace-nowrap truncate">
              읽은 값을 확인해주세요
            </span>
          </div>
          <div className="mt-1 text-[16px] text-graytext pl-[38px]">
            틀린 값이 있으면 눌러서 고쳐주세요
          </div>
        </div>
```

교체:

```tsx
        <PageHeader
          title="읽은 값을 확인해주세요"
          back
          onBack={() => setStep("camera")}
          subtitle="틀린 값이 있으면 눌러서 고쳐주세요"
        />
```

(보조줄이 15px·들여쓰기 없음으로 통일됨 — 의도된 규격화)

- [ ] **Step 5: `BackArrow` 함수 삭제 + import 추가 + 타입체크**

- `app/checkup/page.tsx` 653행 부근 `function BackArrow(...)` 전체 삭제 (사용처 3곳 모두 교체됨)
- 파일 상단에 `import PageHeader from "@/components/PageHeader";` 추가 (report도 동일)

Run: `npx tsc --noEmit`
Expected: 에러 없음 (BackArrow 잔여 참조가 있으면 여기서 잡힘)

---

### Task 7: 최종 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: 빌드 + 기존 테스트**

Run: `npm run build && npm test`
Expected: 빌드 성공, `tests/*.test.mjs` 전부 PASS

- [ ] **Step 2: 전 화면 육안 확인**

Run: `npm run dev` 후 아래 경로 확인 (Playwright 스크린샷 활용 가능):

| 경로 | 확인 포인트 |
|---|---|
| `/survey` (터치) | 헤더 "건강 설문" + 뒤로가기, 그 아래 진행바 줄("N / 10 단계" + 트랙 + 본이 우측) |
| `/survey` (음성 모드) | 헤더 "건강 설문" + 우측 '음성 모드' 칩, 아래 진행바 줄 |
| `/home` | 인사말 24px + 보조줄, 뒤로가기 없음 |
| `/routine` `/local` | 페이지명만 |
| `/mypage` | 페이지명 + 우측 사용자 전환 + 보조줄, 전환 시트 동작 |
| `/favorites` `/simulator` `/profile-add` `/signup` | 뒤로가기 + 24px 페이지명, 회원가입 뒤로가기 → `/` |
| `/report` | 페이지명 + 아래 날짜 드롭다운, 드롭다운 동작 |
| `/checkup` | 3개 단계 헤더 전부 (방법선택 "건강검진 입력"+뱃지 / 촬영+본이 / 결과확인+보조줄), 단계 간 뒤로가기 동작 |
| `/onboarding`, AI 분석 | 변경 없음(헤더 없는 풀스크린 유지) 확인 |

Expected: 모든 화면에서 헤더 첫 줄 규격 동일(24px·패딩·뒤로가기), 설문 페이지명 자리에 "~단계" 없음
