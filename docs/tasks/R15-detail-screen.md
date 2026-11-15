# R15 · 상세 화면 — Tabs · Breadcrumb · Dialog · AlertDialog

R13 에서 목록 화면을 완성했다. R10 에서는 "돌아오는 길"(`useReturnContext`)을 설계했지만
**정작 그 경로를 그릴 컴포넌트가 없다.** 이번 라운드가 그 구멍을 메우고 상세 화면을 닫는다.

대상 섹션: `DESIGN.md §16`. (§15 가 마지막이다. §16 을 새로 만든다.)

---

## 0. 전제 — 내가 브라우저에서 직접 측정한 결과

추측하지 마라. 아래는 순수 Radix 를 띄워 CDP 로 잰 값이다. **이 표가 설계의 근거다.**
의심되면 다시 재라. 단, 재측정 없이 표와 다르게 구현하지는 마라.

| 측정 항목 | 결과 |
|---|---|
| `Tabs activationMode="automatic"` + ArrowRight | 포커스와 선택이 **같이** 이동, 패널 즉시 교체 |
| `Tabs activationMode="manual"` + ArrowRight | 포커스만 이동(`tab-b`), 선택은 유지(`tab-a`). **Enter 가 확정** |
| 탭의 roving tabindex | 선택된 탭 `0`, 나머지 `-1` |
| 탭 패널 | `tabIndex=0` + `aria-labelledby` 가 자동으로 붙는다 |
| `Dialog` 열린 직후 포커스 | **첫 포커스 가능 요소** (내 프로브에서는 `<input>`) |
| `Dialog` Escape | 닫힌다. `onEscapeKeyDown` 에서 `preventDefault()` 하면 **안 닫힌다** |
| `Dialog` 바깥 클릭 | 닫힌다. `onPointerDownOutside`/`onInteractOutside` `preventDefault()` 로 **막힌다** |
| 위 둘을 막은 상태에서 명시적 닫기 버튼 | **정상 동작한다** (갇히지 않는다) |
| `AlertDialog` 열린 직후 포커스 | **Cancel** — Radix 가 자동으로 옮긴다 |
| `AlertDialog` 바깥 클릭 | 안 닫힌다 (의도된 동작) |
| `AlertDialog` Escape | 닫힌다 |
| `Dialog` 안의 Radix `Select` | Dialog 위에 정상 표시 |
| `Dialog` 안의 native `popover` | `z-index:auto` 인데도 Dialog(`z-index:50`) **위**. 픽셀 `rgb(0,248,0)` |
| `Dialog` 위의 sonner 토스트 | **위에 그려진다.** 픽셀 `rgb(255,0,0)` |
| Dialog 열렸을 때 바깥 콘텐츠 | `aria-hidden="true"` 가 걸린다 |
| Dialog 열렸을 때 토스트의 `aria-hidden` | **안 걸린다 — 읽힌다** (sonner 가 지연 마운트하기 때문) |

### 이 표에서 바로 나오는 결론 두 개

**(1) z-index 를 손댈 곳이 없다.** native `popover` 는 top layer 라 z-index 를 아예 이긴다.
Radix 포털과 sonner 는 이미 위에 온다. **z-index 스케일 토큰을 만들지 마라.** 필요 없다.
우리 Tooltip·Hint·Tour 는 `popover="manual"` 이므로 Dialog 안에서 아무 조정 없이 동작한다.

**(2) 토스트가 Dialog 안에서도 읽힌다 — 단, 이유가 우연이다.**
sonner 는 토스트가 0개면 컨테이너를 DOM 에서 **없앤다**(실측). 그래서 Dialog 가 바깥을
`aria-hidden` 으로 덮을 때 컨테이너가 존재하지 않고, 나중에 생기는 노드는 그 처리를 피한다.
→ **Toaster 를 강제로 상주시키지 마라.** 그 "최적화"가 접근성을 깬다. 주석으로 남겨라.

---

## 1. Tabs

