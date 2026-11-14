# R08 · 차트 로딩 상태

R06 에서 `ChartSkeleton` 을 만들어놓고 **아무도 쓰지 않는 채로 남겼다.**
"차트에 로딩 상태가 없으니 연결은 API 추가다, 다음으로 미룬다"고 적었다. 지금이 그 다음이다.

`AGENTS.md` 와 `DESIGN.md` **9절(로딩)** 을 먼저 읽어라. 특히 9.2 — 스켈레톤의
치수는 실제 컴포넌트와 맞아야 한다.

---

## 1. 어휘는 `DataTable` 과 똑같이 간다

이미 정해진 규칙이 있으므로 새로 만들지 마라. `data-table.tsx` 52행:

```ts
const effectiveState = state === 'idle' && rows.length === 0 ? 'empty' : state;
```

**앱이 준 상태가 이기고, `empty` 만 데이터에서 파생된다.** 차트도 같다.
메시지 기본값도 맞춘다 — `'표시할 데이터가 없습니다'` / `'데이터를 불러오지 못했습니다'`.

**`empty` 와 `error` 를 같은 화면으로 보여주지 마라.** "오늘 주문이 없다"와
"주문을 불러오지 못했다"는 사용자가 할 행동이 다르다. 전자는 그냥 사실이고,
후자는 새로고침해야 한다. 지금 차트에는 `error` 가 아예 없어서 실패가 "데이터 없음"
으로 보인다 — 이게 이번에 고치는 것 중 하나다.

## 2. `ChartFrame`

```ts
export interface ChartFrameProps {
  // … 기존 그대로 …
  empty?: boolean;                                   // 차트가 데이터에서 판단 (기존 유지)
  state?: 'idle' | 'loading' | 'empty' | 'error';    // 앱이 준다. 기본 'idle'
  emptyMessage?: string;
  errorMessage?: string;
  loadingLabel?: string;                             // 기본 '불러오는 중'
  skeleton?: ReactNode;                              // 차트가 자기 모양의 스켈레톤을 준다 (4절)
}
```

- `effectiveState` 는 1절 공식 그대로.
- **제목과 범례는 로딩 중에도 진짜를 그대로 보여준다.** 둘 다 props 지 데이터가
  아니다. 바뀌는 것은 플롯 영역뿐이고, 그래야 로딩이 끝날 때 레이아웃이 안 흔들린다.
- `aria-busy` 는 `effectiveState === 'loading'` 일 때 `figure` 에 건다.
- **`summary` 를 로딩 중에 읽히게 두지 마라.** `summary` 는 "최근 30일 매출 12% 증가"
  같은 결론 문장이다. 아직 데이터가 없는데 그걸 읽어주면 거짓말이다.
  로딩 중에는 `loadingLabel` 이 읽히게 한다.

## 3. `ChartSkeleton` 확장

지금 시그니처는 `{ label, className }` 뿐이다. 필요한 것을 더한다.

```ts
export interface ChartSkeletonProps extends SkeletonPatternProps {
  height?: number;                     // 실제 차트 높이와 맞춘다
  legend?: boolean;                    // 기본 true. ChartFrame 안에서는 false
  variant?: 'plot' | 'bullet';         // 기본 'plot'
  rows?: number;                       // variant='bullet' 일 때 막대 줄 수. 기본 3
}
```

- `height` 는 CSS 변수로 넘겨라. `.loading-chart-plot` 의
  `height: var(--chart-h-default)` 를 `height: var(--chart-skeleton-h, var(--chart-h-default))`
  로 바꾸고, `height` prop 이 있을 때만 인라인으로 `--chart-skeleton-h` 를 준다.
  **`height` 가 NaN·0·음수로 들어오면 토큰 기본값으로 떨어뜨려라.**
  `chart-frame.tsx` 의 `defaultChartHeight()` 주석에 왜 이게 중요한지 적혀 있다.
- `legend: false` 면 범례 줄을 아예 렌더하지 않는다(빈 높이도 남기지 마라).
- **`variant='bullet'` 이 새로 필요한 이유**: 불릿 차트에는 축이 없다.
  축 상자 모양 스켈레톤을 보여주면 "곧 꺾은선이 옵니다"라고 거짓말하는 것이다.
  불릿용은 `rows` 개의 "짧은 라벨 + 가로 막대" 줄로 그린다.
  실제 `BulletRow` 가 한 줄에 44px 를 쓰므로 줄 높이도 44px 로 맞춰라.

## 4. 차트 3종

세 컴포넌트 모두 `state` / `emptyMessage` / `errorMessage` 를 받아 `ChartFrame` 에
그대로 넘긴다. 각자 자기 모양의 스켈레톤을 `skeleton` 으로 준다.

