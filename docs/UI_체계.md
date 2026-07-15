# 본주르(BonJour) UI 체계

> 디자인 원본: Claude Design "BonJour Screens" · 구현: Tailwind CSS 토큰
> 이 문서가 화면을 새로 만들거나 수정할 때의 기준입니다.

---

## 1. 컬러

| 토큰 | HEX | 용도 |
|---|---|---|
| `forest` | `#3E7A4E` | 메인 버튼, 강조 텍스트, 활성 탭, 로고 |
| `green` | `#5B9A6B` | 보조 그린, 그래프 |
| `ivory` | `#FAF6EC` | 화면 배경 (기본) |
| `lightgreen` | `#E8F0E3` | 연한 배경, 아이콘 타일, 선택 상태, 보조 버튼 |
| `gold` | `#D9A441` | 포인트 (BonJour 로고, 개선 배지, 주의 등급) |
| `charcoal` | `#2B2B2B` | 본문·제목 텍스트 |
| `graytext` | `#6B6B6B` | 보조 텍스트, 비활성 탭 |
| `borderline` | `#D8D8D0` | 입력 필드 테두리, 구분선 |
| `good / warn / danger` | `#3E7A4E / #D9A441 / #C7503A` | 등급 신호등 (좋음/주의/관리 필요) |

보조 색 (토큰 외 직접 사용):
- 제휴 배지: 글자 `#8C5A1E` / 배경 `#FBF3E2` / 테두리 `#E8C87A`
- 리스트 행 구분선: `#F0EEE6` · 휠 피커 흐린 글자: `#9A968A`, `#C9C5B8`

## 2. 타이포그래피

- 폰트: **Noto Sans KR** (400/500/700) — `app/layout.tsx`에서 로드
- 시니어 친화: 본문 최소 16px, 이보다 작은 본문 금지 (보조 라벨 13~15px 허용)

| 역할 | 크기/굵기 | 예 |
|---|---|---|
| 페이지명(헤더) | **24px Bold, 한 줄 고정** (`whitespace-nowrap truncate`) | 마이페이지, 내 뼈 건강 리포트 |
| 설문 질문 | 30px Bold (7~10번 문항 28px) | 나이를 알려주세요 |
| 섹션 제목 | 19~23px Bold | 가까운 곳에서 시작해보세요 |
| 카드 제목 | 20~22px Bold | 검진표 사진 찍기 |
| 본문 | 18px | 안내 문구 |
| 보조/힌트 | 14~16px graytext | 만 나이는 자동으로 계산돼요 |
| 버튼(주요 CTA) | 22px Bold | 다음, 가입하기 |
| 탭바 라벨 | 12px (활성 시 Bold+forest) | 홈, AI 루틴 |

## 3. 간격 · 모서리

| 토큰 | 값 | 용도 |
|---|---|---|
| `px-gutter` | 28px | 화면 좌우 패딩 (고정) |
| `pt-safetop` | safe-area + 12px | 화면 상단 여백 (노치 대응) |
| `h-touch` | 64px | 주요 버튼/입력 높이 (터치 영역) |
| `rounded-btn` | 16px | 버튼 |
| `rounded-card` | 20px | 카드 |
| `rounded-field` | 16px | 입력 필드·선택 버튼 |
| `rounded-chip` | 12px | 배지·칩·진행바 |
| `rounded-pill` | 999px | 시작하기 CTA, 탭 필터, 사용자 선택 |

카드 그림자: `shadow-[0_1px_6px_rgba(0,0,0,0.06)]`

## 4. 화면 레이아웃 규칙 (표준)

모든 화면은 아래 3단 구조를 따른다:

```tsx
<div className="h-dvh bg-ivory flex flex-col">
  {/* ① 상단 고정 — 페이지명은 반드시 한 줄 */}
  <div className="shrink-0 pt-safetop pb-3 px-gutter"> ... </div>

  {/* ② 콘텐츠 — 여기만 스크롤 */}
  <div className="flex-1 overflow-y-auto px-gutter pb-4 flex flex-col [&>*]:shrink-0"> ... </div>

  {/* ③ 하단 고정 — 탭바 또는 주요 CTA */}
  <div className="shrink-0 px-gutter pt-3 pb-8"> CTA </div>  {/* 또는 <TabBar /> */}
</div>
```

핵심 원칙:
1. **`h-dvh`** 사용 (모바일 주소창 변화 대응) — `min-h-screen`으로 전체 페이지 스크롤 금지
2. 페이지명은 **24px Bold 한 줄** — 말풍선·캐릭터 등 헤더를 키우는 장식 요소 금지
3. 스크롤 컨테이너 자식에 `[&>*]:shrink-0` — 인풋/버튼이 눌려 찌그러지는 것 방지
4. 하단 CTA는 `btn-primary`(64px 포레스트) 하나만, 보조 액션은 그 아래 작은 텍스트 링크

### 헤더 유형
| 유형 | 구성 | 사용 화면 |
|---|---|---|
| 페이지명형 | 제목 (+ 우측 액션) | 홈, 마이(우측 사용자 선택), 리포트(우측 날짜 드롭다운), 우리동네, AI 루틴 |
| 플로우형 | ← 뒤로가기 + 제목 | 회원가입, 프로필 추가, 관심, 시뮬레이터 |
| 설문형 | ← + 진행바("N / 10 단계") + 본이 52px | 설문, 검진(3/5 단계) |

