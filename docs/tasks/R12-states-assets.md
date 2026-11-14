# R12 · 상태 컴포넌트와 기능 대체물

`AGENTS.md` · `DESIGN.md` **7.5.6**(차트 상태) · **9절**(로딩)을 먼저 읽어라.

사람이 정한 범위다 — **여러 SaaS 에 공통으로 쓰이는 것만.**
장식용 일러스트는 만들지 않는다. 대신 `graphic` 슬롯만 열어두고
나중에 실제 화면을 보고 채운다.

---

## 1. 지금 무엇이 잘못돼 있나 (둘 다 실측)

### 1.1 같은 상태를 두 곳이 각자 그린다

| | `DataTable` | `ChartFrame` |
|---|---|---|
| 비어있음 | `h-48 px-4 text-center` + `<span role="status">` | `py-8 text-center` + `<p role="status">` |
| 오류 | `h-48 bg-danger-tint` + 아이콘 + **다시 시도 버튼** | `py-8 bg-danger-tint` + 아이콘 · **버튼 없음** |

높이가 다르고, **차트는 재시도를 할 방법이 없다.**
"불러오지 못했습니다"라고만 하고 손을 놓는다.

### 1.2 차트 빈 상태가 레이아웃을 132px 밀어낸다

```
비어있음  플롯 88px  · 카드 194px
정상      플롯 220px · 카드 326px
```

R08 에서 **스켈레톤↔완료는 Δ0px** 로 맞췄는데 빈 상태는 빠졌다.
필터를 바꿔 데이터가 들어오는 순간 카드가 132px 자란다. 대시보드에 차트가
여러 개면 화면 전체가 출렁인다. 같은 원칙을 적용해야 한다.

---

## 2. `EmptyState` · `ErrorState`

```
packages/ui/src/components/state/
  empty-state.tsx      # EmptyState · ErrorState
  state.css
  index.ts
```

```tsx
<EmptyState
  title="표시할 주문이 없습니다"
  description="필터를 바꾸거나 기간을 넓혀 보세요."
  action={{ label: '필터 초기화', onClick: reset }}
/>
<ErrorState title="주문을 불러오지 못했습니다" onRetry={refetch} />
```

- **둘을 하나로 합치지 마라.** ARIA 역할과 할 수 있는 일이 다르다 —
  `EmptyState` 는 `role="status"`, `ErrorState` 는 `role="alert"` + 틴트 배경 +
  아이콘 + 재시도. `tone` prop 하나로 합치면 "재시도 버튼 달린 빈 상태" 같은
  말이 안 되는 조합이 가능해진다.
- `graphic?: ReactNode` 슬롯을 **둘 다** 받는다. 지금은 아무도 안 넘긴다.
  기본값은 아이콘(`ErrorState` 는 `CircleAlert`, `EmptyState` 는 적절한 lucide 하나).
- **높이는 컨테이너가 정한다.** 컴포넌트는
  `min-block-size: var(--state-min-h)`(192px, 방금 추가한 토큰) + 가운데 정렬이고,
  컨테이너가 늘리면 늘어난다. 이게 1.2 를 고치는 열쇠다.
- 제목은 `--text-body`, 설명은 `--text-body-sm` + `--text-secondary`.
  **설명과 액션은 선택이다.** 제목만으로도 멀쩡해야 한다.
- 오류 문구와 비어있음 문구는 **눈으로도 구별**돼야 한다 (7.5.6). 지금 규칙 유지.

## 3. 두 표면을 여기로 모은다

### 3.1 `ChartFrame`

- `EmptyState` · `ErrorState` 를 쓴다.
- **`onRetry` 를 추가하라** — 지금 없다. 세 차트(`TrendBand`·`BulletRow`·
  `CompositionArea`)도 그대로 통과시킨다. `DataTable` 과 같은 이름이어야 한다.
- **비어있음·오류 플롯 높이를 정상 차트와 맞춰라.** 1.2 가 이 작업이다.
  `TrendBand`·`CompositionArea` 는 `height ?? --chart-h-default`,
  `BulletRow` 는 `skeletonRows × 44` 를 쓴다 — **스켈레톤이 이미 쓰는 값과 같다.**
  스켈레톤 경로와 같은 계산을 두 번 쓰지 말고 한 곳에서 구해라.

### 3.2 `DataTable`

- `EmptyState` · `ErrorState` 를 `<td colSpan>` 안에 넣는다.
- `h-48` 하드코딩을 없애고 `--state-min-h` 를 쓴다.
- **`emptyAction?: { label, onClick }` 을 추가하라.** 지금 빈 표에서 사용자가
  할 수 있는 게 없다. 필터 때문에 비었을 때 "필터 초기화"가 필요하다.
- 가상화·고정 컬럼·선택 로직을 건드리지 마라.

**겉보기가 바뀌는 것은 위 두 개(차트 높이, 표 액션)뿐이다.** 그 외에
달라지는 게 있으면 보고하라.

## 4. `Avatar`

```tsx
<Avatar name="김철수" size="md" />
<Avatar name="John Doe" src={user.photo} />
```

**색으로 사람을 구분하지 않는다.** 이 시스템에서 채도 높은 색은 상태를 뜻하고,
상태색과 45° 이상 떨어진 색상환 자리는 **네 칸뿐이다**(측정). 6색 팔레트를
만들면 StatusChip 과 경쟁한다. 식별자는 이니셜이 맡는다.
`--avatar-bg` / `--avatar-fg` 한 쌍만 쓴다(대비 8.5:1 검증됨).

### 4.1 이니셜 — 순수 함수로 분리

```ts
// packages/ui/src/components/avatar/initials.ts
export function initials(name: string): string;
```

