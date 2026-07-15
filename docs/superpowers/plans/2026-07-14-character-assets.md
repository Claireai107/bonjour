# 새 캐릭터 에셋 전면 적용 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 새 캐릭터 에셋 13종으로 기존 마스코트를 전면 교체하고, 프로필 추가 화면에 아바타 선택 UI를 추가한다.

**Architecture:** PIL 스크립트로 원본 에셋(1024px/1.5MB)을 트림·리사이즈해 `public/boni-<pose>.png`로 배치. `components/Boni.tsx`의 `BoniPose`를 13종으로 재정의하고 기존 사용처를 리매핑. `ProfileData.avatar` 필드 + 프로필 추가 화면 선택 UI + 표시 3곳 반영. 스펙: `docs/superpowers/specs/2026-07-14-character-assets-design.md`

**Tech Stack:** Next.js 14 + React 18 + Tailwind, Python3 + PIL 11.3 (에셋 처리), node --test (소스 계약 테스트)

## Global Constraints

- 원본 에셋 위치: `/Users/chaewon/bonjour/design/캐릭터에셋/` (읽기만, 절대 수정·이동 금지)
- 처리 결과: `public/boni-<pose>.png`, 높이 320px(트림 후), 각 파일 **< 150KB**
- `본이엄마.png`만 배경(체커보드)이 박혀 있음 → 제거 후 사용, 결과를 반드시 이미지로 열어 육안 확인
- 새 `BoniPose` 13종: `hello point speak think aha heart praise face dad mom run lift curious` (제거: `wink greet heart2`)
- 아바타 후보 6종(순서 고정): `face dad mom hello heart praise`, 기본값 `face`
- 기존 화면 문구 변경 금지. 신규 문구 없음 (장식은 이미지만)
- **git 저장소 아님 → 커밋 단계 없음.** 태스크 검증: `npx tsc --noEmit`
- 기존 테스트 중 2건(checkup TabBar, home /survey 라우팅)은 pre-existing 실패 — 건드리지 않는다

---

### Task 1: 에셋 변환 스크립트 작성 + 실행

**Files:**
- Create: `scripts/prepare_boni_assets.py`
- Create(산출물): `public/boni-{hello,point,speak,think,aha,heart,praise,face,dad,mom,run,lift,curious}.png`
- Delete: `public/boni-greet.png`, `public/boni-heart2.png`, `public/boni-wink.png` (구 에셋 중 새 포즈명에 없는 것)

**Interfaces:**
- Produces: 13개의 `public/boni-<pose>.png` (투명 배경, 높이 320px)

- [ ] **Step 1: 스크립트 작성**

