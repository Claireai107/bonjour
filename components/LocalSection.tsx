"use client";

import { useState } from "react";
import { useBonJour } from "@/lib/store";
import { formatDistance } from "@/lib/geo";

// 우리동네 섹션 — "가까운 곳에서 시작해보세요" (루틴 페이지 + 우리동네 탭 공용).
// "내 위치로 찾기" 버튼 → GPS 좌표로 /api/health-centers(카카오 로컬) 호출.
// 카카오 키가 없으면 순천 인근 예시 시설을 거리 계산해 보여준다(fallback).

const HEART_PATH =
  "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z";

type NearbyPlace = {
  id: string;
  name: string;
  distanceM: number;
  walkMin: number;
  roadAddress: string;
  address: string;
  phone: string;
  url: string;
};

type GeoState = "idle" | "loading" | "done" | "error";

// 프로그램 문구는 데모용 임의 카피 — 실제 프로그램 정보 아님 (센터명·거리만 실데이터)
const DEMO_PROGRAMS = [
  "시니어 골밀도 강화 클래스",
  "중장년 근력 프로그램",
  "첫 달 50% 할인",
];

export default function LocalSection({
  onToast,
  headerRight,
}: {
  onToast: (msg: string) => void;
  headerRight?: React.ReactNode; // 헤더 우측 장식 (우리동네 탭의 달리는 본이)
}) {
  const [state, setState] = useState<GeoState>("idle");
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [gyms, setGyms] = useState<NearbyPlace[]>([]);
  const [source, setSource] = useState<"kakao" | "fallback" | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // GPS → 카카오 로컬 검색으로 근처 보건소 찾기
  const search = () => {
    if (!("geolocation" in navigator)) {
      setState("error");
      setErrorMsg("이 기기에서는 위치를 사용할 수 없어요.");
      return;
    }
    setState("loading");
    setErrorMsg("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `/api/health-centers?lat=${latitude}&lng=${longitude}`
          );
          if (!res.ok) throw new Error("api");
          const data = await res.json();
          setPlaces(Array.isArray(data.places) ? data.places : []);
          setGyms(Array.isArray(data.gyms) ? data.gyms : []);
          setSource(data.source ?? null);
          setState("done");
          if (!data.places?.length) onToast("주변에서 찾지 못했어요");
        } catch {
          setState("error");
          setErrorMsg("목록을 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
        }
      },
      (err) => {
        setState("error");
        setErrorMsg(
          err.code === err.PERMISSION_DENIED
            ? "위치 권한이 꺼져 있어요. 브라우저 설정에서 허용해주세요."
            : "위치를 확인하지 못했어요."
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  return (
    <>
      {/* 섹션 헤더 — AI 루틴 헤드라인과 동일 포맷 (회색 설명 위 + 포레스트 제목 아래) */}
      <div id="local" className="mt-[24px] px-[2px] flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[18px] font-medium text-graytext">
            AI 추천 운동을 근처에서
          </p>
          <h2 className="mt-[4px] text-[23px] font-bold text-forest leading-[1.35]">
            가까운 곳에서 시작해보세요
          </h2>
        </div>
        {headerRight}
      </div>

      {/* 내 위치로 찾기 버튼 */}
      <button
        onClick={search}
        disabled={state === "loading"}
        className="mt-[12px] w-full h-[52px] rounded-btn bg-lightgreen text-forest text-[17px] font-bold flex items-center justify-center gap-2 active:brightness-95 disabled:opacity-70 transition"
      >
        {state === "loading" ? (
          <>
            <span
              className="inline-block w-[18px] h-[18px] rounded-full border-2 border-forest border-t-transparent animate-spin"
              aria-hidden
            />
            현재 위치 확인 중…
          </>
        ) : (
          <>
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
            {state === "done" ? "다시 찾기" : "내 위치로 가까운 보건소 찾기"}
          </>
        )}
      </button>

      {state === "error" && (
        <p className="mt-[8px] text-[14px] text-danger">{errorMsg}</p>
      )}

      {state === "done" ? (
        <>
          {places.slice(0, 3).map((p, i) => (
            <LocalPlaceCard
              key={p.id}
              id={`place-hc-${p.id}`}
              icon="pin"
              name={p.name}
              walk={`도보 ${p.walkMin}분 · ${formatDistance(p.distanceM)}`}
              desc={p.roadAddress || p.address}
              badge="무료"
              detailLink
              href={p.url}
              onToast={onToast}
              className={i === 0 ? "mt-[10px]" : "mt-[10px]"}
            />
          ))}
          {source === "fallback" && (
            <p className="mt-[8px] text-[13px] text-graytext">
              * 예시 데이터예요. (카카오 키 연결 시 실제 보건소가 표시돼요)
            </p>
          )}
        </>
      ) : (
        <LocalPlaceCard
          id="place-health-center"
          icon="pin"
          name="순천 보건소"
          walk="도보 12분"
          desc="중장년 아쿠아로빅 · 매주 화 오전 10시"
          badge="무료"
          detailLink
          href="https://map.kakao.com/?q=순천시보건소"
          onToast={onToast}
          className="mt-[10px]"
        />
      )}
      {(() => {
        const gymCards =
          state === "done"
            ? gyms.slice(0, 2).map((g, i) => ({
                id: `gym-${g.id}`,
                icon: (i === 0 ? "dumbbell" : "plus") as "dumbbell" | "plus",
                name: g.name,
                walk: `도보 ${g.walkMin}분 · ${formatDistance(g.distanceM)}`,
                desc: DEMO_PROGRAMS[i % DEMO_PROGRAMS.length],
                href: g.url,
              }))
            : [];
        const demoCards = [
          {
            id: "place-pilates",
            icon: "dumbbell" as const,
            name: "순천 필라테스",
            walk: "도보 8분",
            desc: "시니어 골밀도 강화 클래스",
            href: undefined,
          },
          {
            id: "place-gym",
            icon: "plus" as const,
            name: "튼튼 헬스장",
            walk: "도보 15분",
            desc: "첫 달 50% 할인",
            href: undefined,
          },
        ];
        const cards = [...gymCards, ...demoCards].slice(0, 2);
        return cards.map((c, i) => (
          <LocalPlaceCard
            key={c.id}
            id={c.id}
            icon={c.icon}
            name={c.name}
            walk={c.walk}
            desc={c.desc}
            badge="제휴"
            cta={i === 0 ? "예약하기" : "바로가기"}
            href={c.href}
            onToast={onToast}
            className="mt-[10px]"
          />
        ));
      })()}

      <p className="mt-[10px] text-[13px] text-graytext text-center">
        제휴 시설은 회원님께 추가 비용이 없어요
      </p>
    </>
  );
}

// 우리동네 시설 카드 — 아이콘 44 + 이름·도보 + 뱃지(무료/제휴) + 하트,
// 하단은 "자세히 보기" 링크 또는 예약/바로가기 CTA(52px).
export function LocalPlaceCard({
  id,
  icon,
  name,
  walk,
  desc,
  badge,
  cta,
  detailLink,
  href,
  onToast,
  className = "",
}: {
  id: string;
  icon: "pin" | "dumbbell" | "plus";
  name: string;
  walk: string;
  desc: string;
  badge: "무료" | "제휴";
  cta?: string;
  detailLink?: boolean;
  href?: string; // 자세히 보기 클릭 시 열 링크 (카카오맵 상세 등)
  onToast: (msg: string) => void;
  className?: string;
}) {
  const favorites = useBonJour((s) => s.favorites);
  const toggleFavorite = useBonJour((s) => s.toggleFavorite);
  const faved = favorites.some((f) => f.id === id);

  const heart = () => {
    toggleFavorite({
      id,
      kind: "place",
      title: `${name} · ${walk}`,
      subtitle: desc,
    });
    onToast(faved ? "관심에서 뺐어요" : "관심에 담겼어요");
  };

  return (
    <div
      className={`bg-white rounded-card py-[16px] px-[18px] shadow-[0_1px_6px_rgba(0,0,0,0.06)] ${className}`}
    >
      <div className="flex items-start gap-[12px]">
        <div className="w-[44px] h-[44px] rounded-[14px] bg-lightgreen flex items-center justify-center shrink-0">
          <PlaceIcon icon={icon} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[17px] font-bold text-charcoal">
            {name}{" "}
            <span className="font-medium text-graytext text-[15px]">
              · {walk}
            </span>
          </p>
          <p className="mt-[2px] text-[15px] text-graytext">{desc}</p>
        </div>
        <div className="shrink-0 flex items-center gap-[8px]">
          {badge === "무료" ? (
            <span className="text-[13px] font-bold text-forest bg-lightgreen rounded-chip py-[3px] px-[10px]">
              무료
            </span>
          ) : (
            <span className="text-[12px] font-bold text-[#8C5A1E] bg-[#FBF3E2] border border-[#E8C87A] rounded-chip py-[2px] px-[8px]">
              제휴
            </span>
          )}
          <button
            onClick={heart}
            aria-label={faved ? "관심 해제" : "관심 담기"}
            aria-pressed={faved}
          >
            <HeartIcon filled={faved} size={26} />
          </button>
        </div>
      </div>

      {detailLink && (
        <button
          type="button"
          onClick={() => {
            const url =
              href || `https://map.kakao.com/?q=${encodeURIComponent(name)}`;
            window.open(url, "_blank", "noopener");
          }}
          className="mt-[10px] w-full flex justify-end items-center gap-[2px]"
        >
          <span className="text-[15px] font-bold text-forest">자세히 보기</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3E7A4E"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}
      {cta && (
        <button
          type="button"
          onClick={() => {
            const url =
              href || `https://map.kakao.com/?q=${encodeURIComponent(name)}`;
            window.open(url, "_blank", "noopener");
          }}
          className="mt-[12px] w-full h-[52px] rounded-btn bg-forest text-white text-[18px] font-bold flex items-center justify-center active:brightness-95"
        >
          {cta}
        </button>
      )}
    </div>
  );
}

function PlaceIcon({ icon }: { icon: "pin" | "dumbbell" | "plus" }) {
  const props = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#3E7A4E",
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (icon === "pin") {
    return (
      <svg {...props}>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    );
  }
  if (icon === "dumbbell") {
    return (
      <svg {...props}>
        <path d="M6 7v10" />
        <path d="M18 7v10" />
        <path d="M3 9v6" />
        <path d="M21 9v6" />
        <path d="M6 12h12" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <path d="M12 2v20" />
      <path d="M2 12h20" />
      <circle cx="12" cy="12" r="9" />
    </svg>
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
