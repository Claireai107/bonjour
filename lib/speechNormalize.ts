/**
 * 음성 인식 결과 → 설문 값 변환
 *
 * 1차 UT(2026.08.07~09)에서 설문 음성 입력 성공률이 0%로 나왔다.
 * 참가자 발음 문제가 아니라, 인식된 자연어를 값으로 바꾸지 못한 것이 원인이었다.
 *
 *   P1  "운동 0일" / "안 해요"   → 값 없음
 *   P2  "하루"                   → 값 없음
 *   P3  "5~7일"                  → 숫자만 뽑아내 57로 읽힘
 *   P4  "한 번"                  → 값 없음
 *
 * 그래서 인식 결과를 바로 쓰지 않고 이 파일을 한 번 거치게 했다.
 * 표현을 추가하려면 아래 사전에 한 줄 넣으면 된다.
 */

/** 전각 숫자 → 반각, 공백·문장부호 제거 */
export function normalize(text: string): string {
  if (!text) return "";
  return text
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[.,!?·]/g, "")
    .replace(/\s+/g, "");
}

/** "하지 않는다"는 뜻의 표현 → 0 */
const ZERO_WORDS = [
  "안해요", "안해", "안함", "안하", "하지않", "안다녀", "못해",
  "없어요", "없음", "없다", "없어", "전혀", "하나도", "제로", "영", "공",
];

/** "매일"에 해당하는 표현 → 7 */
const EVERYDAY_WORDS = ["매일", "날마다", "맨날", "거의매일", "일주일내내", "일주일다"];

/** 순우리말 날짜 세는 말 */
const DAY_WORDS: Record<string, number> = {
  하루: 1, 이틀: 2, 사흘: 3, 나흘: 4, 닷새: 5,
  엿새: 6, 이레: 7, 여드레: 8, 아흐레: 9, 열흘: 10,
};

/** 순우리말 수사 (한 번, 두 번 …) */
const NATIVE: Record<string, number> = {
  하나: 1, 한: 1, 둘: 2, 두: 2, 셋: 3, 세: 3, 넷: 4, 네: 4,
  다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9, 열: 10,
};

/** 한자어 수사 */
const SINO: Record<string, number> = {
  영: 0, 공: 0, 일: 1, 이: 2, 삼: 3, 사: 4, 오: 5,
  육: 6, 륙: 6, 칠: 7, 팔: 8, 구: 9,
};

const NATIVE_TENS: Record<string, number> = {
  열: 10, 스물: 20, 서른: 30, 마흔: 40, 쉰: 50,
  예순: 60, 일흔: 70, 여든: 80, 아흔: 90,
};

/**
 * 값 뒤에 붙는 단위·조사를 떼어낸다.
 * "세 번"처럼 수사와 단위가 둘 다 목록에 있는 경우 통째로 지워지면 안 되므로
 * 앞에 최소 한 글자는 남기도록 했다.
 */
const UNIT_WORDS =
  "살|세|개|번|회|일|시간|정도|쯤|가량|이상|이하|미만|초과|씩|은|는|이|가|을|를|요";
const UNIT_SUFFIX = new RegExp(`^(.+?)(?:${UNIT_WORDS})+$`);

/** "두 번 했어요"의 뒷부분처럼 값과 무관한 말꼬리 */
const TAIL_PHRASE = /(했어요|했습니다|했어|한적있어요|한적|합니다|해요|이에요|예요|입니다|정도예요|같아요|인것같아요)$/;

/** "일주일에 한 번"의 앞부분처럼 값과 무관한 말머리 */
const LEAD_PHRASE = /^(일주일에|1주일에|한주에|매주에|주에|일주일|한주|매주|하루에|한달에|매일같이)/;

function stripUnit(s: string): string {
  const m = s.match(UNIT_SUFFIX);
  return m ? m[1] : s;
}

/**
 * "5~7일", "5에서 7일", "3-4일" 같은 범위 표현 → [하한, 상한]
 * 범위로 답하면 하한값을 쓰고 사용자에게 확인을 받는다.
 */
