import test from "node:test";
import assert from "node:assert/strict";
import navigation from "../lib/navigation.js";

const { activeTabForPath } = navigation;

test("primary tab routes select their own tab", () => {
  assert.equal(activeTabForPath("/home"), "home");
  assert.equal(activeTabForPath("/routine"), "routine");
  assert.equal(activeTabForPath("/local"), "local");
  assert.equal(activeTabForPath("/report"), "report");
  assert.equal(activeTabForPath("/mypage"), "my");
});

test("analysis flow routes select home", () => {
  assert.equal(activeTabForPath("/onboarding"), "home");
  assert.equal(activeTabForPath("/checkup"), "home");
  assert.equal(activeTabForPath("/analysis"), "home");
});

test("secondary routes select the nearest primary tab", () => {
  assert.equal(activeTabForPath("/simulator"), "report");
  assert.equal(activeTabForPath("/favorites"), "my");
  assert.equal(activeTabForPath("/profile-add"), "my");
});

test("unknown routes do not select a tab", () => {
  assert.equal(activeTabForPath("/survey"), null);
});