| 차트 | 스켈레톤 |
|---|---|
| `TrendBand` | `<ChartSkeleton variant="plot" legend={false} height={height ?? defaultChartHeight()} />` |
| `CompositionArea` | 같음 |
| `BulletRow` | `<ChartSkeleton variant="bullet" legend={false} rows={skeletonRows} />` |

**`BulletRow` 에 함정이 있다.** 높이가 `metrics.length * 44` 라서 **데이터가 오기
전에는 높이를 알 수 없다.** 그래서 prop 을 하나 추가한다:

```ts
skeletonRows?: number;   // 기본 3. 불러온 뒤 개수가 다르면 그만큼 레이아웃이 밀린다
```

JSDoc 에 "앱이 지표 개수를 알면 넘겨라, 안 맞으면 로딩이 끝날 때 화면이 밀린다"를
적어라. 기본값으로 숨기지 말고 드러내는 쪽이 맞다.

`defaultChartHeight()` 는 DOM 을 읽으므로 렌더 중(`children(width)` 안)에서만
호출된다. **스켈레톤 경로는 `children` 을 부르지 않는다** — 그 바깥에서 호출하면
SSR 에서 터진다. 어떻게 처리했는지 보고하라.

## 5. 앱이 지연을 책임진다 — 컴포넌트 안에 타이머를 넣지 마라

9절은 빠른 응답에 로더를 띄우지 말라고 한다. 그건 `useDelayedLoading` 이 하는 일이고
**앱이 쓴다.** `DataTable` 도 안에 타이머가 없다. 차트도 똑같이 `state` 를 받기만 한다.
`nextPhase` 나 `useDelayedLoading` 을 차트 안에서 호출하지 마라.

스토리 하나로 이 사용법을 보여줘라 — `useDelayedLoading` 으로 감싼 차트.

---

## 6. 스토리

기존 `charts.stories.tsx` 에 추가한다. 필요한 것:

1. `로딩-추이밴드` — 스켈레톤이 뜨고 제목·범례는 진짜가 보인다
2. `로딩-불릿` — 불릿 모양 스켈레톤(축 상자가 아님)
3. `로딩-치수일치` — **같은 차트를 로딩/완료 두 벌 나란히 렌더하고
   플롯 영역 높이 차이가 2px 이내임을 `play` 에서 단언하라.**
   비교할 두 요소에 `data-compare` 를 붙여라 — 기존 로딩 검증 하네스가 그 마커를 본다.
4. `오류` — 오류 메시지가 "데이터 없음"과 **다른 문구**로 나온다
5. `비어있음` — 기존 엣지 스토리와 구분되게 `state="idle"` + 빈 데이터
6. `지연로딩` — `useDelayedLoading` 사용 예. 빠른 응답(150ms)에 스켈레톤이 안 뜬다

`play` 단언 작성 시:
- `getComputedStyle` 은 **라이브 객체다.** 상태를 바꾸기 전에 문자열로 복사하라.
- `toHaveStyle({ width: '60%' })` 같은 비교는 항상 실패한다 — `getComputedStyle` 이
  퍼센트를 px 로 해소한다. R05 에서 겪었다. 비율을 직접 계산해 비교하라.

## 7. 완료 조건

```bash
pnpm verify
node --test packages/ui/src/lib/*.test.mjs packages/ui/src/components/*/*.test.mjs
```

기존 차트·로딩 스토리가 전부 통과해야 한다. 특히 `스켈레톤-치수일치` 와
`추이밴드-엣지` · `구성변화-엣지`.

## 8. 하지 마라

- 토큰 생성기 · `packages/tokens/*` · `DESIGN.md` · `AGENTS.md` 수정
  (`--chart-skeleton-h` 는 토큰이 아니라 인스턴스 변수다. 생성기에 넣지 마라)
- 차트 안에 로딩 타이머·지연 로직
- `loading.css` 의 다른 패턴(`loading-card-*`, `loading-progress-*`) 변경
- 기존 `empty` prop 제거 — `state` 와 공존한다 (1절)
- 안내(`guide/`)·테이블 컴포넌트 수정
- 새 의존성. 커밋·푸시

## 9. 보고할 것

- `ChartFrame` · `ChartSkeleton` 의 최종 시그니처
- `defaultChartHeight()` 의 SSR 문제를 어떻게 피했는지 (4절)
- `variant='bullet'` 스켈레톤을 어떤 마크업으로 그렸고 44px 를 어떻게 맞췄는지
- 치수 일치 스토리에서 실제로 측정된 차이값
- 의도적으로 하지 않은 것
