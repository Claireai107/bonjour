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

// 숫자·표현 변환은 lib/speechNormalize.ts 로 옮겼다 (UT H1 대응).
// 기존 import 경로를 쓰던 화면이 있어 여기서도 그대로 내보낸다.
export { parseKoreanNumber, parseCount, parseRange, normalize } from "./speechNormalize";

/** 말이 없을 때 이만큼 기다렸다가 스스로 끊는다 (무한 대기 방지) */
const SILENCE_TIMEOUT_MS = 8000;

export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSupported(!!getRecognition());
    return () => {
      try {
        if (timerRef.current) clearTimeout(timerRef.current);
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

  /**
   * 한 번 듣고 인식 결과를 콜백으로 넘긴다.
   * onError 는 인식 실패·권한 거부·무응답을 모두 포함한다.
   */
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

      // 8초 동안 아무 말이 없으면 스스로 끊는다.
      // UT에서 버튼을 누른 뒤 반응이 없어 계속 기다리는 참가자가 있었다(P5).
      const clearTimer = () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
      timerRef.current = setTimeout(() => {
        try {
          rec.stop();
        } catch {
          /* noop */
        }
      }, SILENCE_TIMEOUT_MS);

      let got = false;
      rec.onresult = (e: any) => {
        got = true;
        clearTimer();
        const transcript = e.results?.[0]?.[0]?.transcript ?? "";
        setListening(false);
        onResult(transcript);
      };
      rec.onerror = () => {
        clearTimer();
        setListening(false);
        onError?.();
      };
      rec.onend = () => {
        clearTimer();
        setListening(false);
        if (!got) onError?.(); // 아무것도 못 들은 채 끝난 경우
      };

      try {
        setListening(true);
        // 녹음이 시작됐다는 걸 손끝으로도 알 수 있게 (지원 기기에서만)
        navigator.vibrate?.(30);
        rec.start();
      } catch {
        clearTimer();
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
