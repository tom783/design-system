import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { createColumnHelper } from '@tanstack/react-table';
import { DataTable, dataTableFeatures, type SelectionMode } from '../components/data-table';
import { Button } from '../components/button';
import { StatusChip } from '../components/status-chip';

interface Order {
  id: string;
  recipient: string;
  product: string;
  amount: number;
  quantity: number;
  status: '결제 완료' | '상품 준비 중' | '배송 완료';
  orderedAt: string;
  channel: string;
  address: string;
  phone: string;
  shippingFee: number;
  memo: string;
}

const orders: Order[] = [
  { id: 'ORD-20261114-001', recipient: '김민지', product: '무선 바코드 스캐너', amount: 47600, quantity: 1, status: '결제 완료', orderedAt: '2026-11-14 09:02', channel: '자사몰', address: '서울특별시 성동구 왕십리로 83', phone: '010-1234-5601', shippingFee: 3000, memo: '문 앞에 놓아 주세요' },
  { id: 'ORD-20261114-002', recipient: '이준호', product: '업무용 라벨 프린터', amount: 1248500, quantity: 5, status: '상품 준비 중', orderedAt: '2026-11-14 09:08', channel: '기업 전용몰', address: '경기도 성남시 분당구 판교로 242', phone: '010-1234-5602', shippingFee: 0, memo: '입고 전 연락 부탁드립니다' },
  { id: 'ORD-20261114-003', recipient: '박서연', product: '물류센터 자동 분류 설비 일괄 납품', amount: 1248500000, quantity: 12, status: '결제 완료', orderedAt: '2026-11-14 09:15', channel: '도매 계약', address: '인천광역시 중구 공항동로 296', phone: '010-1234-5603', shippingFee: 120000, memo: '현장 담당자와 납품 일정 협의' },
  { id: 'ORD-20261114-004', recipient: '최지우', product: '친환경 종이 완충재', amount: 15800, quantity: 2, status: '배송 완료', orderedAt: '2026-11-14 09:21', channel: '자사몰', address: '부산광역시 해운대구 센텀중앙로 97', phone: '010-1234-5604', shippingFee: 3000, memo: '' },
  { id: 'ORD-20261114-005', recipient: '정하늘', product: '접이식 운반 카트', amount: 389000, quantity: 3, status: '상품 준비 중', orderedAt: '2026-11-14 09:28', channel: '기업 전용몰', address: '대전광역시 유성구 대학로 99', phone: '010-1234-5605', shippingFee: 5000, memo: '경비실 보관' },
  { id: 'ORD-20261114-006', recipient: '강도윤', product: '배송 박스, 중형 100매', amount: 56200, quantity: 1, status: '결제 완료', orderedAt: '2026-11-14 09:34', channel: '자사몰', address: '대구광역시 수성구 동대구로 15', phone: '010-1234-5606', shippingFee: 3000, memo: '수취인: "강도윤"' },
  { id: 'ORD-20261114-007', recipient: '윤수아', product: '스테인리스 작업대', amount: 780000, quantity: 2, status: '배송 완료', orderedAt: '2026-11-14 09:40', channel: '도매 계약', address: '광주광역시 북구 첨단과기로 123', phone: '010-1234-5607', shippingFee: 30000, memo: '1층 하역장\n담당자에게 전달' },
  { id: 'ORD-20261114-008', recipient: '장시우', product: '송장 라벨 20롤', amount: 92000, quantity: 4, status: '결제 완료', orderedAt: '2026-11-14 09:45', channel: '기업 전용몰', address: '울산광역시 남구 산업로 100', phone: '010-1234-5608', shippingFee: 0, memo: '' },
  { id: 'ORD-20261114-009', recipient: '임유나', product: '산업용 태블릿 거치대', amount: 219000, quantity: 1, status: '상품 준비 중', orderedAt: '2026-11-14 09:51', channel: '자사몰', address: '경기도 수원시 영통구 광교로 145', phone: '010-1234-5609', shippingFee: 3000, memo: '오후 배송 희망' },
  { id: 'ORD-20261114-010', recipient: '한지호', product: '안전 장갑 10켤레', amount: 8500, quantity: 1, status: '배송 완료', orderedAt: '2026-11-14 10:03', channel: '자사몰', address: '강원특별자치도 춘천시 중앙로 1', phone: '010-1234-5610', shippingFee: 3000, memo: '' },
  { id: 'ORD-20261114-011', recipient: '오채원', product: '전동 팔레트 운반기', amount: 12800000, quantity: 2, status: '결제 완료', orderedAt: '2026-11-14 10:12', channel: '도매 계약', address: '충청북도 청주시 흥덕구 직지대로 308', phone: '010-1234-5611', shippingFee: 80000, memo: '법인명으로 세금계산서 발행' },
  { id: 'ORD-20261114-012', recipient: '서우진', product: '포장 테이프 50개입', amount: 67500, quantity: 5, status: '상품 준비 중', orderedAt: '2026-11-14 10:24', channel: '기업 전용몰', address: '제주특별자치도 제주시 첨단로 242', phone: '010-1234-5612', shippingFee: 6000, memo: '도서 지역 배송' },
];

