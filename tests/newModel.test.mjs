// 새 모델 엔진 회귀 테스트
//
// 데이터팀 bonjour_backend.py(파이썬)의 실제 출력(tests/fixtures/modelTestVectors.json)과
// TS 포팅(lib/predict.ts)의 수치가 일치하는지 검증한다.
// 기준 케이스는 인계 문서 D-1의 값 그대로:
//   위험확률 0.568 · 등급 위험 · 점수 9 · whatif(운동 3일) 0.523
//
// 실행: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  toUser,
  chooseTrack,
  predict,
  simulate,
  recommendActions,
  weightSensitivity,
} from "../lib/predict.ts";

const VECTORS = JSON.parse(
  readFileSync(new URL("./fixtures/modelTestVectors.json", import.meta.url), "utf8")
);

// 파이썬 user dict → 앱 입력(SurveyAnswers/CheckupInputs) 역변환
const DAYS_TO_CAT = { 0: 0, 1.5: 1, 3.5: 2, 6: 3 };
function toAnswers(u) {
  return {
    age: u.age,
    weight: u.wt,
    height: u.ht,
    menopause: u.meno_age == null ? "no" : "yes",
    menopauseAge: u.meno_age ?? undefined,
    menarcheAge: u.mens_age,
    education: u.edu,
    pregnancies: u.preg_n,
    hormone: u.hormone === 1 ? "yes" : u.hormone === 0 ? "no" : "unknown",
    drinkStartAge: u.drink_ever === 0 ? -1 : u.drink_age ?? undefined,
    strengthDays: DAYS_TO_CAT[u.exercise] ?? 0,
  };
}

const близко = (a, b, tol, msg) =>
  assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

for (const [i, c] of VECTORS.entries()) {
  if (c.user_raw_checkup) continue; // 검진 케이스는 아래 별도 테스트
  test(`파이썬 대조 #${i}: 확률·등급·점수·또래·whatif 일치`, () => {
    const answers = toAnswers(c.user);
    const r = predict(answers, {});
    близко(r.riskProbability, c.risk["위험확률"], 0.001, "위험확률");
    assert.equal(r.grade, c.risk["등급"], "등급");
    assert.equal(r.boneScore, c.score, "점수");
    assert.equal(r.comment, c.risk["한마디"], "한마디");
    assert.equal(r.easyExplain, c.risk["쉬운설명"], "쉬운설명");
    assert.equal(r.peerText, c.peer["문구"], "또래 문구");
    assert.equal(r.track, c.risk["사용트랙"], "트랙");

    // whatif: 근력운동 3일
    const sim = simulate(answers, {}, { strengthDays: 3 });
    близко(sim.riskProbability, c.whatif3["변경후위험"], 0.001, "whatif 확률");
    assert.equal(sim.grade, c.whatif3["변경후등급"], "whatif 등급");

    // 행동 처방 유형 (유지/회복/증가 구성)
    const rec = recommendActions(answers, {});
    assert.deepEqual(
      rec.modelBased.map((a) => a.kind),
      c.recommend_kinds,
      "모델기반 처방 유형"
    );
  });
}

test("검진표 트랙(전체16): 표준화 변환 포함 일치", () => {
  const c = VECTORS.find((v) => v.user_raw_checkup);
  const raw = c.user_raw_checkup;
  const answers = toAnswers(raw);
  const checkup = {
    alp: raw.alp,
    waist: raw.wc,
    pth: raw.pth,
    fev1fvc: raw.fev1fvc,
    sbp: raw.sbp,
  };
  const u = toUser(answers, checkup);
  assert.equal(chooseTrack(u), "전체16");
  const r = predict(answers, checkup);
  близко(r.riskProbability, c.risk["위험확률"], 0.001, "위험확률");
  assert.equal(r.grade, c.risk["등급"], "등급");
  assert.equal(r.boneScore, c.score, "점수");
});

test("D-1 기준값: 문서의 회귀 기준 그대로", () => {
  const answers = {
    age: 62, weight: 46, height: 152, menopause: "yes", menopauseAge: 47,
    menarcheAge: 15, education: 2, drinkStartAge: -1, pregnancies: 3,
    hormone: "no", strengthDays: 0,
  };
  const r = predict(answers, {});
  assert.equal(r.riskProbability, 0.568);
  assert.equal(r.grade, "위험");
  assert.equal(r.boneScore, 9);
  assert.equal(r.track, "설문11");
  const sim = simulate(answers, {}, { strengthDays: 3 });
  assert.equal(sim.riskProbability, 0.523);
});

test("체중 민감도: 감량 경고 방향 + 주의 문구", () => {
  const answers = {
    age: 62, weight: 52, height: 152, menopause: "yes", menopauseAge: 47,
    menarcheAge: 15, education: 2, drinkStartAge: -1, pregnancies: 3,
    hormone: "no", strengthDays: 0,
  };
  const ws = weightSensitivity(answers, {});
  assert.ok(ws.available);
  assert.match(ws.summary, /지금 몸무게를 지켜주세요/);
  assert.match(ws.caution, /일부러 살을 찌우시라는 말이 아니에요/);
  // 감량할수록 위험이 올라간다 (곡선 방향)
  const risks = ws.curve.map((c) => c.risk);
  assert.ok(risks[0] > risks[risks.length - 1], "감량 쪽 위험이 더 높아야 한다");
});

test("입력 계약: hormone 1/0, 비음주 drink_age는 null 유지", () => {
  const u = toUser({ hormone: "yes", drinkStartAge: -1 }, {});
  assert.equal(u.hormone, 1);
  assert.equal(u.drink_ever, 0);
  assert.equal(u.drink_age, null, "비음주자를 중앙값으로 채우면 안 된다");
  const u2 = toUser({ hormone: "no", drinkStartAge: 25 }, {});
  assert.equal(u2.hormone, 0);
  assert.equal(u2.drink_ever, 1);
  assert.equal(u2.drink_age, 25);
});
