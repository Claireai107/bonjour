import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

// 스펙 §0 폰트: Noto Sans KR (Pretendard 대체)
const noto = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "본주르 BonJour — AI 뼈 건강 플랫폼",
  description: "30초 설문과 건강검진으로 내 뼈의 미래를 읽다",
  // PWA: 홈 화면 추가 시 앱처럼 열리도록 (iOS 전용 메타 포함)
  appleWebApp: {
    capable: true,
    title: "본주르",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FAF6EC",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={noto.variable}>
      <body className="font-[var(--font-noto)]">
        {/* 데스크톱에서도 390x844 모바일 프레임으로 중앙 정렬 */}
        <div className="min-h-screen w-full flex justify-center">
          <div className="relative w-full max-w-frame min-h-screen bg-ivory overflow-hidden shadow-xl">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