const helper = createColumnHelper<typeof dataTableFeatures, Order>();
const columns = helper.columns([
  helper.accessor('id', { header: '주문번호' }),
  helper.accessor('recipient', { header: '수취인' }),
  helper.accessor('product', { header: '상품명' }),
  helper.accessor('amount', { header: '주문 금액', cell: (cell) => cell.getValue().toLocaleString('ko-KR') }),
  helper.accessor('status', {
    header: '주문 상태',
    cell: (cell) => <StatusChip tone={cell.getValue() === '배송 완료' ? 'success' : cell.getValue() === '상품 준비 중' ? 'warning' : 'info'}>{cell.getValue()}</StatusChip>,
  }),
]);
const getRowId = (row: Order) => row.id;

/** 필터·일시 빈 응답·덧붙이기를 앱 선택 개수와 함께 관찰하는 도그푸딩 재현 화면. */
function FilterSelectionExample({ controlled = true }: { controlled?: boolean }) {
  const [filter, setFilter] = React.useState<'이천' | '부산' | '겹침' | '빈 결과'>('이천');
  const [state, setState] = React.useState<'idle' | 'loading' | 'error'>('idle');
  const [ids, setIds] = React.useState<string[]>([]);
  const [changes, setChanges] = React.useState<string[][]>([]);
  const [extra, setExtra] = React.useState(false);
  const [revision, setRevision] = React.useState(0);
  const data = React.useMemo(() => {
    if (state !== 'idle' || filter === '빈 결과') return [];
    const start = filter === '이천' ? 0 : filter === '부산' ? 3 : 1;
    return [...orders.slice(start, start + 3), ...(extra ? orders.slice(9, 10) : [])];
  }, [filter, state, extra, revision]);
  return <section data-probe="selection-filter" className="flex min-w-0 flex-col gap-3">
    <div className="flex flex-wrap gap-2">
      {(['이천', '부산', '겹침', '빈 결과'] as const).map(value => <Button key={value} data-probe={`filter-${value}`}
        onClick={() => { setFilter(value); setExtra(false); }}>{value}센터</Button>)}
      <Button data-probe="loading" onClick={() => setState('loading')}>재조회 중</Button>
      <Button data-probe="error" onClick={() => setState('error')}>일시 오류</Button>
      <Button data-probe="ready" onClick={() => setState('idle')}>조회 완료</Button>
      <Button data-probe="rerender" onClick={() => setRevision(value => value + 1)}>같은 데이터 재렌더</Button>
      <Button data-probe="append" onClick={() => setExtra(true)}>행 덧붙이기</Button>
      <Button data-probe="clear-log" onClick={() => setChanges([])}>호출 기록 비우기</Button>
    </div>
    <output data-probe="app-selection" data-count={ids.length}>{ids.length}건 일괄 처리</output>
    <output data-probe="selection-changes">{JSON.stringify(changes)}</output>
    <DataTable data={data} columns={columns} getRowId={getRowId} selectionMode="multi" state={state}
      selectedIds={controlled ? ids : undefined}
      onSelectedIdsChange={next => { setIds(next); setChanges(previous => [...previous, next]); }}
      exportFileName="필터-선택.csv" hasMore onLoadMore={() => { /* 덧붙이기 버튼으로 응답 시점을 통제한다. */ }}
      caption="필터 결과에 있는 행만 일괄 처리하는 주문 목록" />
  </section>;
}

