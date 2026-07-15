# 새 캐릭터 에셋 전면 적용 설계

날짜: 2026-07-14
상태: 사용자 승인됨

## 배경 / 문제

- 확정된 새 캐릭터 에셋 13종이 `/Users/chaewon/bonjour/design/캐릭터에셋/`에 있다 (1024px급 PNG, 장당 ~1.5MB).
- 기존 마스코트는 `components/Boni.tsx`가 `public/boni-<pose>.png` 8종을 렌더하는 구조. 전부 새 에셋으로 교체한다.
- 작은 자리는 얼굴만 나온 에셋(`얼굴만있음_웃는모습.png`)을 사용한다.
- 캐릭터가 없던 화면(AI 루틴, 우리동네)도 새 캐릭터로 장식한다.

## 에셋 현황 (검증 완료)

- 12종은 실제 투명 배경 (투명 픽셀 63~80%).
- **`본이엄마.png`만 체커보드 무늬가 픽셀로 박혀 있음** (alpha 없음) → PIL로 체커보드 제거 후 사용. 아바타 크기(24~64px)에서는 품질 문제 미미하나, 장기적으로 누끼 재내보내기 권장.

## 에셋 파이프라인

PIL(11.3.0 설치 확인됨) 스크립트로 일괄 처리해 `public/`에 저장:

1. (본이엄마만) 체커보드 배경 제거 — 가장자리에서 체커 색(흰/연회색 격자)만 플러드필로 투명화
2. 투명 여백 트림 (bounding box crop)
3. 높이 320px로 리사이즈 (최대 표시 130px의 2배 이상 확보, 가로형 `앉아서확성기`는 가로 480px 기준)
4. PNG 최적화 저장 → `public/boni-<pose>.png`
5. 기존 `public/boni-*.png` 8종(greet, heart, heart2, hello, point, speak, think, wink) 삭제 후 새 파일로 대체

## 포즈 체계 (BoniPose 재정의, 13종)

| pose | 에셋 파일 | 용도 |
|---|---|---|
| `hello` | 반가운인사포즈.png | 인사 |
| `point` | 확성기왼쪽.png | 안내·설명 |
| `speak` | 앉아서확성기왼쪽.png | 음성 모드 (가로형) |
| `think` | 연구중모습.png | 분석·인식 중 |
| `aha` | 아하느낌표모습.png | 시뮬레이터 |
| `heart` | 하트든모습.png | 관심·즐겨찾기 |
| `praise` | 최고칭찬모습.png | 칭찬·루틴 |
| `face` | 얼굴만있음_웃는모습.png | 작은 칩·아바타 기본 |
| `dad` | 본이아빠.png | 프로필 아바타 |
| `mom` | 본이엄마.png | 프로필 아바타 |
| `run` | 달리기운동.png | 우리동네 |
| `lift` | 역기들고운동.png | 루틴 운동 섹션 |
| `curious` | 궁금한표정.png | 검진 촬영 |

`Boni.tsx`는 API(`pose`/`size`/`className`) 유지, `BoniPose` 유니온과 `LABEL`(접근성 라벨)만 위 13종으로 교체. 제거되는 포즈: `wink`, `greet`, `heart2`.

## 사용처 매핑 (기존 13곳 교체)

| 파일:위치 | 기존 | 신규 |
|---|---|---|
| `app/home/page.tsx:171` (130) | point | `point`(확성기) — 파일 교체로 해결 |
| `app/onboarding/page.tsx:43` (58) | point | `point` |
| `components/ScreenFrame.tsx:45` (52, 설문 터치) | point | `point` |
| `app/survey/page.tsx:226` (64, 음성) | speak | `speak`(앉아서확성기) |
| `app/analysis/page.tsx:70` (122) | think | `think`(연구중) |
| `app/checkup/page.tsx:266` (130, OCR 인식 중) | hello | `think` |
| `app/checkup/page.tsx:306` (46, 촬영 헤더) | point | `curious` |
| `app/simulator/page.tsx:185` (66) | wink | `aha` |
| `app/favorites/page.tsx:68` (120) | hello | `heart` |
| `app/mypage/page.tsx:46` (24, 헤더 칩) | hello | 활성 프로필 avatar (아래 규칙) |
| `app/mypage/page.tsx:74` (43, 프로필 카드) | hello | 활성 프로필 avatar |
| `components/ProfileSwitcher.tsx:85` (44) | hello/point | 각 프로필 avatar (active 여부 무관) |
| `app/report/page.tsx:169` (22) | hello | `face` |

## 신규 장식 (3곳)

- **AI 루틴 상단**: 페이지 헤더 아래/루틴 헤드라인 옆에 `praise` (최고칭찬) — "오늘도 실천해주셔서 멋져요" 톤
- **AI 루틴 하단 안내문 옆**: `lift` (역기들고운동)
- **우리동네 상단**: "가까운 곳에서 시작해보세요" 섹션 옆에 `run` (달리기운동)

배치는 기존 카드 레이아웃을 해치지 않는 보조 장식(56~80px, 텍스트 옆 or 카드 우측)으로 한다.

## 프로필 아바타 선택

- **데이터**: `ProfileData.avatar?: string` 필드 추가 (`lib/types.ts`). 값은 아바타 포즈 id. 미설정·기존 프로필은 `face` 폴백.
- **프로필 추가 화면(`app/profile-add`)**: 폼 맨 위 "프로필 이미지" 섹션 신설 — 원형 선택지 6개(`face`·`dad`·`mom`·`hello`·`heart`·`praise`)를 가로 스크롤 배치. 64px 원, `bg-lightgreen` 배경, 선택 시 `border-forest` 2.5px 테두리(사용자 전환 시트와 동일 문법). 기본 선택 `face`. 저장은 `addProfile` 후 `setProfileInfo({ avatar, ... })`.
- **표시 반영**: 마이페이지 헤더 칩(24)·프로필 카드(43)·사용자 전환 시트(44)에서 `profile.avatar ?? "face"` 사용. 사용자 전환 시트의 기존 active/비active 포즈 구분(hello/point)은 제거하고 아바타로 통일(활성 표시는 기존 테두리 유지).
- 본인(첫 프로필)은 회원가입에 선택 UI가 없으므로 `face` 기본. 아바타 편집 기능은 이번 범위 밖.

## 범위 밖

- 스플래시 영상(`스플래시화면.MOV`) 교체
- 앱 로고·아이콘 교체 (`design/` 루트의 로고 에셋)
- 프로필 아바타 편집(기존 프로필 변경) UI

## 검증

- 에셋 처리 결과: 각 파일 < 150KB, 투명 배경 유지, 트림 후 종횡비 자연스러움 (스크립트 출력으로 확인)
- `npx tsc --noEmit` / `npm run build` 통과, `npm test` 기존 통과 테스트 유지 (기존 실패 2건은 이번 작업과 무관한 pre-existing)
- dev 서버에서 화면별 이미지 로드(200) 및 alt 라벨 확인, 프로필 추가 → 아바타 선택 → 마이페이지/전환 시트 반영 흐름 확인
