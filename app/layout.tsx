import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import UpdateBanner from "@/components/UpdateBanner";
import { TEXT_SCALE_BOOTSTRAP } from "@/lib/textScale";

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
  // PWA: 홈 화면 추가 시 앱처럼 열리도록 (iOS 전용 메타 포함, manifest는 app/manifest.ts)
  applicationName: "본주르",
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
  // 손가락으로 확대할 수 있어야 한다.
  // maximumScale: 1 이면 시니어가 화면을 키울 방법이 아예 없다 (1차 UT P4·P5).
  maximumScale: 5,
  userScalable: true,
  themeColor: "#FAF6EC",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 부트스트랩 스크립트가 첫 그리기 전에 --ts 를 html 에 심으므로
    // 서버 HTML 과 속성이 달라진다 — 의도된 차이라 경고를 끈다
    <html lang="ko" className={noto.variable} suppressHydrationWarning>
      <head>
        {/* 저장해 둔 글자 크기를 첫 그리기 전에 적용 — 커졌다 작아지는 깜빡임 방지 */}
        <script dangerouslySetInnerHTML={{ __html: TEXT_SCALE_BOOTSTRAP }} />
      </head>
      <body className="font-[var(--font-noto)]">
        {/* 데스크톱에서도 390x844 모바일 프레임으로 중앙 정렬 */}
        <div className="min-h-screen w-full flex justify-center">
          <div className="relative w-full max-w-frame min-h-screen bg-ivory overflow-hidden shadow-xl">
            <UpdateBanner />
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
