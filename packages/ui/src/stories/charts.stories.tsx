import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { BulletRow, CompositionArea, TrendBand, type BulletMetric } from '../components/chart';

import { Button } from '../components/button';
import { useDelayedLoading } from '../lib/use-delayed-loading';

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
export const 추이밴드_축기준: Story = {
  parameters: { docs: { description: { story: '규율 8: 선·상하한 밴드는 변화를 읽도록 데이터 프레이밍(auto)을 사용합니다. 막대·0까지 채우는 영역은 길이와 면적이 크기를 나타내므로 0 기준이 필수이며, 이 선 차트에서도 0을 포함해 비교해야 할 때는 zero를 지정합니다.' } } },
  render: () => <div className="flex flex-col gap-4">
    <TrendBand {...trendProps} {...bandProps} yDomain="zero" title="0 포함 — zero" />
    <TrendBand {...trendProps} {...bandProps} title="데이터 프레이밍 — auto (기본)" />
  </div>,
  play: async ({ canvasElement }) => { await checkCharts(canvasElement, 2); },
};
export const 추이밴드_음수: Story = {
  parameters: { docs: { description: { story: '음수와 양수가 섞인 증감 데이터도 상하한 밴드를 기준으로 프레이밍합니다.' } } },
  render: () => <TrendBand
    data={[-120, -80, -100, -20, 40, -10, 60].map((value, index) => ({ date: new Date(2026, 10, 8 + index), value }))}
    x={(d) => d.date} y={(d) => d.value} yLow={(d) => d.value - 30} yHigh={(d) => d.value + 30}
    title="반품 건수 증감" summary="반품 건수 증감은 11월 8일 -120건에서 11월 14일 60건으로 변했습니다." />,
  play: async ({ canvasElement }) => { await checkCharts(canvasElement, 1); },
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

export const 로딩_추이밴드: Story = {
  render: () => <TrendBand {...trendProps} {...bandProps} data={[]} state="loading" title="7일 주문과 시간대 편차" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('7일 주문과 시간대 편차')).toBeVisible();
    await expect(canvas.getByRole('list', { name: '범례' })).toHaveTextContent('추이분포 범위');
    await expect(canvasElement.querySelector('[data-slot="chart-frame"]')).toHaveAttribute('aria-busy', 'true');
    await expect(canvas.getByRole('status')).toHaveTextContent('불러오는 중');
    await expect(canvasElement.querySelector('[data-slot="chart-skeleton-plot"]')).toBeVisible();
    await expect(canvas.queryByRole('img')).toBeNull();
    await expect(canvasElement.innerHTML).not.toContain(trendSummary);
    await expect(canvasElement.querySelector('[data-slot="chart-empty"]')).toBeNull();
  },
};

export const 로딩_불릿: Story = {
  name: '로딩-불릿',
  render: () => <BulletRow metrics={[]} state="loading" skeletonRows={metrics.length} title="주간 목표 달성" summary={bulletSummary} />,
  play: async ({ canvasElement }) => {
    const rows = canvasElement.querySelectorAll('[data-slot="chart-skeleton-bullet-row"]');
    await expect(rows).toHaveLength(metrics.length);
    for (const row of rows) await expect(row.getBoundingClientRect().height).toBe(44);
    await expect(canvasElement.querySelector('.loading-chart-axis')).toBeNull();
    await expect(canvasElement.querySelector('.loading-chart-legend')).toBeNull();
    await expect(within(canvasElement).getByRole('list', { name: '범례' })).toBeVisible();
  },
};

export const 로딩_치수일치: Story = {
  render: () => <div className="grid grid-cols-2 items-start gap-4">
    {[undefined, 300, 60, NaN, 0, -1].map((height, index) => <React.Fragment key={index}>
      <div data-compare={`trend-${index}-loading`}><TrendBand {...trendProps} {...bandProps} height={height} state="loading" title="주문 추이" /></div>
      <div data-compare={`trend-${index}-ready`}><TrendBand {...trendProps} {...bandProps} height={height} title="주문 추이" /></div>
      <div data-compare={`composition-${index}-loading`}><CompositionArea {...compositionProps} height={height} state="loading" title="주문 구성" /></div>
      <div data-compare={`composition-${index}-ready`}><CompositionArea {...compositionProps} height={height} title="주문 구성" /></div>
    </React.Fragment>)}
    <div data-compare="bullet-loading"><BulletRow metrics={[]} skeletonRows={metrics.length} state="loading" title="주간 목표" summary={bulletSummary} /></div>
    <div data-compare="bullet-ready"><BulletRow metrics={metrics} title="주간 목표" summary={bulletSummary} /></div>
  </div>,
  play: async ({ canvasElement }) => {
    await checkCharts(canvasElement, 13);
    const groups = [...canvasElement.querySelectorAll<HTMLElement>('[data-compare]')];
    for (let i = 0; i < groups.length; i += 2) {
      const loading = groups[i]!.querySelector('[data-slot="chart-plot"]')!;
      const ready = groups[i + 1]!.querySelector('[data-slot="chart-plot"]')!;
      const diff = Math.abs(loading.getBoundingClientRect().height - ready.getBoundingClientRect().height);
      groups[i]!.dataset.plotHeightDiff = String(diff);
      await expect(diff).toBeLessThanOrEqual(2);
      // 플롯뿐 아니라 제목·범례·외곽 여백도 같은 레이아웃 약속을 지킨다.
      await expect(Math.abs(groups[i]!.getBoundingClientRect().height - groups[i + 1]!.getBoundingClientRect().height)).toBeLessThanOrEqual(2);
    }
  },
};

