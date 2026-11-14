# R10 · 요약 Peek 과 상세에서 돌아오는 길

`AGENTS.md` · `DESIGN.md` **10절(안내)** · **2.3절(브랜드/에러 분리)** 을 먼저 읽어라.

지침은 이거였다 —
> 간략한 정보를 빠르게 확인하는 floating UI 와, 깊은 정보를 보는 상세 페이지로
> 나누고, **다시 돌아올 수 있도록** 한다.

두 번째 절반("돌아올 수 있도록")이 어렵고 대부분의 시스템이 빠뜨리는 부분이다.
표에서 500행 중 300번째를 열어보고 돌아왔을 때 맨 위로 튕기면,
사용자는 방금 한 일을 처음부터 다시 해야 한다.

---

## 1. 이미 있는 것을 다시 만들지 마라

`guide/use-anchored.ts` 에 앵커 배치·popover·폴백이 **이미 있다.**
`Peek` 은 그걸 **재사용**한다. 새 배치 로직을 쓰지 마라.

`use-anchored.ts` 를 고쳐야 한다면 **고치기 전에 보고하라** —
Tooltip·Hint·Tour 가 전부 거기 걸려 있고 브라우저 검증 30건이 걸려 있다.

| 도구 | 무엇을 | 언제 |
|---|---|---|
| `Tooltip` | UI 를 설명 (한 줄) | 호버·포커스 |
| `Hint` | UI 를 한 번 알림 | 앱이 정한 시점 |
| `Tour` | UI 흐름을 안내 | 사용자가 요청 |
| **`Peek`** | **레코드 내용을 요약** | **사용자가 열 때, 반복 가능** |

앞의 셋은 **UI 를 가르치고**, `Peek` 은 **데이터를 보여준다.** 목적이 다르므로
별개 컴포넌트가 맞다. 배치 코어만 공유한다.

## 2. `Peek`

```tsx
<Peek
  open={openId === row.id}
  onOpenChange={(open) => setOpenId(open ? row.id : null)}
  title="주문 20260114-0012"
  items={[
    { label: '수취인', value: '김철수' },
    { label: '금액', value: '142,000원', numeric: true },
    { label: '상태', value: <StatusChip tone="info">배송중</StatusChip> },
  ]}
  action={{ label: '상세 보기', onClick: () => goDetail(row.id) }}
>
  <Button variant="ghost" size="sm" aria-label="주문 요약 보기">⋯</Button>
</Peek>
```

규칙:

1. **호버로 열지 마라.** 표의 행 위를 지나갈 때마다 떠오르면 방해만 된다.
   전용 컨트롤을 클릭하거나 Enter 로 연다. (`Tooltip` 과 갈리는 지점이다)
2. **`items` 는 최대 6줄.** 7줄이 필요하면 그건 요약이 아니라 상세 페이지다.
   초과 시 **개발 모드에서 경고**하라 — `Tour` 의 3단계 경고와 같은 방식이다.
   던지지는 마라.
3. 구조는 `<dl>` / `<dt>` / `<dd>`. 라벨과 값의 관계가 마크업에 있어야 한다.
4. `numeric: true` 인 값은 `tabular` + 우측 정렬 (DESIGN 3절).
5. `role="dialog"` + `aria-labelledby`(제목). 열 때 포커스를 옮기고 닫을 때
   트리거로 되돌린다. **포커스를 가두지 마라** (10.4).
6. Escape 와 닫기 버튼 둘 다 동작한다.
7. `action` 은 상세로 가는 **유일한 출구**다. 여기서 수정·삭제 같은 것을 하지 마라 —
   요약 카드는 읽는 곳이다.

## 3. 돌아오는 길 — `useReturnContext`

우리는 라우터가 아니다. **네비게이션을 소유하지 않는다.**
우리가 소유하는 것은 **무엇을 기억하고 언제 잊을지**다.

```ts
const ret = useReturnContext({ key: 'orders', ttlMs: 600000 });
// 떠나기 직전
ret.capture({ itemKey: row.id, scrollTop: el.scrollTop });
// 목록으로 돌아와 마운트될 때 — 한 번만 꺼내진다
const back = ret.consume();   // { itemKey, scrollTop } | null
```

- **`consume()` 은 일회성이다.** 한 번 꺼내면 사라진다. 그래야 새로고침하거나
  나중에 다시 들어왔을 때 옛날 위치로 끌려가지 않는다.
- **`ttlMs` 가 지난 기록은 버린다** (기본 10분). 왕복은 짧은 일이다.
  어제 보던 자리로 돌아가는 건 복원이 아니라 방해다.
- 저장소는 주입 가능하게 하되 기본은 `sessionStorage`.
  **`sessionStorage` 접근은 반드시 `try/catch` 로 감싸라** — 시크릿 모드·
  설정에 따라 접근 자체가 throw 한다. 실패하면 조용히 `null` 로 동작한다.
- SSR 에서 `window` 를 만지지 마라.

### 3.1 순수 함수로 분리 — `return-record.ts`

