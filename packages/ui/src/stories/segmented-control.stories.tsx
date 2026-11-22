import { useId, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { LayoutGrid, List, CalendarDays } from 'lucide-react';
import { SegmentedControl, Card, CardBody } from '../index';
import { SegmentedControlExample } from '../../docs/examples/segmented-control';
import primarySource from '../../docs/examples/segmented-control.tsx?raw';

const meta = { title: 'Components/SegmentedControl', component: SegmentedControl, tags: ['autodocs'],
  parameters: { manifest: ['SegmentedControl'] } } satisfies Meta<typeof SegmentedControl>;
export default meta;
type Story = StoryObj;
const periods = [{ value: 'day', label: '일' }, { value: 'week', label: '주' }, { value: 'month', label: '월' }];
const views = [{ value: 'table', label: '표 보기', icon: <List /> }, { value: 'card', label: '카드 보기', icon: <LayoutGrid /> }];
export const 사용법: Story = {
  parameters: { docs: { source: { code: primarySource.replace("from '../../src'", "from '@s2life/ui'"), language: 'tsx', type: 'code' } } },
  render: () => <SegmentedControlExample />,
};
export const 기본: Story = { render: () => <SegmentedControlExample /> };
export const 아이콘라벨: Story = { render: () => <SegmentedControl aria-label="목록 보기" options={views} defaultValue="table" /> };
export const 아이콘전용: Story = { render: () => <SegmentedControl aria-label="목록 보기" options={views} iconOnly defaultValue="table" /> };
export const 크기: Story = { render: () => <div className="flex flex-wrap items-center gap-4">
  <SegmentedControl aria-label="작은 기간 단위" options={periods} size="sm" />
  <SegmentedControl aria-label="기본 기간 단위" options={periods} size="md" />
</div> };
export const 비활성항목: Story = { render: () => <div className="flex flex-wrap gap-4">
  <SegmentedControl aria-label="기간 단위" options={periods.map(p => ({ ...p, disabled: p.value === 'week' }))} defaultValue="day" />
  <SegmentedControl aria-label="사용할 수 없는 기간 단위" options={periods} disabled />
</div> };
export const 전체폭: Story = { render: () => <div style={{ width: 600, maxWidth: '100%' }}>
  <SegmentedControl aria-label="전체 폭 기간 단위" options={periods} fullWidth />
</div> };
export const 좁은폭: Story = { render: () => <div style={{ width: 180, maxWidth: '100%' }}>
  <SegmentedControl aria-label="매출 집계 단위" fullWidth options={[
    { value: 'day', label: '일별 매출 현황' }, { value: 'week', label: '주별 매출 현황' }, { value: 'month', label: '월별 매출 현황' },
  ]} />
</div> };
export const 다크: Story = { globals: { theme: 'dark' }, render: () => <SegmentedControl aria-label="목록 보기" options={views} /> };
const orders = [{ id: 'ORD-1024', customer: '서울 상점', amount: '128,400원' }, { id: 'ORD-1025', customer: '부산 상점', amount: '84,000원' }];
function ViewSwitch() {
  const [view, setView] = useState('table');
  return <div className="space-y-4">
    <SegmentedControl aria-label="주문 보기 방식" value={view} onValueChange={setView} options={views} />
    {view === 'table' ? <table aria-label="주문 목록" className="w-full text-left">
      <thead><tr><th>주문 번호</th><th>거래처</th><th className="text-right">금액</th></tr></thead>
      <tbody>{orders.map(order => <tr key={order.id}><td>{order.id}</td><td>{order.customer}</td><td className="text-right tabular">{order.amount}</td></tr>)}</tbody>
    </table> : <ul className="grid gap-4 sm:grid-cols-2" aria-label="주문 목록">{orders.map(order => <li key={order.id}>
      <Card><CardBody><p>{order.id}</p><p>{order.customer}</p><p className="tabular">{order.amount}</p></CardBody></Card>
    </li>)}</ul>}
  </div>;
}
export const 보기전환: Story = { render: () => <ViewSwitch /> };
// 키보드·외부 제어·보이는 이름을 검증하는 장치는 사용법에서 분리한다.
function KeyboardFixture() {
  const id = useId();
  const [value, setValue] = useState('day');
  return <div className="space-y-4">
    <button data-probe="before" type="button">이전 작업</button>
    <p id={id}>집계 단위</p>
    <SegmentedControl aria-labelledby={id} value={value} onValueChange={setValue} options={[
      { value: 'day', label: '일', icon: <CalendarDays /> }, { value: 'week', label: '주', disabled: true }, { value: 'month', label: '월' },
    ]} />
    <button data-probe="after" type="button" onClick={() => setValue('month')}>외부에서 월 선택</button>
    <output aria-live="polite">{value}</output>
  </div>;
}
export const 키보드: Story = { render: () => <KeyboardFixture /> };
export const 오른쪽부터: Story = { render: () => <div dir="rtl"><SegmentedControl aria-label="기간 단위" options={periods} /></div> };
