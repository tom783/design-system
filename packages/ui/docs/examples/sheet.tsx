import { useState } from 'react';
import {
  Dialog, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  DialogClose, SheetContent, SheetBody, Button, Field, Input,
} from '../../src';

export function SheetExample() {
  const [open, setOpen] = useState(false);
  const [tracking, setTracking] = useState('');
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button>출고 처리</Button></DialogTrigger>
    <SheetContent>
      <DialogHeader><DialogTitle>출고 처리</DialogTitle>
        <DialogDescription>주문 ORD-001의 운송장 정보를 입력합니다.</DialogDescription></DialogHeader>
      <SheetBody>
        <form id="shipment-form" onSubmit={event => { event.preventDefault(); setOpen(false); }}>
          <Field label="운송장 번호" required><Input value={tracking} onChange={event => setTracking(event.target.value)} /></Field>
        </form>
      </SheetBody>
      <DialogFooter><DialogClose asChild><Button>취소</Button></DialogClose>
        <Button variant="primary" type="submit" form="shipment-form">출고 저장</Button></DialogFooter>
    </SheetContent>
  </Dialog>;
}
