import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, BulkActionBar, Button, DataTable, FilterBar, PageHeader, Pagination, StatusChip,
  createDataTableColumnHelper, toast, Toaster,
} from '../index';
import { Download, Plus } from '../icons';
import { STATUS, StoreShell, dateTime, orders, won, type Order } from './screens-shell';
import { ORDER_FILTERS, OrderFilterPanel, filtersOf } from './order-filters';

/**
 * 주문 목록 — 데이터 화면의 기준 조립(2026-11-22 시안 T34 확정 · 0.5.0 목록 툴바 규격 Figma 189:2).
 * 제목은 PageHeader 기본 display 34/40·700 그대로다. 툴바는 FilterBar(저장된 보기 → 검색 → 필터 → 칩 줄)이고,
 * 행을 선택하면 BulkActionBar 가 같은 자리·같은 높이로 대체해 표 위에 sticky 로 붙는다.
 * 선택은 DataTable 이 소유한다(selectedIds·onSelectedIdsChange 제어형). 바는 그 길이와 선택 해제만 쓴다.
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
const VIEWS = [{ value: 'default', label: '기본 보기' }, { value: 'ready', label: '출고 대기만' }, { value: 'vip', label: 'VIP 주문' }];
const DEFAULT_FILTERS = ['status', 'period', 'payment'];

interface ScreenProps {
  /** 처음 적용할 필터 수(ORDER_FILTERS 앞에서부터). 검수 매트릭스 0·3·8개. */
  filterCount?: number;
  /** 처음 선택할 행. 숫자는 1페이지 행 순서(0부터), 문자열은 주문번호다. */
  initialSelected?: Array<number | string>;
  /** 저장된 보기에서 조건이 달라진 상태로 시작한다(시안 187:79). */
  viewChanged?: boolean;
}

function OrderListScreen({ filterCount = 3, initialSelected = [], viewChanged: initialChanged = false }: ScreenProps) {
  const [view, setView] = React.useState('default');
  const [query, setQuery] = React.useState('');
  const [filterIds, setFilterIds] = React.useState(() => ORDER_FILTERS.slice(0, filterCount).map(filter => filter.id));
  const [savedIds, setSavedIds] = React.useState(() => initialChanged ? DEFAULT_FILTERS.slice(0, 2) : filterIds);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [confirm, setConfirm] = React.useState(false);
  const filters = filtersOf(filterIds);
  const filtered = React.useMemo(() => {
    const text = query.trim();
    return orders.filter(order => filters.every(filter => filter.test(order))
      && (!text || [order.id, order.recipient, order.product].some(value => value.includes(text))));
  }, [query, filterIds]);
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const [selected, setSelected] = React.useState<string[]>(() =>
    initialSelected.map(item => typeof item === 'number' ? rows[item]?.id : item).filter((id): id is string => !!id));
  const toolbar = React.useRef<HTMLDivElement>(null);
  // 조건이 바뀌면 첫 페이지로 간다. 화면에서 빠진 행의 선택은 DataTable 이 해제한다.
  const changeFilters = (ids: string[]) => { setFilterIds(ids); setPage(1); };
  const viewChanged = savedIds.join() !== filterIds.join();
  return <StoreShell current="orders">
    <Toaster />
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader title="주문 목록" description="결제가 끝난 주문을 확인하고 출고를 처리합니다."
        actions={<>
          <Button leadingIcon={<Download aria-hidden="true" />}>내보내기</Button>
          <Button variant="primary" leadingIcon={<Plus aria-hidden="true" />}>주문 등록</Button>
        </>} />
      {/* 바가 sticky 로 붙으려면 표와 같은 부모 안에 있어야 한다. */}
      <section aria-label="주문 조회" className="flex min-w-0 flex-col gap-3">
        <BulkActionBar ref={toolbar} data-screen="toolbar" selectedCount={selected.length} onClear={() => setSelected([])}
          actions={<><Button size="sm">송장 출력</Button><Button size="sm">출고 처리</Button></>}
          dangerAction={<Button size="sm" variant="danger" onClick={() => setConfirm(true)}>주문 취소</Button>}>
          <FilterBar views={VIEWS} view={view} onViewChange={setView} viewChanged={viewChanged}
            onSaveView={() => { setSavedIds(filterIds); toast.success('기본 보기에 지금 조건을 저장했습니다'); }}
            query={query} onQueryChange={value => { setQuery(value); setPage(1); }}
            searchLabel="주문 검색" searchPlaceholder="주문번호·수취인·상품명 검색"
            filters={filters} onFiltersChange={next => changeFilters(next.map(filter => filter.id))}
            filterContent={<OrderFilterPanel ids={filterIds} onIdsChange={changeFilters} />} />
        </BulkActionBar>
        <DataTable data={rows} columns={columns} getRowId={order => order.id} selectionMode="multi"
          selectedIds={selected} onSelectedIdsChange={setSelected} align={{ amount: 'end' }}
          caption={`주문 목록 ${filtered.length.toLocaleString('ko-KR')}건 중 ${page}페이지`} />
        <Pagination page={page} pageSize={pageSize} totalCount={filtered.length} onPageChange={setPage}
          pageSizeOptions={[20, 50, 100]} onPageSizeChange={setPageSize} />
      </section>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        {/* 확정하면 선택이 비어 바(와 주문 취소 버튼)가 사라진다. 돌아갈 곳은 돌아온 툴바의 검색이다. */}
        <AlertDialogContent onCloseAutoFocus={event => {
          const search = toolbar.current?.querySelector<HTMLElement>('[data-slot="filter-bar-search"] input');
          if (selected.length === 0 && search) { event.preventDefault(); search.focus(); }
        }}>
          <AlertDialogHeader>
            <AlertDialogTitle>주문 {selected.length.toLocaleString('ko-KR')}건을 취소하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>선택한 주문의 결제를 취소하고 고객에게 취소 안내를 보냅니다. 취소한 주문은 되돌릴 수 없습니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>계속 보기</AlertDialogCancel>
            <AlertDialogAction variant="danger" onClick={() => {
              toast.success(`주문 ${selected.length.toLocaleString('ko-KR')}건을 취소했습니다`); setSelected([]);
            }}>주문 취소</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </StoreShell>;
}

