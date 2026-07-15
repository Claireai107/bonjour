# 운동시설 실데이터 연동 설계

날짜: 2026-07-15
상태: 사용자 승인됨 (센터명·거리 실데이터, 프로그램 문구는 임의 데모 유지, 예약하기→카카오맵)

## API (`app/api/health-centers/route.ts`)

- 카카오 경로에서 보건소 검색에 이어 **운동시설 검색 추가**: `query: "헬스장"`, 동일 좌표, radius 20000, sort distance, size 5. 실패해도 보건소 결과는 반환(운동시설만 빈 배열).
- 응답: `{ source, places, gyms: Place[] }` — 폴백 경로는 `gyms: []`.
- 두 카카오 호출은 병렬(Promise.all)로.

## UI (`components/LocalSection.tsx`)

- state에 `gyms: NearbyPlace[]` 추가, 검색 성공 시 저장.
- **검색 후**: 제휴 카드 2장을 gyms 상위 2개로 대체 —
  - name·walk(도보 N분 · 거리) 실데이터, badge "제휴", cta "예약하기"
  - desc는 데모 프로그램 문구 배열 `DEMO_PROGRAMS = ["시니어 골밀도 강화 클래스", "중장년 근력 프로그램", "첫 달 50% 할인"]`에서 순번(i % length)으로 — 임의 문구임을 주석 명시
  - icon: 첫 번째 "dumbbell", 두 번째 "plus" (기존 스타일 유지)
  - gyms가 0~1개면 부족분은 기존 데모 카드로 채움
- **검색 전(idle)**: 기존 데모 카드 유지.
- `LocalPlaceCard`의 cta 버튼에 onClick 추가: `href`가 있으면 새 탭, 없으면 카카오맵 이름 검색(`https://map.kakao.com/?q=<name>`) — '자세히 보기'와 동일 폴백. 데모 카드도 이제 버튼이 무반응이 아님.
- gym 카드에는 `href={g.url}`(카카오 place_url) 전달.

## 범위 밖

- 실제 예약 기능, 필라테스/요가 등 업종별 필터, 제휴 여부 실데이터

## 검증

- tsc/build/test green
- API 직접 호출로 gyms 실데이터 확인(순천·서울 좌표)
- E2E: 위치 허용 컨텍스트에서 '내 위치로 찾기' → 제휴 카드가 실제 센터명으로 교체, 예약하기 → 카카오맵 새 탭
- 프로덕션 배포 + 스모크
