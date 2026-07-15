"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Boni from "@/components/Boni";
import { useBonJour } from "@/lib/store";
import PageHeader from "@/components/PageHeader";

// 건강검진 입력 (선택). 있으면 Model C(정밀), 없으면 Model B(설문전용).
// 단계: choose(방법 선택) → camera(촬영) → recognizing(OCR 인식중) → confirm(결과 확인)
//                        → manual(직접 입력)
type Step = "choose" | "manual" | "camera" | "recognizing" | "confirm";

const OCR_ROWS = [
  { key: "weight", label: "체중", unit: "kg" },
  { key: "height", label: "신장", unit: "cm" },
  { key: "chol", label: "총콜레스테롤", unit: "mg/dL" },
  { key: "alp", label: "ALP (뼈 관련 수치)", unit: "IU/L" },
  { key: "crea", label: "크레아티닌", unit: "mg/dL" },
] as const;

type OcrKey = (typeof OCR_ROWS)[number]["key"];

// OCR 텍스트에서 검진 항목 숫자 추출 — 키워드가 있는 줄에서 유효 범위의 첫 숫자
const OCR_PATTERNS: Record<
  OcrKey,
  { kw: RegExp; min: number; max: number }
> = {
  // OCR 오독 대비 퍼지 매칭 (체중→채중/체증, ALP→AIP/A1P 등)
  weight: { kw: /[체채][중증]|몸무게|weight/i, min: 25, max: 200 },
  height: { kw: /신장|키|height/i, min: 100, max: 210 },
  chol: { kw: /콜레스테롤|cholesterol/i, min: 80, max: 500 },
  alp: { kw: /A[LI1]P|알칼리|인산분해|phosphatase/i, min: 20, max: 500 },
  crea: { kw: /크레아티닌|creatinine/i, min: 0.2, max: 15 },
};

// 검진표의 '정상범위(참고치)' 표기를 지운다 — 결과값만 남기기 위해.
// 예: "120-199", "0.5~1.2", "200 미만", "199 이하", "≤ 105"
function maskReferenceRanges(s: string): string {
  return s
    .replace(/\d+(?:\.\d+)?\s*[-~–—]\s*\d+(?:\.\d+)?/g, " § ")
    .replace(/[≤≥<>]\s*\d+(?:\.\d+)?/g, " § ")
    .replace(
      /\d+(?:\.\d+)?\s*(?:[a-zA-Z/%µ]+\s*)?(?:미만|이하|이상|초과)/g,
      " § "
    );
}

// 키워드 뒤 ~60자 안에서 유효 범위의 첫 숫자를 찾는다 (줄 경계 무시).
function parseOcrText(text: string): Partial<Record<OcrKey, string>> {
  const found: Partial<Record<OcrKey, string>> = {};
  // 정상범위 숫자를 먼저 제거해서 '결과' 값만 남긴다
  const flat = maskReferenceRanges(text.replace(/\s+/g, " "));
  for (const key of Object.keys(OCR_PATTERNS) as OcrKey[]) {
    const { kw, min, max } = OCR_PATTERNS[key];
    const m = flat.match(kw);
    if (!m || m.index == null) continue;
    const after = flat.slice(m.index + m[0].length, m.index + m[0].length + 60);
    // 첫 번째 숫자만 인정 — 범위 밖이면 버린다 (다음 행 값을 잘못 집는 것 방지)
    const first = after.match(/\d+(?:\.\d+)?/);
    const n = first ? Number(first[0]) : NaN;
    if (n >= min && n <= max) found[key] = String(n);
  }

  // 키워드를 못 읽었으면 단위 패턴으로 보조 탐색 (kg / IU/L / mg/dL)
  if (!found.weight) {
    const m = flat.match(/(\d{2,3}(?:\.\d)?)\s*kg/i);
    const n = m ? Number(m[1]) : NaN;
    if (n >= 25 && n <= 200) found.weight = String(n);
  }
  if (!found.alp) {
    const m = flat.match(/(\d{2,3}(?:\.\d)?)\s*I?U\/?L/i);
    const n = m ? Number(m[1]) : NaN;
    if (n >= 20 && n <= 500) found.alp = String(n);
  }
  for (const m of flat.matchAll(/(\d+(?:\.\d+)?)\s*mg\/?d[lL]/gi)) {
    const n = Number(m[1]);
    if (!found.chol && n >= 80 && n <= 500) found.chol = String(n);
    else if (!found.crea && n >= 0.2 && n < 15) found.crea = String(n);
  }
  return found;
}