const meta = {
  tags: ['autodocs'],
  title: 'Components/DataTable',
  component: DataTable<Order>,
  args: { data: orders, columns, getRowId, caption: '오늘 접수된 커머스 주문 12건' },
  parameters: { manifest: ['DataTable'],
    docs: { description: { component: '행 클릭과 선택을 분리하고, 실제 너비로 고정 컬럼을 배치하는 업무용 데이터 테이블입니다. 금액은 원본 숫자를 유지해 정렬과 CSV 내보내기에 사용합니다.' } },
  },
} satisfies Meta<typeof DataTable<Order>>;
export default meta;
type Story = StoryObj<typeof meta>;

export const 선택자동해제: Story = { render: () => <React.StrictMode><FilterSelectionExample /></React.StrictMode> };
export const 선택자동해제_비제어: Story = { render: () => <FilterSelectionExample controlled={false} /> };

export const 기본: Story = {
  parameters: { docs: { description: { story: '장시간 주문을 비교하는 화면이므로 40px 행과 우측 정렬 숫자를 기본으로 사용합니다. 정렬 아이콘은 항상 공간을 차지해 정렬 전환 시 헤더가 움직이지 않습니다.' } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sort = canvas.getByRole('button', { name: '주문 금액' });
    await userEvent.click(sort);
    await expect(sort.closest('th')).toHaveAttribute('aria-sort', 'descending');
    await expect(canvas.getAllByRole('row')[1]).toHaveTextContent('1,248,500,000');
    await userEvent.click(sort);
    await expect(sort.closest('th')).toHaveAttribute('aria-sort', 'ascending');
    await expect(canvas.getAllByRole('row')[1]).toHaveTextContent('8,500');
  },
};

const alignmentOrders = [
  { orderNo: 20241190841, count: 2, amount: 47600 },
  { orderNo: 20241190842, count: 12, amount: 1248500 },
  { orderNo: 20241190843, count: 1, amount: 15800 },
];
const alignmentHelper = createColumnHelper<typeof dataTableFeatures, typeof alignmentOrders[number]>();
const alignmentColumns = alignmentHelper.columns([
  alignmentHelper.accessor('orderNo', { header: '주문번호' }),
  alignmentHelper.accessor('count', { header: '수량' }),
  alignmentHelper.accessor('amount', { header: '주문 금액', cell: (cell) => cell.getValue().toLocaleString('ko-KR') }),
]);

export const 정렬지정: Story = {
  parameters: { docs: { description: { story: '숫자로 저장된 주문번호도 식별자이므로 좌측 정렬이 적합합니다. 데이터 타입만으로 컬럼의 의미를 판단할 수 없으므로 작성자가 선언한 정렬을 추론보다 우선합니다.' } } },
  render: () => <div className="flex min-w-0 flex-col gap-6">
    <section className="min-w-0">
      <h2 className="mb-3 font-semibold">자동 추론 · 숫자 컬럼 모두 우측 정렬</h2>
      <DataTable data={alignmentOrders} columns={alignmentColumns} getRowId={(row) => String(row.orderNo)} caption="자동 추론을 사용하는 주문 목록" />
    </section>
    <section className="min-w-0">
      <h2 className="mb-3 font-semibold">정렬 지정 · 주문번호 좌측, 수량 가운데</h2>
      <DataTable data={alignmentOrders} columns={alignmentColumns} getRowId={(row) => String(row.orderNo)}
        align={{ orderNo: 'start', count: 'center' }} caption="컬럼별 정렬을 지정한 주문 목록" />
    </section>
  </div>,
  play: async ({ canvasElement }) => {
    const tables = within(canvasElement).getAllByRole('table');
    const inferred = tables[0]!;
    const declared = tables[1]!;
    for (const cell of inferred.querySelectorAll('[data-column-id]')) {
      await expect(cell).toHaveClass('ds-data-table-numeric', 'tabular', 'text-right');
    }
    for (const [id, alignment] of [['orderNo', 'text-left'], ['count', 'text-center']] as const) {
      for (const cell of declared.querySelectorAll(`[data-column-id="${id}"]`)) {
        await expect(cell).toHaveClass(alignment);
        await expect(cell).not.toHaveClass('ds-data-table-numeric');
        await expect(cell).not.toHaveClass('tabular');
      }
    }
    await expect(within(declared).getByRole('button', { name: '수량' })).toHaveClass('justify-center');
    await expect(within(declared).getByRole('button', { name: '주문 금액' }).querySelector('span')).toHaveClass('ml-auto');
    await expect(within(declared).getByRole('button', { name: '주문번호' }).querySelector('span')).not.toHaveClass('ml-auto');
  },
};

function SelectionExample({ mode, controlled }: { mode: Exclude<SelectionMode, 'none'>; controlled: boolean }) {
  const [ids, setIds] = React.useState<string[]>([]);
  return <div className="flex min-w-0 flex-col gap-3">
    <p className="text-[length:var(--text-body-sm)] text-fg-muted">{controlled ? '제어' : '비제어'} 선택 · 선택된 ID: <output aria-live="polite">{ids.join(', ') || '없음'}</output></p>
    <DataTable data={orders} columns={columns} getRowId={getRowId} selectionMode={mode}
      selectedIds={controlled ? ids : undefined} onSelectedIdsChange={setIds} caption="선택 가능한 주문 목록" />
  </div>;
}

export const 단일선택: Story = {
  parameters: { docs: { description: { story: '상세 작업의 대상을 하나만 고를 때 사용합니다. 제어 모드에서 새 행을 선택하면 이전 선택을 해제하며, 전체 선택은 제공하지 않습니다.' } } },
  render: () => <SelectionExample mode="single" controlled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const first = canvas.getByRole('checkbox', { name: `${orders[0]!.id} 선택` });
    const second = canvas.getByRole('checkbox', { name: `${orders[1]!.id} 선택` });
    await userEvent.click(first);
    await userEvent.click(second);
    await expect(first).not.toBeChecked();
    await expect(second).toBeChecked();
    await expect(canvas.queryByRole('checkbox', { name: '전체 선택' })).not.toBeInTheDocument();
  },
};

