"use client";

import { useMemo, useState, type MouseEvent } from "react";
import TabBar from "@/components/TabBar";
import PageHeader from "@/components/PageHeader";
import LocalSection from "@/components/LocalSection";
import Boni from "@/components/Boni";
import EmptyAnalysis from "@/components/EmptyAnalysis";
import { useBonJour } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { buildPrescription } from "@/lib/prescription";
import { youtubeThumb, youtubeWatch } from "@/lib/videos";
import type { VideoResource, FavoriteItem } from "@/lib/types";

const HEART_PATH =
  "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z";

// 처방 규칙 → 화면 상단 헤더 문구 (디자인: "운동이 부족하시네요 / 그래서 근력운동을 추천해요")
const RULE_HEADER: Record<string, { sub: string; title: string }> = {
  R1: { sub: "운동이 부족하시네요", title: "그래서 근력운동을 추천해요" },
  R2: { sub: "체중이 조금 부족하시네요", title: "그래서 하체 근력운동을 추천해요" },
  R3: { sub: "낙상이 걱정되는 시기예요", title: "그래서 균형운동을 추천해요" },
  R4: { sub: "허리 지지력이 약하시네요", title: "그래서 코어 운동을 추천해요" },
  R5: { sub: "활동량이 부족하시네요", title: "그래서 걷기와 스트레칭을 추천해요" },
  R6: { sub: "폐경 후엔 뼈가 약해지기 쉬워요", title: "그래서 체중부하 운동을 추천해요" },
  R7: { sub: "균형 감각이 걱정되시네요", title: "그래서 균형운동을 추천해요" },
  R8: { sub: "몸이 굳어 있기 쉬워요", title: "그래서 스트레칭을 추천해요" },
  R9: { sub: "전반적으로 잘 관리하고 계세요", title: "지금처럼 유지하는 걸 추천해요" },
};

export default function RoutineScreen() {
  const result = useBonJour((s) => s.result);
  const answers = useBonJour((s) => s.answers);
  const hydrated = useHydrated();
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  };

  const cards = useMemo(
    () => (result ? buildPrescription(result, answers) : []),
    [result, answers]
  );
  if (!hydrated) return null;

  return (
    <div className="h-dvh bg-ivory flex flex-col">
      <PageHeader title="AI 루틴" />

      {result ? (
        <div className="flex-1 overflow-y-auto px-gutter pb-6">
          {cards.map((card, idx) => {
            const header = RULE_HEADER[card.ruleId] ?? {
              sub: "",
              title: card.headline,
            };
            return (
              <section key={card.ruleId} className={idx > 0 ? "mt-[32px]" : ""}>
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    {header.sub && (
                      <p className="text-[18px] font-medium text-graytext">
                        {header.sub}
                      </p>
                    )}
                    <h2 className="mt-[4px] text-[23px] font-bold text-forest leading-[1.35]">
                      {header.title}
                    </h2>
                  </div>
                  {idx === 0 && (
                    <Boni pose="praise" size={76} className="shrink-0" />
                  )}
                </div>

                {/* 체크리스트 카드 */}
                <div className="mt-[18px] bg-white rounded-card py-[20px] px-[22px] flex flex-col gap-[16px] shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                  {card.checklist.map((item, i) => (
                    <ChecklistRow
                      key={i}
                      label={item}
                      cardId={card.ruleId}
                      onToast={showToast}
                    />
                  ))}
                </div>

                {/* 영상 카드 */}
                {card.videos.map((v) => (
                  <VideoCard key={v.id} video={v} onToast={showToast} />
                ))}

                {/* BonTip */}
                <div className="mt-[14px] bg-lightgreen rounded-card py-[16px] px-[20px] flex items-center gap-[14px]">
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#D9A441"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0"
                  >
                    <path d="M9 18h6" />
                    <path d="M10 22h4" />
                    <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z" />
                  </svg>
                  <p className="text-[16px] text-charcoal leading-[1.5]">
                    <b className="text-forest">BonTip</b> · {card.bonTip}
                  </p>
                </div>
              </section>
            );
          })}

          {/* 우리동네 연계 (공용 섹션 — /local 탭과 동일) */}
          <LocalSection onToast={showToast} />

          <div className="mt-[26px] flex items-center gap-3">
            <Boni pose="lift" size={64} className="shrink-0" />
            <p className="text-[14px] text-graytext leading-[1.6]">
              이 운동 추천은 참고용이에요. 통증이 있거나 치료 중이시라면
              <br />
              운동 시작 전에 의사와 상담해 주세요.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 px-gutter flex flex-col">
          <EmptyAnalysis />
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-[98px] left-1/2 -translate-x-1/2 z-50 bg-charcoal text-white text-[16px] font-bold rounded-pill py-[12px] px-[22px] flex items-center gap-[8px] shadow-[0_4px_12px_rgba(0,0,0,0.25)] whitespace-nowrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
            <path d={HEART_PATH} />
          </svg>
          {toast}
        </div>
      )}

      <TabBar />
    </div>
  );
}

