// 또래 비교 표시 회귀 테스트
//
// percentile 은 "나보다 위험이 높은 또래의 비율"이라 값이 클수록 건강하다.
// 화면의 '상위 몇 %'는 방향이 반대라, 예전에는 건강한 사용자의 표시가
// 막대의 '관리 필요' 쪽에 찍히고 "상위 97%"로 적히는 문제가 있었다.
//
// 실행:  npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { predict } from "../lib/predict.ts";

const 기본 = {
  age: 65,
  height: 158,
  menopause: "yes",
  menopauseAge: 50,
  menarcheAge: 15,
  hormone: "no",
  education: 3,
  pregnancies: 2,
};

const 건강한사람 = predict({ ...기본, weight: 70, strengthDays: 3 }, {});
const 위험한사람 = predict({ ...기본, weight: 42, strengthDays: 0 }, {});

// 리포트 화면이 쓰는 계산과 같은 식
const 상위표기 = (r) => Math.max(1, Math.min(99, 100 - r.percentile));
const 마커위치 = (r) => r.percentile;

test("percentile 은 클수록 건강하다", () => {
  assert.ok(건강한사람.percentile > 위험한사람.percentile);
  assert.ok(건강한사람.boneScore > 위험한사람.boneScore);
});

test("건강한 사용자는 '상위' 숫자가 작게 나온다", () => {
  assert.ok(
    상위표기(건강한사람) < 상위표기(위험한사람),
    "상위 3%가 상위 97%보다 건강해야 한다"
  );
  assert.ok(상위표기(건강한사람) < 50);
});

test("막대 위 표시가 점수와 같은 방향을 향한다", () => {
  // 막대는 왼쪽이 '관리 필요', 오른쪽이 '건강'
  assert.ok(
    마커위치(건강한사람) > 마커위치(위험한사람),
    "건강한 사용자의 표시가 더 오른쪽에 있어야 한다"
  );
});

test("비교 문구가 점수와 어긋나지 않는다", () => {
  const 문구 = (r) =>
    r.percentile >= 50 ? "또래 평균보다 좋은 편이에요" : "또래 평균보다 관리가 필요해요";
  assert.equal(문구(건강한사람), "또래 평균보다 좋은 편이에요");
  assert.equal(문구(위험한사람), "또래 평균보다 관리가 필요해요");
});
