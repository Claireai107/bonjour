# 본주르 (BonJour) — AI 골다공증 위험 예측 & 웰에이징 플랫폼

40~60대 여성 타깃, 시니어 친화 모바일 웹앱. 30초 설문(+선택 건강검진)으로 뼈 건강 위험을 예측하고, 위험요인 → 맞춤 운동 처방 → 지역 자원 연계까지 이어주는 MVP.

디자인 스펙 v1.2 / 운동처방 매핑테이블 / 중간보고서를 그대로 구현했습니다.

---

## 빠른 시작 (VS Code)

```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 실행
npm run dev

# 3. 브라우저에서 열기
# http://localhost:3000
```

> 데스크톱 브라우저에서 열어도 가운데 390×844 모바일 프레임으로 보입니다.
> 실제 폰처럼 보려면 크롬 개발자도구(F12) → 기기 툴바(Ctrl+Shift+M) → iPhone 등 선택.

빌드/배포:
```bash
npm run build && npm start     # 로컬 프로덕션
# 또는 Vercel에 연결해 자동 배포 (스펙 부록 H: Next.js + Vercel)
```

---

## 기술 스택

- **Next.js 14 (App Router) + React 18 + TypeScript** — 스펙 부록 H 최종 앱 기준
- **Tailwind CSS** — 디자인 토큰(색·모서리·폰트)을 `tailwind.config.ts`에 그대로 반영
- **Zustand** — 설문 답변/결과를 화면 간 전달 (sessionStorage 유지)
- 차트/게이지는 외부 의존성 없이 SVG로 직접 구현 (설치 부담↓)

---

## 폴더 구조

```
app/
  page.tsx            화면1 스플래시
  onboarding/         답변 방식 선택 (손입력/음성)
  survey/             설문 10문항 (한 문항 한 화면, 분기 로직)
  checkup/            화면4 건강검진 입력 (선택)
  analysis/           화면5 AI 분석 로딩 → 예측 실행
  report/             화면6 AI 리포트 (Bone Score·위험/보호요인·백분위·개선가능성)
  simulator/          화면7 행동 변화 시뮬레이터 (DiCE 슬라이더)
  routine/            화면8 맞춤 루틴 + 영상 + 우리동네
  mypage/             화면9 마이페이지 (MVP)
components/           Boni(마스코트)·게이지·막대·탭바 등 공용 UI
lib/
  types.ts            도메인 타입
  survey.ts           설문 10문항 정의 + 분기
  predict.ts          ⭐ 예측 엔진 (DA 최종 로지스틱 모델을 앱에서 그대로 실행)
  modelParams.ts      DA joblib에서 추출한 실제 모델 계수 (수정 금지)
  prescription.ts     처방 규칙 R1~R9 + 카드 생성
  videos.ts           KHEPI 공식 영상 라이브러리 (검증된 유튜브 링크)
  store.ts            Zustand 스토어
```

---

## ⭐ 예측 엔진: 우리 팀의 진짜 모델이 앱 안에서 돕니다

`lib/predict.ts`의 `predict()`는 **DA 팀이 학습한 최종 로지스틱 회귀 모델
(`최종모델_설문검진_로지스틱.joblib`)을 그대로 실행**합니다.

핵심 아이디어: 로지스틱 회귀는 계수(coefficient)만으로 완전히 정의되는 모델이라,
joblib에서 **표준화 기준(mean·std) + 계수 + 절편**을 추출해 `lib/modelParams.ts`에
그대로 담았습니다. 앱은 이 값으로 `sigmoid(절편 + Σ 계수·표준화값)`을 계산하는데,
이는 Python의 `model.predict_proba()`와 **소수점 오차 0으로 완전히 동일**합니다
(검증 완료: 동일 입력에 대해 sklearn과 앱 결과 일치).

덕분에 **Python 서버 없이 `npm run dev` 하나로 진짜 모델이 돌고**, Vercel 배포도 됩니다.
발표 때 "서버 두 개 띄우기" 없이 그대로 시연할 수 있습니다.

화면별로 쓰는 계산은 DA의 `서비스_백엔드_로직.py`와 1:1로 대응합니다:

| 화면 | predict.ts 함수 | 계산 내용 |
|---|---|---|
| 리포트 점수 | `predict()` → `boneScore` | `100 × (1 − 위험확률)` |
| 위험/보호요인 | `predict()` → `riskFactors` | 계수 × 표준화값 (선형모델의 SHAP = 기여도) |
| 또래 비교 | `computePercentile()` | 연령대 분포에서 내 위치 (이진탐색) |
| 시뮬레이터 | `simulate()` | 체중·근력운동만 바꿔 위험 재계산 |
| 행동 처방 | `optimalControllables()` | 안전 범위 내 최적값 탐색 (DiCE 안전 구현) |

> 등급 기준: 위험확률 0.34 이상 = 높음(정밀검사 권유), 0.20 이상 = 주의, 그 미만 = 정상.
> (DA 규칙 `서비스_처리규칙.json`의 위험경보 임계값 0.34를 그대로 사용)

### 모델을 다시 추출해야 할 때 (팀이 모델을 재학습한 경우)

`6_모델서비스규칙` 폴더의 새 `.joblib` + `서비스_처리규칙.json`에서 아래를 추출해
`lib/modelParams.ts`의 값만 교체하면 됩니다 (화면 코드는 그대로):
`cols`, `medians`, `scalerMean`(scaler.mean_), `scalerScale`(scaler.scale_),
`coef`(clf.coef_[0]), `intercept`(clf.intercept_[0]), `threshold`, `peer`, `conv`.

---

## 다음 단계 (이번 빌드에 포함되지 않음)

- 회원가입(데모) 화면 · 답변방식 음성 실동작(Web Speech API)
- 가족 프로필 전환 바텀시트 + 새 사용자 추가 (부록 F)
- 관심(하트) 기능 + "관심 건강 관리" 모아보기 (부록 I)
- 검진표 OCR(멀티모달 LLM) · 카카오맵/공공데이터 API 실연동

---

## 저작권 / 데이터 출처

- 운동 영상: 보건복지부·한국건강증진개발원(KHEPI) 공식 영상, **공공누리 제4유형**
  (출처표시 + 상업적이용금지 + 변경금지). 원본 유튜브 임베드만 사용, 편집·재호스팅 금지.
  영상 카드 하단에 출처를 표기합니다.
- 예측 근거 데이터: 국민건강영양조사(KNHANES) 공공데이터.