### 하단 탭바 (`components/TabBar.tsx`)
- 높이 76px, 흰 배경, 상단 보더, 5열: **홈 / AI 루틴 / 우리동네 / 리포트 / 마이**
- 활성: forest + Bold, 비활성: graytext
- **설문(/survey)·회원가입(/signup)·스플래시(/)를 제외한 모든 페이지에 고정**
- 로딩 화면(분석중·인식중)과 카메라 화면은 몰입형 → 탭바 없음

## 5. 컴포넌트 카탈로그

| 컴포넌트 | 파일 | 용도 · 규칙 |
|---|---|---|
| `Boni` | components/Boni.tsx | 마스코트 이미지. pose: hello/point/think/heart/heart2/wink/speak/greet, `size`=높이px |
| `TabBar` | components/TabBar.tsx | 하단 탭 5개 (위 규칙) |
| `ProgressBar` | components/ProgressBar.tsx | "N / M 단계" + 10px 트랙 |
| `ScreenFrame` | components/ScreenFrame.tsx | 설문형 헤더+스크롤+고정 푸터 골격 |
| `LocalSection` | components/LocalSection.tsx | 우리동네 섹션 (GPS 보건소 + 제휴 카드) — 루틴/우리동네 공용 |
| `PostcodeSearch` | components/PostcodeSearch.tsx | 카카오 우편번호 바텀시트 |
| `ProfileSwitcher` | components/ProfileSwitcher.tsx | 사용자 전환 바텀시트 |
| `BoneScoreGauge` / `FactorBar` | components/ | 리포트 게이지·요인 바 |

### 버튼 클래스 (globals.css)
| 클래스 | 스타일 | 용도 |
|---|---|---|
| `.btn-primary` | 64px, forest 배경, 흰 글자 22px Bold | 화면당 1개 주요 CTA |
| `.btn-secondary` | 64px, lightgreen 배경, forest 글자 | 보조 액션 (음성 말하기 등) |
| `.choice` / `.choice-selected` | 흰 배경 2px 보더 → 선택 시 lightgreen+forest 보더+Bold+체크 | 설문 선택지 |
| `.field` | 60~64px 흰 입력, borderline 2px, 포커스 forest | 텍스트 입력 |

### 공통 패턴
- **아이콘 타일**: 64px(카드) / 36px(스몰) `rounded-field bg-lightgreen` + forest 스트로크 SVG(2.4~2.6)
- **배지**: 무료(lightgreen/forest) · 제휴(#FBF3E2/#8C5A1E) · 자동(흰/forest+체크) · 직접 입력(#FBF3E2/#8C5A1E+연필)
- **바텀시트**: 딤 `rgba(43,43,43,.45)` + 흰 시트 `rounded-t-[24px]` + 상단 핸들
- **토스트**: charcoal 필, 하단 98px 중앙, 1.6초

## 6. 인터랙션 규칙

| 규칙 | 내용 |
|---|---|
| 디폴트값 | 숫자 설문은 디폴트 자동 입력 → [다음] 처음부터 활성 (나이65·키160·몸무게70·폐경50·초경14) |
| 스텝퍼 | +/− 길게 누르면 0.45초 후 초당 ~14 연속 증감, 길게눌러도 OS 메뉴 안 뜸 |
| 선택형 설문 | 선택만으로 이동하지 않음 — [다음] 눌러야 진행 |
| press 피드백 | 모든 버튼 `active:brightness-95` |
| 비활성 | `disabled:opacity-40` (또는 70) + cursor-not-allowed |
| 포커스 | `:focus-visible` forest 3px 아웃라인 (키보드 접근성) |
| 모션 최소화 | `prefers-reduced-motion` 존중 (globals.css) |
| 로딩 | 스피너: forest 보더 링 `animate-spin` / 분석: 진행률 링(호가 채워짐) |

## 7. 에셋

| 파일 (public/) | 용도 |
|---|---|
| `boni-hello/point/think/heart/heart2/wink/speak/greet.png` | 마스코트 포즈 (투명 PNG) |
| `logo-vertical.png` | 스플래시 세로 로고 |
| `splash.mp4` | 인트로 영상 (H.264, 세션당 1회) |

포즈 사용처: point=설문·안내 / think=분석중 / hello=인식중·아바타·빈상태 / heart·heart2=응원 / wink=시뮬레이터 / speak=음성모드

## 8. 새 화면 체크리스트

- [ ] `h-dvh` 3단 구조 (고정 헤더 / 스크롤 / 고정 하단)
- [ ] 페이지명 24px Bold **한 줄** (`whitespace-nowrap truncate`)
- [ ] 탭바 포함 여부 확인 (설문·회원가입·로딩·카메라만 제외)
- [ ] 좌우 `px-gutter`, 상단 `pt-safetop`
- [ ] 본문 16px 이상, 터치 영역 최소 44px (주요 버튼 64px)
- [ ] 색·모서리는 반드시 토큰 사용 (임의 HEX 금지, 예외는 §1 보조 색)
- [ ] 스크롤 컨테이너에 `[&>*]:shrink-0`
- [ ] 버튼 press/disabled 상태 처리
