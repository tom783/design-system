# R13 · 목록 화면을 완성할 수 있게 — Select · DropdownMenu · Toast · DatePicker

`AGENTS.md` 와 `DESIGN.md` **2절(색)** · **4절(치수)** · **11절(폼)** 을 먼저 읽어라.

사람이 정한 방향이다 — **shadcn/Radix 를 전면 채택한다.** 다만 받아온 소스를
그대로 붙이는 게 아니라 **우리 규약으로 번역**한다. 이유는 1절.

이번 라운드의 목표는 하나다: **주문 목록 화면 한 장을 실제로 만들 수 있게 한다.**
지금은 기간 필터도 상태 필터도 행 액션도 저장 알림도 없어서 한 장도 못 만든다.

---

## 1. 이미 깔아둔 것 — 다시 하지 마라

- `@radix-ui/react-select` · `@radix-ui/react-dropdown-menu` ·
  `@radix-ui/react-popover` · `@radix-ui/react-slot` · `react-day-picker` ·
  `date-fns` · `sonner` **설치 완료.** `package.json` 을 건드리지 마라.
- `components.json` 작성 완료.
- **토큰 브리지 완료.** `theme.css` 가 shadcn 이름(`--color-popover`,
  `--color-accent-foreground` …)을 우리 의미 토큰으로 연결한다.
  **그래서 `bg-popover` `text-muted-foreground` 같은 클래스를 그대로 두면
  우리 색이 자동으로 입혀진다.** 색 클래스를 우리 이름으로 바꾸지 마라 —
  브리지가 있으니 불필요하고, 바꾸면 shadcn 업데이트를 따라가기 어려워진다.
  대비 22쌍을 검증해뒀다(총 100건).

## 2. 소스를 어디서 가져오나

```
https://ui.shadcn.com/r/styles/new-york/<이름>.json
```
`select` · `dropdown-menu` · `popover` · `calendar` · `sonner`.
`files[].content` 가 소스다. **CLI 를 돌리지 마라** — `init` 이 `styles.css` 를
덮어쓰고 우리 토큰 위에 shadcn 기본 팔레트를 얹는다.

## 3. 번역 규칙 — 받아온 소스에 반드시 적용

1. **`"use client"` 제거.** Next.js 가 아니다.
2. **`cn` 임포트**를 `../../lib/cn` 로 바꾼다.
3. **`data-slot` 을 모든 주요 요소에 붙인다.** 우리 검증 하네스가 이걸로 찾는다
   (`data-slot="select-trigger"`, `"dropdown-menu-item"` 등). 최신 shadcn 소스에
   이미 있으면 그대로 두고, 없으면 더해라.
4. **높이를 우리 토큰에 맞춘다.** shadcn 은 `h-9`(36px)을 쓰지만 우리 컨트롤은
   `--control-h-md`(38px)다. **Select 트리거가 Input 옆에 섰을 때 높이가 달라
   보이면 안 된다.** `h-[var(--control-h-md)]` 로 바꿔라.
   같은 이유로 반경은 `rounded-[var(--radius-md)]`.
5. **한국어 JSDoc** 으로 "왜 이렇게 했는지"를 적는다. 다른 컴포넌트와 같은 결.
6. 파일 위치는 **우리 구조**를 따른다 — `components/ui/` 가 아니라
   `packages/ui/src/components/<이름>/<이름>.tsx` + `index.ts`.

## 4. 만들 것

### 4.1 `Select`

상태·정렬 필터용. Radix Select.

- 트리거 높이 `--control-h-md`, 경계선은 shadcn 의 `border-input` 그대로
  (브리지가 우리 `--border-input` 으로 연결한다 — 대비 3.86:1 검증됨).
- **`Field` 와 함께 동작해야 한다.** `Field` 가 `cloneElement` 로 `id` ·
  `aria-describedby` · `aria-invalid` 를 주입하는데, Radix Select 트리거가
  그걸 받는지 확인하고 안 되면 `Select` 가 받아서 트리거로 내려보내라.