```ts
export type ReturnRecord = { itemKey: string; scrollTop: number; at: number };
export function encodeRecord(r: ReturnRecord): string;
export function decodeRecord(raw: string | null, now: number, ttlMs: number): ReturnRecord | null;
```

`decodeRecord` 테스트:
- 정상 기록 → 그대로 반환
- `null` · 빈 문자열 → `null`
- 깨진 JSON → `null` (throw 금지)
- 필드 누락·타입 불일치 → `null`
- `at` 이 `now - ttlMs` 보다 오래됨 → `null`
- `at` 이 미래 (시계 변경) → `null`
- `scrollTop` 이 NaN·음수 → `null`

**깨진 입력에 절대 throw 하지 마라.** 저장소 내용은 우리가 쓴 게 아닐 수도 있다.

### 3.2 스크롤 복원은 앱이 한다

훅은 기록만 돌려준다. **가상화된 표에서는 픽셀 오프셋이 틀릴 수 있으므로**
(행 수가 달라졌을 수 있다) 앱이 `itemKey` 로 인덱스를 찾아
`scrollToIndex` 하는 쪽을 택할 수 있어야 한다. 훅이 대신 결정하지 마라.

## 4. 다녀온 행 표시

`--row-marker` 토큰을 방금 추가했다. **배경색이 아니라 왼쪽 가장자리 마커다.**

이유: 기본·호버(`--bg-hover`)·선택(`--bg-selected`)이 이미 흰색 계열 셋을 쓰고 있다.
네 번째 배경은 구별되지 않는다. **다른 시각 채널**을 쓰면 선택된 행 위에도
겹쳐 쓸 수 있다.

색은 **info 블루다. 브랜드 레드가 아니다** — 2.3 에서 링크를 레드로 두지 않은
이유와 같다. 표 안의 빨간색은 음수·오류로 읽힌다. 에러 글자와 ΔE 32.6 으로
분리돼 있음을 검증했다.

```css
[data-slot="data-table-row"][data-revisited] { box-shadow: inset 3px 0 0 var(--row-marker); }
```

`box-shadow: inset` 을 써라. **`border-left` 는 셀 폭을 밀어서 고정 컬럼
오프셋이 어긋난다** — `data-table.css` 가 실측 너비에 의존한다.
적용 전후로 행 내용 좌표가 변하지 않음을 스토리에서 단언하라.

`DataTable` 에 `revisitedRowId?: string` prop 을 추가해 그 행에
`data-revisited` 를 붙인다. **다른 테이블 로직은 건드리지 마라.**

## 5. 만들 것

```
packages/ui/src/components/peek/
  peek.tsx
  use-return-context.ts
  return-record.ts
  return-record.test.mjs
  peek.css
  index.ts
packages/ui/src/stories/peek.stories.tsx
```
`DataTable` 에 `revisitedRowId` 추가 + `data-table.css` 에 마커 규칙.
`index.ts` · `styles.css` 연결.

## 6. 스토리

1. `기본` — 열기·닫기·Escape·포커스 복귀, `<dl>` 구조 단언
2. `줄수초과` — 7줄이면 개발 경고 (동작은 유지)
3. `표에서-요약` — DataTable 행의 컨트롤로 Peek 열기. **스크롤 컨테이너 밖으로
   온전히 보이는지** 단언 (popover 최상위 레이어)
4. `다녀온행` — `revisitedRowId` 로 마커가 붙고, **마커 유무로 셀 좌표가
   변하지 않음**을 단언 (4절)
5. `다녀온행-선택됨` — 선택 + 다녀옴이 동시에 보인다
6. `돌아오기` — capture → 목록 언마운트 → 재마운트 → consume 으로 복원,
   **두 번째 consume 은 null**
7. `만료` — ttl 지난 기록은 복원하지 않는다 (`Date.now` 를 직접 쓰지 말고
   주입 가능하게 만들어 테스트하라)

`play` 작성 시: `getComputedStyle` 은 라이브 객체다. 좌표는 숫자로 떠서 비교하라.

## 7. 완료 조건

```bash
pnpm verify
node --test packages/ui/src/components/peek/*.test.mjs
node --test packages/ui/src/lib/*.test.mjs packages/ui/src/components/*/*.test.mjs
```
기존 테이블·안내 스토리가 전부 통과해야 한다.

## 8. 하지 마라

- 라우터 도입, `history` API 직접 조작. **새 의존성 금지.**
- `Peek` 안에서 수정·삭제 액션 제공
- 호버로 Peek 열기
- `use-anchored.ts` 를 말없이 고치는 것 (1절)
- `border-left` 로 마커 그리기 (4절)
- 토큰 생성기 · `packages/tokens/*` · `DESIGN.md` · `AGENTS.md` 수정
  (`--row-marker` 는 내가 이미 넣었다)
- 커밋 · 푸시

## 9. 보고할 것

- `Peek` 이 `use-anchored` 를 어떻게 재사용했는지 (고쳤다면 무엇을 왜)
- `decodeRecord` 가 거부하는 입력 목록
- `sessionStorage` 접근 실패를 어떻게 처리했는지
- 마커 적용 전후 셀 좌표 측정값
- 의도적으로 하지 않은 것
