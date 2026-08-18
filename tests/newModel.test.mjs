// 새 모델 엔진(2차 개정판, 2026-08-18 인계) 회귀 테스트
//
// ① 데이터팀 bonjour_backend.py(파이썬)의 실제 출력(fixtures/modelTestVectors2.json)과
//    TS 포팅(lib/predict.ts)의 수치가 일치하는지 검증한다.
// ② 인계 문서 §8의 회귀 테스트(관문·트랙 선택·조기폐경·단조성·불사조 입력)를 포팅한다.
//
// 실행: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  toUser,
  chooseTrack,
  checkEligible,
  normalize,
  predict,
  simulate,
  recommendActions,
  weightSensitivity,
} from "../lib/predict.ts";

const { cases: VECTORS, gate: GATES } = JSON.parse(
  readFileSync(new URL("./fixtures/modelTestVectors2.json", import.meta.url), "utf8")
);

// 파이썬 user dict → 앱 입력(SurveyAnswers/CheckupInputs) 역변환
const DAYS_TO_CAT = { 0: 0, 1.5: 1, 3.5: 2, 6: 3 };
function toAnswers(u) {
  return {
    age: u.age,
    sex: u.sex,
    weight: u.wt,
    height: u.ht,
    menopause: u.meno_age == null ? "no" : "yes",
    menopauseAge: u.meno_age ?? undefined,
    menarcheAge: u.mens_age,
    education: u.edu,
    pregnancies: u.preg_n,
    hormone: u.hormone === 1 ? "yes" : u.hormone === 0 ? "no" : "unknown",
    drinkStartAge:
      u.drink_ever === 0 ? -1 : u.drink_ever === 1 ? u.drink_age ?? undefined : undefined,
    strengthDays: u.exercise == null ? undefined : DAYS_TO_CAT[u.exercise] ?? 0,
  };
}

const close = (a, b, tol, msg) =>
  assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

for (const [i, c] of VECTORS.entries()) {
  if (c.user_raw_checkup) continue;
  test(`파이썬 대조 #${i} (${c.risk["사용트랙"]}): 확률·등급·점수·또래·whatif 일치`, () => {
    const answers = toAnswers(c.user);
    const r = predict(answers, {});
    assert.equal(r.applicable, true);
    close(r.riskProbability, c.risk["위험확률"], 0.001, "위험확률");
    assert.equal(r.grade, c.risk["등급"], "등급");
    assert.equal(r.boneScore, c.score, "점수");
    assert.equal(r.comment, c.risk["한마디"], "한마디");
    assert.equal(r.guidance, c.risk["안내"], "안내");
    assert.equal(r.easyExplain, c.risk["쉬운설명"], "쉬운설명");
    assert.equal(r.track, c.risk["사용트랙"], "트랙");
    assert.equal(r.peerText, c.peer["문구"], "또래 문구");
    assert.equal(r.peerReliable, c.peer["신뢰가능"], "또래 신뢰가능");

    const sim = simulate(answers, {}, { strengthDays: 3 });
    close(sim.riskProbability, c.whatif3["변경후위험"], 0.001, "whatif 확률");
    assert.equal(sim.grade, c.whatif3["변경후등급"], "whatif 등급");

    const rec = recommendActions(answers, {});
    assert.deepEqual(
      rec.modelBased.map((a) => a.kind),
      c.recommend_kinds,
      "모델기반 처방 유형"
    );
  });
}

test("검진표 트랙(전체16): 원본값 표준화 포함 일치", () => {
  const c = VECTORS.find((v) => v.user_raw_checkup);
  const raw = c.user_raw_checkup;
  const answers = toAnswers(raw);
  const checkup = {
    alp: raw.alp, waist: raw.wc, pth: raw.pth,
    fev1fvc: raw.fev1fvc, sbp: raw.sbp,
  };
  const u = toUser(answers, checkup);
  assert.equal(chooseTrack(u), "전체16");
  const r = predict(answers, checkup);
  close(r.riskProbability, c.risk["위험확률"], 0.001, "위험확률");
  assert.equal(r.grade, c.risk["등급"], "등급");
  assert.equal(r.boneScore, c.score, "점수");
});

test("적용 대상 관문: 파이썬과 동일한 판정·문구", () => {
  for (const g of GATES) {
    const ok = checkEligible({ ...g.user });
    assert.equal(ok.applicable, g.risk["적용가능"], JSON.stringify(g.user));
    if (!ok.applicable) {
      assert.equal(ok.text, g.risk["안내"], "관문 문구");
    }
  }
});

// ── 인계 문서 §8 회귀 테스트 포팅 ────────────────────────────────────────

test("§8-1 문자열로 보내도 숫자와 같은 결과", () => {
  const a = { age: 62, meno_age: 47, wt: 55, ht: 158 };
  const s = Object.fromEntries(Object.entries(a).map(([k, v]) => [k, String(v)]));
  assert.deepEqual(normalize(s), normalize(a));
});

test("§8-3 트랙 자동 선택 (폐경전/설문11/전체16)", () => {
  assert.equal(chooseTrack(normalize({ age: 46, wt: 55 })), "폐경전");
  assert.equal(chooseTrack(normalize({ age: 62, meno_age: 47 })), "설문11");
  assert.equal(chooseTrack(normalize({ age: 62, meno_age: 47, alp: 0.1 })), "전체16");
});

test("§8-4 조기폐경이 더 위험하다 (폐경연령이 실제로 반영)", () => {
  const base = {
    age: 62, weight: 55, height: 158, pregnancies: 2, strengthDays: 0,
    menopause: "yes",
  };
  const early = predict({ ...base, menopauseAge: 40 }, {}).riskProbability;
  const late = predict({ ...base, menopauseAge: 55 }, {}).riskProbability;
  assert.ok(early > late, `조기폐경 ${early} > 늦은폐경 ${late} 이어야 함`);
});

test("§8-5 확률이 오르면 점수는 내려간다 (트랙이 바뀌어도)", () => {
  let prevP = -1;
  let prevS = 100;
  const seq = [
    [24, null], [40, null], [46, 45], [52, 50], [62, 47], [85, 48],
  ];
  for (const [age, meno] of seq) {
    const answers = {
      age, weight: 55, height: 158, pregnancies: 2, strengthDays: 0,
      menopause: meno == null ? "no" : "yes",
      menopauseAge: meno ?? undefined,
    };
    const r = predict(answers, {});
    assert.ok(
      !(r.riskProbability > prevP && r.boneScore > prevS),
      `${age}세에서 점수 역전 (p ${prevP}→${r.riskProbability}, s ${prevS}→${r.boneScore})`
    );
    prevP = r.riskProbability;
    prevS = r.boneScore;
  }
});

test("§8-6 어떤 입력에도 터지지 않는다", () => {
  const inputs = [
    {},
    { age: 60 },
    { age: undefined, menopauseAge: undefined },
    { age: 60, menopause: "yes", menopauseAge: 50, weight: -5, height: 9999 },
  ];
  for (const a of inputs) {
    predict(a, {});
    recommendActions(a, {});
    weightSensitivity(a, {});
  }
});

test("입력 계약: hormone 1/0, 비음주 drink_age null, 성별 관문", () => {
  const u = toUser({ hormone: "yes", drinkStartAge: -1 }, {});
  assert.equal(u.hormone, 1);
  assert.equal(u.drink_ever, 0);
  assert.equal(u.drink_age, null);
  // 남성 프로필 → 적용 불가 안내
  const r = predict({ age: 50, sex: "남" }, {});
  assert.equal(r.applicable, false);
  assert.match(r.guidance, /여성의 뼈 건강/);
});
