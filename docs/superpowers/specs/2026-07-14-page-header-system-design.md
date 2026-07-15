# 앱 공통 헤더 체계 (PageHeader) 설계

날짜: 2026-07-14
상태: 사용자 승인됨

## 배경 / 문제

- 페이지마다 헤더를 손으로 만들어 페이지명 크기(22px/24px), 뒤로가기 유무·스타일, 구성이 제각각이다.
- 설문 화면(`app/survey/page.tsx` + `components/ScreenFrame.tsx`)은 페이지명이 없고,
  페이지명이 놓일 자리에 진행바("1 / 10 단계")가 들어가 "여기가 무슨 화면인지"를 알 수 없어 어색하다.

## 목표

- 모든 화면의 상단 첫 줄을 하나의 공통 컴포넌트(`PageHeader`)로 통일해 체계를 코드로 강제한다.
- 설문 화면에 페이지명("건강 설문")을 부여하고, 진행바는 헤더 아래 별도 줄로 분리한다.

## 헤더 규칙

1. 모든 화면의 첫 줄은 `PageHeader` 한 가지: `[뒤로가기?] [페이지명] [우측 슬롯?]`
2. 페이지명은 **24px bold, text-charcoal**로 통일 (기존 22px 사용처도 24px로 승격).
3. 페이지명 자리에는 "화면 이름"만 — 단계·상태·진행 표시를 넣지 않는다.
4. 탭 루트(홈·AI 루틴·우리동네·마이페이지)는 뒤로가기 없음. 하위 페이지는 뒤로가기 있음.
5. 진행바·날짜 드롭다운 등 보조 UI는 헤더 **아래 별도 줄**로 렌더한다.
6. 예외: 스플래시(`app/page.tsx`), 온보딩, AI 분석 중 등 풀스크린 상태 화면은 헤더 없이 유지한다.

## 컴포넌트 설계

### 신규: `components/PageHeader.tsx`

```tsx
export default function PageHeader({
  title,      // 필수: 페이지명
  back,       // 선택: true면 뒤로가기 표시 (기본 router.back())
  onBack,     // 선택: 뒤로가기 동작 대체 (예: 회원가입 → "/")
  subtitle,   // 선택: 제목 아래 보조줄 (홈 인사말 "오늘도 뼈 건강 함께 챙겨요")
  right,      // 선택: 우측 슬롯 ReactNode (마이페이지 사용자 전환 등)
}: { ... })
```

- 레이아웃: `shrink-0 flex items-center gap-3 px-gutter pt-safetop pb-3`
- 뒤로가기: 기존 ScreenFrame의 26px 셰브론 SVG·터치영역(`w-8 h-11 -ml-1`)을 그대로 이동.
- 제목: `text-[24px] font-bold text-charcoal whitespace-nowrap truncate`, `flex-1`
- subtitle: 제목 아래 `text-[15px] text-graytext` (홈 전용 패턴, subtitle 있으면 2줄 블록)

### 변경: `components/ScreenFrame.tsx`

- `title?: string` prop 추가 → 헤더 줄을 `PageHeader`로 렌더 (back/onBack 위임).
- `progress`가 있으면 헤더 **아래** 줄에 `[ProgressBar flex-1] [Boni 52px]` 렌더.
- `boni` prop은 진행바 줄 우측에서만 사용 (헤더에서 제거).

### 유지: `components/ProgressBar.tsx`

- "N / M 단계" 텍스트 + 트랙 그대로. 위치만 헤더 아래 줄로 이동.

## 페이지별 적용

| 페이지 | 구성 |
|---|---|
| 홈 `app/home` | title=인사말(동적) + subtitle |
| AI 루틴 `app/routine` | title="AI 루틴" |
| 우리동네 `app/local` | title="우리동네" |
| 마이페이지 `app/mypage` | title="마이페이지" + right=사용자 전환 |
| 즐겨찾기 `app/favorites` | back + title |
| 시뮬레이터 `app/simulator` | back + title |
| 검진 입력 `app/checkup` | back + title (단계별 헤더 있는 화면 전부) |
| 프로필 추가 `app/profile-add` | back + title |
| 회원가입 `app/signup` | back(onBack→`/`) + title |
| 리포트 `app/report` | title="내 뼈 건강 리포트", 날짜 드롭다운은 헤더 아래 줄 유지 |
| 설문 `app/survey` | back + title="건강 설문" + 진행바 줄(본이 우측) |
| 온보딩 / AI 분석 | 헤더 없음 (풀스크린 예외) |

## 설문 화면 목표 레이아웃

```
┌─────────────────────┐
│ <  건강 설문          │  ← PageHeader
│ 3 / 10 단계     본이  │  ← 진행바 줄 (텍스트+트랙 flex-1, 본이 52px 우측)
│ ████████░░░░░░░      │
├─────────────────────┤
│ 하루에 우유나 치즈를…?  │  ← 질문(콘텐츠)
└─────────────────────┘
```

## 검증

- `npm run dev`로 전 화면 육안 확인 (Playwright 스크린샷 활용 가능).
- 기존 `tests/*.test.mjs`는 lib 로직 테스트로 영향 없음 — 통과 확인만 수행.
