# 스플래시 여백 + 상세 링크 + 앱 설정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 스플래시 상단 여백 확보, 보건소 '자세히 보기' 전 경로 카카오맵 연결, 권한 재요청이 가능한 `/settings` 페이지 신설.

**Architecture:** 권한 카드 데이터·순차 요청 로직을 `components/permissions-shared.tsx`로 추출해 `/permissions`와 신규 `/settings`가 공유. 스펙: `docs/superpowers/specs/2026-07-15-splash-detail-settings-design.md`

**Tech Stack:** Next.js 14, navigator.permissions API(폴백 포함)

## Global Constraints

- **git 저장소 아님 → 커밋 없음.** 검증 `npx tsc --noEmit`, `npm test` 21 pass
- 상태 뱃지 문구·색: granted "허용됨"(bg-lightgreen text-forest) / prompt "요청 가능"(bg-[#F0EEE6] text-graytext) / denied "꺼짐"(bg-[#F7ECEA] text-[#C7503A]) / 미지원 "확인 필요"(bg-[#F0EEE6] text-graytext)
- 안내문: "'차단'된 권한은 여기서 다시 켤 수 없어요. 브라우저의 사이트 설정(주소창 자물쇠 아이콘)에서 허용해 주세요."
- 공유 모듈 export 정확히: `PERM_CARDS: { key: "geolocation" | "camera" | "microphone"; title: string; desc: string; icon: JSX.Element }[]`, `requestAllPermissions(): Promise<void>`

---

### Task 1: 공유 모듈 추출 + /permissions 리팩터 + 스플래시 여백 + 상세 링크

**Files:**
- Create: `components/permissions-shared.tsx`
- Modify: `app/permissions/page.tsx` (로컬 CARDS·requestAll 제거, 공유 모듈 사용)
- Modify: `app/page.tsx` (로고 `mt-7` → `mt-16`)
- Modify: `components/LocalSection.tsx` (데모 카드 href + 클릭 폴백)

**Interfaces:**
- Produces: `PERM_CARDS`, `requestAllPermissions()` — Task 2가 사용

- [ ] **Step 1: 공유 모듈 생성**

`components/permissions-shared.tsx` — 기존 `app/permissions/page.tsx`의 `requestAll` 함수 본문과 `CARDS` 배열(아이콘 SVG 3종 포함)을 **그대로 이동**하되 이름을 `requestAllPermissions`/`PERM_CARDS`로, 각 카드에 `key` 필드 추가:

```tsx
"use client";

// 권한 온보딩(/permissions)과 앱 설정(/settings)이 공유하는 권한 카드 정의 + 순차 요청.

export type PermKey = "geolocation" | "camera" | "microphone";

export interface PermCard {
  key: PermKey;
  title: string;
  desc: string;
  icon: JSX.Element;
}

// 위치 → 카메라 → 마이크 순차 요청. 각 실패(거부)는 무시, 미디어 트랙 즉시 반납.
export async function requestAllPermissions(): Promise<void> {
  await new Promise<void>((resolve) => {
    if (!("geolocation" in navigator)) return resolve();
    navigator.geolocation.getCurrentPosition(
      () => resolve(),
      () => resolve(),
      { timeout: 8000 }
    );
  });
  for (const constraints of [{ video: true }, { audio: true }] as const) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      /* 거부/미지원 — 무시하고 진행 */
    }
  }
}

export const PERM_CARDS: PermCard[] = [
  { key: "geolocation", title: "위치", desc: "가까운 보건소를 찾아드려요", icon: (/* 기존 pin SVG 그대로 */) },
  { key: "camera", title: "카메라", desc: "검진표를 찍어서 자동 인식해요", icon: (/* 기존 camera SVG 그대로 */) },
  { key: "microphone", title: "마이크", desc: "설문을 음성으로 답할 수 있어요", icon: (/* 기존 mic SVG 그대로 */) },
];
```

(SVG 3종은 `app/permissions/page.tsx`의 현재 코드에서 그대로 복사 — 새로 그리지 말 것)

- [ ] **Step 2: /permissions 리팩터**

`app/permissions/page.tsx`에서 로컬 `requestAll`·`CARDS` 삭제, `import { PERM_CARDS, requestAllPermissions } from "@/components/permissions-shared";`로 대체. 렌더의 `CARDS.map` → `PERM_CARDS.map`, `allowAll`의 `requestAll()` → `requestAllPermissions()`. 동작·카피 무변경.

- [ ] **Step 3: 스플래시 여백**

`app/page.tsx` 로고 `className="w-[150px] mt-7 mx-auto"` → `className="w-[150px] mt-16 mx-auto"`

- [ ] **Step 4: 상세 링크**

`components/LocalSection.tsx`:
(a) 검색 전 기본 카드(id="place-health-center", 순천 보건소)에 prop 추가: `href="https://map.kakao.com/?q=순천시보건소"`
(b) LocalPlaceCard의 자세히 보기 onClick을 폴백 포함으로:

```tsx
          onClick={() => {
            const url =
              href || `https://map.kakao.com/?q=${encodeURIComponent(name)}`;
            window.open(url, "_blank", "noopener");
          }}
