# 프로필 수정/삭제 + UI 폴리시 6건 설계

날짜: 2026-07-14
상태: 사용자 승인됨 (전 항목 추천안 채택)

## 1. 빈 상태 버튼 폭

- `components/EmptyAnalysis.tsx` 루트 div에 `px-gutter` 추가.
- 근거: 홈은 패딩 컨테이너 안, 루틴·리포트는 무패딩 컬럼 직속이라 버튼(`btn-primary`=w-full)이 화면 끝까지 참. 세 화면 모두 콘텐츠 폭(양쪽 28px)으로 통일.

## 2. 사용자 수정/삭제

### 스토어 (`lib/store.ts`)
- `updateProfile(id: string, patch: Partial<ProfileData>): void` — 해당 id 프로필에 patch 적용, 그 프로필이 활성이면 mirror도 갱신.
- `removeProfile(id: string): void` — 목록에서 제거. `id === "me"`(본인)면 무시. 삭제 대상이 활성이면 활성은 `"me"`로 전환(mirror 갱신).

### 공용 다이얼로그 (`components/Dialog.tsx` 신규)
- props: `open: boolean; message: string; confirmLabel?: string("확인"); cancelLabel?: string(없으면 확인만); onConfirm: () => void; onCancel?: () => void`
- 딤(rgba(43,43,43,.45)) + 중앙 흰 카드(rounded-card, px-6 py-7) + 메시지(18px charcoal, 중앙, break-keep) + 버튼 행(취소=lightgreen/forest, 확인=forest/white, h-touch). z-60 (전환 시트 z-50 위).

### 전환 시트 편집 모드 (`components/ProfileSwitcher.tsx`)
- 기존 연필 버튼(현재 무동작)이 `editing` state 토글. 편집 모드에서 헤더 버튼은 텍스트 "완료"(forest bold)로.
- 편집 모드의 행: 아바타+이름 그대로, 행 탭(전환) 비활성. 우측에
  - [연필] → `router.push("/profile-add?edit=" + p.id)` 후 onClose
  - [휴지통] → 확인 다이얼로그 "'{이름}'님을 삭제할까요? 기록도 함께 삭제돼요" → 확인 시 `removeProfile(id)`. **본인(`relation === "본인"`) 행에는 휴지통 미표시.**
- 일반 모드는 기존 동작(행 탭 = 전환) 유지.

### 프로필 수정 화면 (`app/profile-add/page.tsx` 편집 모드)
- `useSearchParams()`의 `edit` 파라미터가 있으면 편집 모드:
  - PageHeader 제목 "사용자 정보 수정", 인트로 문구 유지
  - 대상 프로필 값 프리필: name, gender, birth("YYYY-MM-DD" 파싱→year/month/day, 없으면 기존 기본값), region→addr, avatar
  - 버튼 라벨 "저장하기" → `updateProfile(id, { name, gender, birth, region, avatar })` → 다이얼로그 "수정되었습니다" → 확인 시 `/mypage` 이동
  - 편집 모드에선 "데모용 빠르게 채우기" 숨김
- `useSearchParams` 사용에 따른 Suspense 경계 필요 시 페이지를 `<Suspense>`로 감싼 래퍼 구성 (Next 14 CSR bailout 대응).

## 3. 아바타 스크롤 피크

- 선택지 스크롤 컨테이너를 풀블리드로: `-mx-gutter px-gutter` 추가 → 5번째 원이 화면 우측 끝에 걸쳐 잘려 보임(스크롤 어포던스).

## 4. 아바타 얼굴 확대 — 공용 `Avatar` 컴포넌트

- `components/Avatar.tsx` 신규: `Avatar({ pose, size, className?, ring? })`
  - `<span>` 원형(bg-lightgreen, overflow-hidden, `items-start justify-center`) + 내부 `<Boni size={round(size*1.4)}>` → 머리~상반신 크롭.
  - `ring`(boolean)은 선택 테두리용(border-forest 2.5px) — 픽커/전환 시트 활성 표시에 사용.
- 적용처(기존 원형 마크업 대체): 프로필 추가 픽커(64), 마이페이지 헤더 칩(30 컨테이너), 마이페이지 프로필 카드(52 컨테이너), 전환 시트 행(56 컨테이너). 기존 컨테이너 지름 유지, 내부 크롭만 변경.

## 5. 추가 완료 얼럿 + 마이페이지 유지

- profile-add 신규 모드 submit: `addProfile` + `setProfileInfo({avatar, gender, birth, region})` 후 **onboarding 이동 제거** → 다이얼로그 "사용자가 추가되었습니다" → 확인 시 `router.push("/mypage")`.
- 새 프로필이 활성이므로 마이페이지에는 측정 유도 카드가 노출되어 설문 유도가 이어짐.

## 6. 우리동네 부제목 한 줄

- `components/LocalSection.tsx` 서브 문구: "AI가 추천한 운동을 근처에서 할 수 있어요" → **"AI 추천 운동을 근처에서"** (18px 기준 본이 76px 옆 한 줄 확정 폭). 루틴 하단 동일 섹션에도 자동 적용.

## 범위 밖

- 회원가입(본인) 아바타 선택, 프로필 사진 업로드, 전화번호 저장(현재도 미저장 — 편집 폼에서 프리필 없음 유지)

## 검증

- `npx tsc --noEmit` / `npm run build` / `npm test` (계약 테스트 유지 — profile-add 아바타 테스트의 `setProfileInfo({...avatar` 매치가 신규 모드 코드에 남는지 확인)
- dev 확인 시나리오: ① 루틴·리포트 빈 상태 버튼 폭 = 홈과 동일 ② 전환 시트 편집 모드 → 수정 화면 프리필·저장 → 마이 반영 ③ 삭제 확인 다이얼로그·본인 삭제 불가·활성 삭제 시 본인 전환 ④ 픽커 5번째 원 피크 ⑤ 아바타 4곳 얼굴 크롭 ⑥ 새 사용자 추가 → 얼럿 → 마이페이지 ⑦ 우리동네 부제목 한 줄
