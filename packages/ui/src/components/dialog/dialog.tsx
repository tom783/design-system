import * as React from 'react';
import { X } from 'lucide-react';
import * as Primitive from '../../internal/dialog';
import { cn } from '../../lib/cn';

export const Dialog = Primitive.Root;
export function DialogTrigger(props: React.ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Trigger data-slot="dialog-trigger" {...props} />;
}
export interface DialogContentProps extends React.ComponentProps<typeof Primitive.Content> {
  /** default는 기존 36rem, wide는 미디어처럼 뷰포트 폭이 필요한 내용에 쓴다. */
  size?: 'default' | 'wide';
  /** false면 바깥 클릭·Escape로 닫히지 않는다. 명시적 닫기 버튼은 계속 동작한다. */
  dismissible?: boolean;
  /** dismissible=false일 때 닫으려는 시도를 알린다. 앱에서 확인 AlertDialog를 연다. */
  onDismissAttempt?: () => void;
  /** 우상단 닫기 버튼. 끄면 앱이 직접 출구를 제공해야 한다. */
  showClose?: boolean;
}
export function DialogContent({ size = 'default', dismissible = true, onDismissAttempt, showClose = true, onEscapeKeyDown,
  onPointerDownOutside, onInteractOutside, className, children, ...props }: DialogContentProps) {
  // pointerdownoutside와 interactoutside는 같은 이벤트를 전달한다. 한 번의 시도는 한 번만 알린다.
  const lastAttempt = React.useRef<Event | null>(null);
  const guard = (event: Event) => {
    if (dismissible) return;
    event.preventDefault();
    if (lastAttempt.current !== event) { lastAttempt.current = event; onDismissAttempt?.(); }
  };
  return <Primitive.Portal>
    <Primitive.Overlay data-slot="dialog-overlay" className="ds-dialog-overlay" />
    <Primitive.Content {...props} data-slot="dialog-content" data-size={size} className={cn('ds-dialog-content', className)}
      onEscapeKeyDown={event => { onEscapeKeyDown?.(event); guard(event); }}
      onPointerDownOutside={event => { onPointerDownOutside?.(event); guard(event); }}
      onInteractOutside={event => { onInteractOutside?.(event); guard(event); }}>
      {children}
      {/* dismissible=false 는 바깥 클릭·Escape 를 막는다. 출구까지 막으면 갇힌다 —
          그래서 닫기 버튼을 내장한다. children 뒤에 두어야 초기 포커스가 첫 입력으로 간다.
          확인을 받기로 한 앱(onDismissAttempt 있음)에서는 이 버튼도 확인을 거친다.
          앱이 확인을 안 받으면 그대로 닫는다. 어느 쪽이든 출구는 남는다. */}
      {showClose && (dismissible || !onDismissAttempt
        ? <Primitive.Close data-slot="dialog-close-icon" className="ds-dialog-close" aria-label="닫기"><X aria-hidden="true" /></Primitive.Close>
        : <button type="button" data-slot="dialog-close-icon" className="ds-dialog-close" aria-label="닫기"
            onClick={onDismissAttempt}><X aria-hidden="true" /></button>)}
    </Primitive.Content>
  </Primitive.Portal>;
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