// 폰 카메라 사진은 EXIF 회전 정보를 가진다 — tesseract는 이를 무시하므로
// 반드시 회전을 보정한 캔버스로 변환해서 넘긴다. (+ 대용량 다운스케일)
const OCR_MAX_SIDE = 2000;

async function toOrientedCanvas(
  src: File | HTMLCanvasElement
): Promise<HTMLCanvasElement> {
  if (src instanceof HTMLCanvasElement) return src;
  let bmp: ImageBitmap | HTMLImageElement;
  try {
    bmp = await createImageBitmap(src, { imageOrientation: "from-image" });
  } catch {
    // createImageBitmap 미지원 폴백 — <img> 디코드는 브라우저가 EXIF를 보정해준다
    bmp = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(src);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }
  const scale = Math.min(1, OCR_MAX_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export default function CheckupScreen() {
  const router = useRouter();
  const setCheckup = useBonJour((s) => s.setCheckup);
  const [step, setStep] = useState<Step>("choose");
  const [form, setForm] = useState({ weight: "", height: "", waist: "", alp: "", sbp: "" });
  const [ocr, setOcr] = useState<Record<OcrKey, string>>({
    weight: "",
    height: "",
    chol: "",
    alp: "",
    crea: "",
  });
  // OCR이 실제로 읽어낸 항목 → "자동" 뱃지, 못 읽은 항목 → "직접 입력"
  const [autoKeys, setAutoKeys] = useState<Set<OcrKey>>(new Set());
  const [ocrProgress, setOcrProgress] = useState(0);
  const [editing, setEditing] = useState<OcrKey | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);

  // 실시간 카메라 미리보기 (HTTPS/localhost에서만 가능 — 아니면 네이티브 카메라 폴백)
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [liveCam, setLiveCam] = useState(false);

  useEffect(() => {
    if (step !== "camera") return;
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) return;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setLiveCam(true);
      } catch {
        setLiveCam(false); // 권한 거부/미지원 → 셔터가 네이티브 카메라를 연다
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setLiveCam(false);
    };
  }, [step]);

  // 셔터: 미리보기 중이면 현재 프레임 캡처 → OCR, 아니면 네이티브 카메라
  const shutter = () => {
    const video = videoRef.current;
    if (liveCam && video && video.videoWidth > 0) {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      runOcr(canvas);
    } else {
      cameraInputRef.current?.click();
    }
  };

  // 고성능 OCR — 서버(/api/ocr, Claude 비전)로 결과값 추출. 키가 없으면 null.
  const claudeOcr = async (
    canvas: HTMLCanvasElement
  ): Promise<Partial<Record<OcrKey, string>> | null> => {
    try {
      setOcrProgress(25);
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: canvas.toDataURL("image/jpeg", 0.85) }),
      });
      const d = await res.json();
      if (!d?.available || !d.values) return null;
      setOcrProgress(90);
      const found: Partial<Record<OcrKey, string>> = {};
      for (const key of ["weight", "height", "chol", "alp", "crea"] as OcrKey[]) {
        const v = d.values[key];
        if (typeof v === "number" && Number.isFinite(v)) found[key] = String(v);
      }
      return found;
    } catch {
      return null;
    }
  };

  // 사진 선택/캡처 → 인식중 화면에서 OCR (1순위 Claude 비전, 폴백 tesseract)
  const runOcr = async (file: File | HTMLCanvasElement) => {
    setStep("recognizing");
    setOcrProgress(4);
    const minWait = new Promise((r) => setTimeout(r, 2000));
    try {
      const canvas = await toOrientedCanvas(file); // EXIF 회전 보정 + 다운스케일
      let found = await claudeOcr(canvas);
      if (found === null) {
        // 폴백: 기기 내 tesseract.js (한국어+영어)
        const Tesseract = (await import("tesseract.js")).default;
        const { data } = await Tesseract.recognize(canvas, "kor+eng", {
          logger: (m: { status: string; progress: number }) => {
            if (m.status === "recognizing text") {
              setOcrProgress(Math.round(m.progress * 100));
            }
          },
        });
        found = parseOcrText(data.text ?? "");
      }
      await minWait;
      setOcr((prev) => ({ ...prev, ...found }));
      setAutoKeys(new Set(Object.keys(found) as OcrKey[]));
    } catch {
      await minWait; // 인식 실패 → 전부 직접 입력으로
      setAutoKeys(new Set());
    }
    setStep("confirm");
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일 재선택 허용
    if (file) runOcr(file);
  };

  const submitManual = () => {
    setCheckup({
      weight: form.weight ? Number(form.weight) : undefined,
      height: form.height ? Number(form.height) : undefined,
      waist: form.waist ? Number(form.waist) : undefined,
      alp: form.alp ? Number(form.alp) : undefined,
      sbp: form.sbp ? Number(form.sbp) : undefined,
    });
    router.push("/analysis");
  };

  const submitOcr = () => {
    // 검진표 체중·신장은 설문 값을 덮어쓴다 (예측에서 우선 사용)
    setCheckup({
      weight: ocr.weight ? Number(ocr.weight) : undefined,
      height: ocr.height ? Number(ocr.height) : undefined,
      alp: ocr.alp ? Number(ocr.alp) : undefined,
    });
    router.push("/analysis");
  };

  /* ---------- ② 인식중 ---------- */
  if (step === "recognizing") {
    return (
      <CheckupShell>
      <div className="h-full bg-ivory flex flex-col items-center justify-center px-gutter">
        <div className="relative">
          <div className="w-[170px] h-[170px] rounded-full bg-lightgreen flex items-end justify-center overflow-hidden">
            <Boni pose="think" size={130} />
          </div>
          <div
            className="absolute -inset-3.5 rounded-full border-[3px] border-transparent border-t-forest animate-spin"
            style={{ animationDuration: "1.4s" }}
          />
        </div>
        <div className="mt-10 text-[24px] font-bold text-charcoal text-center leading-[1.45]">
          본이가 검진표를
          <br />
          읽고 있어요
        </div>
        <div className="mt-5 flex items-center gap-2.5">
          <span className="text-[18px] text-graytext">숫자를 찾는 중</span>
          <span className="flex gap-[5px]">
            <span className="w-2 h-2 rounded-full bg-forest opacity-90" />
            <span className="w-2 h-2 rounded-full bg-green opacity-60" />
            <span className="w-2 h-2 rounded-full bg-green opacity-30" />
          </span>
        </div>
        <div className="mt-8 w-[220px] h-2.5 rounded-chip bg-lightgreen overflow-hidden">
          <div
            className="h-full bg-forest rounded-chip transition-all duration-300"
            style={{ width: `${Math.max(6, ocrProgress)}%` }}
          />
        </div>
      </div>
      </CheckupShell>
    );
  }

  /* ---------- ① 촬영 ---------- */
  if (step === "camera") {
    return (
      <CheckupShell>
      <div className="h-full bg-ivory flex flex-col pb-6">
        <PageHeader
          title="검진표를 찍어주세요"
          back
          onBack={() => setStep("choose")}
          right={<Boni pose="curious" size={46} className="flex-none" />}
        />
        <div className="flex-1 min-h-0 px-gutter flex flex-col">
        {/* 카메라 뷰파인더 — 지원 시 실시간 미리보기 */}
        <div className="mt-5 flex-1 rounded-card bg-[#3A3A36] relative overflow-hidden flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover ${
              liveCam ? "" : "hidden"
            }`}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center,rgba(255,255,255,.08),rgba(0,0,0,.35))",
            }}
          />
          <div className="relative w-[78%] h-[64%]">
            <div className="absolute inset-0 rounded-chip bg-[rgba(250,246,236,0.12)]" />
            <div className="absolute -top-[3px] -left-[3px] w-11 h-11 border-t-[5px] border-l-[5px] border-gold rounded-tl-[14px]" />
            <div className="absolute -top-[3px] -right-[3px] w-11 h-11 border-t-[5px] border-r-[5px] border-gold rounded-tr-[14px]" />
            <div className="absolute -bottom-[3px] -left-[3px] w-11 h-11 border-b-[5px] border-l-[5px] border-gold rounded-bl-[14px]" />
            <div className="absolute -bottom-[3px] -right-[3px] w-11 h-11 border-b-[5px] border-r-[5px] border-gold rounded-br-[14px]" />
          </div>
          <div className="absolute left-0 right-0 bottom-[18px] text-center">
            <span className="inline-block bg-black/55 text-white text-[16px] font-medium rounded-pill px-[18px] py-[9px]">
              검진 결과지를 네모 안에 맞춰주세요
            </span>
          </div>
        </div>

        {/* 셔터 + 앨범 — 실제 카메라/앨범 열기 */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPickFile}
          className="hidden"
        />
        <input
          ref={albumInputRef}
          type="file"
          accept="image/*"
          onChange={onPickFile}
          className="hidden"
        />
        <div className="mt-[22px] flex flex-col items-center gap-3.5">
          <button
            onClick={shutter}
            aria-label="검진표 촬영"
            className="w-[76px] h-[76px] rounded-full bg-forest border-[5px] border-lightgreen flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.2)] active:brightness-95"
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
          <button
            onClick={() => albumInputRef.current?.click()}
            className="text-[17px] font-bold text-forest underline underline-offset-4"
          >
            앨범에서 선택
          </button>
        </div>
        </div>
      </div>
      </CheckupShell>
    );
  }

  /* ---------- ③ 결과 확인 ---------- */
  if (step === "confirm") {
    return (
      <CheckupShell>
      <div className="h-full bg-ivory flex flex-col">
        <PageHeader
          title="읽은 값을 확인해주세요"
          back
          onBack={() => setStep("camera")}
          subtitle="틀린 값이 있으면 눌러서 고쳐주세요"
        />

        {/* 콘텐츠 스크롤 */}
        <div className="flex-1 overflow-y-auto px-gutter pb-3 flex flex-col [&>*]:shrink-0">
        <div className="mt-2 flex flex-col gap-3">
          {OCR_ROWS.map((row) => {
            const auto = autoKeys.has(row.key);
            // 체중·신장은 OCR이 읽었을 때만 확인 대상 — 못 읽으면 설문 값 사용(재질문 없음)
            if (!auto && (row.key === "weight" || row.key === "height")) {
              return null;
            }
            const value = ocr[row.key];
            const isEditing = editing === row.key;
            const missing = !auto;
            return (
              <div
                key={row.key}
                onClick={() => setEditing(row.key)}
                className={`rounded-field px-[18px] py-3.5 flex items-center gap-3 cursor-pointer ${
                  missing
                    ? "bg-white border-[2.5px] border-gold"
                    : "bg-lightgreen"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-graytext">
                    {row.label}
                  </div>
                  {isEditing ? (
                    <input
                      autoFocus
                      type="number"
                      inputMode="decimal"
                      value={value}
                      placeholder="숫자 입력"
                      onChange={(e) =>
                        setOcr({ ...ocr, [row.key]: e.target.value })
                      }
                      onBlur={() => setEditing(null)}
                      className="mt-0.5 w-full bg-transparent text-[24px] font-bold text-charcoal placeholder:text-borderline outline-none"
                    />
                  ) : (
                    <div className="mt-0.5 text-[24px] font-bold text-charcoal">
                      {value === "" ? (
                        <span className="text-borderline">—</span>
                      ) : (
                        value
                      )}{" "}
                      <span className="text-[16px] font-medium text-graytext">
                        {row.unit}
                      </span>
                    </div>
                  )}
                </div>
                {auto ? (
                  <span className="flex-none flex items-center gap-[5px] bg-white text-forest text-[14px] font-bold rounded-chip px-3 py-[5px]">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#3E7A4E"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    자동
                  </span>
                ) : (
                  <span className="flex-none flex items-center gap-[5px] bg-[#FBF3E2] text-[#8C5A1E] text-[14px] font-bold rounded-chip px-3 py-[5px]">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#8C5A1E"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
                    </svg>
                    직접 입력
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {(!autoKeys.has("weight") || !autoKeys.has("height")) && (
          <p className="mt-3 text-[15px] text-graytext">
            체중·신장은 설문에서 입력한 값을 사용해요
          </p>
        )}

        <div className="mt-3 text-[14px] text-graytext text-center">
          못 읽은 값은 검진표를 보고 직접 넣어주세요
        </div>
        </div>

        {/* 하단 고정: CTA */}
        <div className="shrink-0 px-gutter pt-2 pb-8">
          <button onClick={submitOcr} className="btn-primary w-full">
            이 값으로 분석하기
          </button>
          <div className="mt-2.5 text-[13px] text-graytext text-center leading-[1.5]">
            분석 결과는 참고 정보이며 검진 결과의 해석은 의사와 상담해 주세요.
          </div>
        </div>
      </div>
      </CheckupShell>
    );
  }

  /* ---------- 방법 선택 / 직접 입력 ---------- */
  return (
    <CheckupShell>
    <div className="h-full bg-ivory flex flex-col">
      <PageHeader
        title="건강검진 입력"
        back
        onBack={() => (step === "manual" ? setStep("choose") : router.back())}
        right={
          <span className="text-[14px] font-bold text-gold bg-white border-[1.5px] border-gold rounded-chip px-2.5 py-[2px]">
            선택 입력
          </span>
        }
      />

      {/* 콘텐츠 스크롤 */}
      <div className="flex-1 overflow-y-auto px-gutter pb-10 flex flex-col [&>*]:shrink-0">
      {step === "choose" ? (
        <>
          <h1 className="mt-10 text-[28px] font-bold text-charcoal leading-[1.4]">
            건강검진표가 있으면
            <br />더 정밀해져요
          </h1>
          <p className="mt-2.5 text-[18px] text-graytext">
            둘 중 편한 방법을 골라 주세요
          </p>

          <div className="mt-7 flex flex-col gap-4">
            <ChoiceCard
              onClick={() => setStep("camera")}
              title="검진표 사진 찍기"
              desc="카메라로 찍으면 자동으로 읽어요"
              icon={
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
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              }
            />
            <ChoiceCard
              onClick={() => setStep("manual")}
              title="직접 입력하기"
              desc="숫자 몇 개만 입력하면 돼요"
              icon={
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
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
                </svg>
              }
            />
          </div>

          <div className="flex-1" />

          <button
            onClick={() => router.push("/analysis")}
            className="mt-6 w-full h-touch rounded-btn bg-white border-2 border-forest text-forest text-btn flex items-center justify-center active:brightness-95 transition"
          >
            검진표 없이 계속하기
          </button>
        </>
      ) : (
        <>
          <h1 className="mt-10 text-[28px] font-bold text-charcoal leading-[1.4]">
            검진표 숫자를
            <br />
            직접 입력해 주세요
          </h1>
          <p className="mt-2.5 text-[18px] text-graytext">
            숫자 몇 개만 입력하면 돼요
          </p>

          <div className="mt-4 space-y-5">
            <Field
              label="체중"
              unit="kg"
              value={form.weight}
              onChange={(v) => setForm({ ...form, weight: v })}
            />
            <Field
              label="신장"
              unit="cm"
              value={form.height}
              onChange={(v) => setForm({ ...form, height: v })}
            />
            <Field
              label="허리둘레"
              unit="cm"
              value={form.waist}
              onChange={(v) => setForm({ ...form, waist: v })}
            />
            <Field
              label="알칼리성 인산분해효소 (ALP)"
              unit="IU/L"
              value={form.alp}
              onChange={(v) => setForm({ ...form, alp: v })}
            />
            <Field
              label="수축기 혈압"
              unit="mmHg"
              value={form.sbp}
              onChange={(v) => setForm({ ...form, sbp: v })}
            />
            <button onClick={submitManual} className="btn-primary mt-2">
              이 정보로 분석하기
            </button>
          </div>

          <div className="flex-1" />

          <button
            onClick={() => router.push("/analysis")}
            className="mt-6 w-full h-touch rounded-btn bg-white border-2 border-forest text-forest text-btn flex items-center justify-center active:brightness-95 transition"
          >
            검진표 없이 계속하기
          </button>
        </>
      )}
      </div>
    </div>
    </CheckupShell>
  );
}

function CheckupShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh bg-ivory flex flex-col">
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}


/* 방법 선택 카드 (아이콘 타일 + 제목/설명 + 우측 화살표) */
function ChoiceCard({
  onClick,
  title,
  desc,
  icon,
}: {
  onClick: () => void;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-card px-6 py-[26px] flex items-center gap-[18px] shadow-[0_1px_6px_rgba(0,0,0,0.06)] text-left active:brightness-95"
    >
      <div className="w-16 h-16 rounded-field bg-lightgreen flex items-center justify-center flex-none">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-[22px] font-bold text-charcoal">{title}</div>
        <div className="mt-1 text-[16px] text-graytext">{desc}</div>
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
        className="flex-none"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  );
}

function Field({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mt-4">
      <label className="block text-body text-charcoal mb-2">{label}</label>
      <div className="relative">
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="field pr-16"
          placeholder="숫자 입력"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-body text-graytext">
          {unit}
        </span>
      </div>
    </div>
  );
}