```python
"""새 캐릭터 원본(1024px)을 웹용으로 변환해 public/에 배치한다.
- 본이엄마: 체커보드 배경 제거(가장자리 플러드필)
- 공통: 투명 여백 트림 → 높이 320px 리사이즈 → 최적화 PNG 저장
실행: python3 scripts/prepare_boni_assets.py (프로젝트 루트에서)
"""
from collections import deque
from PIL import Image
import os

SRC = "/Users/chaewon/bonjour/design/캐릭터에셋"
DST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public")
TARGET_H = 320

MAP = {
    "hello": "반가운인사포즈.png",
    "point": "확성기왼쪽.png",
    "speak": "앉아서확성기왼쪽.png",
    "think": "연구중모습.png",
    "aha": "아하느낌표모습.png",
    "heart": "하트든모습.png",
    "praise": "최고칭찬모습.png",
    "face": "얼굴만있음_웃는모습.png",
    "dad": "본이아빠.png",
    "mom": "본이엄마.png",
    "run": "달리기운동.png",
    "lift": "역기들고운동.png",
    "curious": "궁금한표정.png",
}


def is_checker(px):
    """체커보드 픽셀: 무채색(r≈g≈b)이고 밝음(>=195)."""
    r, g, b = px[0], px[1], px[2]
    return max(r, g, b) - min(r, g, b) <= 6 and min(r, g, b) >= 195


def remove_checkerboard(im):
    """가장자리에서 체커보드 색만 4방향 플러드필로 투명화."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            q.append((x, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y * w + x]:
            continue
        seen[y * w + x] = 1
        if not is_checker(px[x, y]):
            continue
        px[x, y] = (0, 0, 0, 0)
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return im


def process(pose, fname):
    im = Image.open(os.path.join(SRC, fname)).convert("RGBA")
    if pose == "mom":
        im = remove_checkerboard(im)
    bbox = im.getchannel("A").getbbox()
    if bbox:
        im = im.crop(bbox)
    ratio = TARGET_H / im.height
    im = im.resize((max(1, round(im.width * ratio)), TARGET_H), Image.LANCZOS)
    out = os.path.join(DST, f"boni-{pose}.png")
    im.save(out, optimize=True)
    kb = os.path.getsize(out) / 1024
    print(f"boni-{pose}.png  {im.width}x{im.height}  {kb:.0f}KB")
    assert kb < 150, f"{pose} 150KB 초과"


for pose, fname in MAP.items():
    process(pose, fname)

for legacy in ("boni-greet.png", "boni-heart2.png", "boni-wink.png"):
    p = os.path.join(DST, legacy)
    if os.path.exists(p):
        os.remove(p)
        print(f"removed {legacy}")
print("done")
```

- [ ] **Step 2: 실행**

Run: `python3 scripts/prepare_boni_assets.py`
Expected: 13줄의 `boni-*.png ... KB` 출력(전부 150KB 미만), `removed boni-greet/heart2/wink`, `done`. assert 실패 시 중단됨.

- [ ] **Step 3: mom 품질 육안 확인**

`public/boni-mom.png`를 이미지로 열어(Read) 확인: 체커보드가 사라지고 캐릭터 외곽이 자연스러운지. 체커보드 잔여물이나 캐릭터 몸통 구멍이 보이면 `is_checker`의 임계값(195/6)을 조정해 재실행. 판단 불가면 DONE_WITH_CONCERNS로 보고.

- [ ] **Step 4: 산출물 목록 확인**

Run: `ls public/boni-*.png | sort`
Expected: 정확히 13개 (hello, point, speak, think, aha, heart, praise, face, dad, mom, run, lift, curious)

---

### Task 2: Boni 포즈 체계 재정의 + 기존 사용처 리매핑

**Files:**
- Modify: `components/Boni.tsx` (전체 교체)
- Modify: `app/checkup/page.tsx:266,306` / `app/simulator/page.tsx:185` / `app/favorites/page.tsx:68` / `app/report/page.tsx:169`

**Interfaces:**
- Consumes: Task 1의 `public/boni-<pose>.png`
- Produces: `BoniPose` 유니온 13종, `AVATARS: readonly BoniPose[]`, `avatarPose(v?: string): BoniPose` — Task 3이 사용

- [ ] **Step 1: Boni.tsx 전체 교체**

