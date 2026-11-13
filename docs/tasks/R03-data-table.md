# R03-A · 데이터 테이블 구현 지시서

TanStack Table **v9.3.1** 기반 `DataTable` 컴포넌트를 만든다.
`AGENTS.md` 와 `DESIGN.md` 를 먼저 읽어라. 토큰·스타일 규율은 거기 있는 것을 따른다.

---

## 0. v9 API 검증된 레퍼런스 — 이걸 그대로 따라라

v9 는 v8 과 구조가 다르다. **아래 코드는 이 저장소에서 `pnpm typecheck` 0 에러로 검증한 것이다.**
v8 기억이나 인터넷 예제를 따르지 말고 이 형태를 쓴다.

```tsx
import {
  useTable, tableFeatures, createColumnHelper, flexRender,
  rowSelectionFeature, rowSortingFeature, columnPinningFeature, columnVisibilityFeature,
  createSortedRowModel,
} from '@tanstack/react-table';

// (1) row model 은 useTable 옵션이 아니라 tableFeatures 의 "슬롯"에 들어간다.
//     coreRowModel 은 생략하면 createCoreRowModel() 이 기본으로 적용된다.
// (2) 등록하지 않은 feature 의 메서드는 타입에 존재하지 않는다.
//     columnVisibilityFeature 를 빼면 row.getVisibleCells() 가 없다.
const features = tableFeatures({
  rowSelectionFeature,
  rowSortingFeature,
  columnPinningFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
});

const helper = createColumnHelper<typeof features, Order>();

// (3) helper.columns([...]) 로 감싸야 각 컬럼의 TValue 가 보존된다.
//     생략하면 ColumnDef<..., unknown>[] 과 불일치로 TS2322 가 난다.
const columns = helper.columns([
  helper.accessor('id', { header: '주문번호' }),
  helper.accessor('amount', { header: '금액', cell: (c) => c.getValue().toLocaleString() }),
]);

const table = useTable({ features, columns, data, getRowId: (r) => r.id, enableRowSelection: true });

table.getHeaderGroups()        // → hg.headers[].column.getToggleSortingHandler() / getIsSorted()
table.getRowModel().rows       // → row.getIsSelected() / getToggleSelectedHandler() / getVisibleCells()
flexRender(h.column.columnDef.header, h.getContext())
flexRender(cell.column.columnDef.cell, cell.getContext())
```

**컬럼 고정은 `left/right` 가 아니라 `start/end` 다:**
`ColumnPinningPosition = false | 'start' | 'end'` ·
`column.pin('start')` · `column.getIsPinned()` ·
`table.getPinnedVisibleLeafColumns('start' | 'center' | 'end')` ·
`row.getStartVisibleCells()` / `getCenterVisibleCells()` / `getEndVisibleCells()`

---

## 1. 만들 파일

| 경로 | 내용 |
|---|---|
| `packages/ui/src/components/data-table/data-table.tsx` | `DataTable` 본체 |
| `packages/ui/src/components/data-table/use-data-table.ts` | `useDataTable` 훅 (테이블 인스턴스 생성 + 상태) |
| `packages/ui/src/components/data-table/selection-column.tsx` | 선택 체크박스 컬럼 팩토리 |
| `packages/ui/src/components/data-table/export-csv.ts` | CSV 내보내기 |
| `packages/ui/src/components/data-table/index.ts` | 재수출 |
| `packages/ui/src/components/checkbox.tsx` | `Checkbox` (없으므로 새로 만든다) |
| `packages/ui/src/stories/data-table.stories.tsx` | Storybook 스토리 |

`packages/ui/src/index.ts` 에 공개 API 를 추가한다.

---

## 2. 공개 API

```ts
export interface DataTableProps<T> {
  data: T[];
  columns: /* helper.columns([...]) 결과 */;
  getRowId: (row: T) => string;

  /** 'none' 기본. 'single' 은 라디오처럼 하나만, 'multi' 는 체크박스 + 전체선택 */
  selectionMode?: 'none' | 'single' | 'multi';
  selectedIds?: string[];                       // 제어 모드
  onSelectedIdsChange?: (ids: string[]) => void;

  /** 행 클릭. 상세로 이동하는 용도. 선택과 독립이어야 한다 (4절) */
  onRowClick?: (row: T) => void;

  /** 컬럼 id 배열. 선택 컬럼은 자동으로 start 에 들어간다 */
  pinnedStart?: string[];
  pinnedEnd?: string[];

  density?: 'compact' | 'default' | 'comfortable';   // 기본 'default'
  state?: 'idle' | 'loading' | 'empty' | 'error';    // 기본 'idle'
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;

  /** 지정하면 툴바에 내보내기 버튼이 나온다 */
  exportFileName?: string;

  caption?: string;      // 스크린리더용 표 설명. 필수에 가깝게 취급한다
  className?: string;
}
```

제어/비제어 양쪽을 지원한다. `selectedIds` 가 주어지면 제어 모드, 없으면 내부 상태.

---

## 3. 수치 — 추측하지 말고 이 값을 쓴다

