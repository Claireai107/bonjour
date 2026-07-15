import type { Config } from "tailwindcss";

// 본주르 디자인 스펙 v1.2 §0 — 색상/모서리/폰트 토큰을 그대로 반영.
// 값은 스펙 표에서 직접 가져온 것이며 절대 임의 변경 금지.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: "#3E7A4E", // 메인 버튼, 강조 텍스트, 로고
        green: "#5B9A6B", // 보조 그린, 그래프
        ivory: "#FAF6EC", // 화면 배경(기본)
        gold: "#D9A441", // 포인트 (BonJour 로고)
        charcoal: "#2B2B2B", // 본문 텍스트
        graytext: "#6B6B6B", // 보조 텍스트
        lightgreen: "#E8F0E3", // 연한 배경, 음성버튼, 뱃지
        borderline: "#D8D8D0", // 입력필드 테두리
        // 신호등 상태색 (Bone Score 등급용)
        good: "#3E7A4E",
        warn: "#D9A441",
        danger: "#C7503A",
      },
      borderRadius: {
        btn: "16px", // 버튼
        card: "20px", // 카드
        field: "16px", // 입력 필드
        chip: "12px", // 작은 뱃지/칩
        pill: "999px", // 시작하기 CTA
      },
      fontSize: {
        // 시니어 친화: 최소 16px, 이보다 작게 금지
        display: ["30px", { lineHeight: "1.35", fontWeight: "700" }],
        h1: ["30px", { lineHeight: "1.35", fontWeight: "700" }],
        h2: ["24px", { lineHeight: "1.4", fontWeight: "700" }],
        h3: ["22px", { lineHeight: "1.4", fontWeight: "700" }],
        body: ["18px", { lineHeight: "1.55" }],
        btn: ["22px", { lineHeight: "1.2", fontWeight: "700" }],
        sub: ["16px", { lineHeight: "1.5" }],
      },
      spacing: {
        gutter: "28px", // 화면 좌우 패딩(고정)
        touch: "64px", // 버튼/입력 높이(터치영역)
        // 화면 상단 여백 — 표준 모바일 웹: 노치 safe-area + 12px
        safetop: "calc(env(safe-area-inset-top) + 12px)",
      },
      maxWidth: {
        frame: "390px", // 모바일 프레임 폭
      },
    },
  },
  plugins: [],
};

export default config;
