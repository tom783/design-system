import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import {
  Button, DataTable, Input, PageHeader, Pagination, Select, SelectContent, SelectItem, SelectTrigger,
  SelectValue, StatusChip, createDataTableColumnHelper,
} from '../index';
import { Download, Plus } from '../icons';
import { NOW, STATUS, StoreShell, dateTime, orders, won, type Order, type OrderStatus } from './screens-shell';

/**
 * 주문 목록 — 데이터 화면의 기준 조립(2026-11-22 시안 T34 확정).
 * 제목은 PageHeader 기본 display 34/40·700 그대로다. 툴바는 검색 Input + 필터 Select 두 개 +
 * 선택 요약·일괄 버튼을 한 줄에 둔다. 검색 폭은 className="w-80" 하나로 준다(래퍼가 폭을 받는다).
 * 선택 요약은 DataTable·Pagination 과 같은 단위 "건"을 쓴다.
 */
const meta = { title: 'Screens/OrderList', parameters: { fullBleed: true } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const helper = createDataTableColumnHelper<Order>();
const columns = helper.columns([
  helper.accessor('id', { header: '주문번호', cell: cell => <a className="tabular text-fg-link underline" href={`#${cell.getValue()}`}>{cell.getValue()}</a> }),
  helper.accessor('orderedAt', { header: '주문 일시', cell: cell => <span className="tabular">{dateTime(cell.getValue())}</span> }),
  helper.accessor('recipient', { header: '수취인' }),
  helper.accessor('product', { header: '상품' }),
  helper.accessor('amount', { header: '결제 금액', cell: cell => <span className="tabular">{won(cell.getValue())}</span> }),
  helper.accessor('payment', { header: '결제 수단' }),
  helper.accessor('status', { header: '상태', cell: cell => {
    const status = STATUS[cell.getValue()];
    return <StatusChip tone={status.tone}>{status.label}</StatusChip>;
  } }),
]);
const PERIODS = { '7d': 7, '30d': 30 } as const;

// 기본 선택에 '취소 요청'(danger 칩) 행을 넣는다. 선택 행 바탕 위에서 오류 칩이 구별되는지가 검토 대상이다(2026-11-22).
function OrderListScreen({ initialSelected = ['ORD-20480', 'ORD-20479', 'ORD-20475'] }: { initialSelected?: string[] }) {
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState<'all' | OrderStatus>('all');
  const [period, setPeriod] = React.useState<keyof typeof PERIODS>('30d');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [selected, setSelected] = React.useState<string[]>(initialSelected);
  const filtered = React.useMemo(() => {
    const since = NOW.getTime() - PERIODS[period] * 86_400_000, text = query.trim();
    return orders.filter(order => order.orderedAt.getTime() >= since && (status === 'all' || order.status === status)
      && (!text || [order.id, order.recipient, order.product].some(value => value.includes(text))));
  }, [query, status, period]);
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  // 조건이 바뀌면 첫 페이지로 간다. 화면에서 빠진 행의 선택은 DataTable 이 해제한다.
  const reset = <T,>(set: (value: T) => void) => (value: T) => { set(value); setPage(1); };
  return <StoreShell current="orders">
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader title="주문 목록" description="결제가 끝난 주문을 확인하고 출고를 처리합니다."
        actions={<>
          <Button leadingIcon={<Download aria-hidden="true" />}>내보내기</Button>
          <Button variant="primary" leadingIcon={<Plus aria-hidden="true" />}>주문 등록</Button>
        </>} />
      <section aria-label="주문 조회" className="flex min-w-0 flex-col gap-3">
        <div data-screen="toolbar" className="flex flex-wrap items-center gap-2">
          <Input type="search" aria-label="주문 검색" placeholder="주문번호·수취인·상품명 검색" className="w-80 max-w-full"
            value={query} onChange={event => reset(setQuery)(event.target.value)} />
          <Select value={status} onValueChange={reset(value => setStatus(value as typeof status))}>
            <SelectTrigger aria-label="주문 상태" className="w-auto min-w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              {Object.entries(STATUS).map(([value, item]) => <SelectItem key={value} value={value}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={reset(value => setPeriod(value as typeof period))}>
            <SelectTrigger aria-label="주문 기간" className="w-auto min-w-40"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="7d">최근 7일</SelectItem><SelectItem value="30d">최근 30일</SelectItem></SelectContent>
          </Select>
          <div data-screen="bulk" className="ml-auto flex flex-wrap items-center gap-2">
            {/* 알림 영역은 항상 둔다. 선택될 때 새로 끼워 넣은 live region 은 읽히지 않을 수 있다. */}
            <span role="status" className="tabular text-[length:var(--text-body-sm)] font-semibold">
              {selected.length ? `${selected.length.toLocaleString('ko-KR')}건 선택` : ''}
            </span>
            {selected.length > 0 && <>
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>선택 해제</Button>
              <Button>송장 출력</Button>
              <Button>출고 처리</Button>
            </>}
          </div>
        </div>
        <DataTable data={rows} columns={columns} getRowId={order => order.id} selectionMode="multi"
          selectedIds={selected} onSelectedIdsChange={setSelected} align={{ amount: 'end' }}
          caption={`최근 ${PERIODS[period]}일 주문 목록, ${page}페이지`} />
        <Pagination page={page} pageSize={pageSize} totalCount={filtered.length} onPageChange={setPage}
          pageSizeOptions={[20, 50, 100]} onPageSizeChange={setPageSize} />
      </section>
    </div>
  </StoreShell>;
}

export const 기본: Story = {
  render: () => <OrderListScreen />,
  play: async ({ canvasElement: root }) => {
    const c = within(root);
    await expect(c.getByRole('heading', { level: 1, name: '주문 목록' })).toBeInTheDocument();
    await expect(root.querySelector('[data-screen="bulk"] [role="status"]')).toHaveTextContent('3건 선택');
    await expect(c.getByText('1–20 / 1,284건')).toBeInTheDocument();
    root.dataset.playComplete = 'true';
  },
};
