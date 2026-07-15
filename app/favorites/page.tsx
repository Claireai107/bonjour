"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Boni from "@/components/Boni";
import PageHeader from "@/components/PageHeader";
import TabBar from "@/components/TabBar";
import { useBonJour } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { youtubeWatch } from "@/lib/videos";
import type { FavoriteItem } from "@/lib/types";

const TABS: { key: FavoriteItem["kind"]; label: string }[] = [
  { key: "video", label: "운동 영상" },
  { key: "place", label: "운동 시설" },
  { key: "program", label: "프로그램" },
];

const KIND_LABEL: Record<FavoriteItem["kind"], string> = {
  video: "운동 영상",
  place: "운동 시설",
  program: "프로그램",
};

// 화면 6 · 관심 건강 관리 — 하트로 담은 영상·시설·프로그램 모음
export default function FavoritesScreen() {
  const router = useRouter();
  const favorites = useBonJour((s) => s.favorites);
  const toggleFavorite = useBonJour((s) => s.toggleFavorite);
  const hydrated = useHydrated();
  const [tab, setTab] = useState<FavoriteItem["kind"]>("video");

  if (!hydrated) return null;

  const shown = favorites.filter((f) => f.kind === tab);

  return (
    <div className="h-dvh bg-ivory flex flex-col">
      <PageHeader title="관심 건강 관리" back />

      {/* 콘텐츠 스크롤 */}
      <div className="flex-1 overflow-y-auto px-gutter pb-8 flex flex-col">
      {/* 탭 */}
      <div className="mt-1 flex gap-2">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 h-12 rounded-pill flex items-center justify-center text-[16px] box-border ${
                active
                  ? "bg-forest text-white font-bold"
                  : "bg-white border-[1.5px] border-borderline text-graytext font-medium"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        // 6b · 비어있을 때
        <>
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <Boni pose="heart" size={120} />
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3E7A4E"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute -top-1.5 -right-[18px]"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <p className="text-[20px] font-bold text-charcoal text-center">
              아직 담은 관심이 없어요
            </p>
            <p className="text-[17px] text-graytext text-center -mt-2">
              마음에 드는 걸 하트로 담아보세요
            </p>
          </div>
          <button
            onClick={() => router.push("/routine")}
            className="h-touch flex-none rounded-btn bg-lightgreen text-forest text-[20px] font-bold flex items-center justify-center"
          >
            맞춤 루틴 보러 가기
          </button>
        </>
      ) : (
        // 6a · 담은 항목 리스트
        <>
          <div className="mt-4 flex flex-col gap-3">
            {shown.map((f) => (
              <FavCard key={f.id} item={f} onRemove={() => toggleFavorite(f)} />
            ))}
          </div>
          <p className="mt-3 text-[13px] text-graytext text-center">
            하트를 다시 누르면 관심에서 빠져요
          </p>
          <div className="flex-1" />
        </>
      )}
      </div>
      <TabBar />
    </div>
  );
}

function KindIcon({ kind }: { kind: FavoriteItem["kind"] }) {
  if (kind === "video") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#3E7A4E">
        <path d="M8 5v14l11-7z" />
      </svg>
    );
  }
  if (kind === "place") {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#3E7A4E"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 7v10" />
        <path d="M18 7v10" />
        <path d="M3 9v6" />
        <path d="M21 9v6" />
        <path d="M6 12h12" />
      </svg>
    );
  }
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#3E7A4E"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function FavCard({
  item,
  onRemove,
}: {
  item: FavoriteItem;
  onRemove: () => void;
}) {
  const ctaLabel = item.kind === "place" ? "예약" : "바로가기";
  const ctaClass =
    "mt-3 h-[52px] w-full rounded-field bg-forest text-white text-[18px] font-bold flex items-center justify-center";

  return (
    <div className="bg-white rounded-card px-[18px] py-4 shadow-[0_1px_6px_rgba(0,0,0,.06)]">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-[14px] bg-lightgreen flex items-center justify-center flex-none">
          <KindIcon kind={item.kind} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[17px] font-bold text-charcoal truncate">
            {item.title}
          </p>
          <p className="mt-0.5 text-[15px] text-graytext truncate">
            {KIND_LABEL[item.kind]}
            {item.subtitle ? ` · ${item.subtitle}` : ""}
          </p>
        </div>
        <button onClick={onRemove} aria-label="관심 해제" className="flex-none">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#3E7A4E">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>
      {item.kind === "video" && item.youtubeId ? (
        <a
          href={youtubeWatch(item.youtubeId)}
          target="_blank"
          rel="noopener noreferrer"
          className={ctaClass}
        >
          {ctaLabel}
        </a>
      ) : (
        <button className={ctaClass}>{ctaLabel}</button>
      )}
    </div>
  );
}
