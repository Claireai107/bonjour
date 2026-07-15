import type { MetadataRoute } from "next";

// PWA 매니페스트 — 홈 화면에 추가 시 앱 아이콘·이름·전체화면(standalone)으로 열림
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "본주르 — AI 뼈 건강 플랫폼",
    short_name: "본주르",
    description: "30초 설문과 건강검진으로 내 뼈의 미래를 읽다",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF6EC",
    theme_color: "#FAF6EC",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