- **`FormFlow` 안에서 Enter 는 Radix 에 맡긴다.** 트리거는 `button` 이라
  `form-flow.tsx` 가 이미 early return 한다(34행). 그대로 두되
  **스토리로 확인하라** — Enter 가 목록을 열어야지 다음 칸으로 가면 안 된다.
- 옵션이 20개를 넘으면 그건 Select 가 아니라 Combobox 다. **개발 모드 경고**
  (`Tour` 3단계 · `Peek` 6줄과 같은 규율).

### 4.2 `DropdownMenu`

표의 행 액션(⋯)용. Radix DropdownMenu.

- **파괴적 항목은 색만으로 구분하지 마라** — `destructive` 색 + 아이콘.
  2.3 에서 브랜드 레드와 에러 레드를 분리한 이유와 같다.
- **가상화된 표 안에서 열려 있는데 행이 언마운트되면** 어떻게 되는지
  스토리로 확인하라. Radix 는 포털로 body 에 붙으므로 잘리지는 않지만,
  트리거가 사라지면 포커스가 갈 곳을 잃는다 — `DataTable` 의 기존 포커스
  복구(`data-table.tsx` 106행 부근)와 충돌하는지 보라. **충돌하면 고치지 말고
  보고하라.**

### 4.3 `Toast`

저장·삭제 피드백. `sonner`.

- **`next-themes` 를 쓰지 마라.** 설치하지 않았다. shadcn 소스는 그걸로
  테마 문자열을 얻는데, 우리는 `document.documentElement` 의 `data-theme` 과
  `prefers-color-scheme` 으로 직접 판단한다 (DESIGN.md 의 3상태 테마).
  **세 상태를 모두 처리하라** — `data-theme="dark"` · `data-theme="light"` ·
  미지정(시스템 설정 따름).
- 성공/오류/정보 톤이 우리 `status-*` 토큰을 쓰게 하라.
- **`role` 과 자동 사라짐**: 오류 토스트는 사용자가 닫기 전까지 남긴다.
  "저장했습니다"는 사라져도 되지만 "저장 실패"가 4초 만에 사라지면 안 된다.

### 4.4 `DatePicker` — 이 도메인에서 가장 중요하다

판매·물류 목록 화면은 거의 전부 **기간 필터**로 시작한다.

- `react-day-picker` + Radix Popover.
- **단일 날짜와 기간(range) 둘 다** 지원. 기간이 주 용도다.
- **한국어.** `date-fns/locale/ko`. 요일 머리글자, 월 표기(`2026년 11월`).
- **빠른 선택 버튼**을 함께 둬라 — 오늘 · 최근 7일 · 이번 달 · 지난 달.
  운영자는 날짜를 하나씩 고르는 것보다 이걸 훨씬 많이 쓴다.
- 입력창에 직접 타이핑도 되게 하라. **IME 가드가 필요하다** —
  `useComposition` 을 재사용하라 (11.1). 한글 입력이 섞일 일은 적지만
  숫자 필드에서 조합 중 파싱하면 같은 문제가 난다.
- 날짜 숫자는 `tabular`.

## 5. 절대 바꾸지 마라 — 기존 컴포넌트

shadcn 에 같은 이름이 있어도 **우리 것을 교체하지 마라.** 전부 검증을 통과한
것들이고, 교체하면 그 검증이 무효가 된다:

| 우리 것 | 왜 지키나 |
|---|---|
| `Button` | 대비 검증·`leadingIcon`/`trailingIcon`·`type="button"` 기본값 |
| `Input` | 경계선 대비 근거(2절)·`numeric` |
| `Checkbox` | 네이티브 input 유지 — SR 의 혼합 선택 상태가 보존된다 |
| `Card` | Header/Title/Body/Footer 구조를 쓰는 곳이 있다 |
| `Tooltip` | CSS anchor + 포커스 링 규칙(10.3.1·R07-B), 브라우저 30건 |
| `Peek` | shadcn Popover 와 역할이 겹치지만 **목적이 다르다**(12.1) |
| `Skeleton`·`Avatar` | 치수 일치·이니셜 규칙 검증됨 |

