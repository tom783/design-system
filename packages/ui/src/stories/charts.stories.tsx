import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';
import { BulletRow, CompositionArea, TrendBand, type BulletMetric } from '../components/chart';

const daily = [980, 1020, 940, 1110, 1180, 1220, 1284].map((orders, index) => ({
  date: new Date(2026, 10, 8 + index), orders, low: orders - 180 - index * 10, high: orders + 220 + index * 10,
}));
const trendSummary = '11월 8일 980건에서 11월 14일 1,284건으로 주문이 증가했습니다.';
const trendProps = { data: daily, x: (d: typeof daily[number]) => d.date, y: (d: typeof daily[number]) => d.orders, summary: trendSummary };
const bandProps = { yLow: (d: typeof daily[number]) => d.low, yHigh: (d: typeof daily[number]) => d.high };
const metrics: BulletMetric[] = [
  { label: '매출', actual: 1284, target: 1200, max: 1600, good: [1100, 1400], unit: '만원' },
  { label: '신규고객', actual: 284, target: 320, max: 400, good: [280, 360], unit: '명' },
  { label: '출고SLA', actual: 98.2, target: 98, max: 100, good: [98, 100], unit: '%' },
  { label: '반품률', actual: 1.8, target: 2, max: 5, good: [0, 2], unit: '%', lowerIsBetter: true },
];
const bulletSummary = '매출·출고SLA·반품률은 목표를 달성했고 신규고객은 284명으로 목표 320명에 미달했습니다.';
const composition = [
  [30, 25, 40, 5], [28, 24, 44, 4], [25, 24, 47, 4], [24, 22, 50, 4],
  [23, 20, 54, 3], [21, 19, 57, 3], [20, 18, 60, 2],
].map(([paid, preparing, shipping, returned], index) => ({
  date: new Date(2026, 10, 8 + index), paid: paid!, preparing: preparing!, shipping: shipping!, returned: returned!,
}));
const series = [
  { key: 'paid', label: '결제완료', color: 'var(--status-info-fg)' },
  { key: 'preparing', label: '상품준비중', color: 'var(--status-warning-fg)' },
  { key: 'shipping', label: '배송중', color: 'var(--status-success-fg)' },
  { key: 'returned', label: '반품요청', color: 'var(--status-danger-fg)' },
] satisfies { key: keyof typeof composition[number] & string; label: string; color: string }[];
const compositionSummary = '배송중 비중은 40%에서 60%로 늘고 반품요청은 5%에서 2%로 줄었습니다.';
const compositionProps = { data: composition, x: (d: typeof composition[number]) => d.date, series, summary: compositionSummary };

