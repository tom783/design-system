'use client';

import * as React from 'react';
import {
  Button, Field, Input,
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '../src';

export function DirtyFormRecipe() {
  const [open, setOpen] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [saved, setSaved] = React.useState('김민지');
  const [draft, setDraft] = React.useState(saved);
  const dismissOrigin = React.useRef<HTMLElement | null>(null);
  // 변경했다 원래 값으로 돌렸을 때도 깨끗한 상태가 되도록 저장값과 비교한다.
  const dirty = draft !== saved;
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button onClick={() => setDraft(saved)}>수취인 수정</Button></DialogTrigger>
    <DialogContent dismissible={!dirty} onDismissAttempt={() => {
      dismissOrigin.current = document.activeElement as HTMLElement | null;
      setConfirm(true);
    }}>
      <DialogHeader>
        <DialogTitle>수취인 수정</DialogTitle>
        <DialogDescription>값을 바꾸고 Escape 또는 우상단 닫기를 눌러 보세요.</DialogDescription>
      </DialogHeader>
      <form onSubmit={event => { event.preventDefault(); setSaved(draft); setOpen(false); }}>
        <Field label="수취인"><Input value={draft} onChange={event => setDraft(event.target.value)} /></Field>
        <DialogFooter><Button type="submit" variant="primary">저장</Button></DialogFooter>
      </form>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent onCloseAutoFocus={event => {
          if (dismissOrigin.current?.isConnected) {
            event.preventDefault(); dismissOrigin.current.focus();
          }
        }}>
          <AlertDialogHeader>
            <AlertDialogTitle>작성을 취소하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>저장하지 않은 변경이 사라집니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>계속 작성</AlertDialogCancel>
            <AlertDialogAction variant="danger" onClick={() => setOpen(false)}>작성 취소</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogContent>
  </Dialog>;
}
