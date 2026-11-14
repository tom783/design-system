# R04 · 차트 컴포넌트 3종 (visx)

`TrendBand` · `BulletRow` · `CompositionArea` 를 만든다.
`AGENTS.md` 와 `DESIGN.md` **7.5절(데이터 시각화)** 을 먼저 읽어라.
7.5.3 의 차트 작성 규율 7개가 이 작업의 합격 기준이다.

---

## 0. 검증된 visx API — 이대로 써라

`@visx/scale` `@visx/shape` `@visx/axis` `@visx/grid` `@visx/curve` `@visx/group`
모두 **4.0.0 (MIT)** 으로 설치되어 있다. 아래는 이 저장소에서 `pnpm typecheck`
**0 에러**로 확인한 형태다. 인터넷 예제가 아니라 이것을 따라라.

```tsx
import { scaleLinear, scaleTime, scaleBand } from '@visx/scale';
import { LinePath, AreaClosed, Bar, AreaStack, Line } from '@visx/shape';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { curveMonotoneX } from '@visx/curve';
import { Group } from '@visx/group';

const x = scaleTime({ domain: [first, last], range: [m.left, w - m.right] });
const y = scaleLinear({ domain: [0, max], range: [h - m.bottom, m.top], nice: true });
const band = scaleBand({ domain: labels, range: [0, h], padding: 0.3 });

// 밴드 영역 — y0 로 하한을 주면 상·하한을 감싸는 닫힌 영역이 된다
<AreaClosed<Point>
  data={series} x={(d) => x(d.date)} y={(d) => y(d.hi)} y0={(d) => y(d.lo)}
  yScale={y} curve={curveMonotoneX} fill="var(--chart-band)" fillOpacity={0.55} />

<LinePath<Point> data={series} x={(d) => x(d.date)} y={(d) => y(d.value)}
  curve={curveMonotoneX} stroke="var(--chart-line)" strokeWidth={2} strokeLinejoin="round" />

<Bar x={m.left} y={band(label) ?? 0} width={120} height={8} fill="var(--chart-line)" />
<Line from={{ x: 200, y: 10 }} to={{ x: 200, y: 30 }} stroke="var(--chart-target)" strokeWidth={2.5} />

// 누적 영역 — 렌더프롭으로 각 스택의 path 를 받는다
<AreaStack<Row, Key> data={rows} keys={[...keys]}
  x={(d) => x(d.data.date)} y0={(d) => yPct(d[0])} y1={(d) => yPct(d[1])}>
  {({ stacks, path }) => stacks.map((s) => <path key={s.key} d={path(s) || ''} fill={colorOf(s.key)} />)}
</AreaStack>

// 축 — tickLabelProps 는 "함수"다. stroke 계열에 CSS 변수를 그대로 넣을 수 있다.
<AxisLeft scale={y} left={m.left} numTicks={4}
  stroke="var(--chart-axis)" tickStroke="var(--chart-axis)"
  tickFormat={(v) => `${Number(v) / 1000}k`}
  tickLabelProps={() => ({ fill: 'var(--chart-axis)', fontSize: 10, textAnchor: 'end', dy: '0.33em', dx: -4 })} />
```

## 1. 색 — 새로 만들지 마라

차트용 역할 토큰이 **이미 생성되어 있다.** 검증(비텍스트 3:1, 격자가 데이터선보다
약한지)까지 통과한 값이다. hex 를 쓰거나 원시색(`--color-brand-600`)을 직접 참조하지 마라.

| 토큰 | 용도 |
|---|---|
| `--chart-line` | 주 데이터 선·막대 |
| `--chart-band` | 분포 밴드·영역 채움 |
| `--chart-point` | 강조 포인트(마지막 값 등) |
| `--chart-grid` | 격자선. 데이터보다 약하다 |
| `--chart-axis` | 축선·눈금 레이블 |
| `--chart-track` | 불릿 배경 트랙 |
| `--chart-range` | 불릿 정상 범위 띠 |
| `--chart-target` | 목표 기준선 |

상태별 계열(결제완료·상품준비중·배송중·반품요청)은 **기존 의미 토큰**을 쓴다 —
`--status-info-fg` / `--status-warning-fg` / `--status-success-fg` / `--status-danger-fg`.
이 색들은 ΔE 로 서로 분리 검증된 값이다.

## 2. 반응형 — 자체 훅으로

