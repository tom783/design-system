# R18 · 조립 검증 — 등록 화면과 Enter 이동 계약

목록(R13)·상세(R15)는 있고 **등록 화면이 없다.** 그리고 R16·R17 에서 만든 컴포넌트를
실제 등록 폼에 넣어 보니 **Enter 이동이 무한 고리에 빠진다.** 먼저 그걸 고친다.

대상 섹션: `DESIGN.md §11.5` 보강 + `§19` 신설.

---

## 0. 전제 — 내가 브라우저에서 직접 측정한 결과

`FormFlow` 안에 `Field` + `Input` + `Combobox` + `RadioGroup` + `Switch` + `Textarea` 를
넣고 Enter 만 눌러 봤다.

### 0.1 Combobox 가 Enter 이동을 무한 고리로 가둔다 — 이게 이번 라운드의 본론

상품명에 포커스를 두고 **Enter 를 9번** 눌렀을 때의 포커스 경로:

```
name → combobox-trigger → combobox-input → combobox-trigger → combobox-input
     → combobox-trigger → combobox-input → combobox-trigger → combobox-input
     → combobox-trigger
```

**수량 칸에 영원히 도달하지 못한다. 제출 횟수 0.** 등록 화면이 Enter 로는 쓸 수 없다.

고리가 닫히는 기제 (따로 확인했다):

| 단계 | 결과 |
|---|---|
| 닫힌 트리거에서 Enter | 목록이 열리고 포커스가 검색 입력으로 |
| 목록에서 Enter | 선택되고 닫히며 **포커스가 트리거로 복귀** |
| 그 트리거에서 Enter | **다시 열린다** ← 고리 |

원인은 `form-flow.tsx` 가 `target.matches('select, button, …')` 에서 조기 반환하는 것이다.
콤보박스 트리거는 구현상 `<button>` 이라 "네이티브 동작 유지" 로 분류되고, 버튼의
네이티브 Enter 는 클릭이라 목록이 열린다.

### 0.2 Switch 는 Enter 로 **조용히 토글된다**

| 측정 | 결과 |
|---|---|
| 스위치에 포커스 후 Enter | `aria-checked` **false → true** |

Enter 를 "다음 칸" 으로 믿고 누르는 사용자가 `알림 받기` 를 켜 버린다. **값 사고다.**

### 0.3 RadioGroup 은 Enter 로 아무 일도 안 한다

이동도 선택도 없다. 고리는 아니지만 **멈춘다** — 사용자는 Tab 을 찾아야 한다.

### 0.4 라디오 그룹은 건너뛰지 않는다 — 내 가설이 틀렸다

차가운 라디오 항목은 `tabIndex=-1` 이어서(`r-normal:-1 r-express:-1`) 그룹 전체가
Tab 정지점에서 빠질 거라고 의심했는데, **아니었다.** Radix 가 그룹 루트 `div` 에
`tabindex=0` 을 준다. 실제 정지점:

```
name[input] · combobox-trigger[button] · qty[input] · radio-group[div]
· switch[button] · memo[textarea] · owner[input] · submit[button]
```

순서도 맞다. **이 부분은 고칠 것이 없다.**

---

## 1. Enter 이동 계약을 고친다

### 1.1 원칙

§11.5 는 "**이동 순서는 Tab 순서와 같다. 둘이 다르면 사용자가 둘 다 못 믿는다**" 고
말한다. 지금은 입력 칸 사이에서만 지켜지고 **버튼으로 구현된 컨트롤에서 깨진다.**

Enter 는 한 가지만 뜻해야 한다 — **"이 칸 끝났다, 다음으로."**
컨트롤 고유 동작은 Space·화살표가 맡는다.

단, **콤보박스는 예외다.** Enter 로 그냥 지나가면 사용자가 골라야 하는 칸을 건너뛴다.
그래서 콤보박스만 "열고, 고르면 다음으로" 다.

| 컨트롤 | Enter | 고유 동작 |
|---|---|---|
| `Input` | 다음 칸 (지금과 같다) | — |
| `Textarea` | 줄바꿈 (§11.5) | `Ctrl/Cmd+Enter` 제출 |
| **`Combobox`** | **닫혀 있으면 연다. 고르면 다음 칸으로 간다** | 화살표·Space 로도 열린다 |
| **`Switch`** | **다음 칸. 토글하지 않는다** | **Space** 가 토글 |
| **`RadioGroup`** | **다음 칸** | **화살표**가 선택 |
| 제출 버튼 | 제출 (네이티브) | — |
| 그 밖의 버튼 | **네이티브 유지** (주소 찾기 같은 실제 액션은 Enter 로 눌려야 한다) | — |

마지막 줄이 중요하다. **모든 버튼을 "다음 칸" 으로 만들면 안 된다.**

### 1.2 구현 — 명시적 계약을 둔다