`packages/ui/src/internal/tabs.ts` 에 `@radix-ui/react-tabs` 재수출. 그 파일 밖에서 Radix 를
import 하면 `pnpm verify` 가 `scripts/check-boundaries.mjs` 로 떨어뜨린다.

`packages/ui/src/components/tabs/tabs.tsx` + `tabs.css`.

- 내보낼 것: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`.
- `activationMode` 는 **그대로 통과시킨다. 기본값은 Radix 기본인 `automatic` 을 유지한다.**
  shadcn 에서 오는 사람이 놀라지 않는 게 더 중요하다. 대신 규칙으로 적는다 —
  **패널이 서버에서 데이터를 가져오면 `manual` 을 써라.** `automatic` 이면 탭 4개를
  화살표로 지나가는 동안 요청이 4번 나간다.
- 탭 높이·선택 표시: 선택된 탭은 **아래쪽 2px 경계선**(`--border-focus` 아님,
  브랜드 강조색)으로 표시하고, 색만으로 구분하지 않도록 **글자 굵기도 함께** 바꾼다.
  (§2.4 — 색만으로 정보를 전달하지 않는다.)
- `TabsList` 가 넘칠 때: **가로 스크롤.** 줄바꿈하지 마라 — 높이가 변해 아래 레이아웃이 밀린다.
  `overflow-x:auto`, 스크롤바는 숨기지 말고 얇게. 선택된 탭이 보이지 않으면
  `scrollIntoView({ block:'nearest', inline:'nearest' })` 로 끌어온다.
  **`behavior:'smooth'` 는 `prefers-reduced-motion` 에서 끈다.**
- 포커스 링은 기존 `--border-focus` 규칙을 따른다. 선택 표시와 혼동되지 않게 해라.

## 2. Breadcrumb

Radix 에 없다. 평범한 마크업이다 — `@radix-ui/react-slot` 만 쓴다(이미 설치됨).

`packages/ui/src/components/breadcrumb/breadcrumb.tsx` + `breadcrumb.css`.

- 구조: `<nav aria-label="breadcrumb"><ol>…</ol></nav>`.
- 내보낼 것: `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`,
  `BreadcrumbPage`, `BreadcrumbSeparator`, `BreadcrumbEllipsis`.
- 마지막 항목은 링크가 아니라 `BreadcrumbPage` 이고 `aria-current="page"` 를 갖는다.
- `BreadcrumbSeparator` 는 `<li role="presentation" aria-hidden="true">`. 보조기기가 읽으면 소음이다.
- `BreadcrumbLink` 는 `asChild` 를 지원한다. **우리가 라우터를 정하지 않는다** —
  Next `<Link>` 든 `<a>` 든 앱이 넣는다.
- 경로가 길면: 첫 항목 + `BreadcrumbEllipsis` + 마지막 2개. 중간을 접는다.
  `BreadcrumbEllipsis` 는 `aria-hidden` 이 아니라 **접힌 항목 수를 읽을 수 있게** 해라
  (`<span class="sr-only">생략된 경로 N개</span>`).
- 링크는 §2.4 에 따라 **밑줄**을 쓴다.

### R10 과의 연결 — 이게 이번 라운드의 핵심이다

Breadcrumb 은 **표현만** 한다. 복원은 앱이 한다. 다만 **그 배선을 조립 스토리에서 실제로
보여줘라**: 상세 화면의 "주문 목록" 링크를 누르면 `useReturnContext().consume()` 으로
읽은 기록(필터·스크롤·재방문 행)이 목록에 적용되는 흐름. 컴포넌트에 라우팅을 넣지 마라.

## 3. Dialog

`packages/ui/src/internal/dialog.ts` 에 재수출. `packages/ui/src/components/dialog/dialog.tsx`.

- 내보낼 것: `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`,
  `DialogDescription`, `DialogFooter`, `DialogClose`.
- `DialogTitle` 과 `DialogDescription` 은 **필수다.** 없으면 Radix 가 콘솔 경고를 낸다 —
  `pnpm qa` 의 콘솔 오류 검사가 잡는다. 설명이 정말 없으면 `aria-describedby={undefined}`.
- 순서는 §11.4 를 따른다: 제목 → 설명 → 내용 → 푸터.

### `dismissible` — 이번 라운드에서 새로 만드는 유일한 API

```ts
interface DialogContentProps {
  /** false 면 바깥 클릭·Escape 로 닫히지 않는다. 명시적 닫기 버튼은 계속 동작한다. */
  dismissible?: boolean;          // 기본 true
  /** dismissible=false 일 때 닫으려는 시도가 있었음을 알린다. */
  onDismissAttempt?: () => void;
}
```

구현은 측정된 그대로다 — `onEscapeKeyDown`·`onPointerDownOutside`·`onInteractOutside` 에서
`preventDefault()` 하고 `onDismissAttempt()` 를 부른다. 세 핸들러 모두 막아야 한다
(`onInteractOutside` 만 막으면 포커스 바깥 이동이 남는다).

**규칙: 입력을 받는 Dialog 는 `dismissible={false}` 를 쓴다.** 바깥을 잘못 클릭해서
작성 중인 내용이 사라지는 건 사고다. 그리고 `onDismissAttempt` 로 **확인 AlertDialog** 를
띄운다 — Escape 를 아무 반응 없이 삼키지 마라. 그건 더 나쁘다.

### 초기 포커스

Radix 는 첫 포커스 가능 요소로 옮긴다(실측). 폼 다이얼로그에서는 그게 보통 맞다.
**바꾸지 마라.** 다만 파괴적 버튼이 첫 요소가 되는 배치를 만들지 마라.

## 4. AlertDialog

`packages/ui/src/internal/alert-dialog.ts` 에 재수출.
`packages/ui/src/components/dialog/alert-dialog.tsx` (같은 디렉터리, 다른 파일).

- 내보낼 것: `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`,
  `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogAction`,
  `AlertDialogCancel`.
- **`AlertDialogCancel` 을 반드시 둔다.** Radix 가 여기로 초기 포커스를 옮긴다(실측).
  없으면 포커스가 파괴적 버튼에 떨어지고, Enter 한 번에 삭제된다.
- `AlertDialogAction` 의 파괴적 변형은 기존 danger 액션 토큰을 쓴다. 새 토큰을 만들지 마라.
- 바깥 클릭으로 닫히지 않고 Escape 로는 닫힌다 — Radix 기본값 그대로 두고 **덮어쓰지 마라.**
  이게 "기본은 취소"다.

### Dialog 와 AlertDialog 를 언제 쓰나 — `dont` 에 넣을 규칙

- Dialog: 입력·편집·선택처럼 **되돌릴 수 있는** 일.
- AlertDialog: 삭제·취소·되돌릴 수 없는 일. **선택을 강제한다.**
- AlertDialog 에 폼을 넣지 마라. 입력이 필요하면 Dialog 다.

## 5. 조립 스토리 — 완료 조건

`packages/ui/src/stories/detail-screen.stories.tsx`, `title: 'Screens/DetailScreen'`.
R13 의 `list-screen.stories.tsx` 를 참고해 같은 결로 만들어라.

주문 상세 화면 하나. 아래가 **한 화면에서 전부** 동작해야 한다:

1. Breadcrumb: `주문 관리 / 주문 목록 / ORD-20481`. 마지막은 `aria-current="page"`.
2. Tabs 4개(기본정보·배송·결제·이력), **`activationMode="manual"`** — 패널이 서버에서
   온다는 설정이니 규칙대로. 패널 중 하나는 `Skeleton` 으로 로딩을 보여준다.
3. "수정" → `Dialog`, `dismissible={false}`. 안에 `Field` + `Input` + `Select`.
   바깥 클릭·Escape 시 `onDismissAttempt` → **확인 AlertDialog**("작성 중인 내용이 사라집니다").
4. "삭제" → `AlertDialog`. Cancel 에 초기 포커스.
5. 저장 성공 → `toast.success`. Dialog 안에서 띄워도 보이고 읽힌다(실측).
6. 탭 넘침 스토리 하나 더: 탭 8개를 좁은 폭에 두고 가로 스크롤 + 선택 탭 끌어오기 확인.

`play` 를 붙여라. **단, `play` 는 열었다가 전부 닫고 끝난다는 걸 기억해라** —
사후 상태를 "열려 있다"고 가정하는 단정을 쓰지 마라. (R13B 에서 밟은 함정이다.)

## 6. 검증 하네스

`docs/qa/detail-render-verify.mjs` 를 새로 만들고 `docs/qa/run-all.mjs` 에 등록해라.
**반드시 `docs/qa/browser.mjs` 를 쓴다.** 직접 브라우저를 띄우지 마라.

최소한 아래를 검사해라 (0. 표의 항목들이다):

- 탭 roving tabindex (선택 `0`, 나머지 `-1`)
- `manual` 에서 ArrowRight 가 선택을 **안** 바꾸고 Enter 가 바꾼다
- 패널에 `aria-labelledby` 가 있다
- Breadcrumb 마지막 항목의 `aria-current="page"`, separator 의 `aria-hidden`
- `dismissible={false}` 에서 Escape·바깥 클릭이 닫지 않는다
- 같은 상태에서 명시적 닫기 버튼은 닫는다
- AlertDialog 열린 직후 `document.activeElement` 가 Cancel 이다
- Dialog 안에서 Select 가 열린다
- 콘솔 오류 0건 (Radix 의 Title/Description 경고 포함)

**포커스 단정 앞에는 대기 루프를 넣어라.** 즉시 읽으면 부하 걸린 CI 에서 거짓 실패한다
(peek·guide 하네스에 같은 주석이 있다).

## 7. 유지보수 꼬리 — 빼먹으면 verify 가 떨어진다

- `docs/research/component-intent.mjs` 에 새 컴포넌트 **전부** 항목 추가
  (purpose/useWhen/dont/rules/props/slots/keywords). 섹션은 `16`.
  키워드에 실제로 쓸 말을 넣어라: `탭`, `탭 헤더`, `경로`, `빵부스러기`, `뒤로`,
  `모달`, `다이얼로그`, `팝업`, `확인창`, `삭제 확인`, `되돌릴 수 없`.
- `docs/research/match.test.mjs` 에 라우팅 케이스 추가.
  최소: "삭제 확인" → `AlertDialog`, "모달 띄우기" → `Dialog`, "탭으로 나누기" → `Tabs`,
  "목록으로 돌아가는 경로" → `Breadcrumb`.
- `packages/ui/src/index.ts` 내보내기. `styles.css` 에 새 CSS 연결.
- `pnpm tokens` 는 돌릴 필요 없다. **새 토큰을 만들지 마라.** 0. 결론 (1) 을 보라.

## 8. 하지 마라

- z-index 토큰·스케일 신설 (측정 결과 불필요)
- `internal/` 밖에서 `@radix-ui/*` import
- JS 에서 CSS import (`styles.css` 로만 연결한다)
- Radix 의 `AlertDialog` 바깥클릭/Escape 기본값 덮어쓰기
- `TabsList` 줄바꿈
- Toaster 상주화
- `activationMode` 기본값을 `manual` 로 바꾸기

## 9. 보고할 것

1. 새로 만든 파일 목록
2. `pnpm verify` 결과
3. `pnpm typecheck` 결과
4. 0. 표와 **다르게 나온 측정이 있었는지** — 있으면 그 값과 재현 방법
5. 구현하다 막혀서 명세와 다르게 한 부분 (있으면 반드시)

브라우저는 네 샌드박스에서 못 띄운다. `pnpm qa` 는 내가 돌린다. 하네스는 **작성만** 해라.
