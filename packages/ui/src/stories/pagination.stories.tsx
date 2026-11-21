import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Pagination, Button, EmptyState } from '../index';
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

export const 사용법: Story = { parameters: source(primarySource), render: () => <PaginationExample /> };
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
export const 로딩중: Story = { render: () => <Pagination page={4} pageSize={50} totalCount={1234} disabled
  onPageChange={() => { throw new Error('로딩 중 페이지 이동'); }} pageSizeOptions={[20, 50, 100]}
  onPageSizeChange={() => { throw new Error('로딩 중 크기 변경'); }} /> };
export const 좁은폭: Story = { render: () => <div style={{ width: 280, maxWidth: '100%' }}><Pages initial={4} /></div> };
export const 페이지감소: Story = { render: () => <ShrinkingPages /> };
export const 표조립: Story = { parameters: source(tableSource), render: () => <PaginatedOrdersExample /> };
