import * as React from 'react';
import { createDataTableColumnHelper, DataTable } from '../src';

type Order = { id: string; recipient: string; amount: number };
const orders: Order[] = [
  { id: 'ORDER-001', recipient: '김민지', amount: 47600 },
  { id: 'ORDER-002', recipient: '이준호', amount: 1248500 },
];
const h = createDataTableColumnHelper<Order>();
const columns = h.columns([
  h.accessor('id', { header: '주문번호' }),
  h.accessor('recipient', { header: '수취인' }),
  h.accessor('amount', {
    header: '주문 금액',
    cell: cell => cell.getValue().toLocaleString('ko-KR'),
  }),
]);

export function OrdersTable() {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  return <DataTable
    data={orders}
    columns={columns}
    getRowId={row => row.id}
    caption="주문 목록"
    selectionMode="multi"
    selectedIds={selectedIds}
    onSelectedIdsChange={setSelectedIds}
    density="default"
    state="idle"
    exportFileName="주문내역"
    exportValue={{ amount: row => String(row.amount) }}
  />;
}
