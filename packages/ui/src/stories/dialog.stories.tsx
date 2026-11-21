import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, Field, Input, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '../index';

const meta = {
  title: 'Components/Dialog',
  tags: ['autodocs'],
  parameters: { manifest: ['Dialog', 'DialogTrigger', 'DialogContent', 'DialogHeader', 'DialogTitle',
    'DialogDescription', 'DialogFooter', 'DialogClose', 'AlertDialog', 'AlertDialogTrigger', 'AlertDialogContent',
    'AlertDialogHeader', 'AlertDialogTitle', 'AlertDialogDescription', 'AlertDialogFooter', 'AlertDialogAction', 'AlertDialogCancel'] },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const 편집과확인: Story = {
  render: () => <div className="flex gap-3">
    <Dialog>
      <DialogTrigger asChild><Button>주문 정보</Button></DialogTrigger>
      <DialogContent><DialogHeader><DialogTitle>주문 정보</DialogTitle>
        <DialogDescription>상품과 수취인 정보를 확인합니다.</DialogDescription></DialogHeader>
        <p>주문번호 ORD-20261114-001</p>
        <DialogFooter><DialogClose asChild><Button>닫기</Button></DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="danger">주문 삭제</Button></AlertDialogTrigger>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>주문을 삭제할까요?</AlertDialogTitle>
        <AlertDialogDescription>삭제한 주문은 복원할 수 없습니다.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction variant="danger">삭제</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>,
};

function ProtectedDialog() {
  const [open, setOpen] = useState(false), [confirm, setConfirm] = useState(false);
  const [attempts, setAttempts] = useState(0);
  return <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button onClick={() => setAttempts(0)}>배송지 편집</Button></DialogTrigger>
      <DialogContent dismissible={false} onDismissAttempt={() => { setAttempts(n => n + 1); setConfirm(true); }}>
        <DialogHeader><DialogTitle>배송지 편집</DialogTitle>
          <DialogDescription>형제 확인창을 취소하면 편집하던 위치로 돌아갑니다.</DialogDescription></DialogHeader>
        <Field label="배송지"><Input defaultValue="서울시 성동구" /></Field>
        <output aria-label="닫기 시도 횟수">{attempts}</output>
      </DialogContent>
    </Dialog>
    <AlertDialog open={confirm} onOpenChange={setConfirm}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>변경 내용을 버릴까요?</AlertDialogTitle>
        <AlertDialogDescription>저장하지 않은 배송지 변경이 사라집니다.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>계속 편집</AlertDialogCancel>
          <AlertDialogAction variant="danger" onClick={() => setOpen(false)}>변경 버리기</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

export const 형제확인창: Story = {
  parameters: { docs: { story: { inline: false, iframeHeight: 400 } } },
  render: () => <ProtectedDialog />,
};