FormFlow 가 우리 컴포넌트 이름을 하드코딩하면 안 된다. 속성으로 계약한다:

- `data-form-control="advance"` — Enter 가 다음 칸으로 간다. `Switch` 와
  `RadioGroupItem` 에 붙인다.
- 콤보박스 트리거에는 **붙이지 않는다.** 네이티브 Enter(열기)를 유지한다.

`form-flow.tsx` 의 조기 반환을 고쳐라:

```
버튼류를 만나면
  → [data-form-control="advance"] 이면 preventDefault 하고 다음 정지점으로
  → 아니면 지금처럼 네이티브에 맡긴다
```

앱이 자기 컨트롤을 같은 방식으로 옵트인할 수 있어야 한다. §11.5 에 그 속성을 적어라.

### 1.3 콤보박스가 고른 뒤 다음 칸으로 간다

이동 순서를 아는 것은 `FormFlow` 다. `Combobox` 가 자기 멋대로 다음 요소를 찾으면
두 곳이 Tab 순서를 소유하게 된다 — §11.5 가 금지하는 상태다.

그러니 **`form` 모듈이 헬퍼를 내보내고** Combobox 가 그걸 부르게 해라:

```ts
/** 폼 안의 다음 Tab 정지점으로 포커스를 옮긴다. FormFlow 폼이 아니면 아무것도 하지 않는다. */
export function focusNextFormStop(from: HTMLElement): boolean
```

- `FormFlow` 가 자기 `<form>` 에 표식을 남긴다(예: `data-form-flow`).
- `focusNextFormStop` 은 `from.closest('form[data-form-flow]')` 가 없으면 `false` 를
  돌려주고 끝낸다. **FormFlow 밖의 Combobox 는 지금 그대로 동작해야 한다.**
- `tabStops` 로직을 복제하지 마라. 같은 함수를 쓰게 정리해라.
- 기존 `nextFocusable`·`tabStops` 의 동작을 바꾸지 마라. 폼·IME 하네스 19건이 그걸 지킨다.

`Combobox` 는 선택이 확정된 뒤(닫힌 뒤) 이 헬퍼를 부른다. **조합 중 선택은 이미
막혀 있으니(R17) 그 경로에서는 부르지 마라.**

### 1.4 깨지면 안 되는 것

- `pnpm qa` 의 **폼·한글 IME 19건**과 **검색 선택 29건**이 전부 그대로 통과해야 한다.
  하나라도 깨지면 그 검사가 무엇을 지키고 있었는지 **보고하고 멈춰라.**
- FormFlow 밖의 Combobox·Switch·RadioGroup 동작은 바뀌지 않는다.

## 2. 등록 화면

`packages/ui/src/stories/create-screen.stories.tsx`, `title: 'Screens/CreateScreen'`.
R13 `list-screen`, R15 `detail-screen` 과 같은 결로 만들어라.

주문 등록 화면 하나. 이번 라운드에서 고친 것이 **한 화면에서 전부** 보여야 한다:

1. `Breadcrumb`: `주문 관리 / 주문 목록 / 신규 등록`
2. `FormFlow` 로 감싼 폼. 칸 구성(이 순서대로 Enter 로 끝까지 가야 한다):
   `상품명`(Input, 필수) → `사업장`(Combobox) → `수량`(Input, inputMode=numeric)
   → `배송`(RadioGroup) → `알림`(Switch) → `비고`(Textarea) → `담당자`(Input) → 저장
3. **금액·수량에 `type="number"` 를 쓰지 마라** (§17 실측).
4. 제출 오류: 필수 칸을 비우고 저장하면 **첫 오류로 이동**한다(§11.2).
   첫 오류가 Combobox 인 경우도 포함해 동작해야 한다.
5. 저장 성공 → `toast.success` → 목록으로 복귀.
6. `restartOnSubmit` 을 쓰는 "연속 등록" 변형 스토리 하나. 제출 후 첫 칸으로 돌아간다.

## 3. 세 화면을 잇는 흐름

`packages/ui/src/stories/flow.stories.tsx`, `title: 'Screens/Flow'`.

**목록 → 등록 → 저장 → 목록 복귀**를 한 스토리에서 실제로 돌려라.

- 목록에서 "신규 등록" 을 누르면 등록 화면으로 간다. 떠날 때
  `useReturnContext.capture` 로 행·스크롤을 기록한다(R10).
- 저장하면 목록으로 돌아오고 **새 행이 보이며 재방문 마커가 붙는다**(§12.3).
  필터는 앱 상태로 보관한다 — R15 의 상세 화면이 하는 것과 같은 배선이다.
- 등록 중 Breadcrumb 의 "주문 목록" 으로 이탈하면 **작성 중인 내용 확인**을 받는다.
  `Dialog` 가 아니라 화면 전환이므로 `AlertDialog` 로 확인한다(§16.4).

## 4. 검증 하네스

