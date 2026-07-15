import test from "node:test";
import assert from "node:assert/strict";
import reportHistory from "../lib/reportHistory.js";

const { buildReportHistory, clampReportSelection } = reportHistory;

test("report history is returned latest first without mutating storage order", () => {
  const stored = [
    { date: "2026-07-10T09:00:00.000Z", result: { boneScore: 70 } },
    { date: "2026-07-13T09:00:00.000Z", result: { boneScore: 82 } },
  ];

  const history = buildReportHistory(stored, { boneScore: 82 });

  assert.deepEqual(history.map((entry) => entry.result.boneScore), [82, 70]);
  assert.deepEqual(stored.map((entry) => entry.result.boneScore), [70, 82]);
});

test("current result is used when stored history is unavailable", () => {
  assert.deepEqual(buildReportHistory([], { boneScore: 77 }), [
    { date: "", result: { boneScore: 77 } },
  ]);
});

test("history is empty when there is no result", () => {
  assert.deepEqual(buildReportHistory(undefined, null), []);
});

test("report selection is clamped to an available item", () => {
  assert.equal(clampReportSelection(0, 2), 0);
  assert.equal(clampReportSelection(4, 2), 1);
  assert.equal(clampReportSelection(-1, 2), 0);
  assert.equal(clampReportSelection(3, 0), 0);
});
