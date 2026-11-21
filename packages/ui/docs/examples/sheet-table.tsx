import { useRef, useState } from 'react';
import {
  DataTable, createDataTableColumnHelper, Dialog, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose, SheetContent, SheetBody, Button, Field, Input,
} from '../../src';

const initialOrders = [
  { id: 'ORD-001', recipient: '김민수', address: '서울시 성동구' },
  { id: 'ORD-002', recipient: '박서연', address: '경기도 성남시' },
];
const helper = createDataTableColumnHelper<typeof initialOrders[number]>();
const columns = helper.columns([
  helper.accessor('id', { header: '주문번호' }),
  helper.accessor('recipient', { header: '수취인' }),
  helper.accessor('address', { header: '배송지' }),
]);

export function SheetOrdersExample() {
  const [orders, setOrders] = useState(initialOrders);
  const [editing, setEditing] = useState<typeof initialOrders[number] | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  return <>
    <DataTable data={orders} columns={columns} getRowId={order => order.id} caption="주문 빠른 편집"
      onRowClick={order => { opener.current = document.activeElement as HTMLElement; setEditing({ ...order }); }} />
    <Dialog open={editing !== null} onOpenChange={open => { if (!open) setEditing(null); }}>
      <SheetContent onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus(); }}>
        <DialogHeader><DialogTitle>{editing?.id} 빠른 편집</DialogTitle>
          <DialogDescription>목록에서 벗어나지 않고 수취인과 배송지를 수정합니다.</DialogDescription></DialogHeader>
        <SheetBody>{editing && <form id="order-edit-form" className="grid gap-4" onSubmit={event => {
          event.preventDefault(); setOrders(previous => previous.map(order => order.id === editing.id ? editing : order)); setEditing(null);
        }}>
          <Field label="수취인" required><Input value={editing.recipient} onChange={event => setEditing({ ...editing, recipient: event.target.value })} /></Field>
          <Field label="배송지" required><Input value={editing.address} onChange={event => setEditing({ ...editing, address: event.target.value })} /></Field>
        </form>}</SheetBody>
        <DialogFooter><DialogClose asChild><Button>취소</Button></DialogClose>
          <Button variant="primary" type="submit" form="order-edit-form">저장</Button></DialogFooter>
      </SheetContent>
    </Dialog>
  </>;
}
