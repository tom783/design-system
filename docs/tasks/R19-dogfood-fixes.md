# R19 · 도그푸딩이 찾은 공개 API 간극 메우기

게시된 `@s2life/ui@0.2.0` 을 npm 에서 받아 Next.js App Router 로 이커머스 판매관리
화면을 만들어 봤다. **근거와 재현은 `docs/dogfood/01-ecommerce-nextjs.md` 에 있다.
먼저 읽어라.** 여기서는 고칠 것만 적는다.

통과한 것도 그 문서에 있다. RSC 경계·토큰·DataTable 렌더·Dialog 더티 보호는
전부 정상이었고 콘솔 오류 0건이었다. **그건 건드리지 마라.**

---

## G1 · DataTable 을 clean install 로 쓸 수 있게 한다 (최우선)

지금은 컬럼을 만들려면 소비자가 `@tanstack/react-table` 을 직접 설치해
`createColumnHelper<DataTableFeatures, T>()` 를 호출해야 한다. 우리 일반 의존성에
우연히 평탄화된 것에 기대고 있고 **pnpm 엄격 모드에서는 깨진다.**

`@s2life/ui` 가 헬퍼를 내보낸다. 원시 재수출보다 **우리 feature 가 이미 적용된**
형태가 낫다 — 소비자가 `DataTableFeatures` 를 알 필요가 없어진다:

```ts
/** DataTable 전용 컬럼 헬퍼. features 는 이미 적용돼 있다. */
export function createDataTableColumnHelper<T extends RowData>(): ColumnHelper<DataTableFeatures, T>;
```

소비자 코드가 이렇게 되어야 한다:

```ts
import { createDataTableColumnHelper } from '@s2life/ui';
const h = createDataTableColumnHelper<Order>();
const columns = h.columns([ h.accessor('id', { header: '주문번호' }) ]);
```

- 소비자가 쓸 수밖에 없는 TanStack 타입(`RowData`·`CellContext` 등 실제로 필요한 것만)
  도 `@s2life/ui` 에서 재수출해라. **필요한 것만.** 전부 다 열지 마라.
- `@tanstack/react-table` 을 peer 로 바꾸지 **마라.** 소비자가 버전을 맞출 이유가 없다.
  우리가 감싸서 내보내는 쪽이 맞다.

## G2 · `DataTableColumns<T>` 로 주석하면 셀 추론이 깨지는 것을 고친다

격리된 재현(도그푸딩 G2)은 주석 유무만 다르다. `ReturnType<>` 이 제네릭 문맥을
잃어서 할당 시 콜백이 `any` 로 넓어진다. **그 타입은 주석하라고 내보낸 것이다.**

둘 중 하나를 해라. 어느 쪽이든 **결과를 검증으로 증명해라.**

- (가) 주석해도 추론이 살아남도록 타입을 고친다. 가능하면 이쪽이다.
- (나) 못 고치면 `DataTableColumns<T>` 를 공개 API 에서 **빼고**, `createDataTableColumnHelper`
  의 반환으로 추론하게 한다. 빼면 **breaking change 이니 CHANGELOG 에 적어라.**

## G3 · `Button` 에 `asChild` 를 추가한다

`@radix-ui/react-slot` 은 이미 의존성이고 `internal/slot.ts` 도 있다.
`BreadcrumbLink`·`DialogTrigger`·`AlertDialogTrigger` 는 지원하는데 `Button` 만 없다.

- `asChild` 일 때도 `leadingIcon`/`trailingIcon` 이 동작해야 한다 — Slot 은 자식
  **하나**만 받으므로, 아이콘이 있으면 자식을 감싸 넘기는 처리가 필요하다.
  동작하지 않게 할 거라면 **타입으로 막고** 이유를 적어라. 조용히 사라지면 안 된다.
- `buttonVariants` 내보내기는 그대로 둔다. 둘 다 쓸 수 있어야 한다.

## G4 · 중첩 확인창이 부모 다이얼로그를 반으로 자르는 것을 고친다

