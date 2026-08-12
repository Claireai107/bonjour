"use client";

import { useEffect, useState } from "react";
import { APP_VERSION, compareVersion } from "@/lib/appVersion";

/**
 * 새 버전 안내 배너
 *
 * PWA로 홈 화면에 추가하면 화면이 기기에 캐시되기 때문에, 새로 배포해도
 * 사용자가 예전 화면을 계속 볼 수 있다. 서버 버전과 비교해 다르면 새로고침을 안내한다.
 */
export default function UpdateBanner() {
  const [newVersion, setNewVersion] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const data = await res.json();
        if (alive && compareVersion(APP_VERSION, data.version) < 0) {
          setNewVersion(data.version);
        }
      } catch {
        // 네트워크가 끊긴 상황 — 배너를 띄우지 않고 조용히 넘어간다
      }
    };
    check();
    const id = setInterval(check, 5 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (!newVersion) return null;

  return (
    <div className="absolute left-0 right-0 bottom-[96px] z-40 px-gutter">
      <div className="rounded-card bg-forest text-white px-4 py-3 flex items-center gap-3 shadow-[0_4px_14px_rgba(0,0,0,.18)]">
        <span className="flex-1 text-sub leading-[1.45]">
          새 버전 {newVersion}이 나왔어요
        </span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="shrink-0 rounded-chip bg-white/95 px-3 py-1.5 text-[length:calc(16px*var(--ts))] font-bold text-forest"
        >
          업데이트
        </button>
      </div>
    </div>
  );
}
