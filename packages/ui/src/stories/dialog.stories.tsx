import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
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
