# R03-B · 테이블 가상화와 무한 스크롤

`DataTable` 에 행 가상화와 무한 스크롤을 추가한다.
`AGENTS.md`·`DESIGN.md` 를 먼저 읽어라. 기존 `DataTable` 의 동작·API 를 깨뜨리지 마라.

---

## 0. 검증된 사실 — 추측하지 말고 이대로 해라

`@tanstack/react-virtual` **3.14.26** 이 설치되어 있다. 아래는 이 저장소에서
`pnpm typecheck` 0 에러로 확인한 형태다.

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const v = useVirtualizer({
  count: rows.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => rowHeight,     // px 숫자
  overscan: 8,
  getItemKey: (i) => rows[i]!.id,
});
const items = v.getVirtualItems();   // { key, index, start, end, size }
const total = v.getTotalSize();
```

### 왜 동적 측정(`measureElement`)을 쓰지 않는가

쓰지 마라. 우리 행 높이는 밀도 토큰으로 **고정**이고(`--row-h-compact` 36 /
`--row-h-default` 40 / `--row-h-comfortable` 48), 셀은 `white-space: nowrap` +
말줄임이라 내용에 따라 높이가 변하지 않는다. 따라서 `estimateSize` 가 추정이 아니라
정확한 값이다.

`measureElement` 를 쓰면 측정 대상 `<tr>` 마다 `data-index={index}` 속성이 **필수**다
(없으면 `indexFromElement` 가 `console.warn` 하고 -1 을 반환해 측정이 조용히 깨진다).
우리는 그 경로를 아예 쓰지 않으므로 이 함정을 피한다.

### 가상화 방식: 패딩 스페이서 행 (절대 위치 금지)

`<tr>` 을 `position: absolute` 로 띄우는 방식을 쓰지 마라. 기존 컬럼 고정이
**실측 너비 기반 sticky** 로 동작하고(`ResizeObserver` 로 헤더 셀 너비를 측정),
절대 위치는 테이블 레이아웃을 무너뜨려 그 측정을 깨뜨린다.

위/아래에 높이만 가진 스페이서 행을 넣는다:

```tsx
{padTop > 0 && <tr aria-hidden="true" style={{ height: padTop }}><td colSpan={colSpan} /></tr>}
{items.map((item) => <tr key={item.key}>…</tr>)}
{padBottom > 0 && <tr aria-hidden="true" style={{ height: padBottom }}><td colSpan={colSpan} /></tr>}
```

`padTop = items[0].start`, `padBottom = total - items.at(-1).end`.
스페이서 행은 `colSpan` 단일 셀이므로 고정 컬럼 스타일을 받지 않는다 — 의도된 것이다.

---

## 1. 추가할 Props

```ts
/** 행 수가 이 값을 넘으면 가상화를 켠다. false 로 끄고, 숫자로 임계값을 바꾼다. 기본 100 */
virtualize?: boolean | number;

/** 서버 전체 건수. 무한 스크롤 UI 와 선택 안내에 쓴다. 생략하면 data.length 로 간주 */
totalCount?: number;

/** 더 불러올 것이 남았는지. false 면 트리거를 걸지 않는다 */
hasMore?: boolean;

/** 추가 로드 요청. 중복 호출되지 않아야 한다(4절) */
onLoadMore?: () => void;

