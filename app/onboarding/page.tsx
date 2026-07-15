"use client";

import { useRouter } from "next/navigation";
import Boni from "@/components/Boni";
import TabBar from "@/components/TabBar";
import { useBonJour } from "@/lib/store";

// 답변 방식 선택 (부록 C·G: 설문 시작 전 1회 선택)
export default function AnswerModeScreen() {
  const router = useRouter();
  const setAnswerMode = useBonJour((s) => s.setAnswerMode);
  const reset = useBonJour((s) => s.reset);

  const choose = (mode: "hand" | "voice") => {
    reset();
    setAnswerMode(mode);
    router.push("/survey");
  };

  return (
    <div className="h-dvh bg-ivory flex flex-col">
      {/* 상단 고정: 뒤로가기 + 본이 */}
      <div className="shrink-0 pt-safetop pb-2 px-gutter flex items-center gap-3">
        <button
          onClick={() => router.back()}
          aria-label="뒤로 가기"
          className="shrink-0 text-charcoal"
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex-1" />
        <Boni pose="point" size={58} className="shrink-0" />
      </div>

      {/* 콘텐츠 스크롤 */}
      <div className="flex-1 overflow-y-auto px-gutter pb-10 flex flex-col [&>*]:shrink-0">
      <h1 className="mt-9 text-[30px] font-bold text-charcoal">
        어떻게 답하시겠어요?
      </h1>
      <p className="mt-2.5 text-[18px] text-graytext">
        설문 중에 언제든 바꿀 수 있어요
      </p>

      <div className="mt-7 flex flex-col gap-4">
        <button
          onClick={() => choose("hand")}
          className="bg-white rounded-card px-6 py-7 flex items-center gap-[18px] text-left shadow-[0_1px_6px_rgba(0,0,0,0.06)] active:brightness-95"
        >
          <div className="w-16 h-16 rounded-field bg-lightgreen flex items-center justify-center flex-none">
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3E7A4E"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 11V6a2 2 0 0 0-4 0" />
              <path d="M14 10V4a2 2 0 0 0-4 0v2" />
              <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
              <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[22px] font-bold text-charcoal">
              손으로 입력하기
            </p>
            <p className="mt-1 text-[16px] text-graytext">버튼을 눌러 답해요</p>
          </div>
          <svg
            width="22"
            height="22"
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

        <button
          onClick={() => choose("voice")}
          className="bg-white rounded-card px-6 py-7 flex items-center gap-[18px] text-left shadow-[0_1px_6px_rgba(0,0,0,0.06)] active:brightness-95"
        >
          <div className="w-16 h-16 rounded-field bg-lightgreen flex items-center justify-center flex-none">
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3E7A4E"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
              <path d="M12 18v4" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[22px] font-bold text-charcoal">말로 답하기</p>
            <p className="mt-1 text-[16px] text-graytext">
              본이가 읽어주고, 말로 답해요
            </p>
          </div>
          <svg
            width="22"
            height="22"
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
      </div>

      <div className="flex-1" />
      </div>
      <TabBar />
    </div>
  );
}