```

- [ ] **Step 5: 검증**

Run: `npx tsc --noEmit` → 0 에러. `npm test 2>&1 | tail -3` → 21 pass

---

### Task 2: `/settings` 페이지 + 마이페이지 연결

**Files:**
- Create: `app/settings/page.tsx`
- Modify: `app/mypage/page.tsx` (앱 설정 메뉴 onClick)

**Interfaces:**
- Consumes: Task 1의 `PERM_CARDS`, `requestAllPermissions`, `PermKey`

- [ ] **Step 1: settings 페이지 생성**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import TabBar from "@/components/TabBar";
import {
  PERM_CARDS,
  requestAllPermissions,
  type PermKey,
} from "@/components/permissions-shared";

type PermState = "granted" | "prompt" | "denied" | "unknown";

const BADGE: Record<PermState, { label: string; className: string }> = {
  granted: { label: "허용됨", className: "bg-lightgreen text-forest" },
  prompt: { label: "요청 가능", className: "bg-[#F0EEE6] text-graytext" },
  denied: { label: "꺼짐", className: "bg-[#F7ECEA] text-[#C7503A]" },
  unknown: { label: "확인 필요", className: "bg-[#F0EEE6] text-graytext" },
};

// Permissions API 상태 조회 — 미지원 브라우저(iOS 구버전 등)는 "unknown"
async function queryState(key: PermKey): Promise<PermState> {
  try {
    const st = await navigator.permissions.query({
      name: key as PermissionName,
    });
    return st.state as PermState;
  } catch {
    return "unknown";
  }
}

export default function SettingsScreen() {
  const [states, setStates] = useState<Record<PermKey, PermState>>({
    geolocation: "unknown",
    camera: "unknown",
    microphone: "unknown",
  });
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const entries = await Promise.all(
      PERM_CARDS.map(async (c) => [c.key, await queryState(c.key)] as const)
    );
    setStates(Object.fromEntries(entries) as Record<PermKey, PermState>);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const reRequest = async () => {
    setBusy(true);
    await requestAllPermissions();
    await refresh();
    setBusy(false);
  };

  return (
    <div className="flex flex-col h-dvh bg-ivory">
      <PageHeader title="앱 설정" back />

      <div className="flex-1 overflow-y-auto px-gutter pb-6">
        <h2 className="mt-2 text-[16px] font-bold text-charcoal">권한 관리</h2>

        <div className="mt-3 flex flex-col gap-3">
          {PERM_CARDS.map((c) => {
            const badge = BADGE[states[c.key]];
            return (
              <div
                key={c.key}
                className="bg-white rounded-card px-5 py-4 flex items-center gap-4 shadow-[0_1px_6px_rgba(0,0,0,0.06)]"
              >
                <span className="w-11 h-11 rounded-full bg-lightgreen flex items-center justify-center flex-none">
                  {c.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[18px] font-bold text-charcoal">
                    {c.title}
                  </span>
                  <span className="block mt-0.5 text-[14px] text-graytext">
                    {c.desc}
                  </span>
                </span>
                <span
                  className={`flex-none text-[13px] font-bold rounded-chip px-2.5 py-[4px] ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>

        <button
          onClick={reRequest}
          disabled={busy}
          className="btn-primary mt-5"
        >
          {busy ? "허용 확인 중…" : "권한 다시 요청하기"}
        </button>

        <p className="mt-3 text-[14px] text-graytext leading-[1.6]">
          &apos;차단&apos;된 권한은 여기서 다시 켤 수 없어요. 브라우저의 사이트
          설정(주소창 자물쇠 아이콘)에서 허용해 주세요.
        </p>
      </div>

      <TabBar />
    </div>
  );
}
```

- [ ] **Step 2: 마이페이지 연결**

`app/mypage/page.tsx` 메뉴: `<MenuItem label="앱 설정" onClick={() => {}} />` → `<MenuItem label="앱 설정" onClick={() => router.push("/settings")} />`

- [ ] **Step 3: 검증**

Run: `npx tsc --noEmit` → 0 에러 (camera/microphone은 TS PermissionName에 없어 `as PermissionName` 캐스팅 필수 — 이미 코드에 포함). `npm test 2>&1 | tail -3` → 21 pass

---

### Task 3: 검증 + 배포

- [ ] **Step 1:** `npm run build && npm test` green (/settings 라우트 생성 확인)
- [ ] **Step 2:** E2E — ① 스플래시 스크린샷(로고 하강) ② `/local` 데모 카드 '자세히 보기' → 새 탭 URL이 map.kakao.com인지 (playwright `context.waitForEvent("page")`) ③ `/mypage` → 앱 설정 탭 → `/settings` 카드 3개+뱃지, 권한 granted 컨텍스트에서 "허용됨" 표시, [권한 다시 요청하기] 클릭 후에도 정상 ④ `/permissions` 기존 동작 회귀 없음(카드 3개 렌더)
- [ ] **Step 3:** `vercel --prod --yes` → READY, `/settings` 200 스모크