const meta = {
  title: 'Components/Charts',
  parameters: { docs: { description: { component: '의미 토큰을 상속하는 정적 SVG 차트입니다. 폭이 바뀌면 좌표와 눈금을 다시 계산하고, 요약 문장과 직접 라벨로 데이터를 전달합니다.' } } },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

async function checkCharts(canvasElement: HTMLElement, count: number) {
  await waitFor(() => expect(within(canvasElement).getAllByRole('img')).toHaveLength(count));
  for (const svg of canvasElement.querySelectorAll('svg[role="img"]')) {
    await expect(svg.getAttribute('aria-label')?.length).toBeGreaterThan(20);
    await expect(svg.hasAttribute('viewBox')).toBe(false);
    await expect(svg.outerHTML).not.toMatch(/NaN|Infinity/);
    const plot = svg.parentElement!;
    await expect(Math.abs(svg.getBoundingClientRect().width - plot.getBoundingClientRect().width)).toBeLessThan(1);
  }
}

export const 추이밴드: Story = {
  parameters: { docs: { description: { story: '7일 주문 추이와 시간대 편차 밴드를 함께 표시합니다. 밴드 투명도 0.55, 마지막 점과 1,284건 라벨, 결론을 전달하는 접근성 이름을 확인합니다.' } } },
  render: () => <TrendBand {...trendProps} {...bandProps} title="7일 주문과 시간대 편차" />,
  play: async ({ canvasElement }) => {
    await checkCharts(canvasElement, 1);
    await expect(canvasElement.querySelector('[data-slot="trend-band-area"]')).toHaveAttribute('fill-opacity', '0.55');
    await expect(canvasElement.querySelector('[data-slot="trend-band-value"]')).toHaveTextContent('1,284');
    await expect(within(canvasElement).getByRole('img', { name: trendSummary })).toBeVisible();
  },
};
export const 추이밴드_선만: Story = {
  parameters: { docs: { description: { story: '분포 접근자를 생략하면 밴드 없이 선과 마지막 값만 나타납니다.' } } },
  render: () => <TrendBand {...trendProps} title="7일 주문 추이" />,
  play: async ({ canvasElement }) => {
    await checkCharts(canvasElement, 1);
    await expect(canvasElement.querySelector('[data-slot="trend-band-area"]')).toBeNull();
    await expect(canvasElement.querySelector('[data-slot="trend-band-line"]')).toBeInTheDocument();
  },
};
export const 추이밴드_엣지: Story = {
  parameters: { docs: { description: { story: '빈 데이터는 안내만, 단일 시점은 선 없이 점과 값만 표시합니다. 폭이 좁아도 두 상태가 깨지지 않는지 확인합니다.' } } },
  render: () => <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
    <TrendBand {...trendProps} data={[]} title="주문 데이터 없음" summary="아직 집계된 주문 데이터가 없습니다." />
    <TrendBand {...trendProps} {...bandProps} data={daily.slice(-1)} title="첫 집계" summary="11월 14일 최초 집계된 주문은 1,284건입니다." />
  </div>,
  play: async ({ canvasElement }) => {
    await checkCharts(canvasElement, 1);
    await expect(within(canvasElement).getByText('표시할 데이터가 없습니다')).toBeVisible();
    await expect(canvasElement.querySelectorAll('[data-slot="trend-band-point"]')).toHaveLength(1);
    await expect(canvasElement.querySelector('[data-slot="trend-band-line"]')).toBeNull();
    await expect(canvasElement.querySelector('[data-slot="trend-band-area"]')).toBeNull();
  },
};
export const 불릿: Story = {
  parameters: { docs: { description: { story: '매출·신규고객·출고SLA·반품률의 실적과 목표 눈금을 비교합니다. 반품률은 낮을수록 좋으며 판정은 서로 다른 아이콘과 달성/미달 텍스트로도 전달합니다. 행 44px, 트랙 18px, 실적 8px을 확인합니다.' } } },
  render: () => <BulletRow metrics={metrics} summary={bulletSummary} title="주간 목표 달성" />,
  play: async ({ canvasElement }) => {
    await checkCharts(canvasElement, 1);
    const statuses = [...canvasElement.querySelectorAll('[data-slot="bullet-status"]')].map((node) => node.textContent);
    await expect(statuses).toEqual(['달성', '미달', '달성', '달성']);
    for (const bar of canvasElement.querySelectorAll('[data-slot="bullet-actual"]')) await expect(bar).toHaveAttribute('height', '8');
    for (const track of canvasElement.querySelectorAll('[data-slot="bullet-track"]')) await expect(track).toHaveAttribute('height', '18');
  },
};
export const 구성변화: Story = {
  parameters: { docs: { description: { story: '7일 동안 주문 상태 4계열의 구성비가 바뀌는 모습을 봅니다. 마지막 구성비를 우측에 직접 쓰고, 2%인 반품요청도 라벨이 겹치지 않도록 연결선으로 분리합니다.' } } },
  render: () => <CompositionArea {...compositionProps} title="주문 상태 구성 변화" />,
  play: async ({ canvasElement }) => {
    await checkCharts(canvasElement, 1);
    await expect([...canvasElement.querySelectorAll('[data-slot="composition-value"]')].map((node) => node.textContent)).toEqual(['2.0%', '60.0%', '18.0%', '20.0%']);
    await expect(canvasElement.querySelectorAll('[data-slot="composition-series"]')).toHaveLength(4);
  },
};
export const 구성변화_절대값: Story = {
  parameters: { docs: { description: { story: '시점마다 총 주문수가 달라도 절대 건수를 합계 100%로 정규화합니다. 비율 입력 스토리와 마지막 구성비가 같은지 검증합니다.' } } },
  render: () => <CompositionArea {...compositionProps} title="절대 건수에서 계산한 구성비" data={composition.map((row, i) => ({
    ...row, paid: row.paid * (i + 8), preparing: row.preparing * (i + 8), shipping: row.shipping * (i + 8), returned: row.returned * (i + 8),
  }))} />,
  play: 구성변화.play,
};
export const 반응형: Story = {
  parameters: { docs: { description: { story: '320·640·1024px 컨테이너에 같은 차트 3종을 배치합니다. 글자는 13px로 유지하고, 640px 컨테이너만 480px로 바꿔도 ResizeObserver가 좌표를 다시 계산하는지 검증합니다.' } } },
  render: () => <div className="flex flex-col gap-6 overflow-x-auto">
    {[320, 640, 1024].map((width) => <section key={width} data-testid={`width-${width}`} style={{ width, flexShrink: 0 }} className="flex flex-col gap-3">
      <h2>{width}px</h2>
      <TrendBand {...trendProps} {...bandProps} title="주문 추이" />
      <BulletRow metrics={metrics} summary={bulletSummary} title="목표 대비 실적" />
      <CompositionArea {...compositionProps} title="주문 상태 구성비" />
    </section>)}
  </div>,
  play: async ({ canvasElement }) => {
    await checkCharts(canvasElement, 9);
    for (const text of canvasElement.querySelectorAll('svg[role="img"] text')) {
      await expect(parseFloat(getComputedStyle(text).fontSize)).toBeGreaterThanOrEqual(13);
    }
    const container = within(canvasElement).getByTestId('width-640');
    const svg = container.querySelector('svg[role="img"]')!;
    const previous = svg.getBoundingClientRect().width;
    // 폴백 환경에서는 창 resize로 재측정하므로 컨테이너 단독 변경 검증을 생략한다.
    if (typeof ResizeObserver !== 'undefined') {
      container.style.width = '480px';
      await waitFor(() => expect(svg.getBoundingClientRect().width).toBeCloseTo(previous - 160, 0));
      container.style.width = '640px';
      await waitFor(() => expect(svg.getBoundingClientRect().width).toBeCloseTo(previous, 0));
    }
  },
};
export const 구성변화_엣지: Story = {
  parameters: { docs: { description: { story: '데이터 없음·합계 0·단일 시점·중간 0 구간을 비교합니다. 0 구간을 가로질러 면을 연결하지 않고, 유효한 단일 시점은 얇은 누적 열로 보존합니다.' } } },
  render: () => <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
    <CompositionArea {...compositionProps} data={[]} title="데이터 없음" summary="집계된 주문 상태 데이터가 없습니다." />
    <CompositionArea {...compositionProps} data={[{ ...composition[0]!, paid: 0, preparing: 0, shipping: 0, returned: 0 }]} title="전체 합계 0" summary="집계된 주문 합계가 0건이므로 구성비를 계산할 수 없습니다." />
    <CompositionArea {...compositionProps} data={composition.slice(-1)} title="단일 시점" summary="첫 집계에서 배송중 비중은 60%, 반품요청은 2%입니다." />
    <CompositionArea {...compositionProps} data={composition.map((row, i) => i === 3 ? { ...row, paid: 0, preparing: 0, shipping: 0, returned: 0 } : row)} title="중간 합계 0" />
  </div>,
  play: async ({ canvasElement }) => {
    await checkCharts(canvasElement, 2);
    await expect(within(canvasElement).getAllByText('표시할 데이터가 없습니다')).toHaveLength(2);
    await expect(canvasElement.querySelectorAll('[data-slot="composition-single"]')).toHaveLength(4);
    const paths = canvasElement.querySelectorAll('[data-slot="composition-series"]');
    for (const path of [...paths].slice(4)) await expect((path.getAttribute('d')?.match(/M/g) ?? []).length).toBe(2);
  },
};