/** 추가 로드 진행 중. true 면 하단에 로딩 행을 보여주고 트리거를 멈춘다 */
loadingMore?: boolean;
```

기존 props(`selectionMode`·`selectedIds`·`onRowClick`·`pinnedStart`·`align` 등)의
동작과 타입은 그대로 유지한다.

---

## 2. 가상화를 켜는 조건과 대가

`virtualize` 기본값은 `100` 이다 — 행이 100개를 넘으면 자동으로 켜진다.

**가상화를 켜면 브라우저 `Ctrl+F` 가 보이지 않는 행을 찾지 못한다.** 이것은 피할 수
없는 대가이므로 기본값을 "항상 켬"으로 두지 않았다. 100행 이하에서는 가상화의 이득이
없고 Ctrl+F 가 더 가치 있다.

이 대가를 스토리의 설명문에 **명시적으로 적어라**. 사용자가 모르고 쓰면 버그로 오인한다.

## 3. 접근성 — 윈도잉이 깨뜨리는 것들

DOM 에 일부 행만 있으므로 보조기술이 전체 구조를 알 수 없다. 반드시 보정한다.

- `<table aria-rowcount={totalCount ?? data.length}>` — 전체 행 수를 알린다.
- 각 데이터 행에 `aria-rowindex={item.index + 2}` — 1-기반이고 헤더 행이 1번이므로 +2.
- 헤더 행에 `aria-rowindex={1}`.
- 스페이서 행은 `aria-hidden="true"` (이미 1절에 포함).
- **포커스를 잃지 않게 한다**: `onRowClick` 이 있는 행은 `tabIndex=0` 인데, 포커스된
  행이 스크롤로 윈도우를 벗어나면 DOM 에서 사라져 포커스가 `<body>` 로 떨어진다.
  포커스된 행의 id 를 기억하고, 그 행이 언마운트될 때 **스크롤 컨테이너로 포커스를
  옮긴다**. 포커스가 문서 처음으로 튀는 것을 막는 것이 목적이다.

## 4. 무한 스크롤 트리거

별도의 `IntersectionObserver` 센티넬을 만들지 마라. 가상화와 중복이고,
센티넬 행 자체가 윈도우 밖이면 관측되지 않는다.

**가상 아이템의 인덱스로 판단한다:**

```
마지막 가상 아이템의 index >= rows.length - THRESHOLD  →  onLoadMore()
```

`THRESHOLD = 10` (행 10개 남았을 때 미리 불러온다).

**중복 호출을 반드시 막아라.** 스크롤 중 같은 조건이 여러 프레임에 걸쳐 참이 된다.
`loadingMore` 가 true 거나 `hasMore` 가 false 면 호출하지 않고, 추가로
"이미 이 길이에서 요청했다"를 기억해 같은 `rows.length` 로 두 번 요청하지 않게 한다.

가상화가 꺼진 경우(`virtualize: false` 또는 100행 이하)에도 무한 스크롤은 동작해야
한다. 이때는 스크롤 컨테이너의 `scrollTop + clientHeight >= scrollHeight - 120px` 로 판단한다.

### 하단 로딩 표시

`loadingMore` 가 true 면 테이블 맨 아래에 로딩 행 하나를 둔다 —
기존 스켈레톤 스타일(`--data-table-skeleton`)을 재사용하고, `role="status"` 로
"불러오는 중" 을 알린다. 전체 로딩 상태(`state="loading"`)와 혼동하지 마라.
이건 **아래에 덧붙는** 로딩이다.

`hasMore` 가 false 면 "전체 N건을 모두 불러왔습니다" 를 한 줄로 표시한다.
끝에 도달했는지 모르는 상태가 데이터 조회 화면에서 가장 답답하다.

---

## 5. 전체 선택의 의미 — 설계 결정이 이미 내려져 있다

이 부분은 구현 자유도가 없다. 아래대로 해라.

로드된 행이 50건이고 서버 전체가 1,284건일 때 헤더 체크박스의 의미가 모호해진다.
**우리의 결정: 헤더 체크박스는 "로드된 행"만 선택한다.** 컴포넌트는 서버에 없는
정보를 아는 척하지 않는다.

- 헤더 체크박스 `aria-label` 을 상황에 맞게 바꾼다 —
  전체를 다 불러왔으면 `"전체 선택"`, 일부만 로드됐으면 `"로드된 50건 선택"`.
- 로드된 행 전부가 선택됐고 `totalCount` 가 그보다 크면, 툴바에 한 줄 안내를 띄운다:
  `"로드된 50건이 선택됨 · 전체 1,284건"`.
  **"전체 선택" 버튼을 만들지 마라** — 서버 측 전체 선택 API 가 없으므로 지킬 수 없는
  약속이 된다. 필요해지면 그때 서버 계약과 함께 추가한다.
- 선택 후 추가 로드가 일어나도 기존 선택은 유지된다(id 기반이므로 자동).
  새로 로드된 행이 자동 선택되어서는 안 된다.

## 6. CSV 내보내기와의 상호작용

기존 `exportRows()` 는 `rows`(로드된 전체)를 쓴다. 가상화는 **렌더만** 윈도잉하므로
`rows` 는 그대로다 — 내보내기 동작은 바뀌지 않아야 한다.
가상 아이템만 내보내는 실수를 하지 마라.

`totalCount > rows.length` 인데 선택 없이 내보내면, 내보내기 전에
`"로드된 N건만 내보냅니다"` 를 버튼 라벨이나 안내로 드러낸다.
사용자가 전체를 받았다고 오해하면 안 된다.

---

## 7. Storybook 스토리

기존 `data-table.stories.tsx` 에 추가한다. 기존 스토리를 고치지 마라.

1. `가상화_1만행` — 10,000행을 즉시 렌더. 스크롤이 부드러운지 확인할 수 있게.
   설명문에 "DOM 에는 약 20행만 존재한다"와 "Ctrl+F 가 안 되는 대가"를 적어라.
2. `무한스크롤` — 500ms 지연으로 50건씩 불러오는 모의 로더. 전체 1,284건.
   하단 로딩 행과 "모두 불러왔습니다" 종료 표시가 둘 다 보여야 한다.
3. `무한스크롤_선택유지` — 몇 행을 선택한 뒤 더 불러왔을 때 선택이 유지되고
   새 행이 자동 선택되지 않는 것을 보여준다. 선택된 id 목록을 화면에 출력.
4. `가상화_컬럼고정` — 10,000행 + start/end 고정 + 가로 스크롤.
   가상화가 고정 컬럼 오프셋을 깨뜨리지 않는지 확인하는 스토리다.
5. `부분로드_전체선택` — 50/1,284 상태에서 헤더 체크박스 라벨과 툴바 안내(5절) 확인.

각 스토리에 `parameters.docs.description.story` 로 무엇을 확인하는 스토리인지 적어라.

## 8. 완료 조건

```bash
pnpm verify
node --test packages/ui/src/components/data-table/*.test.mjs
```

둘 다 통과해야 한다. (`node --test <디렉토리>` 는 Node 24 에서 동작하지 않는다)

무한 스크롤 트리거의 중복 방지 로직은 **순수 함수로 분리해 단위 테스트를 만들어라** —
`should-load-more.ts` + `should-load-more.test.mjs`. 입력(마지막 인덱스, 행 수,
hasMore, loadingMore, 마지막 요청 길이)에 대해 호출 여부가 결정되는 함수다.
렌더 없이 검증 가능해야 한다. 최소 케이스: 임계 미달, 임계 도달, loadingMore 중,
hasMore false, 같은 길이로 재요청.

## 9. 범위 밖 — 하지 마라

- 컬럼 가상화(가로 윈도잉)는 하지 마라. 컬럼은 수십 개 수준이라 이득이 없다.
- 컬럼 리사이즈·순서 변경·그룹 헤더·행 확장·필터 UI — 다음 단계.
- 서버 측 정렬·페이지네이션 계약 설계 — 우리 범위가 아니다.
- `export-csv.ts` 의 로직을 바꾸지 마라(6절은 라벨·안내 변경만이다).
- 토큰 생성기·`DESIGN.md`·`AGENTS.md`·기존 컴포넌트(`button`·`input`·`card`·
  `status-chip`·`checkbox`)를 고치지 마라.
- 새 외부 의존성 추가 금지. `@tanstack/react-virtual` 은 이미 설치되어 있다.
- 커밋·푸시 금지.

## 10. 보고할 것

- 만든/고친 파일
- 가상화 켜짐 임계값 처리 방식과, 꺼진 경우의 무한 스크롤 판단 방식
- 포커스 유실 방지(3절)를 어떻게 구현했는지
- 중복 로드 방지 로직과 테스트 케이스
- 타입이 맞지 않아 우회한 지점이 있으면 어디를 어떻게
- 의도적으로 하지 않은 것
