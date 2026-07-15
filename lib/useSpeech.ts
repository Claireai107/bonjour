"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================
// 음성 모드 — 브라우저 Web Speech API (Chrome/Edge 권장).
// speak(): 질문 읽어주기(TTS) / listen(): 음성 인식(STT, ko-KR)
// ============================================================

// 표준 타입에 없는 SpeechRecognition을 any로 접근
function getRecognition(): any {
  if (typeof window === "undefined") return null;
  const w = window as any;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/** 한국어 음성 → 숫자 파싱 (아라비아 숫자 우선, 없으면 한글 수사) */
export function parseKoreanNumber(text: string): number | null {
  if (!text) return null;
  // 1) 아라비아 숫자
  const digits = text.replace(/[^\d]/g, "");
  if (digits) return parseInt(digits, 10);

  // 2) 한글 수사 (0~99 위주)
  const t = text.replace(/\s/g, "");
  const sino: Record<string, number> = {
    영: 0, 공: 0, 일: 1, 이: 2, 삼: 3, 사: 4, 오: 5,
    육: 6, 륙: 6, 칠: 7, 팔: 8, 구: 9,
  };
  const native: Record<string, number> = {
    한: 1, 하나: 1, 두: 2, 둘: 2, 세: 3, 셋: 3, 네: 4, 넷: 4,
    다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9,
  };
  const nativeTens: Record<string, number> = {
    열: 10, 스물: 20, 서른: 30, 마흔: 40, 쉰: 50,
    예순: 60, 일흔: 70, 여든: 80, 아흔: 90,
  };

  // 2-a) 고유어 (예: 예순둘, 마흔다섯, 쉰)
  for (const tens of Object.keys(nativeTens)) {
    if (t.startsWith(tens)) {
      let val = nativeTens[tens];
      const rest = t.slice(tens.length).replace(/살|세|개|번|시간|회/g, "");
      for (const u of Object.keys(native)) {
        if (rest.startsWith(u)) {
          val += native[u];
          break;
        }
      }
      return val;
    }
  }

  // 2-b) 한자어 (예: 육십이, 십오)
  const cleaned = t.replace(/살|세|개|번|시간|회/g, "");
  if (cleaned.includes("십")) {
    const [tensPart, unitPart] = cleaned.split("십");
    const tens = tensPart === "" ? 1 : sino[tensPart] ?? 0;
    const unit = unitPart ? sino[unitPart[0]] ?? 0 : 0;
    return tens * 10 + unit;
  }
  if (cleaned.length === 1 && sino[cleaned] != null) return sino[cleaned];

  return null;
}

export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    setSupported(!!getRecognition());
    return () => {
      try {
        recRef.current?.abort?.();
        window.speechSynthesis?.cancel?.();
      } catch {
        /* noop */
      }
    };
  }, []);

  /** 텍스트 읽어주기 (TTS) */
  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/\n/g, " "));
      u.lang = "ko-KR";
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    } catch {
      /* noop */
    }
  }, []);

  /** 한 번 듣고 인식 결과(문자열)를 콜백으로 반환 */
  const listen = useCallback(
    (onResult: (transcript: string) => void, onError?: () => void) => {
      const rec = getRecognition();
      if (!rec) {
        onError?.();
        return;
      }
      recRef.current = rec;
      rec.lang = "ko-KR";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e: any) => {
        const transcript = e.results?.[0]?.[0]?.transcript ?? "";
        setListening(false);
        onResult(transcript);
      };
      rec.onerror = () => {
        setListening(false);
        onError?.();
      };
      rec.onend = () => setListening(false);
      try {
        setListening(true);
        rec.start();
      } catch {
        setListening(false);
        onError?.();
      }
    },
    []
  );

  const stop = useCallback(() => {
    try {
      recRef.current?.stop?.();
    } catch {
      /* noop */
    }
    setListening(false);
  }, []);

  return { supported, listening, speak, listen, stop };
}
