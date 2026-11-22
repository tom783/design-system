import * as React from 'react';
import { CircleCheck, CircleAlert, Info, TriangleAlert, X } from 'lucide-react';
import { Toaster as Sonner, toast as sonnerToast, type ExternalToast } from 'sonner';

/** 명시적 테마가 우선이며, 미지정이면 OS 설정을 따른다. 두 입력의 변경도 구독한다. */
function useTheme() {
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light');
  React.useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => {
      const explicit = document.documentElement.dataset.theme;
      setTheme(explicit === 'dark' || (explicit !== 'light' && media.matches) ? 'dark' : 'light');
    };
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    media.addEventListener('change', update); update();
    return () => { observer.disconnect(); media.removeEventListener('change', update); };
  }, []);
  return theme;
}
type Message = Parameters<typeof sonnerToast>[0];
function announcement(message: Message, error = false) {
  return <span data-slot="toast-message" role={error ? 'alert' : 'status'}>{typeof message === 'function' ? message() : message}</span>;
}
/** 오류는 운영자가 읽고 닫을 때까지 남긴다. 원본 객체를 변형하지 않고 공개 메서드를 감싼다. */
export const toast: typeof sonnerToast = Object.assign((message: Message, options?: ExternalToast) => sonnerToast(announcement(message), options), sonnerToast, {
  success: (message: Message, options?: ExternalToast) => sonnerToast.success(announcement(message), options),
  info: (message: Message, options?: ExternalToast) => sonnerToast.info(announcement(message), options),
  warning: (message: Message, options?: ExternalToast) => sonnerToast.warning(announcement(message), options),
  message: (message: Message, options?: ExternalToast) => sonnerToast.message(announcement(message), options),
  error: (message: Message, options?: ExternalToast) =>
    sonnerToast.error(announcement(message, true), { ...options, duration: Infinity, closeButton: true }),
  // 비동기 실패도 같은 정책이다. 성공 알림의 자동 사라짐 시간은 원래 설정을 유지한다.
  promise: <T,>(promise: Promise<T> | (() => Promise<T>), options?: Parameters<typeof sonnerToast.promise<T>>[1]) =>
    sonnerToast.promise(promise, options ? { ...options, error: options.error === undefined ? undefined : async (error: unknown) => {
      const result = typeof options.error === 'function' ? await options.error(error) : options.error;
      if (result && typeof result === 'object' && !React.isValidElement(result) && 'message' in result) {
        return { ...result, message: announcement(result.message, true), duration: Infinity, closeButton: true };
      }
      return { message: announcement(result as React.ReactNode, true), duration: Infinity, closeButton: true };
    } } : undefined),
});
/**
 * sonner 2.0.8의 Escape는 펼친 알림 묶음을 접기만 하고 닫지 않는다(setExpanded(false)).
 * 포커스가 알림 안에 있을 때만 그 알림의 닫기 버튼을 눌러 닫는다. 버튼을 거치므로
 * dismissible·onDismiss가 그대로 지켜지고, 닫기 버튼이 없는 알림은 Escape로도 닫히지 않는다.
 * 문서 전역 Escape는 쓰지 않는다 — Dialog·Sheet·팝오버의 Escape와 겹친다.
 */
function closeOnEscape(event: React.KeyboardEvent<HTMLDivElement>) {
  if (event.key !== 'Escape' || event.defaultPrevented || !(event.target instanceof Element)) return;
  const close = event.target.closest('[data-sonner-toast]')?.querySelector<HTMLButtonElement>(':scope > [data-close-button]');
  if (!close) return;
  event.preventDefault();
  close.click();
}
/**
 * 닫은 뒤 포커스는 알림에 들어오기 직전 요소로 돌아간다(Dialog가 트리거로 돌려주는 것과 같다).
 * 그 요소가 사라졌거나 포커스를 받을 수 없으면 Toaster 영역이 아니라 main 랜드마크로 보낸다.
 * main에 tabindex가 없으면 -1을 준다(AppShell main은 이미 -1). main도 없으면 그대로 둔다.
 */
