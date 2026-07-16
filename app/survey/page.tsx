"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ScreenFrame from "@/components/ScreenFrame";
import ProgressBar from "@/components/ProgressBar";
import Boni from "@/components/Boni";
import PageHeader from "@/components/PageHeader";
import { useBonJour } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { QUESTIONS, type Question } from "@/lib/survey";
import type { SurveyAnswers } from "@/lib/types";
import { useSpeech, parseKoreanNumber } from "@/lib/useSpeech";

// 음성 인식 결과 → 선택지 매칭 (예/아니오/잘모름 · 라벨 · 숫자)
function matchChoice(q: Question, text: string): string | number | null {
  const s = text.replace(/\s/g, "");
  const has = (arr: string[]) => arr.some((k) => s.includes(k));
  if (q.skip && has(["안마셔", "안마시", "안먹", "못마셔", "금주"])) {
    return q.skip.value;
  }
  for (const c of q.choices ?? []) {
    if (c.value === "yes" && has(["예", "네", "응", "했", "맞", "있"]))
      return c.value;
    if (c.value === "no" && has(["아니", "안", "없", "아뇨"])) return c.value;
    if (c.value === "unknown" && has(["몰라", "모르", "글쎄"])) return c.value;
  }
  for (const c of q.choices ?? []) {
    const label = c.label.replace(/\s/g, "");
    if (s.includes(label) || label.includes(s)) return c.value;
  }
  const n = parseKoreanNumber(text);
  if (n != null) {
    for (const c of q.choices ?? []) {
      if (c.label.includes(String(n))) return c.value;
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
  const { supported, listening, speak, listen } = useSpeech();
  const [heard, setHeard] = useState("");

  const [idx, setIdx] = useState(0);
  const q = QUESTIONS[idx];

  // 음성 모드: 문항이 바뀌면 본이가 질문을 읽어줌
  useEffect(() => {
    setHeard("");
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
  const isVisible = (qq: Question) => !qq.showIf || qq.showIf(answers);
  const stepNo = QUESTIONS.slice(0, idx + 1).filter(isVisible).length;
  const stepTotal = QUESTIONS.filter(isVisible).length;

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
  const hasNumber = typeof value === "number" && !Number.isNaN(value);
  const answered =
    q.type === "number"
      ? hasNumber || (q.skip != null && value === q.skip.value)
      : value != null;

  const handleVoice = () => {
    listen(
      (transcript) => {
        setHeard(transcript);
        if (q.type === "number") {
          const s = transcript.replace(/\s/g, "");
          const has = (arr: string[]) => arr.some((k) => s.includes(k));
          if (
            q.skip &&
            has(["안마셔", "안마시", "안먹", "못마셔", "금주"])
          ) {
            setAnswer(q.key, q.skip.value as SurveyAnswers[typeof q.key]);
            return;
          }
          const n = parseKoreanNumber(transcript);
          if (n != null) {
            const clamped = Math.max(q.min ?? 0, Math.min(q.max ?? 999, n));
            setAnswer(q.key, clamped as SurveyAnswers[typeof q.key]);
          }
        } else {
          const m = matchChoice(q, transcript);
          if (m != null) {
            setAnswer(q.key, m as SurveyAnswers[typeof q.key]);
          }
        }
      },
      () => setHeard("(잘 안 들렸어요. 다시 말씀해 주세요)")
    );
  };

  // 디자인: 한 줄 제목 30px, 후반부 긴 제목(6~10)은 28px
  const titleSize = q.step >= 6 ? 28 : 30;

  // ================== 음성 모드 (음성모드_예시.html) ==================
  if (answerMode === "voice") {
    const answeredLabel = !answered
      ? null
      : q.skip && value === q.skip.value
      ? q.skip.label
      : q.type === "choice"
      ? q.choices?.find((c) => c.value === value)?.label ?? String(value)
      : `${value}${q.unit ?? ""}`;

    return (
      <div className="flex flex-col h-dvh bg-ivory">
        {/* 상단 고정: 페이지명 헤더('음성 모드' 칩 우측) + 진행바 줄 */}
        <PageHeader
          title="건강 설문"
          back
          onBack={goBack}
          right={
            <span className="text-[13px] font-bold text-forest bg-lightgreen rounded-chip px-3 py-1">
              음성 모드
            </span>
          }
        />
        <div className="shrink-0 px-gutter pb-2">
          <ProgressBar current={stepNo} total={stepTotal} />
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
              <span className="text-[14px] font-bold text-forest">
                본이가 읽어드려요
              </span>
            </div>
            <div className="text-[22px] font-bold text-charcoal leading-[1.4] whitespace-pre-line">
              {q.title}
            </div>
          </button>
        </div>

        {/* 들은 말 */}
        <div className="mt-6 bg-lightgreen rounded-card px-5 py-[18px] flex items-center gap-3">
          <MicIcon />
          <div className="flex-1 text-[18px] text-charcoal">
            {listening ? (
              "듣고 있어요..."
            ) : heard ? (
              <>
                들은 말: <b className="text-forest">&ldquo;{heard}&rdquo;</b>
              </>
            ) : (
              "아래 버튼을 누르고 말씀해 주세요"
            )}
          </div>
        </div>

        {/* 인식된 답 */}
        {answeredLabel && (
          <>
            <div className="mt-4 min-h-[64px] bg-white border-[2.5px] border-forest rounded-field flex items-center justify-center gap-2 px-4">
              <span className="text-[26px] font-bold text-charcoal">
                {answeredLabel}
              </span>
            </div>
            <div className="mt-5 text-[20px] font-bold text-charcoal text-center">
              이게 맞나요? 아니면 수정하세요
            </div>
          </>
        )}

        {!supported && (
          <p className="mt-5 text-sub text-[#C7503A] text-center">
            이 브라우저는 음성 인식을 지원하지 않아요.
            <br />
            크롬(Chrome)에서 열거나 손으로 입력해 주세요.
          </p>
        )}

        <div className="flex-1" />
        </div>

        {/* 하단 고정: 확인/말하기 버튼 */}
        <div className="shrink-0 px-gutter pt-2 pb-8 flex flex-col">
          <button
            onClick={goNext}
            disabled={!answered}
            className="h-touch rounded-btn bg-forest text-white text-[22px] font-bold flex items-center justify-center gap-2.5 active:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <CheckIcon size={24} stroke="#fff" width={3} />네, 맞아요
          </button>
          <button
            onClick={handleVoice}
            disabled={listening || !supported}
            className="mt-3 h-touch rounded-btn bg-lightgreen text-forest text-[20px] font-bold flex items-center justify-center gap-2.5 active:brightness-95 disabled:opacity-40 transition"
          >
            <MicIcon size={22} />
            {listening ? "듣는 중..." : heard ? "다시 말하기" : "눌러서 말하기"}
          </button>
        </div>
      </div>
    );
  }

  // ================== 터치 모드 (설문 디자인) ==================
  return (
    <ScreenFrame
      title="건강 설문"
      boni="point"
      onBack={goBack}
      progress={{ current: stepNo, total: stepTotal }}
      footer={
        <button onClick={goNext} disabled={!answered} className="btn-primary">
          다음
        </button>
      }
    >
      <h1
        className="mt-6 font-bold text-charcoal leading-[1.4] whitespace-pre-line"
        style={{ fontSize: titleSize }}
      >
        {q.title}
      </h1>
      {q.hint && (
        <p className="mt-2.5 text-[18px] text-graytext">{q.hint}</p>
      )}

      {q.type === "number" ? (
        <>
          <NumberStepper
            key={q.key}
            q={q}
            value={typeof value === "number" ? value : undefined}
            onChange={(v) =>
              setAnswer(q.key, v as SurveyAnswers[typeof q.key])
            }
          />
          {q.skip && (
            <button
              onClick={() =>
                setAnswer(q.key, q.skip!.value as SurveyAnswers[typeof q.key])
              }
              className={`mt-4 w-full h-touch rounded-btn border-2 text-btn flex items-center justify-center transition active:brightness-95 ${
                value === q.skip.value
                  ? "border-forest bg-lightgreen text-forest"
                  : "border-borderline bg-white text-graytext"
              }`}
            >
              {q.skip.label}
            </button>
          )}
        </>
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

// ---------- 숫자 스테퍼 (설문1·2·4·5 디자인: − / 값+단위 / +) ----------

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
        className="w-touch h-touch rounded-field bg-lightgreen text-forest text-[34px] font-bold shrink-0 flex items-center justify-center active:brightness-95 transition select-none touch-none"
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
          className="w-20 bg-transparent text-center text-[28px] font-bold text-charcoal placeholder:text-borderline outline-none"
          aria-label={q.title.replace(/\n/g, " ")}
        />
        {q.unit && (
          <span className="text-[20px] text-graytext">{q.unit}</span>
        )}
      </div>
      <button
        {...holdProps(1)}
        aria-label="늘리기 (길게 누르면 빠르게)"
        className="w-touch h-touch rounded-field bg-forest text-white text-[34px] font-bold shrink-0 flex items-center justify-center active:brightness-95 transition select-none touch-none"
      >
        +
      </button>
    </div>
  );
}

// ---------- 선택형 버튼 (설문3·6~9 디자인: 흰 배경 → 선택 시 연녹+포레스트) ----------

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
            className={`min-h-[64px] rounded-field flex items-center px-[22px] gap-2.5 text-[20px] text-left transition active:brightness-95 ${
              selected
                ? "bg-lightgreen border-[2.5px] border-forest font-bold text-forest"
                : "bg-white border-2 border-borderline font-medium text-charcoal"
            }`}
          >
            <span className="flex-1">{c.label}</span>
            {selected && <CheckIcon />}
          </button>
        );
      })}
    </div>
  );
}
