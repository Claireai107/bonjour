# 첫 실행 권한 안내 화면 설계

날짜: 2026-07-15
상태: 사용자 승인됨

## 목표

서비스 중간에 권한 팝업이 튀어나오지 않도록, 첫 실행 시 위치·카메라·마이크 권한을 한 번에 요청하는 안내 화면을 넣는다.

## 흐름

- 스플래시 [시작하기] 탭 → `localStorage["bonjour-perms-prompted"]` 없으면 `/permissions`로, 있으면 기존처럼 `/signup`.
- `/permissions` 화면:
  - 본이(point) + 제목 "본이가 도와드리려면\n허용이 필요해요"
  - 권한 카드 3개: 📍 위치 "가까운 보건소를 찾아드려요" / 📷 카메라 "검진표를 찍어서 자동 인식해요" / 🎤 마이크 "설문을 음성으로 답할 수 있어요" (아이콘은 기존 앱의 SVG 스타일로 — pin·camera·mic, forest 스트로크, lightgreen 원형 배경 44px)
  - [모두 허용하고 시작하기](btn-primary) → **순차 요청**: ① geolocation.getCurrentPosition ② getUserMedia({video}) ③ getUserMedia({audio}) — 각 요청은 성공/실패 무관하게 다음으로 진행(실패 무시), video/audio 스트림은 획득 즉시 `track.stop()`
  - 요청 중 버튼은 "허용 확인 중…" 비활성. 3개 완료 후 플래그 저장 + `router.replace("/signup")`
  - 보조 버튼 "나중에 할게요"(텍스트 링크, graytext underline) → 플래그 저장 + `/signup` (기능 사용 시점에 기존처럼 개별 요청됨)
- 거부된 권한의 사후 처리: 기존 각 기능의 에러 안내 유지 (우리동네 위치 에러 문구 등 — 신규 작업 없음)

## 화면 구성

- 헤더 없음(풀스크린 온보딩 계열 — 스펙 예외 목록과 동일 취급), bg-ivory, px-gutter
- 카드: bg-white rounded-card, 아이콘+제목(18px bold)+설명(15px graytext)
- TabBar 없음 (계약 테스트 eligible 목록에 미포함이므로 영향 없음)

## 범위 밖

- 네이티브 앱 수준의 권한 제어, 거부 시 설정 딥링크, 권한 상태 대시보드

## 검증

- tsc/build/test green (기존 21 pass 유지)
- E2E: 스플래시 시작하기 → /permissions 표시 → "나중에 할게요" → /signup 도달, 재방문 시 /permissions 건너뜀. "모두 허용" 경로는 헤드리스에서 권한 자동 승인 컨텍스트로 확인(playwright permissions grant)
- 프로덕션 배포 + 스모크
