import * as React from 'react';
import * as Primitive from '../../internal/alert-dialog';
import { buttonVariants, type ButtonProps } from '../button';
import { cn } from '../../lib/cn';

export const AlertDialog = Primitive.Root;
export function AlertDialogTrigger(props: React.ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}
export function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Portal>
    <Primitive.Overlay data-slot="alert-dialog-overlay" className="ds-dialog-overlay" />
    <Primitive.Content data-slot="alert-dialog-content" className={cn('ds-dialog-content', className)} {...props} />
  </Primitive.Portal>;
}
export function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-dialog-header" className={cn('ds-dialog-header', className)} {...props} />;
}
export function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof Primitive.Title>) {
  return <Primitive.Title data-slot="alert-dialog-title" className={cn('ds-dialog-title', className)} {...props} />;
}
export function AlertDialogDescription({ className, ...props }: React.ComponentProps<typeof Primitive.Description>) {
  return <Primitive.Description data-slot="alert-dialog-description" className={cn('ds-dialog-description', className)} {...props} />;
}
export function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-dialog-footer" className={cn('ds-dialog-footer', className)} {...props} />;
}
export function AlertDialogAction({ className, variant = 'primary', ...props }:
  React.ComponentProps<typeof Primitive.Action> & Pick<ButtonProps, 'variant'>) {
  return <Primitive.Action data-slot="alert-dialog-action" className={cn(buttonVariants({ variant }), className)} {...props} />;
}
export function AlertDialogCancel({ className, ...props }: React.ComponentProps<typeof Primitive.Cancel>) {
  return <Primitive.Cancel data-slot="alert-dialog-cancel" className={cn(buttonVariants(), className)} {...props} />;
}
