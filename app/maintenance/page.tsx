"use client";

import { useEffect, useState } from "react";
import Boni from "@/components/Boni";

/**
 * 점검 안내 화면
 *
 * 기획서 「점검 안내 화면 — 복구 작업 중에는 오류 화면 대신 '점검 중' 안내를 노출」 대응
 * MAINTENANCE_MODE=1 이면 middleware 가 모든 화면을 이 페이지로 보낸다.
 * 30초마다 서버를 확인해 복구되면 자동으로 원래 화면으로 돌아간다.
 */
export default function MaintenanceScreen() {
  const [checking, setChecking] = useState(false);

  const check = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      const data = await res.json();
      if (!data.maintenance) window.location.href = "/";
    } catch {
      // 서버가 아직 안 올라온 상태 — 다음 주기에 다시 확인한다
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col h-dvh bg-ivory items-center justify-center px-gutter text-center">
      <Boni pose="think" size={140} />
      <h1 className="mt-6 text-h2 text-charcoal">잠시 점검 중이에요</h1>
      <p className="mt-3 text-body text-graytext leading-[1.6]">
        더 안전한 서비스로 바꾸고 있어요.
        <br />
        곧 다시 만나요.
      </p>
      <div className="mt-6 rounded-card bg-lightgreen px-5 py-3">
        <p className="text-sub text-forest">
          그동안 저장된 리포트와 기록은 그대로 있어요
        </p>
      </div>
      <button
        type="button"
        onClick={check}
        disabled={checking}
        className="mt-8 w-full max-w-[280px] h-touch rounded-btn bg-forest text-white text-btn flex items-center justify-center disabled:opacity-50"
      >
        {checking ? "확인 중…" : "다시 확인하기"}
      </button>
    </div>
  );
}
