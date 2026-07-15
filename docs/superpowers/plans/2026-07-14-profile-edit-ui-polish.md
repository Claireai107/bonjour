# 프로필 수정/삭제 + UI 폴리시 6건 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 빈 상태 버튼 폭·우리동네 문구·아바타 UX(피크/얼굴 크롭)를 다듬고, 사용자 수정/삭제 기능과 추가 완료 얼럿을 넣는다.

**Architecture:** 공용 `Avatar`(얼굴 크롭 원형)·`Dialog`(알림/확인) 컴포넌트를 신설하고, 스토어에 `updateProfile`/`removeProfile`을 추가한다. `/profile-add`는 `?edit=<id>`로 편집 모드를 겸하고, 사용자 전환 시트의 연필 버튼이 편집 모드를 토글한다. 스펙: `docs/superpowers/specs/2026-07-14-profile-edit-ui-polish-design.md`

**Tech Stack:** Next.js 14 + React 18 + Tailwind + zustand(persist), node --test 소스 계약 테스트

## Global Constraints

- **git 저장소 아님 → 커밋 없음.** 태스크 검증 `npx tsc --noEmit`
- 계약 테스트 유지: profile-add의 추가 경로에 `setProfileInfo({ avatar, ... })` **객체 리터럴** 형태 유지 (기존 테스트가 `/setProfileInfo\(\{[\s\S]*?avatar/` 정규식 검사), `AVATARS.map(`·`setAvatar(`·`avatarPose(` 매치 유지, 파일당 `<TabBar />` 1개 유지
- 본인 프로필 id는 `"me"`, relation `"본인"` — 삭제 불가
- 신규 문구: "사용자가 추가되었습니다" / "수정되었습니다" / "'{이름}'님을 삭제할까요?\n기록도 함께 삭제돼요" / "저장하기" / "사용자 정보 수정" / "완료" / "삭제" / "취소" / 우리동네 부제 "AI 추천 운동을 근처에서"
- pre-existing 테스트 실패 1건(checkup TabBar)은 범위 밖

---

### Task 1: 코스메틱 2건 — 빈 상태 버튼 폭 + 우리동네 부제 한 줄

**Files:**
- Modify: `components/EmptyAnalysis.tsx` (루트 className)
- Modify: `components/LocalSection.tsx:86-88` 부근 (부제 문구)

- [ ] **Step 1: EmptyAnalysis 루트에 px-gutter**

`<div className="flex-1 flex flex-col items-center justify-center text-center">` → `<div className="flex-1 px-gutter flex flex-col items-center justify-center text-center">`

- [ ] **Step 2: 우리동네 부제 교체**

`AI가 추천한 운동을 근처에서 할 수 있어요` → `AI 추천 운동을 근처에서` (LocalSection 헤더의 `<p className="text-[18px] font-medium text-graytext">`)

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit` → 에러 없음

---

### Task 2: `Avatar` 컴포넌트(얼굴 크롭) + 4곳 적용 + 픽커 피크

**Files:**
- Create: `components/Avatar.tsx`
- Modify: `app/profile-add/page.tsx` (픽커: 풀블리드 + Avatar)
- Modify: `app/mypage/page.tsx` (헤더 칩 30 / 프로필 카드 52)
- Modify: `components/ProfileSwitcher.tsx:80-86` (행 아바타 56)

**Interfaces:**
- Consumes: `Boni`, `BoniPose`, `avatarPose`
- Produces: `Avatar({ pose: BoniPose; size: number; ring?: boolean; className?: string })` — Task 5도 사용

- [ ] **Step 1: Avatar 컴포넌트 생성**

```tsx
"use client";

import Boni, { BoniPose } from "./Boni";