```tsx
/* eslint-disable @next/next/no-img-element */
// 마스코트 "본이" — 공식 투명 PNG (public/boni-*.png, design/캐릭터에셋 원본).
// pose 이름은 scripts/prepare_boni_assets.py의 MAP과 1:1 대응.

export type BoniPose =
  | "hello" // 반가운 인사
  | "point" // 확성기 안내·설명
  | "speak" // 앉아서 확성기(음성 모드)
  | "think" // 연구중(분석·인식)
  | "aha" // 아하! (시뮬레이터)
  | "heart" // 하트(관심·즐겨찾기)
  | "praise" // 최고 칭찬(루틴)
  | "face" // 얼굴만(작은 칩·아바타 기본)
  | "dad" // 본이아빠(프로필 아바타)
  | "mom" // 본이엄마(프로필 아바타)
  | "run" // 달리기(우리동네)
  | "lift" // 역기(루틴 운동)
  | "curious"; // 궁금한 표정(검진 촬영)

const LABEL: Record<BoniPose, string> = {
  hello: "인사하는 본이",
  point: "확성기를 든 본이",
  speak: "앉아서 확성기를 든 본이",
  think: "연구하는 본이",
  aha: "아하! 하는 본이",
  heart: "하트를 든 본이",
  praise: "엄지를 든 본이",
  face: "웃는 본이 얼굴",
  dad: "본이 아빠",
  mom: "본이 엄마",
  run: "달리는 본이",
  lift: "역기를 든 본이",
  curious: "궁금한 표정의 본이",
};

// 프로필 아바타 후보 (프로필 추가 화면 선택 순서)
export const AVATARS: readonly BoniPose[] = [
  "face",
  "dad",
  "mom",
  "hello",
  "heart",
  "praise",
];

// 저장된 아바타 값 → 유효한 포즈 (미설정·무효값은 face)
export function avatarPose(v?: string): BoniPose {
  return AVATARS.includes(v as BoniPose) ? (v as BoniPose) : "face";
}

export default function Boni({
  pose = "hello",
  size = 96,
  className,
}: {
  pose?: BoniPose;
  size?: number; // 렌더 높이(px) — 디자인은 높이 기준으로 배치
  className?: string;
}) {
  return (
    <img
      src={`/boni-${pose}.png`}
      alt={`마스코트 본이 (${LABEL[pose]})`}
      style={{ height: size, width: "auto" }}
      className={className}
      draggable={false}
    />
  );
}
```

- [ ] **Step 2: 사용처 포즈 리매핑 (4개 파일, pose 문자열만 변경)**

- `app/checkup/page.tsx:266` `pose="hello"` → `pose="think"` (OCR 인식 중)
- `app/checkup/page.tsx:306` `pose="point"` → `pose="curious"` (촬영 헤더)
- `app/simulator/page.tsx:185` `pose="wink"` → `pose="aha"`
- `app/favorites/page.tsx:68` `pose="hello"` → `pose="heart"`
- `app/report/page.tsx:169` `pose="hello"` → `pose="face"` (백분위 마커)

변경하지 않는 곳(파일 교체로 자동 반영): home:171·onboarding:43·ScreenFrame:45 (`point`), survey:226 (`speak`), analysis:70 (`think`). mypage:46,74·ProfileSwitcher:85는 Task 3에서 처리.

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (`wink` 잔여 사용처가 있으면 여기서 잡힘 — mypage/ProfileSwitcher의 `hello`/`point`는 유효 포즈라 통과)

---

### Task 3: 프로필 아바타 — 데이터 + 선택 UI + 표시 반영

**Files:**
- Modify: `lib/types.ts:101-107` (ProfileData)
- Modify: `app/profile-add/page.tsx` (state·submit·폼 상단 선택 UI)
- Modify: `app/mypage/page.tsx:46,74`
- Modify: `components/ProfileSwitcher.tsx:85`
- Test: `tests/pageContracts.test.mjs` (계약 테스트 1건 추가)

**Interfaces:**
- Consumes: Task 2의 `AVATARS`, `avatarPose(v?: string): BoniPose`, `Boni`
- Produces: `ProfileData.avatar?: string`

- [ ] **Step 1: 실패하는 계약 테스트 추가**

`tests/pageContracts.test.mjs` 끝에 추가:

```js
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
```

- [ ] **Step 2: 실패 확인**

Run: `npm test 2>&1 | grep "pick an avatar"`
Expected: `✖ profile-add lets the user pick an avatar and saves it`

- [ ] **Step 3: `lib/types.ts` — avatar 필드**

`ProfileData`의 `region?: string;` 줄 아래에 추가:

```ts
  avatar?: string; // 프로필 아바타 포즈 id (components/Boni의 AVATARS 중 하나)
```

