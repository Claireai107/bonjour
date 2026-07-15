"use client";

import { usePathname, useRouter } from "next/navigation";
import navigation from "@/lib/navigation";

const { activeTabForPath } = navigation;

// 하단 탭바 — 디자인: 높이 76, 흰 배경, 상단 보더 #D8D8D0, 5열 그리드,
// 아이콘 24(stroke 2.4), 라벨 12px, 활성 탭은 포레스트 그린 Bold.
const TABS = [
  { key: "home", label: "홈", path: "/home", icon: HomeIcon },
  { key: "routine", label: "AI 루틴", path: "/routine", icon: DumbbellIcon },
  { key: "local", label: "우리동네", path: "/local", icon: PinIcon },
  { key: "report", label: "리포트", path: "/report", icon: ChartIcon },
  { key: "my", label: "마이", path: "/mypage", icon: PersonIcon },
];

export default function TabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const activeKey = activeTabForPath(pathname);
  return (
    <nav className="relative z-40 w-full h-[76px] shrink-0 bg-white border-t border-borderline grid grid-cols-5 items-center pb-1.5">
      {TABS.map((t) => {
        const active = activeKey === t.key;
        const Icon = t.icon;
        const color = active ? "#3E7A4E" : "#6B6B6B";
        return (
          <button
            key={t.key}
            onClick={() => router.push(t.path)}
            className="flex flex-col items-center gap-[3px]"
          >
            <Icon color={color} />
            <span
              className="text-[12px]"
              style={{ color, fontWeight: active ? 700 : 400 }}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function base(color: string) {
  return {
    width: 24,
    height: 24,
    fill: "none",
    stroke: color,
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}
function HomeIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" {...base(color)}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}
function DumbbellIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" {...base(color)}>
      <path d="M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12" />
    </svg>
  );
}
function PinIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" {...base(color)}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function ChartIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" {...base(color)}>
      <path d="M4 20v-6" />
      <path d="M12 20V8" />
      <path d="M20 20V4" />
    </svg>
  );
}
function PersonIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" {...base(color)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}
