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

// ── 8/11 업데이트에서 가져온 음성 흐름 계약 ──────────────────

test("홈에서 분석을 시작하면 답변 방식 선택 화면을 먼저 거친다", () => {
  // 분석 시작 CTA는 공용 EmptyAnalysis 컴포넌트에 있고, 온보딩(답변 방식 선택)으로 보낸다
  const home = read("app/home/page.tsx");
  assert.match(home, /<EmptyAnalysis/);
  assert.doesNotMatch(
    home,
    /router\.push\("\/survey"\)/,
    "홈에서 설문으로 직행하면 답변 방식을 고를 기회가 사라진다"
  );
  const empty = read("components/EmptyAnalysis.tsx");
  assert.match(empty, /router\.push\("\/onboarding"\)/);
  assert.doesNotMatch(empty, /router\.push\("\/survey"\)/);
});

test("답변 방식 선택 화면이 손·음성 두 가지를 모두 설정한다", () => {
  const onboarding = read("app/onboarding/page.tsx");
  assert.match(onboarding, /choose\("hand"\)/);
  assert.match(onboarding, /choose\("voice"\)/);
  assert.match(onboarding, /router\.push\("\/survey"\)/);
});

test("설문 안에서도 답변 방식을 바꿀 수 있다", () => {
  const survey = read("app/survey/page.tsx");
  assert.match(survey, /setAnswerMode\("voice"\)/);
  assert.match(survey, /setAnswerMode\("hand"\)/);
});

test("설문 없이 분석 화면에 들어오면 가짜 분석 대신 온보딩으로 보낸다", () => {
  const analysis = read("app/analysis/page.tsx");
  assert.match(analysis, /router\.replace\("\/onboarding"\)/);
  // 가드가 runAnalysis 보다 먼저 와야 한다
  const guardIdx = analysis.indexOf('router.replace("/onboarding")');
  const runIdx = analysis.indexOf("runAnalysis()");
  assert.ok(guardIdx !== -1 && guardIdx < runIdx, "가드가 분석 실행보다 앞서야 한다");
});