export const 복수선택: Story = {
  parameters: { docs: { description: { story: '일괄 작업은 비제어 모드에서도 선택 이벤트를 전달합니다. 일부만 선택되면 전체 선택 입력의 DOM indeterminate 속성으로 혼합 상태를 알립니다.' } } },
  render: () => <SelectionExample mode="multi" controlled={false} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const all = canvas.getByRole('checkbox', { name: '전체 선택' });
    await userEvent.click(canvas.getByRole('checkbox', { name: `${orders[0]!.id} 선택` }));
    await expect(all).toBePartiallyChecked();
    await userEvent.click(all);
    for (const checkbox of canvas.getAllByRole('checkbox')) await expect(checkbox).toBeChecked();
    await userEvent.click(all);
    for (const checkbox of canvas.getAllByRole('checkbox')) await expect(checkbox).not.toBeChecked();
  },
};

function RowClickExample() {
  const [ids, setIds] = React.useState<string[]>([]);
  const [opened, setOpened] = React.useState('없음');
  const [count, setCount] = React.useState(0);
  return <div className="flex min-w-0 flex-col gap-3">
    <p className="text-[length:var(--text-body-sm)]">체크박스는 선택, 행의 다른 곳과 Enter/Space는 상세 열기입니다. 텍스트를 드래그해도 상세는 열리지 않습니다.</p>
    <output data-testid="selection-result" aria-live="polite">선택된 ID: {ids.join(', ') || '없음'}</output>
    <output data-testid="row-result" aria-live="polite">상세 열기: {opened} · {count}회</output>
    <DataTable data={orders} columns={columns} getRowId={getRowId} selectionMode="multi"
      selectedIds={ids} onSelectedIdsChange={setIds}
      onRowClick={(order) => { setOpened(order.id); setCount((value) => value + 1); }}
      caption="선택과 상세 이동을 별개로 제공하는 주문 목록" />
  </div>;
}

export const 행클릭과선택: Story = {
  parameters: { docs: { description: { story: '일괄 작업의 선택과 상세 이동은 의도가 다르므로 서로의 상태를 바꾸지 않습니다. 행은 상세 동작이 있을 때만 탭 순서에 포함하고 텍스트 드래그를 클릭으로 처리하지 않습니다.' } } },
  render: () => <RowClickExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByRole('checkbox', { name: `${orders[0]!.id} 선택` });
    const row = checkbox.closest('tr')!;
    await userEvent.click(checkbox);
    await expect(canvas.getByTestId('row-result')).toHaveTextContent('0회');
    await userEvent.click(within(row).getByText('김민지'));
    await expect(canvas.getByTestId('row-result')).toHaveTextContent('1회');
    await expect(checkbox).toBeChecked();
    row.focus();
    await userEvent.keyboard('{Enter} ');
    await expect(canvas.getByTestId('row-result')).toHaveTextContent('3회');
    const text = within(row).getByText('김민지');
    await userEvent.pointer([
      { target: text, keys: '[MouseLeft>]', coords: { clientX: 300, clientY: 200 } },
      { target: text, coords: { clientX: 310, clientY: 200 } },
      { target: text, keys: '[/MouseLeft]', coords: { clientX: 310, clientY: 200 } },
    ]);
    await expect(canvas.getByTestId('row-result')).toHaveTextContent('3회');
  },
};

