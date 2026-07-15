"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Boni from "@/components/Boni";
import { PERM_CARDS, requestAllPermissions } from "@/components/permissions-shared";

const PERMS_FLAG = "bonjour-perms-prompted";

export default function PermissionsScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const finish = () => {
    localStorage.setItem(PERMS_FLAG, "1");
    router.replace("/signup");
  };

  const allowAll = async () => {
    setBusy(true);
    await requestAllPermissions();
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
          {PERM_CARDS.map((c) => (
            <div
              key={c.key}
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
