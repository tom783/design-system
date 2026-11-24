import * as React from 'react';
import { Ellipsis } from '../icons';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { createColumnHelper } from '@tanstack/react-table';
import { DataTable, dataTableFeatures } from '../components/data-table';
import { DatePicker, type DateRange } from '../components/date-picker';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../components/dropdown-menu';
import { Field } from '../components/form';
import { FilterBar, type FilterBarFilter } from '../components/filter-bar';
import { Button } from '../components/button';
import { StatusChip } from '../components/status-chip';
import { Toaster, toast } from '../components/toast';
import { quickRange } from '../components/date-picker/date-value';
const meta = { title: 'QA/ListScreen' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const today = new Date(2026, 10, 15);
const initialOrders = Array.from({ length: 36 }, (_, i) => ({ id: `ORD-${String(i + 1).padStart(3, '0')}`, recipient: ['김민수', '박서연', '이도윤'][i % 3]!, date: new Date(2026, 10, 15 - i % 12), amount: (i + 1) * 12500, status: i % 2 ? 'done' : 'ready' }));
type Order = typeof initialOrders[number];
const helper = createColumnHelper<typeof dataTableFeatures, Order>();
function ListScreen() {
  const [range, setRange] = React.useState<DateRange | undefined>(quickRange('이번 달', today));
  const [status, setStatus] = React.useState('all'); const [orders, setOrders] = React.useState(initialOrders);
  const columns = React.useMemo(() => helper.columns([
    helper.accessor('id', { header: '주문번호' }), helper.accessor('recipient', { header: '수취인' }),
    helper.accessor('date', { header: '주문일', cell: cell => <span className="tabular">{cell.getValue().toLocaleDateString('sv-SE')}</span> }),
    helper.accessor('amount', { header: '주문 금액', cell: cell => `${cell.getValue().toLocaleString('ko-KR')}원` }),
    helper.accessor('status', { header: '상태', cell: cell => <StatusChip tone={cell.getValue() === 'done' ? 'success' : 'warning'}>{cell.getValue() === 'done' ? '배송 완료' : '준비 중'}</StatusChip> }),
    helper.display({ id: 'actions', header: () => <span className="sr-only">작업</span>, cell: cell => <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" iconOnly aria-label={`${cell.row.original.id} 작업`}><Ellipsis aria-hidden="true" /></Button></DropdownMenuTrigger><DropdownMenuContent>
      <DropdownMenuItem onSelect={() => toast.success('저장했습니다')}>저장</DropdownMenuItem>
      <DropdownMenuItem destructive onSelect={() => { setOrders(previous => previous.filter(order => order.id !== cell.row.original.id)); toast.success('주문을 삭제했습니다'); }}>삭제</DropdownMenuItem>
    </DropdownMenuContent></DropdownMenu> }),
  ]), []);
  const [query, setQuery] = React.useState('');
  const day = (date: Date) => date.toLocaleDateString('sv-SE');
  // 칩은 조건 하나에 하나다. 해제하면 그 조건만 기본값(기간 없음·전체 상태)으로 돌린다.
  const chips: FilterBarFilter[] = [
    ...(range?.from ? [{ id: 'range', label: `기간: ${day(range.from)} – ${range.to ? day(range.to) : '오늘'}` }] : []),
    ...(status !== 'all' ? [{ id: 'status', label: `상태: ${status === 'done' ? '배송 완료' : '준비 중'}` }] : []),
  ];
  const text = query.trim();
  const filtered = orders.filter(order => (status === 'all' || order.status === status) && (!range?.from || order.date >= range.from) && (!range?.to || order.date <= range.to)
    && (!text || order.id.includes(text) || order.recipient.includes(text)));
  return <main className="mx-auto min-w-0 max-w-6xl space-y-4"><Toaster /><h1 className="text-xl font-semibold">주문 목록</h1>
    {/* 조건 편집은 필터 트리거의 패널에 두고, 적용된 조건은 칩으로 보인다(0.5.0 목록 툴바). */}
    <FilterBar query={query} onQueryChange={setQuery} searchLabel="주문 검색" searchPlaceholder="주문번호·수취인 검색"
      filters={chips} onFiltersChange={next => {
        if (!next.some(chip => chip.id === 'range')) setRange(undefined);
        if (!next.some(chip => chip.id === 'status')) setStatus('all');
      }}
      filterContent={<div className="flex flex-col gap-4">
        <Field label="주문 기간"><DatePicker value={range} onValueChange={setRange} today={today} /></Field>
        <Field label="주문 상태"><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-auto min-w-40"><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="all">전체</SelectItem><SelectItem value="ready">준비 중</SelectItem><SelectItem value="done">배송 완료</SelectItem>
        </SelectContent></Select></Field>
      </div>} />
    <p role="status" className="tabular">총 {filtered.length}건</p>
    {/* 상태 열과 그 뒤 행 작업 열을 오른쪽에 고정한다(§4.4) — 고정 열은 끝으로 모이므로 상태만 주면 작업 열 뒤로 간다. */}
    <DataTable data={filtered} columns={columns} getRowId={order => order.id} pinnedEnd={['status', 'actions']} caption="기간 및 상태로 조회한 주문 목록" />
  </main>;
}
export const 목록화면: Story = { render: () => <ListScreen />, play: async ({ canvasElement: root }) => {
  const canvas = within(root); await expect(canvas.getByRole('status', { name: '' })).toHaveTextContent('총 36건');
  await userEvent.click(canvas.getByRole('button', { name: '필터 1개 적용' }));
  const panel = within(await within(document.body).findByRole('dialog', { name: '필터' }));
  await userEvent.click(panel.getByRole('combobox')); await userEvent.click(within(document.body).getByRole('option', { name: '준비 중' }));
  await expect(canvas.getByText('총 18건')).toBeInTheDocument();
  await userEvent.click(panel.getByRole('button', { name: '달력 열기' })); await userEvent.click(within(document.body).getByRole('button', { name: '최근 7일' }));
  await expect(canvas.getByText('총 12건')).toBeInTheDocument();
  await expect(canvas.getByRole('button', { name: '상태: 준비 중 필터 해제' })).toBeInTheDocument();
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(within(document.body).queryByRole('dialog', { name: '필터' })).toBeNull());
  await userEvent.click(canvas.getAllByRole('button', { name: /ORD-.* 작업/ })[0]!);
  await userEvent.click(within(document.body).getByRole('menuitem', { name: '저장' }));
  await expect(await within(document.body).findByText('저장했습니다')).toBeInTheDocument(); toast.dismiss(); root.dataset.playComplete = 'true';
} };