function PinnedExample() {
  const [opened, setOpened] = React.useState('없음');
  const wideColumns = React.useMemo(() => helper.columns([
    ...columns,
    helper.accessor('quantity', { header: '수량' }),
    helper.accessor('orderedAt', { header: '주문 일시' }),
    helper.accessor('channel', { header: '판매 채널' }),
    helper.accessor('address', { header: '배송지' }),
    helper.accessor('phone', { header: '연락처' }),
    helper.accessor('shippingFee', { header: '배송비', cell: (cell) => cell.getValue().toLocaleString('ko-KR') }),
    helper.accessor('memo', { header: '배송 메모' }),
    helper.display({ id: 'actions', header: '작업', cell: ({ row }) => <Button variant="ghost" size="sm" aria-label={`${row.id} 상세 보기`} onClick={() => setOpened(row.id)}>상세 보기</Button> }),
  ]), []);
  return <div className="flex min-w-0 max-w-[960px] flex-col gap-3">
    <p>가로로 스크롤해도 선택 · 주문번호와 상세 버튼은 보입니다. 상세 버튼: <output aria-live="polite">{opened}</output></p>
    <DataTable data={orders} columns={wideColumns} getRowId={getRowId} selectionMode="multi"
      pinnedStart={['id']} pinnedEnd={['actions']} caption="주문번호와 작업을 고정한 주문 상세 목록" />
  </div>;
}

export const 컬럼고정: Story = {
  parameters: { docs: { description: { story: '가로로 긴 13개 컬럼에서 주문 식별자와 작업을 고정합니다. 그림자 대신 불투명 배경과 경계선을 사용하며, 오프셋은 실제 헤더 너비를 관찰해 계산합니다.' } } },
  render: () => <PinnedExample />,
};

export const 밀도: Story = {
  parameters: { docs: { description: { story: '같은 데이터와 스타일 안에서 행 높이와 여백으로 밀도를 조절합니다. 36px은 조회량이 많은 데스크톱, 48px은 터치 작업, 40px은 일반 업무의 기준입니다.' } } },
  render: () => <div className="grid min-w-0 gap-6 lg:grid-cols-3">
    {(['compact', 'default', 'comfortable'] as const).map((density, index) => <section key={density} className="min-w-0">
      <h2 className="mb-3 font-semibold">{['촘촘하게 · 36px', '기본 · 40px', '여유롭게 · 48px'][index]}</h2>
      <DataTable data={orders} columns={columns} getRowId={getRowId} density={density} caption={`${density} 밀도의 주문 목록`} />
    </section>)}
  </div>,
};

function StateExample() {
  const [retryCount, setRetryCount] = React.useState(0);
  return <div className="grid min-w-0 gap-6 lg:grid-cols-3">
    <section className="min-w-0"><h2 className="mb-3 font-semibold">불러오는 중</h2>
      <DataTable data={orders} columns={columns} getRowId={getRowId} state="loading" caption="주문 목록을 불러오는 중" />
    </section>
    <section className="min-w-0"><h2 className="mb-3 font-semibold">조회 결과 없음</h2>
      <DataTable data={[]} columns={columns} getRowId={getRowId} state="empty" caption="조회 결과가 없는 주문 목록" />
    </section>
    <section className="min-w-0"><h2 className="mb-3 font-semibold">불러오기 실패</h2>
      <DataTable data={[]} columns={columns} getRowId={getRowId} state="error" errorMessage="주문을 불러오지 못했습니다"
        onRetry={() => setRetryCount((value) => value + 1)} caption="주문 목록 불러오기 실패" />
      <output aria-live="polite">재시도 {retryCount}회</output>
    </section>
  </div>;
}