// 원형 아바타 — 이미지를 원보다 크게(1.4배) 넣고 위쪽 정렬해 머리~상반신 크롭.
// ring: 선택/활성 테두리(포레스트 2.5px)
export default function Avatar({
  pose,
  size,
  ring = false,
  className = "",
}: {
  pose: BoniPose;
  size: number; // 원 지름(px)
  ring?: boolean;
  className?: string;
}) {
  return (
    <span
      style={{ width: size, height: size }}
      className={`rounded-full bg-lightgreen box-border overflow-hidden flex items-start justify-center flex-none ${
        ring ? "border-[2.5px] border-forest" : ""
      } ${className}`}
    >
      <Boni pose={pose} size={Math.round(size * 1.4)} />
    </span>
  );
}
```

- [ ] **Step 2: 픽커 — 풀블리드 스크롤 + Avatar**

`app/profile-add/page.tsx`의 픽커 블록 교체 (import에 `Avatar` 추가, 기존 Boni import는 다른 사용처 없으면 정리하되 `AVATARS`·`BoniPose`는 유지):

기존:

```tsx
      <div className="mt-2 flex gap-3 overflow-x-auto pb-1">
        {AVATARS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAvatar(a)}
            className={`w-16 h-16 shrink-0 rounded-full bg-lightgreen box-border flex items-end justify-center overflow-hidden ${
              avatar === a
                ? "border-[2.5px] border-forest"
                : "border border-borderline"
            }`}
          >
            <Boni pose={a} size={a === "face" ? 44 : 52} />
          </button>
        ))}
      </div>
```

교체 (풀블리드 `-mx-gutter px-gutter` → 5번째 원이 화면 끝에 걸침):

```tsx
      <div className="mt-2 -mx-gutter px-gutter flex gap-3 overflow-x-auto pb-1">
        {AVATARS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAvatar(a)}
            className="shrink-0"
          >
            <Avatar
              pose={a}
              size={64}
              ring={avatar === a}
              className={avatar === a ? "" : "border border-borderline"}
            />
          </button>
        ))}
      </div>
```

- [ ] **Step 3: 마이페이지 2곳**

(a) 헤더 칩 — 기존:

```tsx
            <span className="w-[30px] h-[30px] shrink-0 rounded-full bg-lightgreen flex items-end justify-center overflow-hidden">
              <Boni pose={avatarPose(profile.avatar)} size={24} />
            </span>
```

교체: `<Avatar pose={avatarPose(profile.avatar)} size={30} />`

(b) 프로필 카드 — 기존:

```tsx
            <div className="w-[52px] h-[52px] rounded-full bg-lightgreen flex items-end justify-center overflow-hidden flex-none">
              <Boni pose="hello" size={43} />
            </div>
```

주의: 위 블록의 실제 현재 pose는 `avatarPose(profile.avatar)`임 — 그대로 유지하며 교체: `<Avatar pose={avatarPose(profile.avatar)} size={52} />`

import 정리: `Avatar` 추가, 파일에서 `Boni` 직접 사용이 사라지면 `import Boni` 제거하고 `avatarPose`만 남김 (`import { avatarPose } from "@/components/Boni";`) — grep으로 잔여 사용 확인.

- [ ] **Step 4: 전환 시트 행**

`components/ProfileSwitcher.tsx` — 기존:

```tsx
                <span
                  className={`w-14 h-14 rounded-full bg-lightgreen box-border flex items-end justify-center overflow-hidden flex-none ${
                    active ? "border-[2.5px] border-forest" : ""
                  }`}
                >
                  <Boni pose={avatarPose(p.avatar)} size={44} />
                </span>
