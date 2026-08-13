"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ScreenFrame from "@/components/ScreenFrame";
import ProgressBar from "@/components/ProgressBar";
import Boni from "@/components/Boni";
import { useBonJour } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { QUESTIONS, type Question } from "@/lib/survey";
import type { SurveyAnswers } from "@/lib/types";
import { useSpeech } from "@/lib/useSpeech";
import PermissionPrimer, { checkPermission } from "@/components/PermissionPrimer";
import {
  normalize,
  parseCount,
  parseRange,
  parseKoreanNumber,
} from "@/lib/speechNormalize";

// 음성 인식 결과 → 선택지 매칭
//
// 1차 UT에서 "하루", "한 번", "안 해요", "5~7일"이 모두 매칭에 실패했다.
// 순서를 바꿔 표현 사전(parseCount)을 먼저 태우고, 거기서 나온 숫자를
// 문항이 정한 구간(numberToChoice)으로 옮긴다.
function matchChoice(q: Question, text: string): string | number | null {
  const s = normalize(text);
  if (!s) return null;

  // 1) 예 / 아니오 / 잘 모름
  const has = (arr: string[]) => arr.some((k) => s.includes(k));
  for (const c of q.choices ?? []) {
    if (c.value === "yes" && has(["예", "네", "응", "했", "맞", "있"])) return c.value;
    if (c.value === "no" && has(["아니", "안", "없", "아뇨"])) return c.value;
    if (c.value === "unknown" && has(["몰라", "모르", "글쎄"])) return c.value;
  }

  // 2) 문항별 추가 표현 (국민학교 → 초등학교 등)
  for (const [value, words] of Object.entries(q.voiceAliases ?? {})) {
    if (words.some((w) => s.includes(w))) {
      const hit = q.choices?.find((c) => String(c.value) === value);
      if (hit) return hit.value;
    }
  }

  // 3) 선택지 라벨 그대로 말한 경우
  for (const c of q.choices ?? []) {
    const label = normalize(c.label);
    if (s.includes(label) || label.includes(s)) return c.value;
  }

  // 4) 표현 사전으로 숫자를 뽑아 구간에 맞춘다
  const n = parseCount(s);
  if (n != null) {
    if (q.numberToChoice) {
      const mapped = q.numberToChoice(n);
      if (mapped != null) return mapped;
    }
    for (const c of q.choices ?? []) {
      if (normalize(c.label).includes(String(n))) return c.value;
    }
  }

  return null;
}

// ---------- 디자인 공통 SVG (설문 화면 원본 path) ----------

function CheckIcon({
  size = 24,
  stroke = "#3E7A4E",
  width = 3,
}: {
  size?: number;
  stroke?: string;
  width?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function MicIcon({
  size = 24,
  stroke = "#3E7A4E",
  width = 2.6,
}: {
  size?: number;
  stroke?: string;
  width?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
      <path d="M12 18v4" />
    </svg>
  );
}

function HandIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#3E7A4E"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 11V6a1.5 1.5 0 0 1 3 0v5" />
      <path d="M12 11V4.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M15 11V6.5a1.5 1.5 0 0 1 3 0V13" />
      <path d="M9 11V9a1.5 1.5 0 0 0-3 0v6a6 6 0 0 0 6 6h1a6 6 0 0 0 6-6" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#3E7A4E"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 5L6 9H2v6h4l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 5a9 9 0 0 1 0 14" />
    </svg>
  );
}

