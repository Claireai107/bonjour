import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (relativePath) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

test("eligible pages render exactly one bottom tab bar", () => {
  const eligible = [
    "app/home/page.tsx",
    "app/routine/page.tsx",
    "app/local/page.tsx",
    "app/report/page.tsx",
    "app/mypage/page.tsx",
    "app/onboarding/page.tsx",
    "app/analysis/page.tsx",
    "app/simulator/page.tsx",
    "app/favorites/page.tsx",
    "app/profile-add/page.tsx",
  ];

  for (const file of eligible) {
    const matches = read(file).match(/<TabBar\s*\/>/g) ?? [];
    assert.equal(matches.length, 1, `${file} should render one TabBar`);
  }

  // 검진 입력은 의도적으로 탭바 없는 몰입 플로우
  const checkup = read("app/checkup/page.tsx");
  assert.equal((checkup.match(/<TabBar\s*\/>/g) ?? []).length, 0);
});

test("splash, signup, and survey do not render a bottom tab bar", () => {
  for (const file of [
    "app/page.tsx",
    "app/signup/page.tsx",
    "app/survey/page.tsx",
  ]) {
    assert.doesNotMatch(read(file), /<TabBar\s*\/>/, file);
  }
});

test("signup completion routes to home", () => {
  const signup = read("app/signup/page.tsx");
  assert.match(signup, /setProfileInfo\([\s\S]*?router\.push\("\/home"\)/);
});

test("empty state offers to start a fresh analysis (shared component)", () => {
  const empty = read("components/EmptyAnalysis.tsx");
  assert.match(empty, /const reset = useBonJour\(\(s\) => s\.reset\)/);
  assert.match(empty, /reset\(\);\s*router\.push\("\/onboarding"\)/);
  assert.match(empty, />\s*AI 뼈건강 분석 시작\s*</);
  // 홈·루틴·리포트가 공용 빈 상태를 사용
  for (const file of ["app/home/page.tsx", "app/routine/page.tsx", "app/report/page.tsx"]) {
    assert.match(read(file), /<EmptyAnalysis\s*\/>/, `${file} should render EmptyAnalysis`);
  }
});

test("back from the first survey question returns home", () => {
  const survey = read("app/survey/page.tsx");
  assert.match(survey, /if \(p === -1\) router\.push\("\/home"\)/);
});

test("report selector uses tested latest-first history and resets per user", () => {
  const report = read("app/report/page.tsx");
  assert.match(report, /import \{ useEffect, useState \} from "react"/);
  assert.match(report, /buildReportHistory/);
  assert.match(report, /clampReportSelection/);
  assert.match(report, /const activeId = useBonJour\(\(s\) => s\.activeId\)/);
  assert.match(report, /useEffect\(\(\) => \{\s*setSel\(0\);\s*\}, \[activeId, reports\?\.length\]\)/);
});

test("my page places the user selector at the right of the title row", () => {
  const mypage = read("app/mypage/page.tsx");
  // 공통 헤더 체계: PageHeader의 right 슬롯에 사용자 전환 버튼
  assert.match(
    mypage,
    /<PageHeader[\s\S]*?title="마이페이지"[\s\S]*?right=\{[\s\S]*?setSheetOpen\(true\)/
  );
});

test("analysis stores one report when strict mode re-runs effects", () => {
  const analysis = read("app/analysis/page.tsx");
  assert.match(analysis, /import \{ useEffect, useRef, useState \} from "react"/);
  assert.match(analysis, /const analysisStarted = useRef\(false\)/);
  assert.match(
    analysis,
    /if \(!analysisStarted\.current\) \{\s*analysisStarted\.current = true;\s*runAnalysis\(\);\s*\}/
  );
});

test("profile-add lets the user pick an avatar and saves it", () => {
  const profileAdd = read("app/profile-add/page.tsx");
  // 아바타 선택 UI: AVATARS 순회 + 선택 상태
  assert.match(profileAdd, /AVATARS\.map\(/);
  assert.match(profileAdd, /setAvatar\(/);
  // 저장: setProfileInfo에 avatar 포함
  assert.match(profileAdd, /setProfileInfo\(\{[\s\S]*?avatar/);
  // 표시 3곳은 저장된 아바타를 사용
  assert.match(read("app/mypage/page.tsx"), /avatarPose\(/);
  assert.match(read("components/ProfileSwitcher.tsx"), /avatarPose\(/);
});

test("profile switcher edit mode can update and remove users", () => {
  const store = read("lib/store.ts");
  assert.match(store, /updateProfile: \(id, patch\)/);
  assert.match(store, /removeProfile: \(id\)/);
  const switcher = read("components/ProfileSwitcher.tsx");
  assert.match(switcher, /profile-add\?edit=/);
  assert.match(switcher, /removeProfile/);
});
