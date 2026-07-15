import test from "node:test";
import assert from "node:assert/strict";
import age from "../lib/age.js";
const { ageFromBirth, ageFromParts } = age;

test("ageFromBirth parses YYYY-MM-DD and computes 만 나이", () => {
  const now = new Date();
  const y = now.getFullYear();
  // 오늘이 생일인 사람: 만 나이 = 현재연도 - 출생연도
  const todayBirth = `${y - 65}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  assert.equal(ageFromBirth(todayBirth), 65);
});

test("ageFromBirth subtracts 1 before birthday", () => {
  const now = new Date();
  const y = now.getFullYear();
  // 내일이 생일 → 아직 만 나이 -1 (연말 경계는 파츠 함수로 별도 확인)
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (t.getFullYear() === y) {
    const birth = `${y - 65}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    assert.equal(ageFromBirth(birth), 64);
  }
});

test("ageFromBirth returns undefined for missing/invalid", () => {
  assert.equal(ageFromBirth(undefined), undefined);
  assert.equal(ageFromBirth(""), undefined);
  assert.equal(ageFromBirth("abc"), undefined);
  assert.equal(ageFromBirth("2050-99-99"), undefined);
});
