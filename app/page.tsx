"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// 스플래시 — 앱 실행 시 인트로 영상 1회 재생 후, 로고 + 특징 카드 + 시작하기 CTA
export default function SplashScreen() {
  const router = useRouter();

  // 인트로 영상: 세션당 1회만 (뒤로가기로 돌아와도 재생 안 함)
  const [showVideo, setShowVideo] = useState(false);
  useEffect(() => {
    if (!sessionStorage.getItem("splashVideoPlayed")) setShowVideo(true);
  }, []);
  const endVideo = () => {
    sessionStorage.setItem("splashVideoPlayed", "1");
    setShowVideo(false);
  };

  const features: { icon: React.ReactNode; label: React.ReactNode }[] = [
    {
      icon: (
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#3E7A4E"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ),
      label: <>간편한 입력</>,
    },
    {
      icon: (
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#3E7A4E"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 20v-6" />
          <path d="M12 20V8" />
          <path d="M20 20V4" />
        </svg>
      ),
      label: (
        <>
          뼈 건강
          <br />
          AI 분석
        </>
      ),
    },
    {
      icon: (
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#3E7A4E"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M9 15h6" />
          <path d="M9 11h3" />
        </svg>
      ),
      label: (
        <>
          맞춤
          <br />
          리포트·운동
        </>
      ),
    },
  ];

  return (
    <div className="flex flex-col items-center h-dvh bg-ivory pt-safetop px-gutter pb-10">
      {/* 인트로 영상 오버레이 — 끝나면(또는 탭하면) 스플래시 화면으로 */}
      {showVideo && (
        <div
          className="fixed inset-0 z-50 bg-ivory flex items-center justify-center"
          onClick={endVideo}
          role="button"
          aria-label="인트로 건너뛰기"
        >
          <video
            src="/splash.mp4"
            autoPlay
            muted
            playsInline
            onEnded={endVideo}
            onError={endVideo}
            className="w-full h-full object-cover"
          />
          <span className="absolute bottom-9 right-6 text-[15px] font-bold text-white bg-black/40 rounded-pill px-4 py-2">
            건너뛰기
          </span>
        </div>
      )}

      {/* 세로형 로고 */}
      <img
        src="/logo-vertical.png"
        alt="본주르 BonJour · AI Bone Health Platform"
        className="w-[150px] mt-16 mx-auto"
      />

      {/* 특징 3카드 */}
      <div className="mt-8 flex gap-[10px] w-full">
        {features.map((f, i) => (
          <div
            key={i}
            className="flex-1 bg-white rounded-card px-[10px] py-[14px] text-center shadow-[0_1px_4px_rgba(0,0,0,0.05)]"
          >
            <div className="w-9 h-9 mx-auto rounded-chip bg-lightgreen flex items-center justify-center">
              {f.icon}
            </div>
            <div className="mt-2 text-[15px] font-bold text-charcoal leading-[1.3]">
              {f.label}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1" />

      {/* 시작하기 CTA (pill형) */}
      <button
        onClick={() =>
          router.push(
            localStorage.getItem("bonjour-perms-prompted")
              ? "/signup"
              : "/permissions"
          )
        }
        className="btn-primary rounded-pill"
      >
        시작하기
      </button>
    </div>
  );
}
