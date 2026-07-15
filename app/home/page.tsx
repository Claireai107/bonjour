"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TabBar from "@/components/TabBar";
import PageHeader from "@/components/PageHeader";
import EmptyAnalysis from "@/components/EmptyAnalysis";
import { useBonJour } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { buildPrescription } from "@/lib/prescription";

// 홈 탭 — 측정 데이터가 있으면 '오늘의 맞춤 루틴', 없으면 측정하러 가기
export default function HomeScreen() {
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useBonJour((s) => s.profile);
  const answers = useBonJour((s) => s.answers);
  const result = useBonJour((s) => s.result);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // 실제 처방에서 오늘의 루틴 체크리스트 상위 3개
  const todos = useMemo(() => {
    if (!result) return [];
    return buildPrescription(result, answers)
      .flatMap((c) => c.checklist)
      .slice(0, 3);
  }, [result, answers]);

  if (!hydrated) return null;

  const displayName = profile.name?.trim() || profile.relation || "사용자";
  const gradeColor =
    result?.grade === "정상"
      ? "#3E7A4E"
      : result?.grade === "주의"
      ? "#D9A441"
      : "#C7503A";
  const gradeLabel =
    result?.grade === "정상" ? "좋음" : result?.grade ?? "";

  return (
    <div className="h-dvh bg-ivory flex flex-col">
      <PageHeader
        title={`${displayName}님, 안녕하세요!`}
        subtitle="오늘도 뼈 건강 함께 챙겨요"
      />

      {/* 콘텐츠 스크롤 */}
      <div className="flex-1 overflow-y-auto px-gutter pb-4 flex flex-col">
        {result ? (
          <>
            {/* Bone Score 요약 */}
            <button
              onClick={() => router.push("/report")}
              className="mt-4 bg-white rounded-card px-5 py-4 shadow-[0_1px_6px_rgba(0,0,0,.06)] flex items-center gap-3 text-left active:brightness-95"
            >
              <span className="text-[15px] font-bold text-graytext whitespace-nowrap">
                Bone Score
              </span>
              <span
                className="flex-1 text-[26px] font-bold"
                style={{ color: gradeColor }}
              >
                {result.boneScore}점
              </span>
              <span
                className="bg-lightgreen text-[16px] font-bold rounded-chip px-3 py-1"
                style={{ color: gradeColor }}
              >
                {gradeLabel}
              </span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6B6B6B"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>

            {/* 오늘의 맞춤 루틴 */}
            <div className="mt-3 bg-lightgreen rounded-card px-5 pt-4 pb-3.5">
              <div className="flex items-center gap-2.5">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#3E7A4E"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                  <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z" />
                </svg>
                <span className="flex-1 text-[19px] font-bold text-charcoal whitespace-nowrap">
                  오늘의 맞춤 루틴
                </span>
                <button
                  onClick={() => router.push("/routine")}
                  className="flex items-center gap-0.5 text-[15px] font-bold text-forest whitespace-nowrap"
                >
                  전체 보기{" "}
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
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {todos.map((t) => {
                  const [main, ...rest] = t.split(" · ");
                  const done = !!checked[t];
                  return (
                    <button
                      key={t}
                      onClick={() =>
                        setChecked((c) => ({ ...c, [t]: !c[t] }))
                      }
                      className="bg-white rounded-field px-4 py-3.5 flex items-center gap-3 text-left active:brightness-95"
                    >
                      <span
                        className={`w-7 h-7 rounded-[9px] border-2 flex-none flex items-center justify-center text-white text-[15px] ${
                          done
                            ? "bg-forest border-forest"
                            : "bg-white border-borderline"
                        }`}
                      >
                        {done && "✓"}
                      </span>
                      <span
                        className={`text-[18px] font-medium ${
                          done
                            ? "text-graytext line-through"
                            : "text-charcoal"
                        }`}
                      >
                        {main}
                        {rest.length > 0 && (
                          <span className="text-graytext text-[15px]">
                            {" "}
                            · {rest.join(" · ")}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* 측정 데이터 없음 — 측정하러 가기 */
          <EmptyAnalysis />
        )}

        {/* 우리동네 운동센터 요약 — 전체는 우리동네 탭에서 */}
        <div className="mt-4 mb-1 bg-white rounded-card px-5 pt-4 pb-2 shadow-[0_1px_6px_rgba(0,0,0,.06)]">
          <div className="flex items-center gap-2.5">
            <svg
              width="22"
              height="22"
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
            <span className="flex-1 text-[19px] font-bold text-charcoal whitespace-nowrap">
              우리동네 운동센터
            </span>
            <button
              onClick={() => router.push("/local")}
              className="flex items-center gap-0.5 text-[15px] font-bold text-forest whitespace-nowrap"
            >
              전체 보기{" "}
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
          </div>
          <div className="mt-1">
            {[
              { name: "순천 보건소", walk: "도보 12분", desc: "중장년 아쿠아로빅", badge: "무료" },
              { name: "순천 필라테스", walk: "도보 8분", desc: "시니어 골밀도 강화", badge: "제휴" },
              { name: "튼튼 헬스장", walk: "도보 15분", desc: "첫 달 50% 할인", badge: "제휴" },
            ].map((p, i) => (
              <button
                key={p.name}
                onClick={() => router.push("/local")}
                className={`w-full py-3 flex items-center gap-3 text-left active:brightness-95 ${
                  i > 0 ? "border-t border-borderline/60" : ""
                }`}
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-[17px] font-bold text-charcoal truncate">
                    {p.name}{" "}
                    <span className="font-medium text-graytext text-[14px]">
                      · {p.walk}
                    </span>
                  </span>
                  <span className="block text-[14px] text-graytext truncate">
                    {p.desc}
                  </span>
                </span>
                {p.badge === "무료" ? (
                  <span className="shrink-0 text-[13px] font-bold text-forest bg-lightgreen rounded-chip py-[3px] px-[10px]">
                    무료
                  </span>
                ) : (
                  <span className="shrink-0 text-[12px] font-bold text-[#8C5A1E] bg-[#FBF3E2] border border-[#E8C87A] rounded-chip py-[2px] px-[8px]">
                    제휴
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <TabBar />
    </div>
  );
}
