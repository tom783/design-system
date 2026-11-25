import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import {
  BulletRow, Button, DataTable, PageHeader, SectionHeader, StatTile, StatusChip, TrendBand,
  createDataTableColumnHelper, type BulletMetric,
} from '../index';
import { Download } from '../icons';
import { STATUS, StoreShell, dateTime, orders, won, type Order } from './screens-shell';

/**
 * 대시보드 — StatTile 4개 → 차트 카드 2개(TrendBand·BulletRow) → 최근 주문 5행.
 * 타일 줄은 DESIGN §7.5.7 그리드(auto-fit minmax(min(100%, 200px), 1fr) · gap 16)를 그대로 쓴다.
 * 반품률·출고 대기는 goodDirection="down" 이다. 증감 화살표는 실제 방향을 따른다.
 * "최근 주문" 섹션 머리는 SectionHeader(DESIGN §24.6)다 — 제목 h2 + 머리 오른끝 링크형 '전체 보기 ›'(접근성 이름 '최근 주문 전체 보기'),
 * 앞 섹션 끝 → 제목 32 · 머리 → 표 12 는 부품이 갖는다. 셸은 상단 바 64(Screens/AppHeader 와 같은 묶음)다.
 */
const meta = { title: 'Screens/Dashboard', parameters: { fullBleed: true } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const daily = [980, 1020, 940, 1110, 1180, 1220, 1284].map((value, index) => ({
  date: new Date(2026, 10, 9 + index), value, low: value - 160 - index * 8, high: value + 210 + index * 8,
}));
const metrics: BulletMetric[] = [
  { label: '매출', actual: 9.4, target: 10, max: 12, good: [9, 11], unit: '억원' },
  { label: '신규 고객', actual: 3120, target: 3000, max: 4000, good: [2800, 3400], unit: '명' },
  { label: '출고 SLA', actual: 97.1, target: 98, max: 100, good: [98, 100], unit: '%' },
  { label: '반품률', actual: 1.8, target: 2, max: 5, good: [0, 2], unit: '%', lowerIsBetter: true },
];
const helper = createDataTableColumnHelper<Order>();
const columns = helper.columns([
  helper.accessor('id', { header: '주문번호', cell: cell => <a className="tabular text-fg-link underline" href={`#${cell.getValue()}`}>{cell.getValue()}</a> }),
  helper.accessor('orderedAt', { header: '주문 일시', cell: cell => <span className="tabular">{dateTime(cell.getValue())}</span> }),
  helper.accessor('recipient', { header: '수취인' }),
  helper.accessor('product', { header: '상품' }),
  helper.accessor('amount', { header: '결제 금액', cell: cell => <span className="tabular">{won(cell.getValue())}</span> }),
  helper.accessor('status', { header: '상태', cell: cell => {
    const status = STATUS[cell.getValue()];
    return <StatusChip tone={status.tone}>{status.label}</StatusChip>;
  } }),
]);

function DashboardScreen() {
  return <StoreShell current="dashboard">
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader title="대시보드" description="2026-11-15 18:00 기준 · 15분마다 새로 고칩니다."
        actions={<Button leadingIcon={<Download aria-hidden="true" />}>보고서 내려받기</Button>} />
      <section aria-label="오늘 지표" data-screen="tiles" className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))' }}>
        <StatTile label="오늘 주문" value={1284} unit="건" delta={12} deltaLabel="전일 대비" href="#orders" />
        <StatTile label="오늘 매출" value={38420000} unit="원" delta={8.4} deltaLabel="전일 대비" />
        <StatTile label="출고 대기" value={86} unit="건" delta={-14} deltaFormat="absolute" deltaUnit="건" deltaLabel="전일 대비" goodDirection="down" href="#orders" />
        <StatTile label="반품률" value={1.8} unit="%" delta={0.3} deltaFormat="absolute" deltaUnit="%p" deltaLabel="전주 대비" goodDirection="down" />
      </section>
      <section aria-label="추이" className="grid min-w-0 grid-cols-2 gap-4">
        <TrendBand data={daily} x={d => d.date} y={d => d.value} yLow={d => d.low} yHigh={d => d.high}
          title="최근 7일 주문" summary="11월 9일 980건에서 11월 15일 1,284건으로 주문이 31% 늘었습니다." />
        <BulletRow metrics={metrics} title="11월 목표 대비"
          summary="신규 고객은 목표를 넘었고 매출·출고 SLA는 목표에 못 미쳤으며 반품률은 목표 안입니다." />
      </section>
      <SectionHeader title="최근 주문" data-screen="recent-orders" actions={[{ kind: 'link', label: '전체 보기', href: '#orders' }]}>
        <DataTable data={orders.slice(0, 5)} columns={columns} getRowId={order => order.id} align={{ amount: 'end' }}
          caption="최근 주문 5건" />
      </SectionHeader>
    </div>
  </StoreShell>;
}

export const 기본: Story = {
  render: () => <DashboardScreen />,
  play: async ({ canvasElement: root }) => {
    const c = within(root);
    await expect(c.getByRole('heading', { level: 1, name: '대시보드' })).toBeInTheDocument();
    await expect(c.getByText('3,842만원')).toBeInTheDocument();
    await expect(c.getByRole('region', { name: '최근 주문' })).toBeInTheDocument();
    await expect(c.getByRole('link', { name: '최근 주문 전체 보기' })).toHaveAttribute('href', '#orders');
    root.dataset.playComplete = 'true';
  },
};