- [ ] **Step 4: profile-add — state·저장·선택 UI**

(a) import에 Boni 추가:

```ts
import Boni, { AVATARS, type BoniPose } from "@/components/Boni";
```

(b) state 블록(`const [name, setName] = useState("");` 위)에 추가:

```ts
  const [avatar, setAvatar] = useState<BoniPose>("face");
```

(c) `submit`의 `setProfileInfo({` 객체에 `avatar,` 추가 (gender 앞):

```ts
    setProfileInfo({
      avatar,
      gender,
      ...
```

(d) 폼 상단 — 기존 첫 요소 `<p className="mt-1 text-[18px] text-graytext">이 분의 뼈 건강을 관리할게요</p>` 바로 아래에 추가:

```tsx
      {/* 프로필 이미지 선택 */}
      <label className="mt-5 text-sub font-bold text-charcoal">
        프로필 이미지
      </label>
      <div className="mt-2 flex gap-3 overflow-x-auto pb-1">
        {AVATARS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAvatar(a)}
            className={`w-16 h-16 shrink-0 rounded-full bg-lightgreen box-border flex items-end justify-center overflow-hidden ${
              avatar === a
                ? "border-[2.5px] border-forest"
                : "border border-borderline"
            }`}
          >
            <Boni pose={a} size={a === "face" ? 44 : 52} />
          </button>
        ))}
      </div>
```

(선택 버튼의 접근성 이름은 내부 `<img alt="마스코트 본이 (…)">`가 제공)

- [ ] **Step 5: mypage 표시 반영**

(a) import 변경: `import Boni from "@/components/Boni";` → `import Boni, { avatarPose } from "@/components/Boni";`
(b) `app/mypage/page.tsx:46` (헤더 칩): `<Boni pose="hello" size={24} />` → `<Boni pose={avatarPose(profile.avatar)} size={24} />`
(c) `app/mypage/page.tsx:74` (프로필 카드): `<Boni pose="hello" size={43} />` → `<Boni pose={avatarPose(profile.avatar)} size={43} />`

- [ ] **Step 6: ProfileSwitcher 표시 반영**

(a) import 변경: `import Boni from "./Boni";` 형태면 `import Boni, { avatarPose } from "./Boni";` (실제 경로 유지)
(b) `components/ProfileSwitcher.tsx:85`: `<Boni pose={active ? "hello" : "point"} size={44} />` → `<Boni pose={avatarPose(p.avatar)} size={44} />` (active 구분은 기존 테두리가 담당)

- [ ] **Step 7: 테스트·타입체크 통과 확인**

Run: `npm test 2>&1 | grep "pick an avatar"` → `✔`
Run: `npx tsc --noEmit` → 에러 없음

---

### Task 4: 신규 장식 3곳 (루틴 2, 우리동네 1)

**Files:**
- Modify: `app/routine/page.tsx` (첫 섹션 헤드라인 + 하단 안내문)
- Modify: `app/local/page.tsx` (LocalSection 위)

**Interfaces:**
- Consumes: Task 2의 `Boni` (`praise`, `lift`, `run`)

- [ ] **Step 1: 루틴 — 첫 섹션 헤드라인 우측에 praise**

`app/routine/page.tsx`에 `import Boni from "@/components/Boni";` 추가.
섹션 헤더 부분(현재 55~72행 부근)을 다음으로 변경 — 첫 섹션(idx===0)만 우측에 본이:

기존:

```tsx
            <section key={card.ruleId} className={idx > 0 ? "mt-[32px]" : ""}>
              {header.sub && (
                <p className="text-[18px] font-medium text-graytext">
                  {header.sub}
                </p>
              )}
              <h2 className="mt-[4px] text-[23px] font-bold text-forest leading-[1.35]">
                {header.title}
              </h2>
```

교체:

