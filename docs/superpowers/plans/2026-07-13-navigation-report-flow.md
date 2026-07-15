# Navigation, Report History, and Entry Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the bottom navigation across the app, route first-time users through signup and home before survey question 1, support latest-first report history selection, and move the My Page user selector to the top-right.

**Architecture:** Preserve the existing per-page `h-dvh` flex shell so only content scrolls while `TabBar` remains a non-shrinking final child. Extract route-to-active-tab and latest-first report selection into small JavaScript helpers that can be tested with Node's built-in test runner and consumed by TypeScript React components.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Zustand, Node built-in test runner.

## Global Constraints

- Keep the existing BonJour ivory, forest-green, Noto Sans KR, 390px mobile-frame visual language.
- Do not show the bottom tab bar on `/`, `/signup`, or `/survey`.
- Show one fixed 76px tab bar on all other page routes in scope.
- Keep report history per profile, latest first in the selector, with the latest selected by default.
- Keep the existing sessionStorage persistence and 20-report limit.
- Do not alter survey questions, prediction coefficients, or prescription rules.

---

### Task 1: Add testable navigation and report-history contracts

**Files:**
- Create: `lib/navigation.js`
- Create: `lib/reportHistory.js`
- Create: `tests/navigation.test.mjs`
- Create: `tests/reportHistory.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `activeTabForPath(pathname: string): string | null`
- Produces: `buildReportHistory(reports, latestResult): Array<{date: string, result: object}>`
- Produces: `clampReportSelection(selection: number, historyLength: number): number`

- [ ] **Step 1: Add `npm test` using `node --test tests/*.test.mjs`.**
- [ ] **Step 2: Write navigation tests asserting `/analysis` maps to `home`, `/simulator` to `report`, `/favorites` and `/profile-add` to `my`, and primary tab routes map to themselves.**
- [ ] **Step 3: Run `npm test` and verify failure because `lib/navigation.js` does not exist.**
- [ ] **Step 4: Implement `activeTabForPath` with an explicit auxiliary-route map and primary-route matching.**
- [ ] **Step 5: Run `npm test` and verify navigation tests pass.**
- [ ] **Step 6: Write report-history tests asserting latest-first reversal, current-result fallback, empty history, and safe selection clamping.**
- [ ] **Step 7: Run `npm test` and verify failure because `lib/reportHistory.js` does not exist.**
- [ ] **Step 8: Implement the minimal pure report-history helpers and verify all tests pass.**

### Task 2: Make bottom navigation fixed within every eligible page shell

**Files:**
- Modify: `components/TabBar.tsx`
- Modify: `app/onboarding/page.tsx`
- Modify: `app/checkup/page.tsx`
- Modify: `app/analysis/page.tsx`
- Modify: `app/simulator/page.tsx`
- Modify: `app/favorites/page.tsx`
- Modify: `app/profile-add/page.tsx`

**Interfaces:**
- Consumes: `activeTabForPath` from Task 1.
- Produces: one non-scrolling 76px `TabBar` as the final child of each eligible page.

- [ ] **Step 1: Add a failing source-contract test that eligible page files render `TabBar`, while splash, signup, and survey do not.**
- [ ] **Step 2: Run the test and confirm it fails on the currently missing pages.**
- [ ] **Step 3: Replace pathname equality in `TabBar` with `activeTabForPath` and change the nav container from sticky positioning to a `relative z-40 shrink-0` flex-shell footer.**
- [ ] **Step 4: Add `TabBar` as the final child to onboarding, checkup, simulator, favorites, and profile-add.**
- [ ] **Step 5: Convert analysis to an `h-dvh flex flex-col` shell, make its animation content `flex-1`, and append `TabBar`.**
- [ ] **Step 6: Run tests and `npx tsc --noEmit` and confirm both pass.**

### Task 3: Update signup-to-home and home-to-survey flow

**Files:**
- Modify: `app/signup/page.tsx`
- Modify: `app/home/page.tsx`
- Modify: `app/survey/page.tsx`

**Interfaces:**
- Consumes: Zustand `reset()` without clearing `reports`.
- Produces: signup → `/home`; home CTA → reset then `/survey`; first survey back → `/home`.

- [ ] **Step 1: Add a failing source-contract test for the three required destinations and the home reset call.**
- [ ] **Step 2: Run the test and confirm it fails on the current onboarding destinations.**
- [ ] **Step 3: Route signup completion to `/home`.**
- [ ] **Step 4: Rename the empty-home CTA to `AI 뼈건강 분석 시작`, call `reset()`, and route directly to `/survey`.**
- [ ] **Step 5: Route back from survey question 1 to `/home`.**
- [ ] **Step 6: Run all tests and TypeScript validation.**

### Task 4: Complete report-date selection behavior

**Files:**
- Modify: `app/report/page.tsx`

**Interfaces:**
- Consumes: `buildReportHistory` and `clampReportSelection` from Task 1.
- Produces: a latest-first date selector that resets to index `0` when active user or history changes.

- [ ] **Step 1: Add a failing source-contract test requiring `useState`, latest-first helpers, and selection reset behavior.**
- [ ] **Step 2: Run the test and confirm the current missing `useState` import or reset behavior fails.**
- [ ] **Step 3: Import `useState`, consume the tested history helpers, and reset `sel` to `0` when `activeId` or report count changes.**
- [ ] **Step 4: Keep the existing top-right date select styling and ensure the current selected result drives every report section.**
- [ ] **Step 5: Run all tests and TypeScript validation.**

### Task 5: Move My Page user selector to the title row

**Files:**
- Modify: `app/mypage/page.tsx`

**Interfaces:**
- Produces: title-left/user-selector-right header while preserving `ProfileSwitcher` behavior.

- [ ] **Step 1: Add a failing source-contract test requiring the title and selector in one `justify-between` header row.**
- [ ] **Step 2: Run the test and confirm it fails against the current vertically stacked header.**
- [ ] **Step 3: Move the existing user selector into the title row, remove its bottom margin, and keep the subtitle below.**
- [ ] **Step 4: Run tests and TypeScript validation.**

### Task 6: Full verification and visual review

**Files:**
- Modify only files needed to fix failures discovered by verification.

**Interfaces:**
- Produces: buildable, visually verified local app.

- [ ] **Step 1: Run `npm test`. Expected: all tests pass with zero failures.**
- [ ] **Step 2: Run `npx tsc --noEmit`. Expected: exit code 0.**
- [ ] **Step 3: Run `npm run build`. Expected: optimized production build completes successfully.**
- [ ] **Step 4: Start the local app and inspect splash, signup, home, survey, report, routine, simulator, favorites, profile-add, analysis, and mypage at the 390px frame width.**
- [ ] **Step 5: Confirm no tab bar is duplicated, clipped, scrolls away, or covers a CTA.**
- [ ] **Step 6: Confirm report selection and profile switching reset to the latest report.**