function restoreFocus(previous: HTMLElement | null) {
  if (previous?.isConnected && focusFirmly(previous)) return;
  const main = document.querySelector<HTMLElement>('main, [role="main"]');
  if (!main) return;
  if (!main.hasAttribute('tabindex')) main.tabIndex = -1;
  focusFirmly(main);
}
/**
 * sonner 목록의 onBlur는 포커스가 목록을 떠나면 자기가 기억한 요소로 한 번 되돌리고 기억을 비운다.
 * 포커스를 가진 알림이 API로 사라지면 Chrome이 blur를 보내지 않아 그 기억이 낡는다
 * (실측: 메모 → 알림 닫기 → 앞서 쓴 트리거 버튼 → main). 한 번 빼앗긴 뒤에는 기억이 비었으므로 다시 놓는다.
 */
function focusFirmly(element: HTMLElement) {
  for (let attempt = 0; attempt < 2 && document.activeElement !== element; attempt++) element.focus({ preventScroll: true });
  return document.activeElement === element;
}
/** shadcn Sonner 래퍼에서 next-themes를 제거하고 3상태 테마와 의미 상태 토큰을 연결한다. */
export function Toaster(props: React.ComponentProps<typeof Sonner>) {
  // §16 실측: sonner는 알림이 없으면 컨테이너를 제거하고 나중에 마운트한다.
  // 강제로 상주시키면 Dialog가 바깥을 aria-hidden으로 덮을 때 알림도 숨겨져 읽히지 않는다.
  // DOM 상주 최적화를 넣지 않는다. Dialog 안 저장 결과도 지연 마운트한 live region으로 읽힌다.
  const theme = useTheme();
  // sonner도 직전 요소를 기억하지만 마지막 알림이 사라져 목록이 언마운트될 때만 되돌린다.
  // 알림이 남아 있으면 포커스가 사라진 버튼과 함께 body로 떨어지고, 직전 요소가 없을 때의 출구도 없다.
  const returnTo = React.useRef<HTMLElement | null>(null);
  const remember = (event: React.FocusEvent<HTMLDivElement>) => {
    const from = event.relatedTarget;
    if (from instanceof Node && event.currentTarget.contains(from)) return; // 알림 사이 이동
    returnTo.current = from instanceof HTMLElement ? from : null;
  };
  // 클릭과 Escape(닫기 버튼 click) 모두 여기로 온다. sonner의 onClick이 먼저 돌아 알림은 이미 닫히는 중이다.
  // 포커스가 알림 안에 없으면(Safari는 버튼을 눌러도 포커스를 옮기지 않는다) 건드리지 않는다.
  const restoreAfterClose = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element)) return;
    const notification = event.target.closest('[data-close-button]')?.closest('[data-sonner-toast]');
    if (!notification || notification.getAttribute('data-dismissible') === 'false') return;
    if (!event.currentTarget.contains(document.activeElement)) return;
    const previous = returnTo.current;
    returnTo.current = null;
    restoreFocus(previous);
  };
  return <div data-slot="toaster" onKeyDown={closeOnEscape} onFocus={remember} onClick={restoreAfterClose}><Sonner {...props} theme={theme} className="ds-toaster toaster group" closeButton
    containerAriaLabel="알림"
    icons={{ success: <CircleCheck aria-hidden="true" />, error: <CircleAlert aria-hidden="true" />,
      info: <Info aria-hidden="true" />, warning: <TriangleAlert aria-hidden="true" />, close: <X aria-hidden="true" /> }}
    toastOptions={{ ...props.toastOptions, closeButtonAriaLabel: '알림 닫기', classNames: {
      toast: 'bg-background text-foreground border-border', description: 'text-muted-foreground',
      ...props.toastOptions?.classNames,
    } }} /></div>;
}