export const 상태: Story = {
  parameters: { docs: { description: { story: '모든 상태를 tbody 안에 유지해 헤더와 본문의 정렬을 보존합니다. 로딩은 5행의 1.4초 명도 변화로 알리고, 모션 감소 설정에서는 정지하며 오류에는 아이콘과 재시도 동작을 제공합니다.' } } },
  render: () => <StateExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvasElement.querySelectorAll('[data-slot="data-table-skeleton-row"]')).toHaveLength(5);
    const rows = canvasElement.querySelectorAll('[data-slot="data-table-skeleton-row"]');
    const textHeight = parseFloat(getComputedStyle(canvasElement).getPropertyValue('--text-body-sm')) * 0.65;
    for (const [index, row] of [...rows].entries()) {
      const bars = row.querySelectorAll<HTMLElement>('[data-slot="skeleton"]');
      await expect(bars).toHaveLength(columns.length);
      for (const [cellIndex, bar] of [...bars].entries()) {
        await expect(bar).toBeVisible();
        await expect(bar).toHaveAttribute('data-variant', 'text');
        await expect(bar.getBoundingClientRect().height).toBeCloseTo(textHeight, 1);
        await expect(bar.style.width).toBe(`${60 + ((index + cellIndex) % 3) * 10}%`);
      }
    }
    await userEvent.click(canvas.getByRole('button', { name: '다시 시도' }));
    await expect(canvas.getByText('재시도 1회')).toBeVisible();
  },
};

export const 내보내기: Story = {
  parameters: { docs: { description: { story: '선택한 행이 있으면 그 행만, 없으면 현재 정렬된 전체 주문을 내보냅니다. 화면의 금액에는 천 단위 쉼표를 쓰지만 CSV는 exportValue를 통해 원본 숫자 문자열을 사용해 Excel의 숫자 인식을 보존합니다.' } } },
  args: { selectionMode: 'multi', exportFileName: '주문내역-20261114', exportValue: { amount: (row) => String(row.amount) } },
};

// 같은 주문 패턴을 재사용하되 ID는 고유하게 만들어 추가 로드 후에도 선택의 대상을 보존한다.
const tenThousandOrders: Order[] = Array.from({ length: 10_000 }, (_, index) => ({
  ...orders[index % orders.length]!,
  id: `ORD-LARGE-${String(index + 1).padStart(5, '0')}`,
}));
const infiniteTotal = 1_284;

function useMockOrderLoader() {
  const [count, setCount] = React.useState(50);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current); }, []);
  const loadMore = React.useCallback(() => {
    if (timer.current !== null) return;
    setLoadingMore(true);
    timer.current = setTimeout(() => {
      setCount((previous) => Math.min(previous + 50, infiniteTotal));
      setLoadingMore(false);
      timer.current = null;
    }, 500);
  }, []);
  const data = React.useMemo(() => tenThousandOrders.slice(0, count), [count]);
  return { data, loadingMore, hasMore: count < infiniteTotal, onLoadMore: loadMore };
}

function InfiniteExample({ selection = false }: { selection?: boolean }) {
  const loader = useMockOrderLoader();
  const [ids, setIds] = React.useState<string[]>([]);
  return <div className="flex min-w-0 flex-col gap-3">
    <p>로드된 <output data-testid="loaded-count">{loader.data.length}</output> / 1,284건 · 하단에서 50건씩, 500ms 후 추가합니다.</p>
    {selection && <p>선택된 ID: <output data-testid="selected-ids" aria-live="polite">{ids.join(', ') || '없음'}</output></p>}
    <DataTable {...loader} columns={columns} getRowId={getRowId} totalCount={infiniteTotal}
      virtualize={selection ? 100 : false}
      selectionMode={selection ? 'multi' : 'none'} selectedIds={ids} onSelectedIdsChange={setIds}
      exportFileName="로드된-주문" className="[--data-table-viewport-height:240px]"
      caption="전체 1,284건 중 순차적으로 불러오는 주문 목록" />
  </div>;
}

function scrollToTableEnd(canvasElement: HTMLElement) {
  const scroll = canvasElement.querySelector<HTMLElement>('[data-slot="data-table-scroll"]')!;
  scroll.scrollTop = scroll.scrollHeight;
  scroll.dispatchEvent(new Event('scroll'));
  return scroll;
}