export function parseRange(text: string): [number, number] | null {
  const s = normalize(text);
  const m = s.match(/(\d+)\s*(?:~|-|–|—|에서|부터|내지)\s*(\d+)/);
  if (!m) return null;
  const lo = parseInt(m[1], 10);
  const hi = parseInt(m[2], 10);
  if (Number.isNaN(lo) || Number.isNaN(hi) || lo > hi) return null;
  return [lo, hi];
}

/**
 * 일수·횟수 표현 → 숫자
 * 나이·키·몸무게처럼 큰 수는 parseKoreanNumber 가 받는다.
 */
export function parseCount(text: string): number | null {
  const base = normalize(text).replace(LEAD_PHRASE, "");
  if (!base) return null;

  // 1) 0을 뜻하는 표현 — 숫자보다 먼저 본다 ("0일도 안 해요").
  //    말꼬리를 떼기 전에 확인해야 한다. "안 해요"에서 '해요'를 먼저 떼면 '안'만 남는다.
  if (ZERO_WORDS.some((w) => base.includes(w))) return 0;

  // 2) 매일
  if (EVERYDAY_WORDS.some((w) => base.includes(w))) return 7;

  // 여기부터는 "두 번 했어요"처럼 뒤에 붙은 말을 떼고 본다
  const s = base.replace(TAIL_PHRASE, "");
  if (!s) return null;

  // 3) 범위는 하한값
  const range = parseRange(s);
  if (range) return range[0];

  // 4) 아라비아 숫자 — 첫 덩어리만 (예전엔 "5~7일"을 57로 읽었다)
  const digit = s.match(/\d+/);
  if (digit) return parseInt(digit[0], 10);

  // 5) 순우리말 날짜
  for (const [w, n] of Object.entries(DAY_WORDS)) {
    if (s.includes(w)) return n;
  }

  // 6) 수사 + 단위 (한 번 / 세 번 / 다섯 번)
  const stripped = stripUnit(s);
  if (NATIVE[stripped] != null) return NATIVE[stripped];
  if (SINO[stripped] != null) return SINO[stripped];

  return parseKoreanNumber(s);
}

/** 한국어 수사 → 숫자 (나이·키·몸무게 등 두 자리 수까지) */
export function parseKoreanNumber(text: string): number | null {
  const t = normalize(text).replace(LEAD_PHRASE, "").replace(TAIL_PHRASE, "");
  if (!t) return null;

  // 아라비아 숫자는 첫 덩어리만 쓴다
  const digit = t.match(/\d+/);
  if (digit) return parseInt(digit[0], 10);

  // 고유어 십단위 (예순둘, 마흔다섯, 쉰)
  for (const tens of Object.keys(NATIVE_TENS)) {
    if (t.startsWith(tens)) {
      let val = NATIVE_TENS[tens];
      const rest = stripUnit(t.slice(tens.length));
      for (const u of Object.keys(NATIVE)) {
        if (rest.startsWith(u)) {
          val += NATIVE[u];
          break;
        }
      }
      return val;
    }
  }

  // 순우리말 날짜
  for (const [w, n] of Object.entries(DAY_WORDS)) {
    if (t.includes(w)) return n;
  }

  const cleaned = stripUnit(t);

  // 한자어 백단위 (백육십, 백오십오) — 키를 말할 때 쓴다
  const hundredAt = cleaned.indexOf("백");
  if (hundredAt >= 0) {
    const before = cleaned.slice(0, hundredAt);
    const after = cleaned.slice(hundredAt + 1);
    const h = before === "" ? 1 : SINO[before] ?? 1;
    return h * 100 + (after ? parseSinoUnder100(after) ?? 0 : 0);
  }

  // 한자어 십단위 (육십이, 십오)
  const under = parseSinoUnder100(cleaned);
  if (under != null) return under;

  if (NATIVE[cleaned] != null) return NATIVE[cleaned];

  return null;
}

/** "육십이", "십오", "칠" 처럼 100 미만 한자어 수 */
function parseSinoUnder100(s: string): number | null {
  if (!s) return null;
  if (s.includes("십")) {
    const [tensPart, unitPart] = s.split("십");
    const tens = tensPart === "" ? 1 : SINO[tensPart] ?? 0;
    const unit = unitPart ? SINO[unitPart[0]] ?? 0 : 0;
    return tens * 10 + unit;
  }
  if (s.length === 1 && SINO[s] != null) return SINO[s];
  return null;
}
