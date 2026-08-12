// 음성 표현 → 값 변환 회귀 테스트
// 1차 UT(2026.08.07~09)에서 실패했던 표현을 모두 넣어뒀다.
// 표현을 추가할 때 여기 먼저 케이스를 넣고 lib/speechNormalize.ts 를 고치면 된다.
//
// 실행:  node --experimental-strip-types --test tests/speechNormalize.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCount, parseKoreanNumber, parseRange } from "../lib/speechNormalize.ts";

test("UT에서 실패했던 표현", () => {
  assert.equal(parseCount("안 해요"), 0);   // P1
  assert.equal(parseCount("0일"), 0);       // P1
  assert.equal(parseCount("하루"), 1);      // P2
  assert.equal(parseCount("한 번"), 1);     // P4
  assert.equal(parseCount("5~7일"), 5);     // P3 — 예전엔 57로 읽혔다
});

test("0을 뜻하는 표현", () => {
  for (const w of ["안 해요", "안함", "없어요", "전혀 안 해요", "하나도 안 해요", "0회"])
    assert.equal(parseCount(w), 0, w);
});

test("순우리말 날짜", () => {
  const 표 = { 하루: 1, 이틀: 2, 사흘: 3, 나흘: 4, 닷새: 5, 엿새: 6, 이레: 7 };
  for (const [w, n] of Object.entries(표)) assert.equal(parseCount(w), n, w);
});

test("수사 + 단위", () => {
  const 표 = { "한 번": 1, "두 번": 2, "세 번": 3, "네 번": 4, "다섯 번": 5, "여섯 번": 6, "일곱 번": 7 };
  for (const [w, n] of Object.entries(표)) assert.equal(parseCount(w), n, w);
});

test("매일에 해당하는 표현", () => {
  for (const w of ["매일", "날마다", "맨날", "거의 매일"]) assert.equal(parseCount(w), 7, w);
});

test("말머리가 붙어도 인식", () => {
  assert.equal(parseCount("일주일에 한 번"), 1);
  assert.equal(parseCount("한주에 세 번"), 3);
});

test("범위 표현은 하한값", () => {
  assert.deepEqual(parseRange("5~7일"), [5, 7]);
  assert.deepEqual(parseRange("3-4일"), [3, 4]);
  assert.deepEqual(parseRange("5에서 7일"), [5, 7]);
  assert.equal(parseCount("1~2일"), 1);
  assert.equal(parseRange("하루"), null);
});

test("나이·키·몸무게", () => {
  assert.equal(parseKoreanNumber("65세"), 65);
  assert.equal(parseKoreanNumber("예순다섯"), 65);
  assert.equal(parseKoreanNumber("쉰다섯"), 55);
  assert.equal(parseKoreanNumber("백육십"), 160);
  assert.equal(parseKoreanNumber("백육십오"), 165);
  assert.equal(parseKoreanNumber("열넷"), 14);
});

test("못 알아들으면 null — 엉뚱한 값을 넣지 않는다", () => {
  for (const w of ["", "그러니까", "어디보자"]) assert.equal(parseCount(w), null, w);
});

test("임신 횟수 문항 (UT P3 '임신 한 번')", () => {
  assert.equal(parseCount("한 번"), 1);
  assert.equal(parseCount("없어요"), 0);
  assert.equal(parseCount("세 번"), 3);
  assert.equal(parseCount("두 번 했어요"), 2);
});