`@visx/responsive` 를 설치하지 않았다. 대신 작은 훅을 만든다:

`packages/ui/src/lib/use-element-width.ts`
```ts
export function useElementWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number]
```
`ResizeObserver` 로 컨테이너 폭을 측정한다. `DataTable` 이 이미 같은 패턴을 쓰니 참고하라.
`ResizeObserver` 가 없는 환경(구형·테스트)에서도 깨지지 않게 폴백을 둔다.

**`viewBox` + `preserveAspectRatio` 로 통째 확대/축소하지 마라.** 글자까지 같이
늘어나 작은 화면에서 레이블이 뭉개지고 큰 화면에서 과하게 커진다. 폭을 측정해
좌표를 다시 계산하는 방식이어야 한다.

높이는 prop 으로 받는다(기본 `TrendBand` 220 / `BulletRow` 자동 / `CompositionArea` 220).

---

## 3. 만들 파일

| 경로 | 내용 |
|---|---|
| `packages/ui/src/lib/use-element-width.ts` | 폭 측정 훅 |
| `packages/ui/src/components/chart/chart-frame.tsx` | 공통 프레임(제목·범례·여백·빈 상태) |
| `packages/ui/src/components/chart/trend-band.tsx` | `TrendBand` |
| `packages/ui/src/components/chart/bullet-row.tsx` | `BulletRow` |
| `packages/ui/src/components/chart/composition-area.tsx` | `CompositionArea` |
| `packages/ui/src/components/chart/index.ts` | 재수출 |
| `packages/ui/src/stories/charts.stories.tsx` | 스토리 |

`packages/ui/src/index.ts` 에 공개 API 를 추가한다.

## 4. 컴포넌트 명세

### 4.1 `TrendBand` — 추이 + 분포 밴드

```ts
interface TrendBandProps<T> {
  data: T[];
  x: (d: T) => Date;
  y: (d: T) => number;
  /** 분포 하한·상한. 둘 다 주면 밴드를 그린다. 없으면 선만 */
  yLow?: (d: T) => number;
  yHigh?: (d: T) => number;
  height?: number;              // 기본 220
  valueFormat?: (v: number) => string;   // 축·레이블 공통
  /** 차트가 말하는 결론 한 문장. aria-label 에 들어간다. 필수 */
  summary: string;
  title?: string;
  className?: string;
}
```

- 마지막 데이터 포인트를 `--chart-point` 로 강조하고 값을 레이블로 붙인다.
- 밴드는 `fillOpacity` 0.55.
- 데이터가 **0개면** 차트를 그리지 말고 "표시할 데이터가 없습니다" 를 보여준다.
- 데이터가 **1개면** 선이 그려지지 않으므로 점만 찍는다. 깨지면 안 된다.

### 4.2 `BulletRow` — 목표 대비 실적

```ts
interface BulletMetric {
  label: string;
  actual: number;
  target: number;
  max: number;
  /** 정상 범위 [lo, hi]. 생략 가능 */
  good?: [number, number];
  unit?: string;
  /** true 면 낮을수록 좋다(반품률 등). 달성 판정이 뒤집힌다 */
  lowerIsBetter?: boolean;
}
interface BulletRowProps { metrics: BulletMetric[]; summary: string; title?: string; className?: string; }
```

- 한 지표 = 한 줄. 줄 높이 44px, 막대 높이 8px, 트랙 높이 18px.
- 목표는 세로 눈금(`--chart-target`, 2.5px). 정상 범위는 `--chart-range` 띠.
- 달성하면 막대를 `--status-success-fg`, 미달이면 `--chart-line`.
  **색만으로 판정을 전달하지 마라** — 우측 수치 옆에 달성/미달을 텍스트나 아이콘으로 함께 적는다.
- `lowerIsBetter` 일 때 달성 판정은 `actual <= target`.
- 레이블이 길면 말줄임하고 `title` 에 전체 값을 남긴다.

### 4.3 `CompositionArea` — 100% 누적 영역

```ts
interface CompositionAreaProps<T> {
  data: T[];
  x: (d: T) => Date;
  /** 계열 정의. 순서가 쌓이는 순서다 */
  series: { key: keyof T & string; label: string; color: string }[];
  height?: number;              // 기본 220
  summary: string;
  title?: string;
  className?: string;
}
```

