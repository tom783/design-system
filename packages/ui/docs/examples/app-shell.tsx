import * as React from 'react';
import {
  AppShell, type AppShellProps, SideNav, SideNavGroup, SideNavItem, PageHeader, Button, DataTable,
  createDataTableColumnHelper, DatePicker, Field, Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem, StatusChip, type DateRange,
} from '../../src';
import { Building2, ClipboardList, Package, Megaphone } from '../../src/icons';

// 기존 목록 화면과 같은 36건·기간·상태 필터를 셸의 본문 안에 조립한다.
const orders = Array.from({ length: 36 }, (_, i) => ({
  id: `ORD-${String(i + 1).padStart(3, '0')}`, recipient: ['김민수', '박서연', '이도윤'][i % 3]!,
  date: new Date(2026, 10, 15 - i % 12), amount: (i + 1) * 12500, status: i % 2 ? 'done' : 'ready',
}));
const helper = createDataTableColumnHelper<typeof orders[number]>();
const columns = helper.columns([
  helper.accessor('id', { header: '주문번호' }),
  helper.accessor('recipient', { header: '수취인' }),
  helper.accessor('date', { header: '주문일', cell: cell => <span className="tabular">{cell.getValue().toLocaleDateString('sv-SE')}</span> }),
  helper.accessor('amount', { header: '주문 금액', cell: cell => `${cell.getValue().toLocaleString('ko-KR')}원` }),
  helper.accessor('status', { header: '상태', cell: cell => <StatusChip tone={cell.getValue() === 'done' ? 'success' : 'warning'}>{cell.getValue() === 'done' ? '배송 완료' : '준비 중'}</StatusChip> }),
]);

export function AppShellExample({ narrowNavigation }: Pick<AppShellProps, 'narrowNavigation'> = {}) {
  const [range, setRange] = React.useState<DateRange | undefined>({ from: new Date(2026, 10, 1), to: new Date(2026, 10, 30) });
  const [status, setStatus] = React.useState('all');
  const filtered = orders.filter(order => (status === 'all' || order.status === status)
    && (!range?.from || order.date >= range.from) && (!range?.to || order.date <= range.to));
  return <AppShell narrowNavigation={narrowNavigation} sidebar={
    <SideNav brand="커머스 운영" brandIcon={<Building2 />}>
      <SideNavGroup label="판매 관리">
        <SideNavItem icon={<ClipboardList />} label="주문 목록" href="#orders" current badge={orders.length} />
        <SideNavItem icon={<Package />} label="상품 관리" href="#products" />
      </SideNavGroup>
      <SideNavGroup label="마케팅">
        <SideNavItem icon={<Megaphone />} label="프로모션" disabled />
      </SideNavGroup>
    </SideNav>
  }>
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader title="주문 목록" description="주문 기간과 처리 상태로 주문을 조회하고 관리합니다."
        actions={<Button variant="primary">주문 등록</Button>} />
      <div>
        <div className="flex flex-wrap items-start gap-4 border-b border-line pb-2">
          <Field label="주문 기간"><DatePicker value={range} onValueChange={setRange} today={new Date(2026, 10, 15)} /></Field>
          <Field label="주문 상태"><Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-auto min-w-40"><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="all">전체</SelectItem><SelectItem value="ready">준비 중</SelectItem><SelectItem value="done">배송 완료</SelectItem>
            </SelectContent>
          </Select></Field>
        </div>
        <p role="status" className="tabular my-4">총 {filtered.length}건</p>
        <DataTable data={filtered} columns={columns} getRowId={order => order.id} caption="기간 및 상태로 조회한 주문 목록" />
      </div>
    </div>
  </AppShell>;
}
