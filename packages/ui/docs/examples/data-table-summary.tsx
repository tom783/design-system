import { DataTable, DescriptionList, createDataTableColumnHelper } from '../../src';

interface OrderItem { id: string; name: string; qty: number; price: number }
const items: OrderItem[] = [
  { id: 'P-1031', name: '무선 블루투스 이어폰', qty: 1, price: 59000 },
  { id: 'P-2207', name: '스테인리스 텀블러 500ml', qty: 2, price: 18900 },
  { id: 'P-0412', name: '세라믹 머그컵 2개입', qty: 1, price: 24500 },
];
const won = (value: number) => `${value.toLocaleString('ko-KR')}원`;
const h = createDataTableColumnHelper<OrderItem>();
const columns = h.columns([
  h.accessor('id', { header: '상품 코드' }),
  h.accessor('name', { header: '상품명' }),
  h.accessor('qty', { header: '수량' }),
  h.accessor('price', { header: '단가', cell: cell => won(cell.getValue()) }),
  h.display({ id: 'sum', header: '금액', cell: cell => won(cell.row.original.qty * cell.row.original.price) }),
]);
const qty = items.reduce((sum, item) => sum + item.qty, 0);
const amount = items.reduce((sum, item) => sum + item.qty * item.price, 0);

/**
 * 열 합계는 표 안 tfoot(summary)으로 — 합계 숫자가 열 숫자와 같은 x 에 선다. 더하지 않는 열(단가)은 키를 빼서 비운다.
 * 배송비·결제 금액처럼 표 열이 아닌 금액 내역은 표 아래 DescriptionList 이고, 값 끝을 금액 열 글자 끝(안쪽 15px)에 맞춘다.
 */
export function DataTableSummaryExample() {
  return <section className="flex min-w-0 flex-col gap-3">
    <DataTable data={items} columns={columns} getRowId={item => item.id} align={{ qty: 'end', price: 'end', sum: 'end' }}
      caption="주문 상품" summary={[{ label: '합계', values: { qty: String(qty), sum: won(amount) } }]} />
    <DescriptionList align="end" className="ml-auto mr-[calc(var(--cell-px)+var(--border-width))]" items={[
      { label: '배송비', value: won(0) }, { label: '결제 금액', value: won(amount), emphasis: true }]} />
  </section>;
}
