"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBonJour } from "@/lib/store";

// 화면 5b · 로그인 — 휴대폰 + 비밀번호. 5회 틀리면 서버가 계정을 잠근다.
const fieldCls =
  "w-full h-[60px] rounded-field bg-white border-2 border-borderline px-5 text-[length:calc(18px*var(--ts))] text-charcoal placeholder:text-graytext focus:border-forest outline-none";

export default function LoginScreen() {
  const router = useRouter();
  const setProfileInfo = useBonJour((s) => s.setProfileInfo);

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!phone || !password || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "로그인하지 못했어요.");
        return;
      }
      setProfileInfo({
        name: data.user.name,
        relation: "본인",
        gender: data.user.gender ?? undefined,
        birth: data.user.birth ?? undefined,
        region: data.user.region ?? "순천시",
      });
      router.push("/home");
    } catch {
      setError("연결이 불안정해요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-dvh bg-ivory">
      <div className="shrink-0 flex items-center gap-3 pt-safetop pb-3 px-gutter">
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="뒤로가기"
          className="shrink-0 flex items-center justify-center"
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2B2B2B"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-[length:calc(22px*var(--ts))] font-bold text-charcoal">로그인</span>
      </div>

      <div className="flex-1 overflow-y-auto px-gutter pb-4 flex flex-col [&>*]:shrink-0">
        <label className="mt-4 text-sub font-bold text-charcoal">
          휴대폰 번호
        </label>
        <input
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="010-1234-5678"
          className={`${fieldCls} mt-2`}
        />

        <label className="mt-4 text-sub font-bold text-charcoal">비밀번호</label>
        <div className="mt-2 flex items-center gap-3 h-[60px] rounded-field bg-white border-2 border-borderline px-5 focus-within:border-forest">
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="비밀번호를 입력해 주세요"
            className="flex-1 min-w-0 h-full bg-transparent text-[length:calc(18px*var(--ts))] text-charcoal placeholder:text-graytext outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 표시"}
            className="shrink-0"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6B6B6B"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>

        {error && (
          <p className="mt-3 text-[length:calc(16px*var(--ts))] text-danger leading-[1.5]">{error}</p>
        )}
      </div>

      <div className="shrink-0 flex flex-col px-gutter pt-3 pb-8 bg-ivory">
        <button
          type="button"
          onClick={submit}
          disabled={!phone || !password || busy}
          className="btn-primary"
        >
          {busy ? "확인 중…" : "로그인"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/signup")}
          className="mt-3 mx-auto text-[length:calc(16px*var(--ts))] text-graytext underline underline-offset-4"
        >
          아직 회원이 아니에요
        </button>
      </div>
    </div>
  );
}