| 항목 | compact | default | comfortable |
|---|---|---|---|
| 행 높이 | `var(--row-h-compact)` 36px | `var(--row-h-default)` 40px | `var(--row-h-comfortable)` 48px |
| 셀 좌우 여백 | 12px | `var(--cell-px)` 14px | 16px |
| 글자 크기 | `var(--text-caption)` 13px | `var(--text-body-sm)` 14px | `var(--text-body-sm)` 14px |

- 헤더: `bg-canvas`, `text-fg-muted`, 굵기 600, 하단 `border-line-strong` 1px
- 행 구분선: 하단 `border-line` 1px
- 행 호버: `bg-hovered`
- 선택된 행: `bg-selected`
- 숫자 컬럼: 우측 정렬 + `.tabular` + 최소 너비 `var(--cell-min-w-money)` 128px
- 텍스트 컬럼 최소 너비: `var(--cell-min-w-text)` 80px
- 선택 체크박스 컬럼: 너비 44px 고정, 가운데 정렬
- 정렬 가능 헤더: 커서 pointer, 정렬 아이콘은 **항상 자리를 차지**한다
  (정렬 시에만 나타나면 헤더 폭이 흔들린다). 미정렬 상태는 opacity 0.35

**그림자를 쓰지 않는다.** 고정 컬럼과 스크롤 영역의 경계는
불투명 `bg-surface` + `border-line-strong` 1px 로만 표현한다 (`DESIGN.md` 5절).

---

## 4. 행 클릭과 선택이 충돌하지 않아야 한다

이 요구사항이 이 컴포넌트에서 가장 틀리기 쉬운 부분이다.

- 체크박스(또는 그 셀) 클릭 → **선택만** 토글. `onRowClick` 을 호출하지 않는다.
  체크박스 셀에서 `stopPropagation()` 한다.
- 행의 다른 곳 클릭 → `onRowClick` 만 호출. 선택 상태를 바꾸지 않는다.
- `selectionMode: 'none'` 이고 `onRowClick` 이 있으면 행 전체가 클릭 대상이다.
- 키보드: 행에 `tabIndex=0`, Enter/Space 로 `onRowClick` 실행.
  단 `onRowClick` 이 없으면 포커스 받지 않는다 (빈 탭 스톱을 만들지 않는다).
- 텍스트를 드래그 선택하는 중에는 `onRowClick` 이 발동하지 않아야 한다.
  mousedown 좌표와 mouseup 좌표가 4px 이상 다르면 클릭으로 보지 않는다.

`selectionMode: 'single'` 일 때는 한 행만 선택된다. 새 행을 선택하면 이전 선택이 풀린다.
`'multi'` 는 헤더에 전체선택 체크박스를 둔다 — 일부만 선택된 상태는
`indeterminate` 로 표시한다 (`input.indeterminate` 는 DOM 속성이므로 ref 로 설정해야 한다).

---

## 5. 컬럼 고정과 가로 스크롤

- 바깥 컨테이너가 `overflow-x: auto`. 페이지 본문이 가로로 스크롤되면 안 된다.
- 고정 컬럼은 `position: sticky` + `left`/`right` 누적 오프셋.
  오프셋은 앞선 고정 컬럼들의 실제 너비 합으로 계산한다 (하드코딩 금지).
- start 고정 묶음의 마지막 컬럼에 `border-right`, end 고정 묶음의 첫 컬럼에 `border-left`
  를 `border-line-strong` 으로 준다.
- 고정 컬럼 셀은 반드시 불투명 배경(`bg-surface`, 선택 시 `bg-selected`, 호버 시 `bg-hovered`).
  투명하면 스크롤되는 내용이 뒤로 비친다.
- 헤더도 같은 규칙으로 고정된다. `thead` 는 `position: sticky; top: 0`.

---

## 6. 상태 표현

- `loading`: 스켈레톤 행 **5개**. 각 셀에 셀 너비의 60~80% 폭 블록,
  `bg-sunken` + `animate-pulse` 대신 **1.4s ease-in-out infinite** 로 opacity 0.4↔1 왕복.
  `prefers-reduced-motion` 에서는 애니메이션 없이 정적 블록.
- `empty`: 표 영역 가운데에 `emptyMessage`(기본 "표시할 데이터가 없습니다").
  아이콘 쓰지 않는다. 글자만.
- `error`: `errorMessage` + `onRetry` 가 있으면 "다시 시도" 버튼(`Button variant="secondary"`).
  `status-danger-fg`/`bg` 토큰을 쓰고 아이콘을 함께 둔다 (색 단독 금지).
- 세 상태 모두 `<tbody>` 안에서 `colSpan` 으로 전체 폭을 차지한다.
  테이블 구조를 벗어난 별도 div 로 그리지 않는다 — 헤더 정렬이 깨진다.

---

## 7. CSV 내보내기

`export-csv.ts` 의 함수는 React 와 무관한 순수 함수여야 한다 (테스트 가능하게).

```ts
export function toCsv(rows: string[][]): string
export function downloadCsv(fileName: string, rows: string[][]): void
```