**한글과 라틴 규칙이 다르다:**
- 라틴: 앞 두 단어의 첫 글자 — `"John Doe"` → `"JD"`, `"Jane"` → `"J"`
- CJK: **뒤 두 글자** — `"김철수"` → `"철수"`, `"김연"` → `"김연"`
  (성만 쓰면 "김"이 너무 많아 구분이 안 된다. 이름 쪽이 변별력이 있다)
- 섞여 있으면 CJK 규칙 우선

테스트에서 덮을 것:
- 라틴 2단어 · 1단어 · 3단어 이상 · 공백 여러 개 · 앞뒤 공백
- 한글 2·3·4글자, 한자, 가나
- 빈 문자열 · 공백만 → `''` (throw 금지)
- 이모지만 → 깨지지 않는다 (**서로게이트 페어를 반으로 자르지 마라**.
  `Array.from()` 이나 `Intl.Segmenter` 를 써라)

### 4.2 컴포넌트

- `src` 가 있으면 이미지, 실패하면 이니셜로 폴백 (5절과 같은 규칙).
- 크기는 `--control-h-sm/md/lg`(32·38·44px) 를 쓴다. 새 토큰을 만들지 마라.
- 원형. 이니셜은 가운데, `tabular` 아님(이름이다).
- **이미지에는 `alt`, 이니셜 폴백에는 `aria-label`** 로 이름 전체를 준다.
  이니셜만 읽히면 스크린리더에서 "철수"가 되어 누군지 모른다.
- 장식용으로 이름 옆에 함께 쓰일 때를 위해 `decorative?: boolean` 을 둬서
  `aria-hidden` 처리할 수 있게 하라 — 이름이 바로 옆에 글자로 있으면
  아바타까지 읽는 건 중복이다.

## 5. `Thumbnail`

```tsx
<Thumbnail src={product.image} alt="상품 사진" ratio="1/1" />
```

이커머스 상품 목록·CMS 미디어·물류 사진에서 **이미지는 실패한다.**
브라우저 기본 깨진 아이콘은 보기 흉하고 테마와 맞지도 않는다.

- **자리를 먼저 잡는다.** `aspect-ratio` 로 공간을 확보해 이미지가 늦게 와도
  레이아웃이 밀리지 않는다. 이 프로젝트가 계속 지켜온 규칙이다.
- 상태 세 가지: 로딩(`Skeleton`) → 성공(이미지) → 실패(아이콘 + 바탕).
  **`Skeleton` 을 다시 만들지 말고 가져다 써라.**
- `loading="lazy"` · `decoding="async"` — 표에 썸네일이 수백 개 뜬다.
- 실패 폴백에도 `role="img"` + `aria-label` 로 `alt` 를 전달하라.
- `src` 가 비어 있으면 **로딩을 거치지 말고 바로** 폴백을 보여라.
  빈 문자열로 네트워크 요청을 만들지 마라.

## 6. 스토리

`state.stories.tsx` · `avatar.stories.tsx` · `thumbnail.stories.tsx`

1. `빈상태-기본` / `빈상태-액션` / `오류-재시도` — 역할·문구·버튼 동작
2. `표-빈상태` — `DataTable` 에서 `emptyAction` 이 동작한다
3. `차트-높이일치` — **비어있음·오류·로딩·정상 네 상태의 플롯 높이가
   서로 2px 이내**임을 단언하라. `data-compare` 마커를 붙여라.
   이게 1.2 의 회귀 테스트다
4. `차트-재시도` — `onRetry` 가 불린다
5. `아바타-이니셜` — 한글 3자/2자, 라틴 2단어/1단어, 이모지, 빈 문자열
6. `아바타-이미지실패` — 깨진 src 로 이니셜 폴백
7. `썸네일-실패` — 깨진 src 로 아이콘 폴백, **레이아웃이 안 밀린다**를 단언
8. `썸네일-빈src` — 네트워크 요청 없이 바로 폴백

`play` 주의: `getComputedStyle` 은 라이브 객체다. 상태를 바꾸기 전에 복사하라.
이미지 실패는 `src` 를 `data:` 로 깨뜨리거나 존재하지 않는 경로를 쓰면 된다.

## 7. 완료 조건

```bash
pnpm verify
node --test packages/ui/src/components/avatar/*.test.mjs
node --test packages/ui/src/lib/*.test.mjs packages/ui/src/components/*/*.test.mjs
```

기존 차트·테이블·로딩 스토리가 전부 통과해야 한다.
특히 R08 의 `로딩-치수일치`(13쌍 Δ0px)가 깨지면 안 된다.

## 8. 하지 마라

- 일러스트·SVG 자산 추가. **`graphic` 슬롯만 만들고 비워둬라**
- 아바타 색상 팔레트 (4절)
- `EmptyState` 와 `ErrorState` 를 `tone` prop 하나로 합치기
- 토큰 생성기 · `packages/tokens/*` · `DESIGN.md` · `AGENTS.md` 수정
  (`--avatar-bg/fg` · `--state-min-h` 는 내가 이미 넣었다)
- 새 의존성. 아이콘은 이미 있는 `lucide-react` 에서 고른다
- 가상화·고정 컬럼·선택·내보내기 로직 변경
- 커밋 · 푸시

## 9. 보고할 것

- 차트 네 상태의 높이를 **한 곳에서** 구했는지, 어디인지
- `initials()` 가 CJK/라틴을 어떻게 가르는지, 서로게이트 페어 처리 방법
- `DataTable` 에서 `h-48` 을 지우고 측정한 빈 상태 높이
- 겉보기가 바뀐 곳 (3절에 적은 둘 외에 있는지)
- 의도적으로 하지 않은 것
