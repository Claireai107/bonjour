# 운동시설 실데이터 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox 문법.

**Goal:** 위치 검색 시 주변 운동시설을 카카오에서 받아 제휴 카드에 실제 센터명·거리로 표시하고, 예약하기가 카카오맵으로 연결되게 한다.

**Architecture:** `/api/health-centers`가 보건소+헬스장 두 키워드를 병렬 검색해 `gyms`를 추가 반환. LocalSection이 검색 후 제휴 카드를 gyms로 대체(프로그램 문구는 데모 배열 순환). 스펙: `docs/superpowers/specs/2026-07-15-fitness-centers-design.md`

## Global Constraints

- **git 저장소 아님 → 커밋 없음.** `npx tsc --noEmit` 클린, `npm test` 21 pass
- 데모 문구 배열 정확히: `["시니어 골밀도 강화 클래스", "중장년 근력 프로그램", "첫 달 50% 할인"]` (임의 문구 주석 필수)
- gyms 부족 시 기존 데모 카드로 채움, 검색 전 화면은 기존과 동일(단 CTA가 카카오맵으로 연결됨)
- 기존 보건소 동작·폴백 무변경

---

### Task 1: API — gyms 병렬 검색

**Files:**
- Modify: `app/api/health-centers/route.ts`

**Interfaces:**
- Produces: 응답 `{ source, places, gyms: Place[] }` — Task 2가 사용

- [ ] **Step 1: 카카오 검색을 함수로 추출 + 병렬 호출**

기존 카카오 경로의 fetch~places 매핑을 `searchKakao(key, query, lat, lng): Promise<Place[]>` 헬퍼로 추출(로직 동일, query만 파라미터화). 카카오 경로를:

```ts
      const [places, gyms] = await Promise.all([
        searchKakao(key, "보건소", lat, lng),
        searchKakao(key, "헬스장", lat, lng).catch(() => [] as Place[]),
      ]);
      return NextResponse.json({ source: "kakao", places, gyms });
```

(보건소 검색 실패는 기존처럼 폴백으로 throw, 헬스장 실패만 빈 배열 허용)

- [ ] **Step 2: 폴백 응답에 `gyms: []` 추가**

`return NextResponse.json({ source: "fallback", places });` → `{ source: "fallback", places, gyms: [] }`

- [ ] **Step 3: 검증**

Run: `npx tsc --noEmit` → 0 에러

---

### Task 2: UI — 제휴 카드 실데이터 + 예약하기 연결

**Files:**
- Modify: `components/LocalSection.tsx`

- [ ] **Step 1: gyms state**

`const [gyms, setGyms] = useState<NearbyPlace[]>([]);` 추가. `search()` 성공 처리에서 `setGyms(Array.isArray(data.gyms) ? data.gyms : []);` 추가.

- [ ] **Step 2: 데모 문구 배열 (모듈 상수)**

```ts
// 프로그램 문구는 데모용 임의 카피 — 실제 프로그램 정보 아님 (센터명·거리만 실데이터)
const DEMO_PROGRAMS = [
  "시니어 골밀도 강화 클래스",
  "중장년 근력 프로그램",
  "첫 달 50% 할인",
];
```

- [ ] **Step 3: 제휴 카드 렌더 교체**

기존 하드코딩 카드 2장(순천 필라테스 id="place-pilates", 튼튼 헬스장 id="place-gym") 자리를:

```tsx
      {(state === "done" && gyms.length > 0
        ? gyms.slice(0, 2).map((g, i) => ({
            id: `gym-${g.id}`,
            icon: (i === 0 ? "dumbbell" : "plus") as const,
            name: g.name,
            walk: `도보 ${g.walkMin}분 · ${formatDistance(g.distanceM)}`,
            desc: DEMO_PROGRAMS[i % DEMO_PROGRAMS.length],
            href: g.url,
          })
        : [
            { id: "place-pilates", icon: "dumbbell" as const, name: "순천 필라테스", walk: "도보 8분", desc: "시니어 골밀도 강화 클래스", href: undefined },
            { id: "place-gym", icon: "plus" as const, name: "튼튼 헬스장", walk: "도보 15분", desc: "첫 달 50% 할인", href: undefined },
          ]
      ).map((c, i) => (
        <LocalPlaceCard
          key={c.id}
          id={c.id}
          icon={c.icon}
          name={c.name}
          walk={c.walk}
          desc={c.desc}
          badge="제휴"
          cta={i === 0 ? "예약하기" : "바로가기"}
          href={c.href}
          onToast={onToast}
          className="mt-[10px]"
        />
      ))}
```

(gyms가 1개면 slice 결과 1장 + 데모 채움이 스펙이나, 구현 단순화를 위해 gyms.length > 0이면 gyms만 최대 2장 — 1장일 때 데모 1장 채움은 다음과 같이: `[...gyms.slice(0,2)매핑, ...데모배열].slice(0, 2)` 형태로 합쳐 앞 2장을 취한다. 이 방식으로 구현할 것)

- [ ] **Step 4: LocalPlaceCard cta onClick**

```tsx
      {cta && (
        <button
          type="button"
          onClick={() => {
            const url =
              href || `https://map.kakao.com/?q=${encodeURIComponent(name)}`;
            window.open(url, "_blank", "noopener");
          }}
          className="mt-[12px] w-full h-[52px] rounded-btn bg-forest text-white text-[18px] font-bold flex items-center justify-center active:brightness-95"
        >
          {cta}
        </button>
      )}
```

- [ ] **Step 5: 검증**

Run: `npx tsc --noEmit` → 0 에러. `npm test 2>&1 | tail -3` → 21 pass

---

### Task 3: 검증 + 배포

- [ ] `npm run build && npm test` green
- [ ] API 확인: 프로덕션 배포 후 `curl ".../api/health-centers?lat=34.95&lng=127.49"`에 gyms 배열 존재·실명 확인
- [ ] E2E: geolocation 허용 컨텍스트에서 `/local` → '내 위치로 찾기' → 제휴 카드가 실제 센터명으로 교체(스크린샷), 예약하기 클릭 → 새 탭 URL이 카카오 place 페이지
- [ ] `vercel --prod --yes` → READY
