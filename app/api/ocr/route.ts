import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// 고성능 OCR — AI 비전으로 검진표에서 '결과' 값만 추출한다.
// 시도 순서: ① Claude (ANTHROPIC_API_KEY) → ② Gemini (GEMINI_API_KEY, 무료 티어)
// 둘 다 없거나 실패하면 { available: false } → 클라이언트가 tesseract 폴백을 쓴다.

export const maxDuration = 60;

// 구조화 출력 스키마 — 항목별 결과값(숫자) 또는 null
const SCHEMA = {
  type: "object",
  properties: {
    weight: { anyOf: [{ type: "number" }, { type: "null" }] },
    height: { anyOf: [{ type: "number" }, { type: "null" }] },
    chol: { anyOf: [{ type: "number" }, { type: "null" }] },
    alp: { anyOf: [{ type: "number" }, { type: "null" }] },
    crea: { anyOf: [{ type: "number" }, { type: "null" }] },
  },
  required: ["weight", "height", "chol", "alp", "crea"],
  additionalProperties: false,
};

const PROMPT = `건강검진 결과지 사진입니다. 아래 항목의 '결과' 값을 추출해 주세요.
반드시 검사 결과값을 추출하고, 참고치(정상범위, 예: 120-199)의 숫자를 결과로 쓰면 안 됩니다.

- weight: 체중 (kg)
- height: 신장/키 (cm)
- chol: 총콜레스테롤 (mg/dL)
- alp: ALP / 알칼리성 인산분해효소 (IU/L)
- crea: 크레아티닌 (mg/dL)

사진에서 확실히 읽을 수 없는 항목은 null로 두세요.`;

// ① Claude 비전 (ANTHROPIC_API_KEY 필요)
async function claudeExtract(base64: string) {
  const client = new Anthropic(); // 키 없으면 여기서 throw → 다음 단계로
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    output_config: {
      format: { type: "json_schema", schema: SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: base64,
            },
          },
          { type: "text", text: PROMPT },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("no text");
  return JSON.parse(textBlock.text);
}

// ② Gemini 비전 (GEMINI_API_KEY 필요 — aistudio.google.com 무료 발급)
async function geminiExtract(base64: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("no GEMINI_API_KEY");

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inlineData: { mimeType: "image/jpeg", data: base64 } },
              { text: PROMPT },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              weight: { type: "NUMBER", nullable: true },
              height: { type: "NUMBER", nullable: true },
              chol: { type: "NUMBER", nullable: true },
              alp: { type: "NUMBER", nullable: true },
              crea: { type: "NUMBER", nullable: true },
            },
            required: ["weight", "height", "chol", "alp", "crea"],
          },
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("gemini empty");
  return JSON.parse(text);
}

export async function POST(req: NextRequest) {
  let base64: string;
  try {
    const body = await req.json();
    base64 = String(body.image ?? "").replace(/^data:image\/\w+;base64,/, "");
    if (!base64) throw new Error("no image");
  } catch {
    return NextResponse.json({ available: false }, { status: 400 });
  }

  // Claude 우선, 실패하면 Gemini — 둘 다 안 되면 클라이언트 tesseract 폴백
  try {
    const values = await claudeExtract(base64);
    return NextResponse.json({ available: true, engine: "claude", values });
  } catch {
    /* 다음 엔진 시도 */
  }
  try {
    const values = await geminiExtract(base64);
    return NextResponse.json({ available: true, engine: "gemini", values });
  } catch {
    return NextResponse.json({ available: false });
  }
}