```tsx
            <section key={card.ruleId} className={idx > 0 ? "mt-[32px]" : ""}>
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  {header.sub && (
                    <p className="text-[18px] font-medium text-graytext">
                      {header.sub}
                    </p>
                  )}
                  <h2 className="mt-[4px] text-[23px] font-bold text-forest leading-[1.35]">
                    {header.title}
                  </h2>
                </div>
                {idx === 0 && (
                  <Boni pose="praise" size={76} className="shrink-0" />
                )}
              </div>
```

- [ ] **Step 2: 루틴 — 하단 안내문 옆에 lift**

기존(118행 부근):

```tsx
        <p className="mt-[26px] text-[14px] text-graytext leading-[1.6]">
          이 운동 추천은 참고용이에요. 통증이 있거나 치료 중이시라면
          <br />
          운동 시작 전에 의사와 상담해 주세요.
        </p>
```

교체 (문구 무변경, 좌측에 캐릭터):

```tsx
        <div className="mt-[26px] flex items-center gap-3">
          <Boni pose="lift" size={64} className="shrink-0" />
          <p className="text-[14px] text-graytext leading-[1.6]">
            이 운동 추천은 참고용이에요. 통증이 있거나 치료 중이시라면
            <br />
            운동 시작 전에 의사와 상담해 주세요.
          </p>
        </div>
```

(실제 기존 마크업이 위와 다르면 — 예: `<br />` 위치 — 문구와 클래스는 그대로 두고 flex 래핑만 적용)

- [ ] **Step 3: 우리동네 — LocalSection 위 우측에 run**

`app/local/page.tsx`에 `import Boni from "@/components/Boni";` 추가.

기존:

```tsx
        {/* LocalSection: 보건소(공공데이터 API) + 제휴 시설 카드 */}
        <div className="-mt-2">
          <LocalSection onToast={showToast} />
        </div>
```

교체:

```tsx
        {/* 달리는 본이 — 섹션 위 우측 장식 */}
        <div className="flex justify-end pr-1 -mb-1">
          <Boni pose="run" size={72} />
        </div>
        {/* LocalSection: 보건소(공공데이터 API) + 제휴 시설 카드 */}
        <div className="-mt-2">
          <LocalSection onToast={showToast} />
        </div>
```

- [ ] **Step 4: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

---

### Task 5: 최종 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: 빌드 + 테스트**

Run: `npm run build && npm test`
Expected: 빌드 성공. 테스트는 신규 아바타 계약 테스트 포함 통과, 실패는 pre-existing 2건(checkup TabBar, home /survey 라우팅)만.

- [ ] **Step 2: dev 서버 스모크 체크**

Run: `npm run dev` (3000 사용 중이면 3001) 후:
- 각 라우트 200 확인: home, routine, local, mypage, favorites, simulator, report, survey, checkup, onboarding, profile-add, analysis
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:PORT/boni-<pose>.png` 13종 전부 200
- profile-add SSR HTML에 "프로필 이미지" 라벨 존재

- [ ] **Step 3: 육안 확인 항목 (스크린샷 또는 사용자 확인)**

| 화면 | 확인 |
|---|---|
| 홈/온보딩/설문 | 확성기 본이 |
| 설문 음성 모드 | 앉아서 확성기(가로형) 잘림 없음 |
| 분석·검진 인식 중 | 연구중 본이 |
| 검진 촬영 | 궁금한 표정 (헤더 46px) |
| 시뮬레이터 | 아하 본이 |
| 즐겨찾기 | 하트 본이 |
| 리포트 | 백분위 마커가 얼굴 본이 22px |
| 루틴 | 첫 헤드라인 옆 최고칭찬 + 하단 역기 |
| 우리동네 | 섹션 위 달리기 |
| 프로필 추가 | 아바타 6개 선택·테두리 표시, 추가 후 마이페이지·전환 시트 반영 |
| 마이페이지 | mom 아바타 선택 시 체커보드 잔여물 없는지 |
