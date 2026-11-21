import * as React from 'react';
import * as Primitive from '../../internal/dialog';
import { cn } from '../../lib/cn';
import { ModalContent, type ModalDismissalProps } from './modal-content';

export const Dialog = Primitive.Root;
export function DialogTrigger(props: React.ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Trigger data-slot="dialog-trigger" {...props} />;
}
export interface DialogContentProps extends React.ComponentProps<typeof Primitive.Content>, ModalDismissalProps {
  /** default는 기존 36rem, wide는 뷰포트 폭이 필요한 내용에 쓴다. */
  size?: 'default' | 'wide';
}
export function DialogContent({ size = 'default', className, ...props }: DialogContentProps) {
  return <ModalContent {...props} data-slot="dialog-content"
    data-size={size} className={cn('ds-dialog-content', className)} />;
}
export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-header" className={cn('ds-dialog-header', className)} {...props} />;
}
export function DialogTitle({ className, ...props }: React.ComponentProps<typeof Primitive.Title>) {
  return <Primitive.Title data-slot="dialog-title" className={cn('ds-dialog-title', className)} {...props} />;
}
export function DialogDescription({ className, ...props }: React.ComponentProps<typeof Primitive.Description>) {
  return <Primitive.Description data-slot="dialog-description" className={cn('ds-dialog-description', className)} {...props} />;
}
export function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-footer" className={cn('ds-dialog-footer', className)} {...props} />;
}
export function DialogClose(props: React.ComponentProps<typeof Primitive.Close>) {
  return <Primitive.Close data-slot="dialog-close" {...props} />;
}
