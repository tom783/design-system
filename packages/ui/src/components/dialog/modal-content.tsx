import * as React from 'react';
import { X } from 'lucide-react';
import * as Primitive from '../../internal/dialog';
import { cn } from '../../lib/cn';

export interface ModalDismissalProps {
  /** false면 바깥 클릭·Escape를 막고, 콜백이 있으면 내장 닫기도 확인을 거친다. */
  dismissible?: boolean;
  /** 보호된 닫기 시도. 앱에서 확인 AlertDialog를 연다. */
  onDismissAttempt?: () => void;
  /** 우상단 닫기 버튼. 끄면 앱이 직접 출구를 제공한다. */
  showClose?: boolean;
}

export interface ModalContentProps extends React.ComponentProps<typeof Primitive.Content>, ModalDismissalProps {
  'data-slot': string;
  overlayClassName?: string;
}

export function ModalContent({ 'data-slot': contentSlot, overlayClassName, dismissible = true, onDismissAttempt, showClose = true, onEscapeKeyDown,
  onPointerDownOutside, onInteractOutside, className, children, ...props }: ModalContentProps) {
  // pointerdownoutside와 interactoutside는 같은 이벤트를 전달한다. 한 번의 시도는 한 번만 알린다.
  const lastAttempt = React.useRef<Event | null>(null);
  const guard = (event: Event) => {
    if (dismissible) return;
    event.preventDefault();
    if (lastAttempt.current !== event) { lastAttempt.current = event; onDismissAttempt?.(); }
  };
  return <Primitive.Portal>
    <Primitive.Overlay data-slot="dialog-overlay" className={cn('ds-dialog-overlay', overlayClassName)} />
    <Primitive.Content {...props} data-slot={contentSlot} className={cn('ds-dialog-content', className)}
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
