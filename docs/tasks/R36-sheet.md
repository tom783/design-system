# R36 · 옆 패널 (Sheet)

근거: `docs/research/ui-coverage-review.md` P1 5번. 목록에서 화면 이동 없이 상세·편집·필터를 연다(물류 출고 처리, 주문 빠른
편집). Peek 는 요약 전용(수정 금지)이라 대신할 수 없다. 앱 셸(R34)의 좁은 화면 메뉴 서랍도 이것을 쓴다.
0.3.1 후보. **버전은 올리지 마라.**

---

## 0. 전제 — 이미 정한 것을 물려받는다

- Dialog: `dismissible` + `onDismissAttempt`(저장 안 한 변경 보호 — 바깥 클릭·Escape·닫기 버튼이 모두 확인을 거친다),
  `showClose`, 막 `--overlay-scrim`(R32: 라이트 35%·다크 65% 검정), 떠 있는 레이어 그림자 `--shadow-overlay`,
  포털·z-index 구조(§16 실측). Sheet 는 **같은 원리의 다른 배치**다 — 새 규칙을 만들지 말고 물려받아라
- R32: 닫기 버튼이 없으면 제목이 전체 폭을 쓴다. 헤더가 래퍼 안에 있어도 닫기 버튼과 겹치지 않는다

## 0b. 선행 보정 — R35 페이지네이션 (같은 커밋에 넣지 말고 보고에 따로 적어라)

표 아래 한 줄에서 페이지 크기 Select 가 38px, 번호·이전·다음 버튼이 32px 이라 높이가 어긋난다(스크린샷 실측).
페이지네이션 안의 크기 Select 만 `--control-h-sm`(32) 로 맞춘다. Select 공개 API 는 늘리지 마라.
하네스 `pagination-render-verify.mjs` 에 "크기 Select 높이 = 번호 버튼 높이" 단정 추가.

## 1. Sheet — Dialog 부품을 그대로 쓴다

**공개 export 는 `SheetContent` 와 `SheetBody` 둘만.** 루트·트리거·헤더·제목·설명·푸터·닫기는 Dialog 부품
(`Dialog`·`DialogTrigger`·`DialogHeader`·`DialogTitle`·`DialogDescription`·`DialogFooter`·`DialogClose`)을 그대로 쓴다.
근거: ① 같은 원리의 다른 배치다(위 0) ② MCP 카탈로그 여유가 5,303바이트뿐이다 — shadcn 식 Sheet 부품 9개는
Dialog 계열 실측으로 약 4KB 라 R37 자리가 없다 ③ MCP 에서 `partOf: 'Dialog'` 로 두면 get_component 가 Dialog 규칙
(저장 안 한 변경 보호 등)을 상속해 보여준다.

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild><Button>편집</Button></DialogTrigger>
  <SheetContent side="right" size="md">
    <DialogHeader><DialogTitle>출고 처리</DialogTitle><DialogDescription>…</DialogDescription></DialogHeader>
    <SheetBody>…긴 폼…</SheetBody>
    <DialogFooter>…</DialogFooter>
  </SheetContent>
</Dialog>
```

- 화면 가장자리에서 붙어 나오는 패널. `side`: right(기본)·left. `size`: sm 400 · md 560 · lg 720(좁은 화면에서는 화면 폭 - 여백)
- 구조: 헤더(제목·설명·닫기) · 스크롤되는 본문(`SheetBody`) · 고정 푸터(액션). 본문만 스크롤, 헤더·푸터는 고정.
  DialogHeader 의 닫기 버튼 자리 확보(R32) 가 SheetContent 안에서도 동작해야 한다
- 모달: 막 + 포커스 가둠 + 닫으면 연 버튼으로 포커스 복귀(Dialog 와 같다). 비모달 옆 패널은 이번 범위 밖
- 열고 닫는 전환은 기존 모션 토큰(`dur-*`, `ease-*`), reduced-motion 에서는 즉시(전역 규칙과 같게 — 0 으로)
- `DialogContent` 의 `dismissible`·`onDismissAttempt`·`showClose` 를 같은 이름·같은 동작으로 — 구현을 복사하지 말고 공유하라

## 2. 앱 셸 연결 (R34 이후)

R34 가 들어갔다면: 1024px 미만에서 SideNav 를 레일 대신 **왼쪽 Sheet 서랍**으로 여는 선택지를 AppShell 에 더한다
(메뉴 버튼 → 서랍, 항목 선택 시 닫힘). 기본 동작을 바꿀지는 보고하고 내가 정한다 — 이번엔 선택 prop 으로만

## 3. 문서·MCP·스토리

- DESIGN 오버레이 절에 Sheet: Dialog·Peek 와 언제 무엇을(가운데 확인·짧은 입력 = Dialog, 목록 맥락 유지한 상세·편집 = Sheet,
  읽기 전용 요약 = Peek)
- MCP intent(`SheetContent` 는 `partOf: 'Dialog'`) + Dialog·Peek 와의 갈림길(dont/related), keywords("옆 패널", "사이드 패널", "서랍", "드로어", "슬라이드 패널").
  `which_component("옆 패널")` 이 SheetContent 를 첫 후보로 내야 한다
- 스토리: 오른쪽 기본 · 왼쪽 · 크기 3 · 긴 본문(본문만 스크롤) · 저장 안 한 변경 보호(확인 AlertDialog) · 닫기 버튼 없음 ·
  목록에서 행 클릭 → 편집 Sheet 조립. Primary 는 깨끗한 예시(R26b)
- MCP 크기: `build.test.mjs`·`server.test.mjs` 의 카탈로그 상한(R33b 후 `< 66_800`)은 새 실측 + 여유 300 이하로 올리고
  주석에 전후 바이트를 적는다. 공식 예산 80KB 를 넘게 되면 지침을 줄이지 말고 멈춰서 보고하라

## 4. 검증

`npm_config_offline=true pnpm verify`, `node docs/qa/mcp-client-verify.mjs .qa-shots/mcp-client-verify`.

하네스 (작성만): 폭(sm·md·lg)과 좁은 화면 폭, side 에 따라 붙는 가장자리, 본문만 스크롤(헤더·푸터 위치 불변), 포커스 가둠·복귀,
Escape·바깥 클릭·닫기 버튼, dismissible=false 에서 세 경로 모두 onDismissAttempt, 막 색(라이트·다크 — R32 단정 재사용),
reduced-motion 전환 0, 콘솔 오류 0. 레이어는 실제 포인터 클릭으로 연다(R24).

## 5. 하지 마라

- 비모달 패널, 끌어서 크기 조절, 위·아래 시트, 새 막·그림자 토큰, 버전 범프

## 6. 보고할 것

1. 바꾼 파일 2. 공개 API 3. Dialog 와 공유한 코드와 갈라진 부분 4. 앱 셸 연결 여부 5. verify·MCP 결과(카탈로그 바이트) 6. CHANGELOG 7. R35 보정