```

교체: `<Avatar pose={avatarPose(p.avatar)} size={56} ring={active} />`
(import Avatar 추가; Boni 직접 사용 없어지면 `import { avatarPose } from "@/components/Boni";`로 정리)

- [ ] **Step 5: 타입체크**

Run: `npx tsc --noEmit` → 에러 없음. `npm test 2>&1 | grep "pick an avatar"` → ✔ 유지 (`AVATARS.map(`·`setAvatar(`·`avatarPose(` 전부 존치)

---

### Task 3: 스토어 액션 + `Dialog` 컴포넌트 + 계약 테스트(RED)

**Files:**
- Modify: `lib/store.ts` (타입 선언 + 액션 2개)
- Create: `components/Dialog.tsx`
- Test: `tests/pageContracts.test.mjs` (신규 테스트 1건 추가)

**Interfaces:**
- Produces: `updateProfile(id: string, patch: Partial<ProfileData>): void`, `removeProfile(id: string): void`, `Dialog({ open, message, confirmLabel?, cancelLabel?, onConfirm, onCancel? })` — Task 4·5가 사용

- [ ] **Step 1: 계약 테스트 추가 (RED)**

`tests/pageContracts.test.mjs` 끝에:

```js
test("profile switcher edit mode can update and remove users", () => {
  const store = read("lib/store.ts");
  assert.match(store, /updateProfile: \(id, patch\)/);
  assert.match(store, /removeProfile: \(id\)/);
  const switcher = read("components/ProfileSwitcher.tsx");
  assert.match(switcher, /profile-add\?edit=/);
  assert.match(switcher, /removeProfile/);
});
```

Run: `npm test 2>&1 | grep "update and remove"` → ✖ (store에 액션 없음)

- [ ] **Step 2: 스토어 타입 + 액션**

`lib/store.ts`의 `BonJourState` 인터페이스에서 `addProfile: (name: string, relation: string) => string;` 아래에 추가:

```ts
  updateProfile: (id: string, patch: Partial<ProfileData>) => void;
  removeProfile: (id: string) => void;
```

구현부 `addProfile: ... },` 바로 아래에 추가:

```ts
        updateProfile: (id, patch) =>
          set((s) => {
            const profiles = s.profiles.map((p) =>
              p.id === id ? { ...p, ...patch } : p
            );
            const active = profiles.find((p) => p.id === s.activeId)!;
            return { profiles, ...mirror(active) };
          }),

        // 본인("me")은 삭제 불가. 활성 사용자를 지우면 본인으로 전환
        removeProfile: (id) =>
          set((s) => {
            if (id === "me") return {};
            const profiles = s.profiles.filter((p) => p.id !== id);
            const activeId = s.activeId === id ? "me" : s.activeId;
            const active = profiles.find((p) => p.id === activeId)!;
            return { profiles, activeId, ...mirror(active) };
          }),
```

- [ ] **Step 3: Dialog 컴포넌트 생성**

```tsx
"use client";

// 공용 다이얼로그 — 완료 알림(확인만) / 삭제 확인(취소+확인).
// 딤 탭으로는 닫히지 않음(시니어 오조작 방지) — 버튼으로만 닫는다.
export default function Dialog({
  open,
  message,
  confirmLabel = "확인",
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string; // 있으면 2버튼(취소/확인)
  onConfirm: () => void;
  onCancel?: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-gutter">
      <div className="absolute inset-0 bg-[rgba(43,43,43,.45)]" aria-hidden />
      <div className="relative w-full max-w-[340px] bg-white rounded-card px-6 pt-7 pb-5 shadow-[0_8px_30px_rgba(0,0,0,.2)]">
        <p className="text-[18px] font-bold text-charcoal text-center leading-[1.5] break-keep whitespace-pre-line">
          {message}
        </p>
        <div className="mt-6 flex gap-2.5">
          {cancelLabel && (
            <button
              onClick={onCancel}
              className="flex-1 h-touch rounded-btn bg-lightgreen text-forest text-[18px] font-bold active:brightness-95"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={onConfirm}
            className="flex-1 h-touch rounded-btn bg-forest text-white text-[18px] font-bold active:brightness-95"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 진행 확인**

Run: `npx tsc --noEmit` → 에러 없음
Run: `npm test 2>&1 | grep "update and remove"` → 여전히 ✖이되, assert 실패 지점이 switcher(`profile-add?edit=`) 매치로 진행됐는지 확인 (store 부분 통과)

---

### Task 4: profile-add 편집 모드 + 추가 완료 얼럿

**Files:**
- Modify: `app/profile-add/page.tsx`

**Interfaces:**
- Consumes: Task 3 `updateProfile`·`Dialog`, Task 2 `Avatar`(이미 적용됨), 기존 `avatarPose`

- [ ] **Step 1: Suspense 3층 구조로 재편**

`useSearchParams()`는 Next 14에서 Suspense 경계가 필요. 파일 구조를 다음으로:

```tsx
export default function ProfileAddScreen() {
  return (
    <Suspense fallback={null}>
      <ProfileAddGate />
    </Suspense>
  );
}

// 편집 모드는 persist 복원 후에 프리필해야 하므로 hydration 게이트
function ProfileAddGate() {
  const params = useSearchParams();
  const editId = params.get("edit");
  const hydrated = useHydrated();
  if (editId && !hydrated) return null;
  return <ProfileAddForm editId={editId} />;
}

function ProfileAddForm({ editId }: { editId: string | null }) {
  // ...기존 컴포넌트 본문 전체가 여기로...
}
```

import 추가: `import { Suspense } from "react";`(기존 useState와 병합), `import { useSearchParams } from "next/navigation";`(useRouter와 병합), `import { useHydrated } from "@/lib/useHydrated";`, `import Dialog from "@/components/Dialog";`, `import { avatarPose } from "@/components/Boni";`(기존 import에 병합), store에서 `const profiles = useBonJour((s) => s.profiles);`, `const updateProfile = useBonJour((s) => s.updateProfile);`

- [ ] **Step 2: 프리필**

`ProfileAddForm` 상단(기존 state 선언부를 다음으로 교체):

```tsx
  const editing = profiles.find((p) => p.id === editId) ?? null;
  const [by, bm, bd] = editing?.birth?.split("-").map(Number) ?? [];

  const [avatar, setAvatar] = useState<BoniPose>(avatarPose(editing?.avatar));
  const [name, setName] = useState(editing?.name ?? "");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"F" | "M">(editing?.gender ?? "F");
  const [year, setYear] = useState(by || 1962);
  const [month, setMonth] = useState(bm || 7);
  const [day, setDay] = useState(bd || 2);
  const [addr, setAddr] = useState(editing?.region ?? "");
  const [addrDetail, setAddrDetail] = useState("");
  const [postcodeOpen, setPostcodeOpen] = useState(false);
  const [doneOpen, setDoneOpen] = useState(false);
```

(신규 모드에선 `editing`이 null이라 기존 기본값과 동일. `avatarPose(undefined)`는 "face")

- [ ] **Step 3: submit 분기 + 얼럿 + 마이페이지 이동**

기존 `submit`을 교체:

```tsx
  const submit = () => {
    if (!canSubmit) return;
    const birth = `${year}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    const region = addr.trim() || "순천시";
    if (editId) {
      updateProfile(editId, { name: name.trim(), avatar, gender, birth, region });
    } else {
      addProfile(name.trim(), "가족"); // 새 프로필 생성 + 활성화
      setProfileInfo({ avatar, gender, birth, region });
    }
    setDoneOpen(true); // 확인 시 마이페이지로 (설문 강제 진입 제거)
  };
```

- [ ] **Step 4: 화면 요소 분기**

- `<PageHeader title="새 사용자 추가" back />` → `<PageHeader title={editId ? "사용자 정보 수정" : "새 사용자 추가"} back />`
- 제출 버튼 라벨 `추가하기` → `{editId ? "저장하기" : "추가하기"}`
- "데모용 빠르게 채우기" 버튼을 `{!editId && ( ...기존 버튼... )}`으로 감싸 편집 모드에서 숨김
- 파일 하단(루트 닫는 태그 직전, TabBar 근처)에 다이얼로그 추가:

```tsx
      <Dialog
        open={doneOpen}
        message={editId ? "수정되었습니다" : "사용자가 추가되었습니다"}
        onConfirm={() => router.push("/mypage")}
      />
```

- [ ] **Step 5: 검증**

Run: `npx tsc --noEmit` → 에러 없음
Run: `npm test 2>&1 | grep "pick an avatar"` → ✔ 유지 (`setProfileInfo({ avatar, ...` 리터럴 존치 확인)
Run: `npm run build 2>&1 | grep -i "useSearchParams\|error"` → useSearchParams 관련 프리렌더 에러 없음

---

### Task 5: 전환 시트 편집 모드 (수정/삭제)

**Files:**
- Modify: `components/ProfileSwitcher.tsx`

**Interfaces:**
- Consumes: Task 3 `removeProfile`·`Dialog`, Task 2 `Avatar`
- 편집 진입 경로: `/profile-add?edit=<id>` (Task 4가 처리)

- [ ] **Step 1: state·import**

```tsx
import { useState } from "react";
import Dialog from "@/components/Dialog";
import type { ProfileData } from "@/lib/types";
```

컴포넌트 상단에:

```tsx
  const removeProfile = useBonJour((s) => s.removeProfile);
  const [editing, setEditing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProfileData | null>(null);
```

(주의: `if (!open) return null;`이 hooks보다 아래에 오도록 — useState는 그 위에 배치)

- [ ] **Step 2: 헤더 연필 버튼 → 토글**

기존 무동작 연필 버튼을:

```tsx
          <button
            aria-label={editing ? "편집 완료" : "사용자 편집"}
            onClick={() => setEditing((v) => !v)}
            className="min-w-8 h-8 px-1.5 rounded-[10px] bg-lightgreen flex items-center justify-center"
          >
            {editing ? (
              <span className="text-[15px] font-bold text-forest">완료</span>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3E7A4E"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
            )}
          </button>
```

좌측 균형용 `<div className="w-8" />`는 그대로.

- [ ] **Step 3: 행 렌더를 모드별로**

`profiles.map((p, i) => { ... })` 내부 return을 다음으로 교체 (Avatar는 Task 2에서 이미 적용된 상태 기준):

```tsx
            return (
              <div
                key={p.id}
                className={`flex items-center gap-3.5 py-3.5 px-1 ${
                  i > 0 ? "border-t border-[#F7F5EF]" : ""
                }`}
              >
                {editing ? (
                  <>
                    <Avatar pose={avatarPose(p.avatar)} size={56} />
                    <span className="text-[20px] font-medium text-charcoal">
                      {label}
                    </span>
                    {p.relation === "본인" && (
                      <span className="text-[13px] font-bold text-graytext bg-[#F0EEE6] rounded-chip px-2.5 py-[3px]">
                        관리인
                      </span>
                    )}
                    <span className="flex-1" />
                    <button
                      aria-label={`${label} 수정`}
                      onClick={() => {
                        onClose();
                        router.push(`/profile-add?edit=${p.id}`);
                      }}
                      className="w-10 h-10 rounded-[10px] bg-lightgreen flex items-center justify-center"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#3E7A4E"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
                      </svg>
                    </button>
                    {p.relation !== "본인" && (
                      <button
                        aria-label={`${label} 삭제`}
                        onClick={() => setDeleteTarget(p)}
                        className="w-10 h-10 rounded-[10px] bg-[#F7ECEA] flex items-center justify-center"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#C7503A"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                        </svg>
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => pick(p.id)}
                    className="flex-1 flex items-center gap-3.5 text-left"
                  >
                    <Avatar pose={avatarPose(p.avatar)} size={56} ring={active} />
                    <span
                      className={`text-[20px] text-charcoal ${
                        active ? "font-bold" : "font-medium"
                      }`}
                    >
                      {label}
                    </span>
                    {p.relation === "본인" && (
                      <span className="text-[13px] font-bold text-graytext bg-[#F0EEE6] rounded-chip px-2.5 py-[3px]">
                        관리인
                      </span>
                    )}
                    <span className="flex-1" />
                    {active && (
                      <svg
                        width="26"
                        height="26"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#3E7A4E"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            );
```

- [ ] **Step 4: 삭제 확인 다이얼로그**

시트 div 닫는 태그 바로 아래(루트 fixed div 내부)에:

```tsx
      <Dialog
        open={deleteTarget != null}
        message={`'${
          deleteTarget?.name?.trim() || deleteTarget?.relation || "사용자"
        }'님을 삭제할까요?\n기록도 함께 삭제돼요`}
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={() => {
          if (deleteTarget) removeProfile(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
```

- [ ] **Step 5: 검증**

Run: `npx tsc --noEmit` → 에러 없음
Run: `npm test 2>&1 | grep "update and remove"` → ✔ PASS

---

### Task 6: 최종 검증

**Files:** 없음

- [ ] **Step 1: 빌드 + 테스트**

Run: `npm run build && npm test`
Expected: 빌드 성공(useSearchParams 프리렌더 에러 없음), 실패는 pre-existing 1건(checkup TabBar)만.

- [ ] **Step 2: 브라우저 시나리오 (playwright-core 스크립트 또는 육안)**

1. `/routine`(결과 없음): 분석 시작 버튼 좌우 여백 28px (홈과 동일 폭)
2. `/local`: 부제 "AI 추천 운동을 근처에서" 한 줄
3. `/profile-add`: 아바타 5번째 원이 화면 우측에 걸쳐 보임, 원 안이 얼굴~상반신 크롭
4. 새 사용자 추가 → "사용자가 추가되었습니다" 다이얼로그 → 확인 → `/mypage` (설문 미진입)
5. 마이페이지 → 사용자 전환 → 연필 → 편집 모드(행 우측 연필/휴지통, 본인 행 휴지통 없음, 헤더 '완료')
6. 휴지통 → 확인 다이얼로그 → 삭제 → 목록에서 제거 (활성 삭제 시 본인으로 전환)
7. 연필 → `/profile-add?edit=<id>` 프리필 확인 → 저장하기 → "수정되었습니다" → 마이페이지 반영
8. 마이 칩·카드·전환 시트 아바타가 얼굴 크롭으로 보임
