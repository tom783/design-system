# R36b · 옆 패널 보정 — 실측으로 찾은 5건

R36 하네스 21/23·문서 54/55. 실패 3건과 스크린샷에서 본 2건. 버전은 올리지 마라.

## 1. 닫기 시도가 두 번 알려진다 (Dialog·Sheet 공통 — 기존 결함이 Sheet 에서 드러났다)

실측(`components-sheet--변경보호`, CDP): Escape 키다운 1회 → 시도 횟수 0→**2**. 닫기 버튼 `.click()` 1회 → 2→**4**.
바깥 클릭은 1회.

원인: 확인 AlertDialog 를 패널의 **형제**로 두면, 확인 창이 열리며 포커스가 패널 밖으로 나간다 → Radix 가
`onFocusOutside` → `onInteractOutside` 를 새 이벤트로 부른다 → `guard` 가 한 번 더 알린다.
상세 화면 스토리는 AlertDialog 를 Content **안**에 두고 `setDiscard(true)`(멱등)만 해서 드러나지 않았다.
소비자는 형제로 두는 것이 자연스럽다 — DS 가 견뎌야 한다.

고칠 것(`dialog/modal-content.tsx`): 알림은 **사용자의 닫기 시도**(Escape · 바깥 포인터 누름 · 내장 닫기 버튼)에서만.
포커스가 밖으로 나가는 것은 시도가 아니다 — `dismissible=false` 면 닫힘만 막고 알리지 않는다.

## 2. 트리거 없이 연 AlertDialog 가 닫히면 포커스가 BODY 로 빠진다

실측: 위 흐름에서 "계속 편집" → `document.activeElement` = BODY. 키보드 사용자는 패널 안 위치를 잃는다.
상세 화면은 앱 코드(`dismissOrigin` + `onCloseAutoFocus`)로 막고 있다 — 소비자마다 짜야 한다는 뜻이다.

고칠 것(`AlertDialogContent`): 트리거 없이(상태로) 열렸다면 닫힐 때 **열리기 직전 포커스 요소**로 돌아간다(연결돼 있을 때).
트리거가 있으면 지금처럼 트리거. 소비자의 `onCloseAutoFocus` 가 `preventDefault` 하면 그것을 따른다(상세 화면 기존 동작 유지).
상세 화면 스토리의 `dismissOrigin` 은 이제 필요 없다 — 지우지 말고 그대로 두어 "앱이 직접 해도 충돌하지 않음"의 증거로 남긴다.

## 3. 문서: 한 페이지에 같은 부모의 부품이 여럿이면 부모 규칙이 반복된다

실측: Sheet 문서에서 SheetContent·SheetBody 가 각각 Dialog 규칙 블록을 그린다 → 하네스 "같은 페이지의 부모 규칙 반복 0건" 에서 2.
부모가 그 페이지에 없을 때는 **첫 부품 아래 한 번만** 부모 규칙을 그린다.

## 4. 패널 테두리는 안쪽 가장자리에만

스크린샷: 화면에 붙은 위·바깥·아래에도 1px 테두리가 그려진다(뷰포트 가장자리의 회색 선). side=right 면 왼쪽만, left 면 오른쪽만.

## 5. 앱 셸 서랍 머리

스크린샷(900px): 서랍 맨 위에 Sheet 제목 "주 메뉴" 줄 + 그 아래 브랜드 줄 — 머리가 이중이다.
"주 메뉴" 제목은 접근성 이름으로만 남기고(스크린리더 전용 — 공개 `.sr-only` 와 같은 방식), 브랜드 줄이 첫 줄이 되게.
닫기 버튼이 브랜드와 겹치지 않아야 한다.

## 하네스 (실행은 내가 한다)

- `sheet-render-verify.mjs`: 세 경로 모두 시도 1회(기존 단정 그대로 통과해야 한다). 형제 AlertDialog 취소 후 포커스 =
  시도 직전 요소(Escape 경로는 입력칸, 닫기 버튼 경로는 닫기 버튼). 테두리: 안쪽 가장자리만 1px, 나머지 0
- Dialog 쪽도 같은 형제 패턴 스토리를 하나 두고 같은 두 단정(시도 1회·포커스 복귀)
- `detail-screen` 관련 기존 하네스는 바꾸지 마라 — 통과해야 한다
- `app-shell-render-verify.mjs`: 서랍에서 보이는 첫 줄이 브랜드, "주 메뉴" 는 접근성 이름으로 존재, 닫기와 브랜드 겹침 0
- 문서 하네스는 손대지 말고 통과시켜라

## 검증

`npm_config_offline=true pnpm verify`, `node docs/qa/mcp-client-verify.mjs .qa-shots/mcp-client-verify`.

## 하지 마라

- 공개 API 추가, MCP 지침 늘리기(카탈로그 76,883 / 80,000), 버전 범프