`docs/qa/create-render-verify.mjs` 를 새로 만들고 `docs/qa/run-all.mjs` 에 등록해라.
**반드시 `docs/qa/browser.mjs` 를 쓴다.**

### 이 라운드의 핵심 검사 — 이게 통과해야 라운드가 끝난다

**상품명에서 Enter 만 눌러 저장 버튼까지 도달한다.** 0.1 의 무한 고리를 막는 검사다.
포커스 경로를 **전부 기록해서** 단정해라. 같은 요소가 두 번 연속 나오거나
`combobox-trigger` ↔ `combobox-input` 왕복이 보이면 실패다. 경로 전체를 비교해라:

```
상품명 → 사업장(트리거) → [열림] → 고르기 → 수량 → 배송 → 알림 → 비고 → 담당자 → 저장
```

그 밖에:

- 스위치에 포커스를 두고 Enter → **`aria-checked` 가 바뀌지 않고** 다음 칸으로 간다
- 같은 스위치에서 **Space → 토글된다** (고유 동작은 살아 있다)
- 라디오에서 Enter → 다음 칸으로 간다. **화살표 → 선택이 바뀐다**
- 콤보박스에서 고른 직후 포커스가 **다음 칸(수량)** 이다. 트리거가 아니다
- FormFlow **밖**의 콤보박스는 고른 뒤 포커스가 트리거에 남는다 (1.3 경계)
- 실제 액션 버튼(제출 아님)은 Enter 로 **눌린다** — 다음 칸으로 가지 않는다
  스토리에 그런 버튼을 하나 두고 검사해라
- 필수 칸을 비우고 제출 → 첫 오류로 포커스가 간다
- 저장 → 토스트가 보이고 목록으로 복귀하며 새 행에 재방문 마커가 있다
- 연속 등록: 제출 후 첫 칸으로 돌아간다
- Textarea 에서 Enter 는 여전히 줄바꿈이다 (R16 회귀 방지)
- 콘솔 오류 0건

### 하네스 함정 — 이미 밟은 것들이다

- **Enter 에 `text: '\r'` 을 넣어라.** `'\n'` 은 아무 일도 하지 않는다 (R16).
- **화살표·Space 는 `rawKeyDown` → 대기 → `keyUp` 으로 떼어 보내라.** 붙여 보내면
  Radix 가 keydown/keyup 사이에 보는 상태가 지워진다 (R16).
- **`id` 로 찾지 마라.** cmdk 가 덮어쓴다 (R17). `data-slot`·`data-probe` 를 써라.
- **포커스 단정 앞에는 대기 루프.** 즉시 읽으면 CI 에서 거짓 실패한다.
- **좌표 클릭을 내부 버튼에 쓰지 마라.** `scrollIntoView` 가 문서를 움직인다 (R15).

## 5. 유지보수 꼬리

- `docs/research/component-intent.mjs`: 새 컴포넌트는 없다. **`FormFlow` 의 `rules` 를
  고쳐라** — Enter 계약이 바뀌었다. `Switch`·`RadioGroupItem`·`Combobox` 의 `rules` 에도
  Enter 동작을 적어라. 섹션은 `11.5`(계약)와 `19`(조립).
- `packages/mcp/match.test.mjs`: 라우팅은 안 바뀐다. 기존 케이스가 깨지지 않는지만 확인.
- `DESIGN.md §11.5` 에 1.1 표와 `data-form-control` 계약을 적어라.
  `DESIGN.md §19` 에 등록 화면·세 화면 흐름·0 번 측정값을 적어라.
- 예산 여유 13,072 바이트. 새 컴포넌트가 없으니 여유롭다.

## 6. 하지 마라

- 모든 버튼을 "다음 칸" 으로 만들기 (실제 액션 버튼이 죽는다)
- `Combobox` 가 자기 멋대로 다음 요소를 찾기 (Tab 순서 소유자는 FormFlow 다)
- `tabStops`·`nextFocusable` 의 기존 동작 변경
- FormFlow 밖 컴포넌트 동작 변경
- 금액·수량에 `type="number"`
- 새 토큰·새 z-index
- `internal/` 밖에서 `cmdk`·`@radix-ui/*` import
- 폼·IME 19건 또는 검색 선택 29건을 "고치기" — 그건 회귀 신호다

## 7. 보고할 것

1. 새로 만든 파일 목록
2. `pnpm verify` · `pnpm typecheck` 결과
3. **Enter 만 눌렀을 때의 포커스 경로** (0.1 과 대조할 수 있게 그대로 적어라)
4. 0 번 표와 다르게 나온 측정 (있으면 값과 재현 방법)
5. 기존 검사 중 손댄 것이 있으면 **무엇을 왜** (있으면 반드시)
6. 명세와 다르게 구현한 부분

브라우저는 네 샌드박스에서 못 띄운다. `pnpm qa` 는 내가 돌린다. 하네스는 **작성만** 해라.