const ready = (root: HTMLElement) => { root.dataset.playComplete = 'true'; };
/** 표·툴바가 그려진 뒤 표식을 세운다. 하네스는 이 표식 뒤에 잰다. */
async function settled(root: HTMLElement) {
  await expect(within(root).getByRole('heading', { level: 1, name: '주문 목록' })).toBeInTheDocument();
  await waitFor(() => expect(root.querySelector('[data-slot="pagination-range"]')).not.toBeNull());
}

export const 기본: Story = {
  name: '기본 — 선택 전 · 필터 3개',
  render: () => <OrderListScreen />,
  play: async ({ canvasElement: root }) => {
    await settled(root);
    await expect(root.querySelector('[data-slot="bulk-action-bar-count"]')).toHaveTextContent(/^$/);
    await expect(within(root).getByRole('button', { name: '필터 3개 적용' })).toBeInTheDocument();
    ready(root);
  },
};
export const 선택됨: Story = {
  name: '선택 후 · 필터 3개',
  render: () => <OrderListScreen initialSelected={[0, 1, 3]} />,
  play: async ({ canvasElement: root }) => {
    await settled(root);
    await expect(root.querySelector('[data-slot="bulk-action-bar-count"]')).toHaveTextContent('3건 선택');
    ready(root);
  },
};
export const 필터없음: Story = { name: '선택 전 · 필터 0개', render: () => <OrderListScreen filterCount={0} />,
  play: async ({ canvasElement: root }) => { await settled(root); ready(root); } };
// '취소 요청'(danger 칩) 행을 선택에 넣는다. 선택 행 바탕 위에서 오류 칩이 구별되는지가 검토 대상이다(2026-11-22).
export const 필터없음선택됨: Story = {
  name: '선택 후 · 필터 0개',
  render: () => <OrderListScreen filterCount={0} initialSelected={['ORD-20480', 'ORD-20479', 'ORD-20475']} />,
  play: async ({ canvasElement: root }) => {
    await settled(root);
    await expect(root.querySelector('[data-slot="bulk-action-bar-count"]')).toHaveTextContent('3건 선택');
    await expect(within(root).getByText('1–20 / 1,284건')).toBeInTheDocument();
    ready(root);
  },
};
export const 필터8개: Story = { name: '선택 전 · 필터 8개', render: () => <OrderListScreen filterCount={8} />,
  play: async ({ canvasElement: root }) => { await settled(root); ready(root); } };
export const 필터8개선택됨: Story = { name: '선택 후 · 필터 8개', render: () => <OrderListScreen filterCount={8} initialSelected={[0, 1, 3]} />,
  play: async ({ canvasElement: root }) => { await settled(root); ready(root); } };
export const 숨은필터열림: Story = {
  name: '+N 팝오버 열림',
  render: () => <OrderListScreen filterCount={8} />,
  play: async ({ canvasElement: root }) => {
    await settled(root);
    const more = await waitFor(() => { const el = root.querySelector<HTMLElement>('[data-slot="filter-bar-more"]'); if (!el) throw new Error('+N 없음'); return el; });
    await userEvent.click(more);
    await expect(await within(document.body).findByRole('dialog', { name: /숨은 필터 \d+개/ })).toBeInTheDocument();
    ready(root);
  },
};
export const 보기변경됨: Story = { name: '보기 변경됨', render: () => <OrderListScreen viewChanged />,
  play: async ({ canvasElement: root }) => { await settled(root); await expect(within(root).getByText('변경됨')).toBeInTheDocument(); ready(root); } };
