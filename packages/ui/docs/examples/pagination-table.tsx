import { useEffect, useState } from 'react';
import { DataTable, Pagination, createDataTableColumnHelper } from '../../src';

type Order = { id: string; recipient: string; amount: number };
const orders: Order[] = Array.from({ length: 1234 }, (_, index) => ({
  id: `ORDER-${String(index + 1).padStart(4, '0')}`,
  recipient: `거래처 ${index + 1}`, amount: (index + 1) * 1200,
}));
const h = createDataTableColumnHelper<Order>();
const columns = h.columns([
  h.accessor('id', { header: '주문번호' }),
  h.accessor('recipient', { header: '수취인' }),
  h.accessor('amount', { header: '주문 금액', cell: cell => cell.getValue().toLocaleString('ko-KR') }),
]);
const getRowId = (row: Order) => row.id;

export function PaginatedOrdersExample() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [response, setResponse] = useState({ page: 1, pageSize: 20, data: orders.slice(0, 20) });
  const loading = response.page !== page || response.pageSize !== pageSize;

  useEffect(() => {
    // 실제 앱은 이 자리에 서버 요청을 연결한다. 이전 응답이 새 요청을 덮지 않도록 정리한다.
    const timer = window.setTimeout(() => setResponse({ page, pageSize,
      data: orders.slice((page - 1) * pageSize, page * pageSize) }), 800);
    return () => window.clearTimeout(timer);
  }, [page, pageSize]);

  return <section className="flex min-w-0 flex-col gap-3" aria-label="서버 페이징 주문 목록">
    <output aria-label="선택한 주문">{selectedIds.length}건 선택</output>
    <DataTable data={response.data} columns={columns} getRowId={getRowId} caption="주문 목록"
      totalCount={orders.length} selectionMode="multi" selectedIds={selectedIds}
      onSelectedIdsChange={setSelectedIds} state={loading ? 'loading' : 'idle'} />
    <Pagination page={page} pageSize={pageSize} totalCount={orders.length} onPageChange={setPage}
      pageSizeOptions={[10, 20, 50]} onPageSizeChange={setPageSize} disabled={loading} />
  </section>;
}