export const 가상화_1만행: Story = {
  parameters: { docs: { description: { story: '10,000행을 즉시 제공해도 DOM 에는 약 20행만 존재한다(뷰포트와 overscan에 따라 달라짐). 가상화의 대가로 Ctrl+F 는 보이지 않는 행을 찾을 수 없다. 모든 행의 브라우저 검색이 필요하면 virtualize={false}를 사용한다. 행에 포커스를 둔 뒤 멀리 스크롤하면 스크롤 컨테이너로 포커스가 이동한다.' } } },
  args: { data: tenThousandOrders, onRowClick: () => {}, caption: '가상화된 주문 10,000건', className: '[--data-table-viewport-height:240px]' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-slot="data-table-row"]').length).toBeGreaterThan(0));
    await expect(canvas.getByRole('table')).toHaveAttribute('aria-rowcount', '10000');
    const first = canvasElement.querySelector<HTMLElement>('[data-slot="data-table-row"]')!;
    await expect(first).toHaveAttribute('aria-rowindex', '2');
    first.focus();
    const scroll = scrollToTableEnd(canvasElement);
    await waitFor(() => expect(scroll).toHaveFocus());
    await expect(canvasElement.querySelectorAll('[data-slot="data-table-row"]').length).toBeLessThan(40);
    await expect(canvasElement.querySelector('[aria-rowindex="10001"]')).toBeInTheDocument();
    for (const spacer of canvasElement.querySelectorAll('[data-slot="data-table-spacer"]')) {
      await expect(spacer).toHaveAttribute('aria-hidden', 'true');
    }
  },
};

export const 무한스크롤: Story = {
  parameters: { docs: { description: { story: '가상화를 명시적으로 끈 상태에서도 바닥 120px 전부터 500ms 지연으로 50건씩 불러온다. 기존 행 아래의 로딩 행, 로드된 건수만 내보낸다는 라벨, 마지막 전체 1,284건을 모두 불러왔습니다 표시를 확인한다.' } } },
  render: () => <InfiniteExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: '50건 내보내기' })).toBeVisible();
    await expect(canvas.getByText('전체 1,284건 중 50건')).toBeVisible();
    await expect(canvas.queryByText(/개 선택/)).not.toBeInTheDocument();
    for (let count = 50; count < infiniteTotal; count = Math.min(count + 50, infiniteTotal)) {
      scrollToTableEnd(canvasElement);
      await waitFor(() => expect(canvas.getByText('불러오는 중')).toBeVisible());
      const bar = canvasElement.querySelector('[data-slot="data-table-loading-more"] [data-slot="skeleton"]');
      await expect(bar).toBeVisible();
      await expect(bar).toHaveAttribute('data-variant', 'text');
      await expect(bar!.getBoundingClientRect().height).toBeCloseTo(parseFloat(getComputedStyle(canvasElement).getPropertyValue('--text-body-sm')) * 0.65, 1);
      await expect(bar!.getBoundingClientRect().width).toBe(64);
      // 같은 길이에서 여러 프레임을 보내도 한 묶음만 추가되어야 한다.
      scrollToTableEnd(canvasElement);
      scrollToTableEnd(canvasElement);
      await waitFor(() => expect(canvas.getByTestId('loaded-count')).toHaveTextContent(String(Math.min(count + 50, infiniteTotal))));
    }
    scrollToTableEnd(canvasElement);
    await expect(canvas.getByText('전체 1,284건을 모두 불러왔습니다')).toBeVisible();
    await expect(canvas.queryByText('불러오는 중')).not.toBeInTheDocument();
  },
};

export const 무한스크롤_선택유지: Story = {
  parameters: { docs: { description: { story: '행 두 개를 선택한 뒤 추가 로드하고 처음으로 돌아와 선택 유지와 새 행 미선택을 확인한다. 선택된 id 목록을 계속 표시한다. 100건을 넘으면 기본 가상화가 켜지므로 이후 Ctrl+F 는 보이지 않는 행을 찾지 못한다.' } } },
  render: () => <InfiniteExample selection />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const order of tenThousandOrders.slice(0, 2)) {
      await userEvent.click(canvas.getByRole('checkbox', { name: `${order.id} 선택` }));
    }
    for (const count of [100, 150]) {
      scrollToTableEnd(canvasElement);
      await waitFor(() => expect(canvas.getByTestId('loaded-count')).toHaveTextContent(String(count)));
    }
    await expect(canvasElement.querySelector<HTMLElement>('[data-slot="data-table-scroll"]')!.scrollTop).toBeGreaterThan(0);
    await waitFor(() => expect(canvas.getByRole('checkbox', { name: `${tenThousandOrders[100]!.id} 선택` })).not.toBeChecked());
    await expect(canvas.getByTestId('selected-ids')).toHaveTextContent(tenThousandOrders.slice(0, 2).map((order) => order.id).join(', '));
    const scroll = canvasElement.querySelector<HTMLElement>('[data-slot="data-table-scroll"]')!;
    scroll.scrollTop = 0;
    scroll.dispatchEvent(new Event('scroll'));
    await waitFor(() => expect(canvas.getByRole('checkbox', { name: `${tenThousandOrders[0]!.id} 선택` })).toBeChecked());
    await expect(canvas.getByRole('checkbox', { name: `${tenThousandOrders[1]!.id} 선택` })).toBeChecked();
  },
};