function HeartIcon({ filled, size = 24 }: { filled: boolean; size?: number }) {
  return filled ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#3E7A4E">
      <path d={HEART_PATH} />
    </svg>
  ) : (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#6B6B6B"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={HEART_PATH} />
    </svg>
  );
}

// 체크리스트 행 — 32px 체크박스 + "루틴명 · 주기" + 하트(관심 담기)
function ChecklistRow({
  label,
  cardId,
  onToast,
}: {
  label: string;
  cardId: string;
  onToast: (msg: string) => void;
}) {
  const [done, setDone] = useState(false);
  const favorites = useBonJour((s) => s.favorites);
  const toggleFavorite = useBonJour((s) => s.toggleFavorite);

  const [main, ...rest] = label.split(" · ");
  const freq = rest.join(" · ");

  const favId = `task-${cardId}-${main}`;
  const faved = favorites.some((f) => f.id === favId);

  const heart = () => {
    toggleFavorite({
      id: favId,
      kind: "program",
      title: main,
      subtitle: freq || undefined,
    });
    onToast(faved ? "관심에서 뺐어요" : "관심에 담겼어요");
  };

  return (
    <div className="flex items-center gap-[14px]">
      <button
        onClick={() => setDone((v) => !v)}
        aria-label={done ? `${main} 완료 해제` : `${main} 완료`}
        aria-pressed={done}
        className={`w-[32px] h-[32px] rounded-[10px] border-2 shrink-0 flex items-center justify-center ${
          done
            ? "bg-forest border-forest text-white"
            : "bg-white border-borderline"
        }`}
      >
        {done && "✓"}
      </button>
      <p
        className={`flex-1 text-[19px] font-medium ${
          done ? "text-graytext line-through" : "text-charcoal"
        }`}
      >
        {main}
        {freq && (
          <span className="text-graytext text-[16px]"> · {freq}</span>
        )}
      </p>
      <button
        onClick={heart}
        aria-label={faved ? "관심 해제" : "관심 담기"}
        aria-pressed={faved}
        className="shrink-0"
      >
        <HeartIcon filled={faved} />
      </button>
    </div>
  );
}

function VideoCard({
  video,
  onToast,
}: {
  video: VideoResource;
  onToast: (msg: string) => void;
}) {
  const favorites = useBonJour((s) => s.favorites);
  const toggleFavorite = useBonJour((s) => s.toggleFavorite);
  const favId = "video-" + video.youtubeId;
  const faved = favorites.some((f) => f.id === favId);

  const heart = (e: MouseEvent) => {
    e.preventDefault();
    const item: FavoriteItem = {
      id: favId,
      kind: "video",
      title: video.title,
      subtitle: video.parts,
      youtubeId: video.youtubeId,
    };
    toggleFavorite(item);
    onToast(faved ? "관심에서 뺐어요" : "관심에 담겼어요");
  };

  return (
    <div className="mt-[14px] bg-white rounded-card overflow-hidden shadow-[0_1px_6px_rgba(0,0,0,0.06)] relative">
      {/* 플로팅 하트 */}
      <button
        onClick={heart}
        aria-label={faved ? "관심 해제" : "관심 담기"}
        aria-pressed={faved}
        className="absolute top-[10px] right-[10px] z-10 w-[40px] h-[40px] rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.18)] flex items-center justify-center"
      >
        <HeartIcon filled={faved} size={22} />
      </button>

      <a
        href={youtubeWatch(video.youtubeId)}
        target="_blank"
        rel="noopener noreferrer"
        className="block active:brightness-95"
      >
        <div className="relative h-[108px] bg-lightgreen">
          {/* 유튜브 썸네일 (임베드/재생은 유튜브에서) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={youtubeThumb(video.youtubeId)}
            alt={video.title}
            className="w-full h-full object-cover"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-[52px] h-[52px] rounded-full bg-forest flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        </div>
        <div className="pt-[12px] px-[20px] pb-[14px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[18px] font-bold text-charcoal truncate">
              {video.title}
            </span>
            {video.duration && (
              <span className="text-[16px] text-graytext shrink-0">
                ▶ {video.duration}
              </span>
            )}
          </div>
          <p className="mt-[4px] text-[13px] text-graytext">
            자료 제공: 한국건강증진개발원
          </p>
        </div>
      </a>
    </div>
  );
}