§16.3 이 권장하는 패턴(`dismissible={!dirty}` + `onDismissAttempt` → 확인 AlertDialog)을
그대로 썼더니 확인창이 부모 한가운데를 가로질러 제목과 푸터가 반씩 잘렸다.
둘 다 `.ds-dialog-content` 의 `max-width: 36rem` 에 둘 다 정중앙이라 그렇다.

- `AlertDialog` 에 **더 좁은 최대 폭**을 준다. 예/아니오 한 줄에 36rem 은 필요 없다.
  새 토큰을 만들지 말고 기존 간격·폭 토큰 조합으로 해라.
- 중첩일 때 **부모가 뒤에 있다는 것이 보여야 한다.** 겹침 자체는 정상이니
  폭 차이로 층이 읽히게 하는 선에서 끝내라. 부모를 축소·블러 하지 마라(§5 모션 규칙).
- §16.4 에 "확인창은 부모보다 좁다" 를 적어라.

## G5 · Select 폭을 문서로 해결한다

툴바에 필터로 놓으면 flex 행에서 혼자 남은 폭을 다 먹는다. `SelectTrigger` 의
`w-full` 은 `Field` 안에서 맞는 기본값이니 **동작을 바꾸지 마라.**
`select.stories.tsx` 에 "툴바 필터" 변형을 추가하고 §11.4 에 한 줄 적어라.

## 하지 마라

- `@tanstack/react-table` 을 peer dependency 로 변경
- TanStack 타입 전체를 무분별하게 재수출
- `"use client"` 배너 제거 (도그푸딩 G6 — 기록만 하기로 했다)
- 도그푸딩에서 **통과한** 동작 변경
- 새 토큰·새 z-index

## 검증 — 회귀 장치를 반드시 만든다

지금 `pnpm qa` 의 **tarball 배포 리허설**이 패키지를 실제로 설치해 타입·렌더를 본다.
거기에 **소비자 시점 타입 픽스처**를 추가해라. 이번 간극이 전부 "소비자가 쓸 때만"
드러났고 우리 내부 타입 검사로는 잡히지 않았다.

픽스처가 반드시 포함할 것:

- `createDataTableColumnHelper<T>()` 로 컬럼을 만들고 **`cell` 콜백의 `getValue()` 가
  정확한 타입**임을 단정한다. `const v: 'paid'|'pending' = i.getValue()` 처럼
  주석을 박아 `any` 면 컴파일이 깨지게 해라.
- (가)를 택했다면 `DataTableColumns<T>` **주석을 단 형태**도 같이 검사해라.
- `@tanstack/react-table` 을 **설치하지 않은** 상태에서 컴파일되어야 한다.
- `Button asChild` 로 `<a>` 를 감싼 사용.
- `tsc --noEmit --strict` 로 돌린다.

그리고 브라우저 쪽:

- `docs/qa/detail-render-verify.mjs` 에 **중첩 확인창이 부모보다 좁다**는 검사를 추가해라
  (폭을 실제로 재서 비교).
- 기존 브라우저 352건은 전부 그대로 통과해야 한다. 깨지면 **고치지 말고 보고해라.**

## 유지보수 꼬리

- `component-intent.mjs`: `Button` 에 `asChild` prop 반영, `DataTable` 의 rules 에
  컬럼 헬퍼 사용법 한 줄. 섹션은 각각 기존 것을 쓴다.
- `CHANGELOG.md` 에 `0.3.0 — 미게시` 절을 만들고 G1~G5 를 적어라.
  **(나)를 택해 타입을 뺐으면 breaking 으로 표시해라.**
- 버전은 **올리지 마라.** 게시 결정은 사람이 한다.
- 예산 여유 11,095 바이트.

## 보고할 것

1. G2 를 (가)로 고쳤는지 (나)로 피했는지, 그 근거
2. `Button asChild` + 아이콘 조합을 어떻게 처리했는지
3. 새로 만든 타입 픽스처가 덮는 경우 목록
4. `pnpm verify` · `pnpm typecheck` 결과
5. 도그푸딩 문서와 다르게 나온 측정 (있으면 값과 재현)
6. 명세와 다르게 구현한 부분

브라우저는 네 샌드박스에서 못 띄운다. `pnpm qa` 는 내가 돌린다. 하네스는 작성만 해라.