- 각 시점의 값을 **합이 100이 되도록 정규화**한다. 입력이 이미 비율이든 절대값이든
  동작해야 한다. 합이 0인 시점은 건너뛰거나 공백으로 둔다(깨지지 않게).
- 마지막 시점의 각 계열 비율을 **우측에 직접 라벨링**한다
  (범례만 두면 4계열에서 색-계열 대응을 눈으로 추적해야 한다).
- `color` 는 호출자가 토큰 문자열(`'var(--status-info-fg)'`)로 넘긴다.

### 4.4 `ChartFrame` — 공통 프레임

제목 · 범례 · 패딩 · 빈 상태를 담당한다. 세 차트가 모두 이것을 쓴다.
범례 항목은 **색 스와치 + 텍스트**이고, 스와치만으로 구분되게 두지 마라.

---

## 5. 접근성 (7.5.3 규율 5·6)

- 모든 차트의 루트 `<svg>` 에 `role="img"` 와 `aria-label={summary}`.
  `summary` 는 **"7일 주문 추이"가 아니라 "11월 8일 980건에서 11월 14일 1,284건으로 증가"** 처럼
  차트가 말하는 결론이어야 한다. prop 으로 필수로 받는 이유가 이것이다.
- 숫자 레이블은 `font-family: var(--font-mono)` + `tabular-nums`.
- 진입 애니메이션을 넣는다면 `--dur-normal` 이내 1회, `prefers-reduced-motion` 준수.
  데이터 갱신마다 전체를 다시 그리며 움직이지 마라.
- 차트 안의 글자는 SVG `<text>` 이므로 Tailwind 클래스가 아니라 `fill` 로 색을 준다.

## 6. 완료 조건

```bash
pnpm verify
```

추가로 **정규화·달성판정 같은 순수 로직은 함수로 분리해 단위 테스트를 만들어라**:
`packages/ui/src/components/chart/normalize.ts` + `normalize.test.mjs`
- 100% 정규화: 절대값 입력, 이미 비율인 입력, 합이 0인 시점, 음수 방어
- 불릿 달성 판정: 일반/`lowerIsBetter`/경계값(actual === target)

`node --test packages/ui/src/components/chart/*.test.mjs` 로 통과 확인한다
(`node --test <디렉토리>` 는 Node 24 에서 동작하지 않는다).

## 7. 스토리

`charts.stories.tsx` 에 커머스 데이터로:

1. `추이밴드` — 7일 주문 추이 + 시간대 편차 밴드
2. `추이밴드_선만` — `yLow`/`yHigh` 없이
3. `추이밴드_엣지` — 데이터 0개와 1개를 나란히 (깨지지 않는 것을 보여준다)
4. `불릿` — 매출·신규고객·출고SLA·반품률 4지표 (반품률은 `lowerIsBetter`)
5. `구성변화` — 주문 상태 4계열 7일
6. `구성변화_절대값` — 비율이 아닌 절대 건수를 넣어도 정규화되는 것
7. `반응형` — 폭 320 / 640 / 1024 컨테이너에 같은 차트 (레이블이 뭉개지지 않는지)

각 스토리에 `parameters.docs.description.story` 로 무엇을 확인하는지 적어라.
가능하면 `play` 로 검증을 넣어라 — 브라우저에서 실행해 확인한다.

## 8. 범위 밖

- 툴팁·호버 인터랙션 — 다음 단계. 지금은 정적 렌더만.
- 스몰 멀티플·산점도 — 1차 3종에 포함되지 않는다.
- 범용 계열 팔레트(`--chart-series-*`) 를 만들지 마라. 지금 3종은 전부 기존 토큰으로 충분하고,
  필요해지면 생성기에 검증과 함께 추가한다.
- 토큰 생성기·`DESIGN.md`·`AGENTS.md`·기존 컴포넌트·DataTable 을 고치지 마라.
- 새 외부 의존성 추가 금지. 커밋·푸시 금지.

## 9. 보고할 것

- 만든 파일과 공개 API
- 100% 정규화를 어떻게 구현했고 합이 0인 시점을 어떻게 처리했는지
- 반응형 훅의 폴백 방식
- 데이터 0개·1개에서 깨지지 않는 것을 어떻게 확인했는지
- 타입이 맞지 않아 우회한 지점이 있으면 어디를 어떻게
- 의도적으로 하지 않은 것
