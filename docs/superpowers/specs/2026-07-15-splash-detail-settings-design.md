# 스플래시 여백 + 보건소 상세 링크 + 앱 설정 페이지 설계

날짜: 2026-07-15
상태: 사용자 승인됨 (요청 3건 그대로, 2번은 카카오맵 연결안 채택)

## ① 스플래시 상단 여백

- `app/page.tsx` 세로 로고 `className="w-[150px] mt-7 mx-auto"` → `mt-16` (로고+특징 카드 블록이 아래로 내려와 상단 숨통).

## ② 보건소 '자세히 보기' 링크

- 실검색(카카오) 결과는 이미 `href={p.url}`(카카오맵 상세)로 연결됨 — 무변경.
- 검색 전 기본 데모 카드(순천 보건소, `components/LocalSection.tsx` ~155행)에 `href="https://map.kakao.com/?q=순천시보건소"` 추가.
- href 없을 때 무반응이던 자세히 보기 버튼은 이제 모든 노출 경로에서 링크 보유. (안전망: href 없으면 카카오맵 이름 검색 `https://map.kakao.com/?q=${encodeURIComponent(name)}` 폴백을 클릭 핸들러에 추가)

## ③ 앱 설정 페이지 (`/settings` 신규)

- 마이페이지 메뉴 "앱 설정" `onClick={() => {}}` → `router.push("/settings")`.
- 화면: PageHeader "앱 설정" back + TabBar. 섹션 "권한 관리":
  - 권한 카드 3개(위치/카메라/마이크 — `/permissions` 화면과 동일 아이콘·설명) + 우측 상태 뱃지:
    - `granted` → "허용됨" (lightgreen/forest)
    - `prompt` → "요청 가능" (#F0EEE6/graytext)
    - `denied` → "꺼짐" (#F7ECEA/#C7503A)
    - 조회 불가(iOS 등 Permissions API 미지원) → "확인 필요" (#F0EEE6/graytext)
  - 상태 조회: `navigator.permissions.query({name})` — geolocation은 표준, camera/microphone은 try/catch(미지원 브라우저 대비)
  - [권한 다시 요청하기](btn-primary) → 위치→카메라→마이크 순차 요청(permissions 화면과 동일 로직) → 완료 후 상태 재조회. 진행 중 "허용 확인 중…"
  - 하단 안내: "'차단'된 권한은 여기서 다시 켤 수 없어요. 브라우저의 사이트 설정(주소창 자물쇠 아이콘)에서 허용해 주세요." (14px graytext)
- 공용화: 권한 카드 데이터(아이콘·제목·설명)와 순차 요청 함수를 `components/permissions-shared.tsx`로 추출 — `/permissions` 페이지와 `/settings`가 공유 (`PERM_CARDS`, `requestAllPermissions()` export).

## 범위 밖

- 설정 페이지의 다른 항목(알림·계정 등), 네이티브 설정 딥링크

## 검증

- tsc/build/test green (settings는 계약 테스트 eligible 목록 밖)
- E2E: 스플래시 여백 스크린샷, 데모 보건소 카드 자세히 보기 → 카카오맵 새 탭(URL 확인), 마이페이지→앱 설정 진입→카드 3개+뱃지 렌더, 권한 granted 컨텍스트에서 "허용됨" 표시 + 다시 요청 버튼 동작
- 프로덕션 배포 + 스모크
