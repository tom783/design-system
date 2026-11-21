import * as React from 'react';
import { ModalContent, type ModalDismissalProps } from '../dialog/modal-content';
import type * as Primitive from '../../internal/dialog';
import { cn } from '../../lib/cn';

export interface SheetContentProps extends React.ComponentProps<typeof Primitive.Content>, ModalDismissalProps {
  /** 화면에 붙는 가장자리. 기본 right. */
  side?: 'right' | 'left';
  /** sm 400 · md 560 · lg 720px. 좁은 화면은 반대편에 16px를 남긴다. */
  size?: 'sm' | 'md' | 'lg';
}
export function SheetContent({ side = 'right', size = 'md', className, ...props }: SheetContentProps) {
  return <ModalContent {...props} data-slot="sheet-content"
    overlayClassName="ds-sheet-overlay" data-side={side} data-size={size}
    className={cn('ds-dialog-content ds-sheet-content', className)} />;
}
export function SheetBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div {...props} data-slot="sheet-body" className={cn('ds-sheet-body', className)} />;
}
