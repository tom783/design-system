# 도그푸딩 1 · 이커머스 판매관리 (Next.js App Router)

게시된 `@s2life/ui@0.2.0` 을 **npm 에서 받아** 소비자 입장에서 화면을 만들어 봤다.
저장소 소스를 전혀 참조하지 않았다.

- Next 16.4.6 · React 19.3.1 · App Router
- 만든 것: 주문 목록(서버 컴포넌트 + 클라이언트 섬) · 주문 상세(탭·수정·삭제)
- 검증: 브라우저 CDP 로 실제 렌더·상호작용 확인, 콘솔 오류 0건

---

## 통과한 것

| 확인 | 결과 |
|---|---|
| Next.js App Router RSC 경계 | **동작한다.** dist 에 `"use client"` 배너가 있다 |
| 서버 컴포넌트 페이지에서 import | 동작 (합계 카드 서버 렌더) |
| 토큰 (Tailwind 설정 없음) | `rgb(211,62,88)` · 38px · tabular |
| DataTable 렌더·정렬 헤더·caption | 24행, caption "주문 목록" |
| Select 포털 필터 | 24건 → 6건 |
| Breadcrumb `aria-label="경로"` | 정상 |
| Dialog 초기 포커스·내장 닫기 | INPUT, 닫기 버튼 있음 |
| 더티 Escape → 확인창, 원래 창 유지 | 정상 |
| 콘솔 오류 | **0건** |

**우리 결함이 아니었던 것:** CSS 사이드이펙트 import 의 `TS2882` 는 `next-env.d.ts`
가 생기면 사라진다. Next 가 `*.css` 선언을 제공한다. Vite 도 `vite/client` 로 덮는다.

---

## 찾은 간극

### G1 · `createColumnHelper` 를 내보내지 않아 DataTable 을 쓸 수 없다 — 치명

`DataTableColumns<T> = ReturnType<ColumnHelper<DataTableFeatures, T>['columns']>` 이라
컬럼을 만들려면 `ColumnHelper<DataTableFeatures, T>` 가 필요한데, 그걸 만들 함수를
우리가 내보내지 않는다. 런타임 export 에도 없음을 확인했다.

소비자의 유일한 길:

```ts
import { createColumnHelper } from '@tanstack/react-table';   // ← 직접 설치해야 한다
import { type DataTableFeatures } from '@s2life/ui';
const h = createColumnHelper<DataTableFeatures, Order>();
```

`@tanstack/react-table` 은 우리 **일반 의존성**이지 peer 가 아니다. npm 평탄화 덕에
우연히 해소됐을 뿐이고(실측), **pnpm 엄격 모드에서는 해소되지 않는다.** 버전이
어긋나면 타입도 어긋난다.

### G2 · 우리가 내보낸 `DataTableColumns<T>` 로 주석하면 셀 추론이 깨진다 — 중대

같은 코드에서 주석 유무만 바꿔 격리했다:

```tsx
// 주석 없음 — 통과
export const a = h.columns([ h.accessor('status', { cell: i => TONE[i.getValue()] }) ]);
// DataTableColumns<Order> 명시 — TS7053: index 가 any 다
export const b: DataTableColumns<Order> = h.columns([ h.accessor('status', { cell: i => TONE[i.getValue()] }) ]);
```

`ReturnType<>` 이 제네릭 문맥을 잃어서 할당 시 콜백이 넓어진다.
**그 타입은 소비자가 주석하라고 내보낸 것인데, 쓰면 더 나빠진다.**

### G3 · `Button` 에 `asChild` 가 없다 — 중대 (우회 가능)

Next `<Link>` 를 주요 버튼으로 만들 수 없다. `buttonVariants()` 로 우회했다.
`@radix-ui/react-slot` 은 이미 의존성이고 `internal/slot.ts` 도 있다.
`BreadcrumbLink`·`DialogTrigger`·`AlertDialogTrigger` 는 `asChild` 를 지원하는데
`Button` 만 없어서 일관성도 깨진다.

### G4 · 중첩 AlertDialog 가 부모 Dialog 를 반으로 자른다 — 중대

§16.3 이 **권장하는** 패턴(`dismissible={!dirty}` + `onDismissAttempt` → 확인
AlertDialog)을 그대로 썼더니, 확인창이 부모 다이얼로그 한가운데를 가로질러
제목("주문 수정")과 푸터 버튼이 반씩 잘려 보인다.

둘 다 `.ds-dialog-content` 의 `max-width: 36rem` 을 쓰고 둘 다 정중앙이라 그렇다.
확인창은 예/아니오 한 줄이라 36rem 이 필요하지도 않다.

### G5 · `SelectTrigger` 가 flex 행에서 전폭으로 늘어난다 — 경미

툴바에 필터로 놓으면 혼자 남은 폭을 다 먹는다. 소비자가 폭을 지정해야 한다는 것을
어디에서도 알 수 없다.

### G6 · 번들 전체가 `"use client"` — 경미, 설계 판단

rollup banner 로 일괄 주입한다. `Card`·`StatusChip`·`Skeleton` 같은 순수 표현
컴포넌트도 서버 컴포넌트로 쓸 수 없다. B2B 관리 화면에서는 큰 손해가 아니지만
기록해 둔다.

---

## 우선순위

| | 간극 | 영향 |
|---|---|---|
| 1 | G1 `createColumnHelper` | DataTable 을 clean install 로 쓸 수 없다 |
| 2 | G2 `DataTableColumns` 추론 | 우리 타입이 타입 안전성을 깎는다 |
| 3 | G4 중첩 확인창 겹침 | 우리가 권장한 패턴이 깨져 보인다 |
| 4 | G3 `Button asChild` | 링크 버튼 불가 (우회 있음) |
| 5 | G5 Select 폭 | 문서·스토리로 해결 |
| 6 | G6 `"use client"` | 기록만 |
