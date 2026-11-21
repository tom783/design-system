import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Dialog, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
  SheetContent, SheetBody, Button, Field, Input, AlertDialog, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
  type SheetContentProps,
} from '../index';
import { SheetExample } from '../../docs/examples/sheet';
import { SheetOrdersExample } from '../../docs/examples/sheet-table';
import primarySource from '../../docs/examples/sheet.tsx?raw';
import tableSource from '../../docs/examples/sheet-table.tsx?raw';

const meta = { title: 'Components/Sheet', component: SheetContent, tags: ['autodocs'],
  parameters: { manifest: ['SheetContent', 'SheetBody'], docs: { story: { inline: false, iframeHeight: 400 } } },
} satisfies Meta<typeof SheetContent>;
export default meta;
type Story = StoryObj;
const source = (code: string) => ({ docs: { source: { code: code.replace("from '../../src'", "from '@s2life/ui'"), language: 'tsx', type: 'code' } } });

function Panel({ side, size, showClose = true, long = false, wrapped = false }: Pick<SheetContentProps, 'side' | 'size' | 'showClose'> & { long?: boolean; wrapped?: boolean }) {
  const header = <DialogHeader><DialogTitle>출고 처리 — 운송장과 배송지 정보를 확인하고 저장하세요</DialogTitle>
    <DialogDescription>선택한 주문의 출고 정보를 수정합니다.</DialogDescription></DialogHeader>;
  return <Dialog>
    <DialogTrigger asChild><Button>패널 열기</Button></DialogTrigger>
    <SheetContent side={side} size={size} showClose={showClose}>
      {wrapped ? <div>{header}</div> : header}
      <SheetBody><div className="grid gap-4">
        {Array.from({ length: long ? 30 : 1 }, (_, i) => <Field key={i} label={`운송장 번호 ${i + 1}`}><Input defaultValue={`1234-${i + 1}`} /></Field>)}
      </div></SheetBody>
      <DialogFooter><DialogClose asChild><Button>취소</Button></DialogClose><DialogClose asChild><Button variant="primary">저장</Button></DialogClose></DialogFooter>
    </SheetContent>
  </Dialog>;
}

function ProtectedSheet() {
  const [open, setOpen] = useState(false), [confirm, setConfirm] = useState(false);
  const [value, setValue] = useState('서울시 성동구'), [saved, setSaved] = useState(value);
  const [attempts, setAttempts] = useState(0);
  return <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button onClick={() => { setValue(saved); setAttempts(0); }}>배송지 편집</Button></DialogTrigger>
      <SheetContent dismissible={value === saved} onDismissAttempt={() => { setAttempts(n => n + 1); setConfirm(true); }}>
        <DialogHeader><DialogTitle>배송지 편집</DialogTitle><DialogDescription>저장하지 않은 변경이 있으면 닫기 전에 확인합니다.</DialogDescription></DialogHeader>
        <SheetBody><Field label="배송지"><Input value={value} onChange={event => setValue(event.target.value)} /></Field>
          <output aria-label="닫기 시도 횟수">{attempts}</output></SheetBody>
        <DialogFooter><DialogClose asChild><Button>취소</Button></DialogClose>
          <Button variant="primary" onClick={() => { setSaved(value); setOpen(false); }}>저장</Button></DialogFooter>
      </SheetContent>
    </Dialog>
    <AlertDialog open={confirm} onOpenChange={setConfirm}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>변경 내용을 버릴까요?</AlertDialogTitle>
        <AlertDialogDescription>저장하지 않은 배송지 변경이 사라집니다.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>계속 편집</AlertDialogCancel>
          <AlertDialogAction variant="danger" onClick={() => { setValue(saved); setOpen(false); }}>변경 버리기</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

export const 사용법: Story = { parameters: source(primarySource), render: () => <SheetExample /> };
export const 오른쪽기본: Story = { render: () => <Panel /> };
export const 왼쪽: Story = { render: () => <Panel side="left" /> };
export const 작은크기: Story = { render: () => <Panel size="sm" /> };
export const 중간크기: Story = { render: () => <Panel size="md" /> };
export const 큰크기: Story = { render: () => <Panel size="lg" /> };
export const 긴본문: Story = { render: () => <Panel long /> };
export const 변경보호: Story = { render: () => <ProtectedSheet /> };
export const 닫기버튼없음: Story = { render: () => <Panel showClose={false} wrapped /> };
export const 래퍼헤더: Story = { render: () => <Panel wrapped /> };
export const 목록편집: Story = { parameters: source(tableSource), render: () => <SheetOrdersExample /> };
