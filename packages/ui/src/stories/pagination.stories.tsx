import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Pagination, Button, EmptyState, DataTable, createDataTableColumnHelper } from '../index';
import { PaginationExample } from '../../docs/examples/pagination';
import { PaginatedOrdersExample } from '../../docs/examples/pagination-table';
import primarySource from '../../docs/examples/pagination.tsx?raw';
import tableSource from '../../docs/examples/pagination-table.tsx?raw';

const meta = { title: 'Components/Pagination', component: Pagination, tags: ['autodocs'],
  parameters: { manifest: ['Pagination'] } } satisfies Meta<typeof Pagination>;
export default meta;
type Story = StoryObj;
const source = (code: string) => ({ docs: { source: { code: code.replace("from '../../src'", "from '@s2life/ui'"), language: 'tsx', type: 'code' } } });

function Pages({ initial = 1, total = 1234, disabled = false }: { initial?: number; total?: number; disabled?: boolean }) {
  const [page, setPage] = useState(initial);
  return <Pagination page={page} pageSize={50} totalCount={total} onPageChange={setPage} disabled={disabled} />;
}
function ShrinkingPages() {
  const [page, setPage] = useState(12);
  const [total, setTotal] = useState(1234);
  return <div className="flex flex-col gap-3">
    <Button onClick={() => { setTotal(250); setPage(5); }}>건수 줄이기</Button>
    <Button onClick={() => { setTotal(20); setPage(1); }}>한 페이지로 줄이기</Button>
    <Pagination page={page} pageSize={50} totalCount={total} onPageChange={setPage} />
  </div>;
}

// 단독 예시다. 실제로는 표 아래에 조립한다 — 로딩중·표조립 스토리를 본다.
export const 사용법: Story = {
  parameters: { docs: { ...source(primarySource).docs, description: { story: '표와 함께 쓴다(진행 표시는 표 스켈레톤이 맡는다, DESIGN §4.1).' } } },
  render: () => <PaginationExample />,
};
export const 기본: Story = { render: () => <Pages total={234} /> };
export const 많은페이지: Story = { render: () => <Pages /> };
export const 중간페이지: Story = { render: () => <Pages initial={12} /> };
export const 페이지크기: Story = { render: () => <PaginationExample /> };
export const 한페이지: Story = { render: () => <Pages total={34} /> };
// 0건이면 Pagination 은 렌더하지 않는다. 그 자리는 EmptyState 가 말한다 — 둘을 함께 둔 조립을 보여준다.
export const 빈결과: Story = { render: () => <div className="flex flex-col gap-3">
  <EmptyState title="조건에 맞는 주문이 없습니다" description="기간을 넓히거나 상태 필터를 바꿔 보세요." />
  <Pages total={0} />
</div> };
type Order = { id: string; recipient: string };
const order = createDataTableColumnHelper<Order>();
const orderColumns = order.columns([order.accessor('id', { header: '주문번호' }), order.accessor('recipient', { header: '수취인' })]);
// 로딩 중 Pagination 은 조작만 막고 진행은 표 스켈레톤이 알린다(DESIGN §4.1). 단독으로 두면 비활성과 구별되지 않으므로
// 표와 함께 보여준다. 이동·크기 변경 콜백은 호출되면 실패하도록 둔다.
export const 로딩중: Story = {
  parameters: { docs: { description: { story: '조회 중에는 표가 스켈레톤으로 진행을 알리고 Pagination은 disabled로 이동과 크기 변경만 막는다(DESIGN §4.1).' } } },
  render: () => <div className="flex min-w-0 flex-col gap-3">
    <DataTable data={[]} columns={orderColumns} getRowId={row => row.id} caption="주문 목록" state="loading" />
    <Pagination page={4} pageSize={50} totalCount={1234} disabled
      onPageChange={() => { throw new Error('로딩 중 페이지 이동'); }} pageSizeOptions={[20, 50, 100]}
      onPageSizeChange={() => { throw new Error('로딩 중 크기 변경'); }} />
  </div>,
};
export const 좁은폭: Story = { render: () => <div style={{ width: 280, maxWidth: '100%' }}><Pages initial={4} /></div> };
export const 페이지감소: Story = { render: () => <ShrinkingPages /> };
export const 표조립: Story = { parameters: source(tableSource), render: () => <PaginatedOrdersExample /> };
