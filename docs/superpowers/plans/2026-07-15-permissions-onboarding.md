# 첫 실행 권한 안내 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 첫 실행 시 위치·카메라·마이크 권한을 한 번에 요청하는 `/permissions` 화면을 추가하고, 스플래시 [시작하기]가 첫 방문에만 그리로 보낸다.

**Architecture:** 신규 `app/permissions/page.tsx`가 순차 권한 요청을 수행하고 `localStorage["bonjour-perms-prompted"]` 플래그로 1회만 노출. 스펙: `docs/superpowers/specs/2026-07-15-permissions-onboarding-design.md`

**Tech Stack:** Next.js 14 클라이언트 컴포넌트, 브라우저 Permissions(geolocation/getUserMedia)

## Global Constraints

- **git 저장소 아님 → 커밋 없음.** 검증 `npx tsc --noEmit`, `npm test` 21 pass 유지
- 플래그 키 정확히 `bonjour-perms-prompted`
- 권한 요청 순서: 위치 → 카메라 → 마이크. 각 단계 실패 무시하고 다음 진행, 미디어 스트림은 즉시 stop
- 카피: 제목 "본이가 도와드리려면\n허용이 필요해요" / 카드 (위치, "가까운 보건소를 찾아드려요") (카메라, "검진표를 찍어서 자동 인식해요") (마이크, "설문을 음성으로 답할 수 있어요") / 버튼 "모두 허용하고 시작하기" · 진행 중 "허용 확인 중…" / 링크 "나중에 할게요"

---

### Task 1: `/permissions` 화면 + 스플래시 분기

**Files:**
- Create: `app/permissions/page.tsx`
- Modify: `app/page.tsx:144` 부근 (시작하기 onClick)

- [ ] **Step 1: 권한 화면 생성**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Boni from "@/components/Boni";

export const PERMS_FLAG = "bonjour-perms-prompted";

// 첫 실행 권한 안내 — 위치·카메라·마이크를 한 번에 요청 (서비스 중간 팝업 방지).
// 각 요청은 실패(거부)해도 다음으로 진행 — 거부된 권한은 해당 기능 사용 시 안내.
async function requestAll() {
  // ① 위치
  await new Promise<void>((resolve) => {
    if (!("geolocation" in navigator)) return resolve();
    navigator.geolocation.getCurrentPosition(
      () => resolve(),
      () => resolve(),
      { timeout: 8000 }
    );
  });
  // ② 카메라 → ③ 마이크 (스트림은 즉시 반납)
  for (const constraints of [{ video: true }, { audio: true }] as const) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      /* 거부/미지원 — 무시하고 진행 */
    }
  }
}

const CARDS = [
  {
    title: "위치",
    desc: "가까운 보건소를 찾아드려요",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3E7A4E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    title: "카메라",
    desc: "검진표를 찍어서 자동 인식해요",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3E7A4E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
  {
    title: "마이크",
    desc: "설문을 음성으로 답할 수 있어요",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3E7A4E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
        <path d="M12 18v4" />
      </svg>
    ),
  },
];

export default function PermissionsScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const finish = () => {
    localStorage.setItem(PERMS_FLAG, "1");
    router.replace("/signup");
  };

  const allowAll = async () => {
    setBusy(true);
    await requestAll();
    finish();
  };

  return (
    <div className="flex flex-col h-dvh bg-ivory px-gutter pt-safetop">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <Boni pose="point" size={110} />
        <h1 className="mt-5 text-[24px] font-bold text-charcoal leading-[1.4] whitespace-pre-line">
          {"본이가 도와드리려면\n허용이 필요해요"}
        </h1>

        <div className="mt-7 w-full flex flex-col gap-3">
          {CARDS.map((c) => (
            <div
              key={c.title}
              className="bg-white rounded-card px-5 py-4 flex items-center gap-4 text-left shadow-[0_1px_6px_rgba(0,0,0,0.06)]"
            >
              <span className="w-11 h-11 rounded-full bg-lightgreen flex items-center justify-center flex-none">
                {c.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-[18px] font-bold text-charcoal">
                  {c.title}
                </span>
                <span className="block mt-0.5 text-[15px] text-graytext">
                  {c.desc}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="shrink-0 pb-10 pt-4">
        <button onClick={allowAll} disabled={busy} className="btn-primary">
          {busy ? "허용 확인 중…" : "모두 허용하고 시작하기"}
        </button>
        <button
          onClick={finish}
          disabled={busy}
          className="mt-3 w-full text-center text-[16px] text-graytext underline underline-offset-4"
        >
          나중에 할게요
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 스플래시 분기**

`app/page.tsx`의 시작하기 버튼 `onClick={() => router.push("/signup")}` →

```tsx
        onClick={() =>
          router.push(
            localStorage.getItem("bonjour-perms-prompted")
              ? "/signup"
              : "/permissions"
          )
        }
```

- [ ] **Step 3: 검증**

Run: `npx tsc --noEmit` → 0 에러. `npm test 2>&1 | tail -3` → 21 pass (permissions는 eligible/탭바 목록 밖 — 영향 없음)

---

### Task 2: 검증 + 배포

- [ ] **Step 1: 빌드·테스트** — `npm run build && npm test` green
- [ ] **Step 2: E2E** — 스플래시 `/` → 시작하기 탭 → `/permissions` 카드 3개·버튼·링크 렌더 확인(스크린샷) → "나중에 할게요" → `/signup` 도달 → 다시 `/`에서 시작하기 → 곧장 `/signup`(플래그 동작). 권한 허용 경로: playwright context `permissions: ["geolocation", "camera", "microphone"]` grant 상태에서 "모두 허용하고 시작하기" → `/signup` 도달
- [ ] **Step 3: 배포** — `vercel --prod --yes` → READY, `/permissions` 200 스모크
