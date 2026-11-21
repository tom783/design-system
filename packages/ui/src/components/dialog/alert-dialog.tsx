import * as React from 'react';
import * as Primitive from '../../internal/alert-dialog';
import { buttonVariants, type ButtonProps } from '../button';
import { cn } from '../../lib/cn';

const TriggerRefContext = React.createContext<React.RefObject<HTMLButtonElement | null> | null>(null);

export function AlertDialog(props: React.ComponentProps<typeof Primitive.Root>) {
  const trigger = React.useRef<HTMLButtonElement>(null);
  return <TriggerRefContext.Provider value={trigger}><Primitive.Root {...props} /></TriggerRefContext.Provider>;
}
export function AlertDialogTrigger({ ref, ...props }: React.ComponentProps<typeof Primitive.Trigger>) {
  const trigger = React.useContext(TriggerRefContext);
  const element = React.useRef<HTMLButtonElement>(null);
  React.useImperativeHandle(ref, () => element.current!);
  React.useImperativeHandle(trigger, () => element.current!);
  return <Primitive.Trigger data-slot="alert-dialog-trigger" {...props} ref={element} />;
}
export function AlertDialogContent({ className, onOpenAutoFocus, onCloseAutoFocus, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  const trigger = React.useContext(TriggerRefContext);
  const origin = React.useRef<HTMLElement | null>(null);
  return <Primitive.Portal>
    <Primitive.Overlay data-slot="alert-dialog-overlay" className="ds-dialog-overlay" />
    <Primitive.Content data-slot="alert-dialog-content" className={cn('ds-dialog-content', className)} {...props}
      onOpenAutoFocus={event => {
        // 취소 버튼으로 옮기기 전에 기록한다. 상태로만 연 확인창에는 Radix의 복귀 트리거가 없다.
        origin.current = (event.target as HTMLElement).ownerDocument.activeElement as HTMLElement | null;
        onOpenAutoFocus?.(event);
      }}
      onCloseAutoFocus={event => {
        onCloseAutoFocus?.(event);
        // 앱의 명시적 복귀와 기존 트리거를 우선하고, 연결된 원래 요소로의 복귀만 보완한다.
        if (!event.defaultPrevented && !trigger?.current?.isConnected && origin.current?.isConnected) {
          event.preventDefault();
          origin.current.focus({ preventScroll: true });
        }
      }} />
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
