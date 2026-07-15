# 분석 결과 없을 때 빈 상태 통일 설계

날짜: 2026-07-14
상태: 사용자 승인됨

## 배경 / 문제

- 분석 결과(result)가 없을 때 AI 루틴·리포트 탭은 `/survey`로 강제 리다이렉트되어, 탭을 눌렀는데 설문이 튀어나오는 어색한 흐름이다.
- 홈에는 이미 좋은 빈 상태(본이 + "아직 측정한 데이터가 없어요" + [AI 뼈건강 분석 시작])가 있다.
- 마이페이지의 '오늘의 맞춤 루틴' 카드는 결과가 없어도 체크리스트를 보여준다.

## 목표

- 루틴·리포트 탭도 홈과 동일한 빈 상태를 보여주고, 탭바를 유지해 자유롭게 이동할 수 있게 한다.
- 마이페이지 루틴 카드는 결과 없을 때 측정 유도 카드로 바뀌고, 탭하면 바로 분석 시작으로 이동한다.

## 컴포넌트: `components/EmptyAnalysis.tsx` (신규)

홈의 기존 빈 상태 블록을 그대로 추출:

- `Boni pose="point" size={130}`
- 제목 22px bold: "아직 측정한 데이터가 없어요"
- 보조 16px graytext: "30초 설문이면 내 뼈 건강을\n확인할 수 있어요"
- `btn-primary` 버튼 "AI 뼈건강 분석 시작" — 클릭 시 `reset()` 후 `router.push("/onboarding")`
- 래퍼: `flex-1 flex flex-col items-center justify-center text-center`
- store(`useBonJour`)의 `reset`과 `useRouter`는 컴포넌트 내부에서 취득 (props 없음)

## 화면별 적용

| 화면 | 변경 |
|---|---|
| 홈 `app/home` | 기존 인라인 빈 상태 블록을 `<EmptyAnalysis />`로 교체 (시각 변화 없음) |
| AI 루틴 `app/routine` | `router.replace("/survey")` 리다이렉트 effect 제거. `!result`면 콘텐츠 영역에 `<EmptyAnalysis />` (PageHeader "AI 루틴" + TabBar 유지) |
| 리포트 `app/report` | 리다이렉트 effect 제거. `!latestResult || history.length === 0`면 콘텐츠 영역에 `<EmptyAnalysis />` (PageHeader 유지, 날짜 드롭다운은 결과 있을 때만, TabBar 유지) |
| 마이페이지 `app/mypage` | '오늘의 맞춤 루틴' 카드: `result` 없으면 카드 전체가 버튼 — 문구 "뼈건강 데이터를 측정하면 맞춤 루틴을 알려드려요" + 우측 '분석 시작하기 ›'(forest), 탭 시 `reset()` 후 `/onboarding`. 체크리스트·'전체 보기'는 결과 있을 때만 |
| 시뮬레이터 | 변경 없음 (리다이렉트 유지 — 리포트에서만 진입) |

## 구현 제약

- 계약 테스트 "eligible pages render exactly one bottom tab bar"가 **파일당 `<TabBar />` 소스 1개**를 검사 → 각 페이지는 단일 return + 조건부 콘텐츠 구조로 작성 (분기별 TabBar 중복 금지).
- 문구는 홈 기존 문구 그대로. 신규 문구는 마이페이지 카드 2건("뼈건강 데이터를 측정하면 맞춤 루틴을 알려드려요", "분석 시작하기")만.
- `hydrated` 전에는 기존처럼 `return null` 유지.

## 검증

- `npx tsc --noEmit`, `npm run build`, `npm test` (기존 실패 2건 pre-existing 유지 — 단, 이 작업으로 home의 `reset(); router.push("/onboarding")` 블록이 EmptyAnalysis로 이동하므로 pre-existing 실패 중 "empty home starts a fresh analysis at survey question one" 테스트의 매치 대상이 홈에서 사라짐 → 해당 테스트는 이미 실패 중이었고 이 작업 범위 밖이지만, 실패 사유가 달라질 수 있음을 인지)
- dev 서버: 결과 없는 상태에서 루틴·리포트 탭 → 빈 상태 + 탭바 확인, 마이 카드 탭 → 온보딩 이동, 결과 있는 상태(설문 완료 후) → 기존 화면 그대로