**반드시 처리할 것:**
- 선두에 **UTF-8 BOM(`﻿`)** 을 붙인다. 없으면 Excel 에서 한글이 깨진다.
- 값에 `,` `"` 개행 중 하나라도 있으면 전체를 `"` 로 감싸고, 내부 `"` 는 `""` 로 이스케이프한다.
- 줄바꿈은 `\r\n` (Excel 호환).
- 숫자는 **원본 숫자 문자열**을 쓴다. `toLocaleString()` 으로 콤마가 들어간 값을 내보내면
  Excel 이 텍스트로 인식한다. 셀 렌더와 export 값이 달라야 하는 이유다.
- 내보낼 범위: 선택된 행이 있으면 **선택된 행만**, 없으면 **현재 정렬·필터가 적용된 전체 행**.
- 헤더 행은 컬럼의 `header` 문자열. `header` 가 함수면 컬럼 id 를 쓴다.

컬럼이 export 값을 따로 지정할 수 있어야 한다 — `columnDef.meta.exportValue?: (row) => string`.
`meta` 를 쓰려면 v9 에서는 `metaHelper` 를 `tableFeatures` 에 등록해야 한다.
등록이 복잡하면 `meta` 대신 `DataTable` 의 선택적 prop
`exportValue?: Record<string, (row: T) => string>` 로 받아도 된다. 둘 중 **타입이 깨끗한 쪽**을 골라라.

---

## 8. 접근성

- `<table>` 에 `<caption>`. 시각적으로 숨기되 스크린리더가 읽게 한다
  (`sr-only` 유틸리티가 없으면 만들어라).
- 정렬 가능 헤더: `<th aria-sort="ascending|descending|none">` + 내부 `<button>`.
  `th` 자체에 onClick 을 걸지 말고 버튼을 쓴다 (키보드 접근).
- 선택 체크박스에 `aria-label` — 전체선택은 "전체 선택", 행은 "{식별값} 선택".
- 고정 컬럼의 sticky 는 포커스 이동 시 가려지지 않아야 한다.
- 모든 인터랙티브 요소가 `:focus-visible` 에서 보이는 포커스 링을 갖는다
  (전역 스타일이 이미 처리하지만 sticky 셀에서 잘리지 않는지 확인).

---

## 9. Storybook 스토리

`data-table.stories.tsx` 에 이커머스 주문 데이터(최소 12행, 한글 수취인/상품명, 금액 자릿수
다양하게 — 47,600 / 1,248,500 / 1,248,500,000 포함)로 다음 스토리를 만든다.

1. `기본`
2. `단일선택` / `복수선택` — 선택된 id 를 화면에 표시해 이벤트가 도는 것을 보여준다
3. `행클릭과선택` — 체크박스 클릭과 행 클릭이 각각 다른 동작을 하는 것을 확인할 수 있게
4. `컬럼고정` — 주문번호 start 고정 + 액션 end 고정, 가로 스크롤 발생하도록 컬럼 10개 이상
5. `밀도` — 세 밀도를 나란히
6. `상태` — loading / empty / error
7. `내보내기` — 내보내기 버튼이 있는 툴바

각 스토리에 `parameters.docs.description.story` 로 **왜 이렇게 설계했는지** 한두 문장.

---

## 10. 완료 조건

아래가 모두 통과해야 한다. 스스로 실행해서 확인하라.

```bash
pnpm typecheck
pnpm build-storybook
```

`toCsv` 는 `node:test` 로 단위 테스트를 만든다 —
`packages/ui/src/components/data-table/export-csv.test.mjs`.
최소 케이스: 콤마 포함 값, 따옴표 포함 값, 개행 포함 값, BOM 존재, 빈 배열.
`node --test packages/ui/src/components/data-table/` 로 통과 확인.

---

## 11. 범위 밖 — 하지 마라

- **무한 스크롤·가상화는 이번 범위가 아니다.** `@tanstack/react-virtual` 이 설치되어 있지만
  쓰지 않는다. 다음 위임에서 한다. 지금 넣으면 검증 범위가 흐려진다.
- 컬럼 리사이즈, 컬럼 순서 변경, 그룹 헤더, 행 확장, 필터 UI — 전부 다음 단계.
- 기존 파일 수정은 `packages/ui/src/index.ts` 만. 토큰 생성기·기존 컴포넌트·DESIGN.md 를 고치지 마라.
- 자동 생성 파일(`packages/tokens/*.css`, `docs/research/tokens.json`)을 손대지 마라.
- 새 외부 의존성을 추가하지 마라. 이미 있는 것으로 충분하다
  (`@tanstack/react-table`, `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`).
- 커밋·푸시하지 마라.

---

## 12. 보고할 것

- 만든 파일 목록
- 7절의 `meta` vs `exportValue` 중 무엇을 골랐고 왜 그랬는지
- 실행한 검증 명령과 결과
- 구현하면서 타입이 맞지 않아 우회한 지점이 있으면 어디를 어떻게 우회했는지
- 의도적으로 하지 않은 것
