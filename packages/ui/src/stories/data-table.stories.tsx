import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
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

const meta = {
  title: 'Components/DataTable',
  component: DataTable<Order>,
  args: { data: orders, columns, getRowId, caption: '오늘 접수된 커머스 주문 12건' },
  parameters: {
    docs: { description: { component: '행 클릭과 선택을 분리하고, 실제 너비로 고정 컬럼을 배치하는 업무용 데이터 테이블입니다. 금액은 원본 숫자를 유지해 정렬과 CSV 내보내기에 사용합니다.' } },
  },
} satisfies Meta<typeof DataTable<Order>>;
export default meta;
type Story = StoryObj<typeof meta>;

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
      await expect(cell).toHaveClass('data-table-numeric', 'tabular', 'text-right');
    }
    for (const [id, alignment] of [['orderNo', 'text-left'], ['count', 'text-center']] as const) {
      for (const cell of declared.querySelectorAll(`[data-column-id="${id}"]`)) {
        await expect(cell).toHaveClass(alignment);
        await expect(cell).not.toHaveClass('data-table-numeric');
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
    await userEvent.click(canvas.getByRole('button', { name: '다시 시도' }));
    await expect(canvas.getByText('재시도 1회')).toBeVisible();
  },
};

export const 내보내기: Story = {
  parameters: { docs: { description: { story: '선택한 행이 있으면 그 행만, 없으면 현재 정렬된 전체 주문을 내보냅니다. 화면의 금액에는 천 단위 쉼표를 쓰지만 CSV는 exportValue를 통해 원본 숫자 문자열을 사용해 Excel의 숫자 인식을 보존합니다.' } } },
  args: { selectionMode: 'multi', exportFileName: '주문내역-20261114', exportValue: { amount: (row) => String(row.amount) } },
};
