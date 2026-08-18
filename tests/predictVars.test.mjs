// 모델 변수 연결 회귀 테스트
//
// 임신 횟수(LW_pr_1)와 음주 시작 나이(BD2)가 예전에는 앱에서 수집되지 않아
// 모든 사용자에게 학습 중앙값(각각 4회·35세)이 들어가고 있었다.
// 실제 입력이 결과에 반영되는지 확인한다.
//
// 실행:  node --experimental-strip-types --test tests/predictVars.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { predict } from "../lib/predict.ts";

const 기본 = {
  age: 58,
  height: 158,
  weight: 55,
  menopause: "yes",
  menopauseAge: 50,
  menarcheAge: 15,
  hormone: "no",
  strengthDays: 1,
  education: 3,
  sleepHours: 1,
};

test("임신 횟수를 입력하면 결과가 달라진다", () => {
  const 없음 = predict({ ...기본 }, {});
  const 영회 = predict({ ...기본, pregnancies: 0 }, {});
  const 여섯회 = predict({ ...기본, pregnancies: 6 }, {});

  assert.notEqual(영회.boneScore, 여섯회.boneScore);
  // 임신 횟수가 많을수록 위험이 낮게 나오는 방향 (계수가 음수)
  assert.ok(여섯회.riskProbability < 영회.riskProbability);
  // 미입력은 중앙값(4회) 대체이므로 그 사이에 위치한다
  assert.ok(
    없음.riskProbability < 영회.riskProbability &&
      없음.riskProbability > 여섯회.riskProbability
  );
});

test("음주 시작 나이를 입력하면 결과가 달라진다", () => {
  const 이른 = predict({ ...기본, drinkStartAge: 18 }, {});
  const 늦은 = predict({ ...기본, drinkStartAge: 45 }, {});
  assert.notEqual(이른.boneScore, 늦은.boneScore);
});

test("술을 안 마시면(-1) 음주경험 0으로 들어가고 중앙값으로 둔갑하지 않는다", () => {
  // 재분석 반영판: 비음주 = drink_ever 0 + drink_age null.
  // 구 모델은 비음주자를 음주시작 중앙값(35세)으로 채워 음주자로 둔갑시켰다.
  const 안마심 = predict({ ...기본, drinkStartAge: -1 }, {});
  const 음주자 = predict({ ...기본, drinkStartAge: 20 }, {});
  assert.notEqual(안마심.riskProbability, 음주자.riskProbability);
});

test("요인 이름이 '출산 횟수'가 아니라 '임신 횟수'로 표기된다", () => {
  const r = predict({ ...기본, pregnancies: 0 }, {});
  const 모든요인 = [...r.riskFactors, ...r.protectiveFactors];
  assert.equal(
    모든요인.some((f) => f.label === "출산 횟수"),
    false,
    "출산 횟수(LW_mt)는 임신 횟수(LW_pr_1)와 다른 변수다"
  );
});