export const 오류: Story = {
  render: () => <div className="grid gap-4">
    <TrendBand {...trendProps} data={[]} state="error" title="주문 추이" />
    <CompositionArea {...compositionProps} state="error" errorMessage="주문 구성 조회에 실패했습니다. 새로고침해 주세요." />
    <BulletRow metrics={metrics} summary={bulletSummary} state="error" />
  </div>,
  play: async ({ canvasElement }) => {
    const alerts = within(canvasElement).getAllByRole('alert');
    await expect(alerts).toHaveLength(3);
    await expect(alerts[0]).toHaveTextContent('데이터를 불러오지 못했습니다');
    await expect(alerts[1]).toHaveTextContent('주문 구성 조회에 실패했습니다. 새로고침해 주세요.');
    await expect(within(canvasElement).queryByText('표시할 데이터가 없습니다')).toBeNull();
    await expect(within(canvasElement).queryByRole('img')).toBeNull();
  },
};

export const 비어있음: Story = {
  render: () => <div className="grid gap-4">
    <TrendBand {...trendProps} data={[]} state="idle" title="오늘 주문" />
    <CompositionArea {...compositionProps} data={[]} state="idle" emptyMessage="오늘 집계된 주문 구성이 없습니다" />
    <BulletRow metrics={[]} summary={bulletSummary} state="idle" />
    <TrendBand {...trendProps} state="empty" emptyMessage="선택한 기간에 주문이 없습니다" />
  </div>,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-slot="chart-empty"]')).toHaveLength(4);
    await expect(within(canvasElement).getAllByText('표시할 데이터가 없습니다')).toHaveLength(2);
    await expect(within(canvasElement).queryByRole('alert')).toBeNull();
    await expect(within(canvasElement).queryByRole('img')).toBeNull();
  },
};

function DelayedChartDemo() {
  const [request, setRequest] = React.useState<{ duration: number } | null>(null);
  const [busy, setBusy] = React.useState(false);
  // 지연은 앱이 책임진다. 빠른 갱신은 기존 데이터를 유지하고 400ms부터 스켈레톤을 표시한다.
  const loading = useDelayedLoading(busy, { delay: 400 });
  React.useEffect(() => {
    if (request === null) return;
    const timer = setTimeout(() => setBusy(false), request.duration);
    return () => clearTimeout(timer);
  }, [request]);
  return <section data-testid="delayed-chart" data-active={busy || loading}>
    <div className="mb-3 flex gap-2">{[150, 1500].map((ms) => <Button key={ms} disabled={busy || loading} onClick={() => { setBusy(true); setRequest({ duration: ms }); }}>{ms}ms 응답</Button>)}</div>
    <TrendBand {...trendProps} {...bandProps} state={loading ? 'loading' : 'idle'} title="주문 추이 새로고침" />
  </section>;
}

export const 지연로딩: Story = {
  render: () => <DelayedChartDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const ms of [150, 1500]) {
      let sawSkeleton = false;
      const record = () => { if (canvasElement.querySelector('[data-slot="chart-skeleton"]')) sawSkeleton = true; };
      const observer = new MutationObserver(record);
      observer.observe(canvasElement, { childList: true, subtree: true });
      try {
        await userEvent.click(canvas.getByRole('button', { name: `${ms}ms 응답` }));
        await waitFor(() => expect(canvas.getByTestId('delayed-chart')).toHaveAttribute('data-active', 'false'), { timeout: ms + 2000 });
        await expect(sawSkeleton).toBe(ms > 400);
        await checkCharts(canvasElement, 1);
      } finally { observer.disconnect(); }
    }
  },
};
