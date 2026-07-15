"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Boni from "@/components/Boni";

// QR 전용 랜딩 — 기기별 최적 경로로 '홈 화면에 추가'를 유도한다.
// · 안드로이드 Chrome: beforeinstallprompt 캡처 → [예] 탭 시 시스템 설치 팝업
// · 아이폰 Safari: 시스템상 자동 팝업 불가 → 공유(⬆)→홈 화면에 추가 2단계 안내
// · 인앱 브라우저(카톡 등): 설치 불가 → 외부 브라우저로 열기 안내
// · 이미 설치(standalone)로 열림: 곧장 앱으로

type Mode = "android" | "ios" | "inapp" | "other";

export default function StartScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);
  // beforeinstallprompt 이벤트 객체 (표준 타입 미제공)
  const deferred = useRef<(Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> }) | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      router.replace("/");
      return;
    }
    const ua = navigator.userAgent;
    const inapp = /KAKAOTALK|Instagram|FBAN|FBAV|NAVER|Line\//i.test(ua);
    const ios = /iPhone|iPad/i.test(ua);
    setMode(inapp ? "inapp" : ios ? "ios" : /Android/i.test(ua) ? "android" : "other");

    const onBip = (e: Event) => {
      e.preventDefault();
      deferred.current = e as typeof deferred.current;
      setCanPrompt(true);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [router]);

  const install = async () => {
    const e = deferred.current;
    if (!e) return;
    e.prompt();
    const { outcome } = await e.userChoice;
    if (outcome === "accepted") setInstalled(true);
  };

  const toWeb = () => router.push("/");

  if (mode === null) return null;

  return (
    <div className="flex flex-col h-dvh bg-ivory px-gutter pt-safetop">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <Boni pose="hello" size={110} />

        {installed ? (
          <>
            <h1 className="mt-5 text-[24px] font-bold text-charcoal leading-[1.4]">
              홈 화면에 추가됐어요!
            </h1>
            <p className="mt-3 text-[16px] text-graytext leading-[1.6] break-keep">
              홈 화면의 본주르 아이콘으로
              <br />
              언제든 앱처럼 열 수 있어요
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-[24px] font-bold text-charcoal leading-[1.4] break-keep">
              본주르를 홈 화면에
              <br />
              추가할까요?
            </h1>
            <p className="mt-3 text-[16px] text-graytext leading-[1.6] break-keep">
              앱처럼 빠르게 열 수 있어요
            </p>

            {mode === "ios" && (
              <div className="mt-6 w-full bg-white rounded-card px-5 py-5 text-left shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                <GuideStep n={1}>
                  화면 아래(또는 위)의 <ShareIcon /> <b>공유 버튼</b>을 눌러요
                </GuideStep>
                <GuideStep n={2}>
                  목록에서 <b>&apos;홈 화면에 추가&apos;</b>를 눌러요
                </GuideStep>
                <GuideStep n={3}>
                  오른쪽 위 <b>&apos;추가&apos;</b>를 누르면 끝!
                </GuideStep>
              </div>
            )}

            {mode === "android" && !canPrompt && (
              <div className="mt-6 w-full bg-white rounded-card px-5 py-5 text-left shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                <GuideStep n={1}>
                  오른쪽 위 <b>⋮ 메뉴</b>를 눌러요
                </GuideStep>
                <GuideStep n={2}>
                  <b>&apos;홈 화면에 추가&apos;</b>를 눌러요
                </GuideStep>
              </div>
            )}

            {mode === "inapp" && (
              <div className="mt-6 w-full bg-white rounded-card px-5 py-5 text-left shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                <p className="text-[16px] text-charcoal leading-[1.6] break-keep">
                  지금은 앱 속 브라우저라 홈 화면 추가가 어려워요.
                  <br />
                  <b>메뉴(⋮ 또는 공유)에서 &apos;다른 브라우저로 열기&apos;</b>를
                  누른 뒤 다시 시도해 주세요.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="shrink-0 pb-10 pt-4">
        {!installed && mode === "android" && canPrompt && (
          <button onClick={install} className="btn-primary">
            예, 홈 화면에 추가할게요
          </button>
        )}
        <button
          onClick={toWeb}
          className={
            installed || (mode === "android" && canPrompt)
              ? "mt-3 w-full text-center text-[16px] text-graytext underline underline-offset-4"
              : "btn-primary"
          }
        >
          {installed ? "웹으로 계속 보기" : mode === "android" && canPrompt ? "아니요, 웹으로 볼게요" : "웹으로 계속하기"}
        </button>
      </div>
    </div>
  );
}

function GuideStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <span className="flex-none w-6 h-6 rounded-full bg-lightgreen text-forest text-[13px] font-bold flex items-center justify-center">
        {n}
      </span>
      <span className="text-[16px] text-charcoal leading-[1.55] break-keep">
        {children}
      </span>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#3E7A4E"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline -mt-0.5"
      aria-label="공유"
    >
      <path d="M12 3v13" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}