const virtualPinnedColumns = helper.columns([
  ...columns,
  helper.accessor('quantity', { header: '수량' }),
  helper.accessor('orderedAt', { header: '주문 일시' }),
  helper.accessor('channel', { header: '판매 채널' }),
  helper.accessor('address', { header: '배송지' }),
  helper.accessor('phone', { header: '연락처' }),
  helper.accessor('shippingFee', { header: '배송비' }),
  helper.accessor('memo', { header: '배송 메모' }),
]);

export const 가상화_컬럼고정: Story = {
  parameters: { docs: { description: { story: '10,000행과 가로 스크롤에서 start의 선택·주문번호·수취인, end의 연락처·배송 메모를 고정한다. 스페이서 행은 고정 스타일을 받지 않고 일반 셀의 실측 sticky 오프셋이 유지되는지 확인한다. 가상화 중 Ctrl+F 는 보이지 않는 행을 찾지 못한다.' } } },
  args: { data: tenThousandOrders, columns: virtualPinnedColumns, selectionMode: 'multi', pinnedStart: ['id', 'recipient'], pinnedEnd: ['phone', 'memo'], className: 'max-w-[960px] [--data-table-viewport-height:240px]', caption: '컬럼 고정과 행 가상화를 함께 사용하는 주문 10,000건' },
  play: async ({ canvasElement }) => {
    const scroll = scrollToTableEnd(canvasElement);
    scroll.scrollLeft = scroll.scrollWidth;
    scroll.dispatchEvent(new Event('scroll'));
    await waitFor(() => expect(canvasElement.querySelector('[aria-rowindex="10001"]')).toBeInTheDocument());
    const row = canvasElement.querySelector('[data-slot="data-table-row"]')!;
    for (const id of ['id', 'recipient', 'phone', 'memo']) {
      const cell = row.querySelector<HTMLElement>(`[data-column-id="${id}"]`)!;
      const head = canvasElement.querySelector<HTMLElement>(`th[data-column-id="${id}"]`)!;
      await expect(cell.style.position).toBe('sticky');
      await expect(cell.style.left).toBe(head.style.left);
      await expect(cell.style.right).toBe(head.style.right);
    }
  },
};

export const 부분로드_전체선택: Story = {
  parameters: { docs: { description: { story: '50/1,284건에서 헤더 라벨은 로드된 50건 선택이다. 체크하면 로드된 50건이 선택됨 · 전체 1,284건을 툴바에 안내한다. 서버 전체 선택 버튼은 제공하지 않으며 선택 전 CSV 라벨도 로드된 범위를 알린다.' } } },
  args: { data: tenThousandOrders.slice(0, 50), totalCount: infiniteTotal, selectionMode: 'multi', exportFileName: '부분-주문', caption: '전체 1,284건 중 처음 50건의 선택 범위' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: '50건 내보내기' })).toBeVisible();
    await userEvent.click(canvas.getByRole('checkbox', { name: '로드된 50건 선택' }));
    await expect(canvas.getByText('로드된 50건이 선택됨 · 전체 1,284건')).toBeVisible();
    await expect(canvas.getByRole('button', { name: '선택한 행 내보내기' })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: '전체 선택' })).not.toBeInTheDocument();
  },
};

// 선택을 생략한 표와 명시적으로 끈 부분 로드 표를 각각 검증하는 예시다.
export const 선택없이내보내기: Story = {
  args: { exportFileName: '주문' },
};
export const 선택없이부분내보내기: Story = {
  args: { data: tenThousandOrders.slice(0, 50), totalCount: infiniteTotal, selectionMode: 'none', exportFileName: '현재-페이지-주문' },
};
