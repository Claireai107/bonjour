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
          &apos;차단&apos;된 권한은 앱에서 다시 켤 수 없어요. 아래 방법대로
          브라우저에서 직접 허용해 주세요.
        </p>

        <BrowserGuide />
      </div>

      <TabBar />
    </div>
  );
}

// 브라우저별 '차단된 권한 다시 켜기' 가이드 — 사용 중인 기기 항목이 기본으로 펼쳐짐
function BrowserGuide() {
  const isIOS =
    typeof navigator !== "undefined" && /iPhone|iPad/i.test(navigator.userAgent);

  const guides = [
    {
      key: "ios",
      title: "아이폰 (Safari)",
      open: isIOS,
      steps: [
        "주소창 왼쪽의 ᴀA 버튼(또는 설정 아이콘)을 눌러요",
        "'웹사이트 설정'을 눌러요",
        "카메라 · 마이크 · 위치를 각각 '허용'으로 바꿔요",
        "페이지를 새로고침하면 적용돼요",
      ],
      extra:
        "위 메뉴가 없다면: 아이폰 [설정 → 앱 → Safari]에서 카메라·마이크·위치를 '허용'으로, 위치는 [설정 → 개인정보 보호 → 위치 서비스 → Safari 웹사이트]도 확인해 주세요.",
    },
    {
      key: "android",
      title: "안드로이드 (Chrome)",
      open: !isIOS,
      steps: [
        "주소창 왼쪽의 자물쇠(또는 설정) 아이콘을 눌러요",
        "'권한'을 눌러요",
        "위치 · 카메라 · 마이크를 '허용'으로 바꿔요",
        "페이지를 새로고침하면 적용돼요",
      ],
      extra:
        "위 메뉴가 없다면: Chrome 오른쪽 위 ⋮ → [설정 → 사이트 설정]에서 위치·카메라·마이크의 '차단됨' 목록에 있는 이 사이트를 눌러 허용으로 바꿔 주세요.",
    },
  ];

  return (
    <div className="mt-4 flex flex-col gap-3">
      {guides.map((g) => (
        <details
          key={g.key}
          open={g.open}
          className="bg-white rounded-card px-5 py-4 shadow-[0_1px_6px_rgba(0,0,0,0.06)]"
        >
          <summary className="text-[16px] font-bold text-charcoal cursor-pointer list-none flex items-center justify-between">
            {g.title}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6B6B6B"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <ol className="mt-3 flex flex-col gap-2">
            {g.steps.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-[15px] text-charcoal leading-[1.5]">
                <span className="flex-none w-6 h-6 rounded-full bg-lightgreen text-forest text-[13px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="break-keep">{s}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[13px] text-graytext leading-[1.6] break-keep">
            {g.extra}
          </p>
        </details>
      ))}
    </div>
  );
}