**단, Radix Popover 는 `DatePicker` 내부용으로만 설치했다.** 독립 `Popover`
컴포넌트를 공개 API 로 내보내지 마라 — `Peek` 과 혼동된다.

## 6. 위치 계산 체계가 둘이 된다 — 섞지 마라

우리 `Tooltip`·`Hint`·`Tour`·`Peek` 은 CSS anchor positioning + popover 를 쓰고
(R07 에서 실측 확정), Radix 는 자체 포털·충돌 회피를 쓴다.

**둘을 섞지 마라.** Radix 컴포넌트는 Radix 방식으로, 우리 것은 우리 방식으로
둔다. `use-anchored.ts` 를 Radix 용으로 고치지 마라 — 30건이 걸려 있다.

## 7. 스토리

`select.stories.tsx` · `dropdown-menu.stories.tsx` · `toast.stories.tsx` ·
`date-picker.stories.tsx` · `list-screen.stories.tsx`

1. `셀렉트-기본` — 열기·선택·Escape, `data-slot` 확인
2. `셀렉트-Field` — `Field` 의 레이블·오류 배선이 트리거에 닿는다
3. `셀렉트-폼흐름` — `FormFlow` 안에서 **Enter 가 목록을 열고 다음 칸으로 안 간다**
4. `셀렉트-높이일치` — **Input 과 Select 의 높이가 같다**를 단언 (4절 3항)
5. `메뉴-행액션` — 표의 행에서 열고 항목 실행
6. `메뉴-파괴적항목` — 색 외 신호(아이콘)가 있다
7. `토스트-성공오류` — 오류는 자동으로 사라지지 않는다
8. `토스트-다크` — `data-theme` 3상태에서 색이 맞다
9. `날짜-기간선택` — 범위 선택이 동작한다
10. `날짜-빠른선택` — "최근 7일" 이 올바른 범위를 만든다
11. `날짜-한국어` — 월·요일이 한국어다
12. **`목록화면`** — DataTable + 기간 필터 + 상태 Select + 행 메뉴 + Toast 를
    **한 화면에 조립**한다. 이번 라운드가 실제로 목표를 달성했는지 보는 스토리다.

`play` 주의:
- `getComputedStyle` 은 라이브 객체다. 상태를 바꾸기 전에 복사하라.
- Radix 는 포털로 `body` 에 붙는다. **`canvasElement` 안에서만 찾으면 못 찾는다** —
  `document` 범위로 찾아야 하는 경우를 구분하라.

## 8. 완료 조건

```bash
pnpm verify
node --test packages/ui/src/lib/*.test.mjs packages/ui/src/components/*/*.test.mjs
```

기존 스토리가 전부 통과해야 한다. 특히 `components-form--*` 와
`components-guide--*` — 토큰 브리지가 기존 색을 바꾸지 않았는지 확인하는 셈이다.

## 9. 하지 마라

- `shadcn` CLI 실행 (`init`·`add`). `styles.css` 가 덮어써진다
- `package.json` 의존성 추가 — 필요한 건 다 깔았다
- 5절의 기존 컴포넌트 교체·수정
- `use-anchored.ts` 수정 (6절)
- 색 클래스를 우리 이름으로 치환 (1절 — 브리지가 처리한다)
- 토큰 생성기 · `packages/tokens/*` · `DESIGN.md` · `AGENTS.md` 수정
- 커밋 · 푸시

## 10. 보고할 것

- shadcn 소스에서 **바꾼 줄**과 이유 (번역 규칙 3절 적용 결과)
- `Field` + Radix Select 배선이 그냥 됐는지, 손을 댔는지
- `FormFlow` 안에서 Enter 동작 (실제 확인 결과)
- Input 과 Select 의 실측 높이
- 가상화 행 언마운트 시 메뉴 동작 (4.2)
- sonner 테마 3상태를 어떻게 판단했는지
- 의도적으로 하지 않은 것