export default function SurveyScreen() {
  const router = useRouter();
  const answers = useBonJour((s) => s.answers);
  const setAnswer = useBonJour((s) => s.setAnswer);
  const answerMode = useBonJour((s) => s.answerMode);
  const setAnswerMode = useBonJour((s) => s.setAnswerMode);
  const { supported, listening, speak, listen } = useSpeech();
  const [heard, setHeard] = useState("");
  /**
   * 음성 입력 상태는 세 단계로 나눠 보여준다.
   *   idle → listening → recognized (또는 failed)
   * UT에서 버튼을 눌러도 켜졌는지 몰라 당황하는 경우가 있었다(P4·P5).
   */
  const [voiceState, setVoiceState] = useState<
    "idle" | "listening" | "recognized" | "failed"
  >("idle");
  const [rangeNote, setRangeNote] = useState("");
  const pickerRef = useRef<HTMLDivElement | null>(null);

  // 인식에 실패하면 직접 고르는 영역으로 시선을 옮겨준다
  const focusPicker = () => {
    setTimeout(() => {
      pickerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };


  const [idx, setIdx] = useState(0);
  const q = QUESTIONS[idx];

  // 음성 모드: 문항이 바뀌면 본이가 질문을 읽어줌
  useEffect(() => {
    setHeard("");
    setVoiceState("idle");
    setRangeNote("");
    if (answerMode === "voice") speak(q.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, answerMode]);

  // 디폴트값이 있는 숫자 문항은 진입 시 자동으로 답을 채운다 → [다음] 기본 활성화
  const hydrated = useHydrated();
  useEffect(() => {
    if (!hydrated) return;
    if (q.type === "number" && q.default != null && answers[q.key] == null) {
      setAnswer(q.key, q.default as SurveyAnswers[typeof q.key]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, idx]);

  // 조건부 표시 반영: 다음/이전 visible 문항 찾기
  const nextVisible = (from: number): number => {
    for (let i = from + 1; i < QUESTIONS.length; i++) {
      const qq = QUESTIONS[i];
      if (!qq.showIf || qq.showIf(answers)) return i;
    }
    return -1; // 끝
  };
  const prevVisible = (from: number): number => {
    for (let i = from - 1; i >= 0; i--) {
      const qq = QUESTIONS[i];
      if (!qq.showIf || qq.showIf(answers)) return i;
    }
    return -1;
  };

  // 진행 번호는 문항 고정 번호(q.step)가 아니라 "보이는 문항" 기준으로 1, 2, 3… 차례대로 센다
  // (폐경 '아니오'면 폐경 나이 문항이 숨겨져 번호가 건너뛰던 문제 방지)
  const isVisibleQ = (qq: Question) => !qq.showIf || qq.showIf(answers);
  const stepNo = QUESTIONS.slice(0, idx + 1).filter(isVisibleQ).length;
  const stepTotal = QUESTIONS.filter(isVisibleQ).length;

  const goNext = () => {
    const n = nextVisible(idx);
    if (n === -1) router.push("/checkup");
    else setIdx(n);
  };
  const goBack = () => {
    const p = prevVisible(idx);
    if (p === -1) router.push("/home");
    else setIdx(p);
  };

  const value = answers[q.key];
  const isLast = nextVisible(idx) === -1;
  const hasNumber = typeof value === "number" && !Number.isNaN(value);
  const answered = q.type === "number" ? hasNumber : value != null;

  // 마이크를 처음 쓸 때는 무엇에 쓰는지 먼저 알려주고 나서 권한을 요청한다
  const [micPrimer, setMicPrimer] = useState(false);
  const micAsked = useRef(false);

  const requestVoice = async () => {
    if (micAsked.current) {
      startVoice();
      return;
    }
    micAsked.current = true;
    const state = await checkPermission("microphone");
    if (state === "granted") {
      startVoice();
      return;
    }
    setMicPrimer(true); // prompt · denied · 확인 불가 모두 안내 먼저
  };

  const startVoice = () => {
    setVoiceState("listening");
    setRangeNote("");
    listen(
      (transcript) => {
        setHeard(transcript);

        if (q.type === "number") {
          const range = parseRange(transcript);
          // 횟수를 묻는 문항은 "없어요", "한 번" 같은 말도 값으로 받는다
          const parse = q.countStyle ? parseCount : parseKoreanNumber;
          const n = range ? range[0] : parse(transcript);
          if (n != null) {
            const clamped = Math.max(q.min ?? 0, Math.min(q.max ?? 999, n));
            setAnswer(q.key, clamped as SurveyAnswers[typeof q.key]);
            setVoiceState("recognized");
            // 범위로 답했으면 어느 값으로 넣었는지 알려준다
            if (range) setRangeNote(`${range[0]}~${range[1]} 중 ${clamped}로 넣었어요`);
            return;
          }
        } else {
          const range = parseRange(transcript);
          const m = matchChoice(q, transcript);
          if (m != null) {
            setAnswer(q.key, m as SurveyAnswers[typeof q.key]);
            setVoiceState("recognized");
            if (range) setRangeNote(`${range[0]}~${range[1]} 중 ${range[0]} 기준으로 넣었어요`);
            return;
          }
        }

        // 들리긴 했지만 값으로 못 바꾼 경우
        setVoiceState("failed");
        focusPicker();
      },
      () => {
        setHeard("");
        setVoiceState("failed");
        focusPicker();
      }
    );
  };

  const handleVoice = () => {
    void requestVoice();
  };

  // 디자인: 한 줄 제목 30px, 후반부 긴 제목(7~10)은 28px
  const titleSize = stepNo >= 7 ? 28 : 30;

  // ================== 음성 모드 (음성모드_예시.html) ==================
  if (answerMode === "voice") {
    const answeredLabel = !answered
      ? null
      : q.type === "choice"
      ? q.choices?.find((c) => c.value === value)?.label ?? String(value)
      : `${value}${q.unit ?? ""}`;

    return (
      <div className="flex flex-col h-dvh bg-ivory">
        {/* 상단 고정: 뒤로가기 + 진행바 + '음성 모드' 칩 */}
        <div className="shrink-0 pt-safetop pb-2 px-gutter flex items-center gap-3">
          <button
            onClick={goBack}
            aria-label="뒤로 가기"
            className="w-8 h-11 -ml-1 flex items-center justify-center text-charcoal shrink-0"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="flex-1">
            <ProgressBar current={stepNo} total={stepTotal} />
          </div>
          {/* 음성 모드에서 다시 손 입력으로 돌아가는 길 */}
          <button
            onClick={() => setAnswerMode("hand")}
            className="text-[length:calc(15px*var(--ts))] font-bold text-forest bg-lightgreen rounded-chip px-3 py-2 shrink-0 active:brightness-95 flex items-center gap-1.5"
          >
            <HandIcon />
            손으로 답하기
          </button>
        </div>

        {/* 콘텐츠 스크롤 */}
        <div className="flex-1 overflow-y-auto px-gutter pb-2 flex flex-col [&>*]:shrink-0">
        {/* 본이 말풍선 — 누르면 다시 읽어줌 */}
        <div className="mt-6 flex items-start gap-3.5">
          <Boni pose="speak" size={64} className="shrink-0" />
          <button
            onClick={() => speak(q.title)}
            aria-label="질문 다시 듣기"
            className="flex-1 text-left bg-white rounded-card rounded-tl-md px-5 py-[18px] shadow-[0_1px_6px_rgba(0,0,0,0.06)]"
          >
            <div className="flex items-center gap-2 mb-2">
              <SpeakerIcon />
              <span className="text-[length:calc(16px*var(--ts))] font-bold text-forest">
                본이가 읽어드려요
              </span>
            </div>
            <div className="text-[length:calc(22px*var(--ts))] font-bold text-charcoal leading-[1.4] whitespace-pre-line">
              {q.title}
            </div>
          </button>
        </div>

        {/*
          인식 결과와 실패 안내 — 말한 뒤에만 나온다.
          예전에는 대기 상태에도 "아래 버튼을 누르고 말씀해 주세요" 박스가 떠 있었는데,
          아래 마이크 버튼과 안내가 겹치는 데다 박스가 눌리는 것처럼 보여 헷갈렸다.
        */}
        {voiceState === "failed" && (
          <div className="mt-6 rounded-card bg-[#FDECE8] px-5 py-4">
            <p className="text-[length:calc(18px*var(--ts))] text-[#C7503A] leading-[1.5]">
              {heard ? `"${heard}" 로 들었는데 잘 모르겠어요.` : "잘 못 들었어요."}
              <br />
              다시 말하거나 아래에서 골라 주세요.
            </p>
          </div>
        )}

        {voiceState === "recognized" && heard && (
          <div className="mt-6 rounded-card bg-lightgreen px-5 py-4">
            <p className="text-[length:calc(18px*var(--ts))] text-charcoal leading-[1.5]">
              <b className="text-forest">&ldquo;{heard}&rdquo;</b> 로 듣고
              {answeredLabel ? (
                <>
                  {" "}
                  <b className="text-forest">{answeredLabel}</b> 로 넣었어요
                </>
              ) : (
                " 인식했어요"
              )}
            </p>
            {rangeNote && (
              <p className="mt-1 text-[length:calc(16px*var(--ts))] text-graytext">
                {rangeNote}
              </p>
            )}
          </div>
        )}

        {/*
          답 영역 — 음성이 되든 안 되든 항상 보여준다.
          UT에서 인식에 실패하면 값을 고를 방법 자체가 없었다(P3).
        */}
        <div ref={pickerRef} className="mt-6">
          <p className="text-[length:calc(17px*var(--ts))] font-bold text-graytext">
            {q.type === "number" ? "숫자를 직접 맞춰도 돼요" : "아래에서 골라도 돼요"}
          </p>

          {q.type === "number" ? (
            <NumberStepper
              key={q.key}
              q={q}
              value={hasNumber ? (value as number) : undefined}
              onChange={(v) => {
                setAnswer(q.key, v as SurveyAnswers[typeof q.key]);
                setVoiceState("recognized");
                setHeard("");
                setRangeNote("");
              }}
            />
          ) : (
            <ChoiceInput
              q={q}
              value={value as string | number | undefined}
              onSelect={(v) => {
                setAnswer(q.key, v as SurveyAnswers[typeof q.key]);
                setVoiceState("recognized");
                setHeard("");
                setRangeNote("");
              }}
            />
          )}
        </div>

        {!supported && (
          <p className="mt-5 text-sub text-[#C7503A] text-center">
            이 브라우저는 음성 인식을 지원하지 않아요.
            <br />
            아래에서 직접 골라 주세요.
          </p>
        )}

        <div className="flex-1" />
        </div>

        {/*
          하단 고정 — 쓰는 순서대로 놓는다. 말하기(주 동작)가 위, 확인이 아래.
          마이크 버튼 하나가 안내와 상태를 모두 맡는다.
        */}
        <div className="shrink-0 px-gutter pt-2 pb-8 flex flex-col">
          <button
            onClick={handleVoice}
            disabled={listening || !supported}
            className={`h-touch rounded-btn border-[2.5px] text-[length:calc(20px*var(--ts))] font-bold flex items-center justify-center gap-2.5 active:brightness-95 disabled:opacity-60 transition ${
              listening
                ? "bg-lightgreen border-forest text-forest animate-pulse"
                : "bg-lightgreen border-forest text-forest"
            }`}
          >
            <MicIcon size={24} />
            {listening
              ? "듣고 있어요…"
              : voiceState === "idle"
              ? "여기를 누르고 말하세요"
              : "다시 말하기"}
          </button>

          {/* 어떻게 말해야 하는지 예시 — 듣는 중에는 감춘다 */}
          {q.voiceHint && !listening && (
            <p className="mt-2 text-[length:calc(16px*var(--ts))] text-graytext text-center">
              {q.voiceHint}
            </p>
          )}

          <button
            onClick={goNext}
            disabled={!answered}
            className="mt-3 h-touch rounded-btn bg-forest text-white text-[length:calc(22px*var(--ts))] font-bold flex items-center justify-center gap-2.5 active:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <CheckIcon size={24} stroke="#fff" width={3} />네, 맞아요
          </button>
        </div>

        <PermissionPrimer
          kind="microphone"
          open={micPrimer}
          onAllow={() => {
            setMicPrimer(false);
            startVoice(); // 여기서 실제 브라우저 권한 창이 뜬다
          }}
          onSkip={() => {
            setMicPrimer(false);
            focusPicker(); // 음성을 안 쓰면 직접 고르기로 안내
          }}
          skipLabel="괜찮아요, 직접 고를게요"
        />
      </div>
    );
  }

  // ================== 터치 모드 (설문1~10 디자인) ==================
  return (
    <ScreenFrame
      title="건강 설문"
      boni="point"
      onBack={goBack}
      progress={{ current: stepNo, total: stepTotal }}
      footer={
        <button onClick={goNext} disabled={!answered} className="btn-primary">
          {isLast ? "완료" : "다음"}
        </button>
      }
    >
      {/*
        음성으로 답하러 가는 입구.
        예전에는 setAnswerMode 를 부르는 화면이 하나도 없어서, 음성 모드가
        구현돼 있어도 사용자가 들어갈 방법이 없었다.
      */}
      {supported && (
        <button
          onClick={() => setAnswerMode("voice")}
          className="mt-3 self-start flex items-center gap-2 rounded-chip bg-lightgreen text-forest font-bold px-4 py-2.5 text-[length:calc(17px*var(--ts))] active:brightness-95"
        >
          <MicIcon size={20} />
          말로 답하기
        </button>
      )}

      <h1
        className="mt-4 font-bold text-charcoal leading-[1.4] whitespace-pre-line"
        style={{ fontSize: `calc(${titleSize}px * var(--ts))` }}
      >
        {q.title}
      </h1>
      {q.hint && (
        <p className="mt-2.5 text-[length:calc(18px*var(--ts))] text-graytext">{q.hint}</p>
      )}

      {q.type === "number" ? (
        q.key === "age" ? (
          <WheelPicker
            key={q.key}
            min={q.min ?? 30}
            max={q.max ?? 100}
            unit={q.unit ?? ""}
            value={hasNumber ? (value as number) : undefined}
            onChange={(v) =>
              setAnswer(q.key, v as SurveyAnswers[typeof q.key])
            }
            chip={(v) => `만 ${v}세`}
          />
        ) : (
          <NumberStepper
            key={q.key}
            q={q}
            value={hasNumber ? (value as number) : undefined}
            onChange={(v) =>
              setAnswer(q.key, v as SurveyAnswers[typeof q.key])
            }
          />
        )
      ) : (
        <ChoiceInput
          q={q}
          value={value as string | number | undefined}
          onSelect={(v) => {
            // 선택만 하고, 이동은 [다음] 버튼으로
            setAnswer(q.key, v as SurveyAnswers[typeof q.key]);
          }}
        />
      )}

    </ScreenFrame>
  );
}

// ---------- 휠 피커 (설문1 디자인: 가운데 행 #E8F0E3 하이라이트, 16/18/25px) ----------

const WHEEL_ITEM = 40; // 행 높이(px)
const WHEEL_HEIGHT = WHEEL_ITEM * 5; // 5행 노출

function WheelPicker({
  min,
  max,
  unit,
  value,
  onChange,
  chip,
}: {
  min: number;
  max: number;
  unit: string;
  value?: number;
  onChange: (v: number) => void;
  chip?: (v: number) => string;
}) {
  const values: number[] = [];
  for (let v = min; v <= max; v++) values.push(v);
  const mid = Math.round((min + max) / 2);

  const ref = useRef<HTMLDivElement>(null);
  const [centered, setCentered] = useState(value ?? mid);
  const interacted = useRef(false);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 최초: 저장된 값(없으면 중간값) 위치로 이동
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = ((value ?? mid) - min) * WHEEL_ITEM;
    return () => {
      if (settle.current) clearTimeout(settle.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist 복원(하이드레이션)으로 저장값이 늦게 도착하면, 조작 전까지는 그 값으로 재정렬
  useEffect(() => {
    if (interacted.current || value == null) return;
    const el = ref.current;
    if (el) el.scrollTop = (value - min) * WHEEL_ITEM;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const i = Math.max(
      0,
      Math.min(values.length - 1, Math.round(el.scrollTop / WHEEL_ITEM))
    );
    setCentered(values[i]);
    if (!interacted.current) return; // 초기 위치 이동은 답으로 기록하지 않음
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => onChange(values[i]), 150);
  };

  const markInteracted = () => {
    interacted.current = true;
  };

  return (
    <div>
      <div className="mt-6 bg-white border-2 border-borderline rounded-field px-2.5 py-3 relative">
        {/* 가운데 하이라이트 바 */}
        <div className="absolute left-2.5 right-2.5 top-1/2 -translate-y-1/2 h-12 bg-lightgreen rounded-chip pointer-events-none" />
        <div
          ref={ref}
          onScroll={onScroll}
          onPointerDown={markInteracted}
          onWheel={markInteracted}
          onTouchStart={markInteracted}
          className="relative overflow-y-auto snap-y snap-mandatory [&::-webkit-scrollbar]:hidden"
          style={{ height: WHEEL_HEIGHT, scrollbarWidth: "none" }}
          role="listbox"
          aria-label={`${min}부터 ${max}까지 선택`}
        >
          <div style={{ height: (WHEEL_HEIGHT - WHEEL_ITEM) / 2 }} />
          {values.map((v) => {
            const d = Math.abs(v - centered);
            return (
              <div
                key={v}
                role="option"
                aria-selected={v === centered}
                onClick={() => {
                  markInteracted();
                  ref.current?.scrollTo({
                    top: (v - min) * WHEEL_ITEM,
                    behavior: "smooth",
                  });
                }}
                className={`snap-center flex items-center justify-center ${
                  d === 0
                    ? "text-[length:calc(25px*var(--ts))] font-bold text-charcoal"
                    : d === 1
                    ? "text-[length:calc(18px*var(--ts))] text-[#9A968A]"
                    : "text-[length:calc(16px*var(--ts))] text-[#C9C5B8]"
                }`}
                style={{ height: WHEEL_ITEM }}
              >
                {v}
                {unit}
              </div>
            );
          })}
          <div style={{ height: (WHEEL_HEIGHT - WHEEL_ITEM) / 2 }} />
        </div>
      </div>
      {chip && (
        <div className="mt-2.5 flex">
          <span className="text-[length:calc(16px*var(--ts))] font-bold text-forest bg-lightgreen rounded-chip px-3.5 py-[5px]">
            {chip(centered)}
          </span>
        </div>
      )}
    </div>
  );
}

// ---------- 숫자 스테퍼 (설문2·3·5·6 디자인: − / 값+단위 / +) ----------

function NumberStepper({
  q,
  value,
  onChange,
}: {
  q: Question;
  value?: number;
  onChange: (v: number) => void;
}) {
  const mid = q.default ?? Math.round(((q.min ?? 0) + (q.max ?? 100)) / 2);

  // 길게 누르면 빠르게 증감 — 최신 값은 ref로 추적 (interval 안에서 stale 방지)
  const valueRef = useRef(value);
  valueRef.current = value;
  const hold = useRef<{ t?: ReturnType<typeof setTimeout>; i?: ReturnType<typeof setInterval> }>({});

  const step = (delta: number) => {
    const base = valueRef.current ?? mid;
    const next = Math.max(q.min ?? 0, Math.min(q.max ?? 999, base + delta));
    valueRef.current = next;
    onChange(next);
  };

  const startHold = (delta: number) => {
    step(delta); // 즉시 1회
    hold.current.t = setTimeout(() => {
      hold.current.i = setInterval(() => step(delta), 70); // 0.45초 후 빠르게 반복
    }, 450);
  };
  const endHold = () => {
    if (hold.current.t) clearTimeout(hold.current.t);
    if (hold.current.i) clearInterval(hold.current.i);
    hold.current = {};
  };
  useEffect(() => endHold, []); // 언마운트 시 정리

  const holdProps = (delta: number) => ({
    onPointerDown: () => startHold(delta),
    onPointerUp: endHold,
    onPointerLeave: endHold,
    onPointerCancel: endHold,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(), // 모바일 길게누르기 메뉴 방지
  });

  return (
    <div className="mt-7 flex items-center gap-3">
      <button
        {...holdProps(-1)}
        aria-label="줄이기 (길게 누르면 빠르게)"
        className="w-touch h-touch rounded-field bg-lightgreen text-forest text-[length:calc(34px*var(--ts))] font-bold shrink-0 flex items-center justify-center active:brightness-95 transition select-none touch-none"
      >
        −
      </button>
      <div className="flex-1 h-touch bg-white border-2 border-borderline rounded-field flex items-center justify-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={value ?? ""}
          min={q.min}
          max={q.max}
          onChange={(e) =>
            e.target.value === ""
              ? onChange(NaN)
              : onChange(Number(e.target.value))
          }
          placeholder={String(mid)}
          className="w-20 bg-transparent text-center text-[length:calc(28px*var(--ts))] font-bold text-charcoal placeholder:text-borderline outline-none"
          aria-label={q.title.replace(/\n/g, " ")}
        />
        {q.unit && (
          <span className="text-[length:calc(20px*var(--ts))] text-graytext">{q.unit}</span>
        )}
      </div>
      <button
        {...holdProps(1)}
        aria-label="늘리기 (길게 누르면 빠르게)"
        className="w-touch h-touch rounded-field bg-forest text-white text-[length:calc(34px*var(--ts))] font-bold shrink-0 flex items-center justify-center active:brightness-95 transition select-none touch-none"
      >
        +
      </button>
    </div>
  );
}

// ---------- 선택형 버튼 (설문4·7~10 디자인: 흰 배경 → 선택 시 연녹+포레스트) ----------

function ChoiceInput({
  q,
  value,
  onSelect,
}: {
  q: Question;
  value?: string | number;
  onSelect: (v: string | number) => void;
}) {
  return (
    <div className="mt-6 flex flex-col gap-3">
      {q.choices?.map((c) => {
        const selected = value === c.value;
        return (
          <button
            key={String(c.value)}
            onClick={() => onSelect(c.value)}
            aria-pressed={selected}
            className={`min-h-[64px] rounded-field flex items-center px-[22px] gap-2.5 text-[length:calc(20px*var(--ts))] text-left transition active:brightness-95 ${
              selected
                ? "bg-forest border-[2.5px] border-forest font-bold text-white"
                : "bg-white border-2 border-borderline font-medium text-charcoal"
            }`}
          >
            <span className="flex-1">{c.label}</span>
            {selected && <CheckIcon stroke="#FFFFFF" />}
          </button>
        );
      })}
    </div>
  );
}
