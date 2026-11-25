import * as React from 'react';
import { Bell, CircleCheck, CircleAlert, Info, TriangleAlert, X } from 'lucide-react';
import { Toaster as Sonner, toast as sonnerToast, type ExternalToast } from 'sonner';
import { buttonVariants } from '../button';
import { nextNotification, notificationDuration, type NotificationSlot } from './notification';

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
/** 알림 토스트(업무 알림 — 다른 곳에서 생긴 일을 알린다)의 입력. 행동 결과 토스트(저장됨 등)는 기존 메서드를 쓴다. */
export interface NotificationToastOptions {
  /** 출처 줄 — 제품·스토어처럼 어디서 생긴 일인지(`--text-caption`). 예: '판매관리 · 스토어 A'. */
  source?: string;
  /** 제목. 함수(건수 → 글자)로 주면 같은 묶음이 합쳐질 때마다 건수로 다시 그린다 — 예: 3 → '취소 요청 3건 · 스토어 A'. */
  title: string | ((count: number) => string);
  /** 대상 화면 주소. 주면 [이동] 링크를 그린다. 누르면 알림 토스트는 닫힌다. */
  href?: string;
  /** 이동 링크 글자. 기본 '이동'. */
  linkLabel?: string;
  /** 이동 직전에 불린다. 앱 라우터로 옮기거나 저장하지 않은 입력을 확인할 때 `event.preventDefault()` 한다. */
  onNavigate?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  /**
   * `normal`: duration 뒤 사라짐(기본 8초) · `pinned`: 닫을 때까지 남는다(오류 토스트와 같은 방식 · 위험 톤).
   * 고정 알림이 떠 있는 동안 온 `normal` 은 토스트로 띄우지 않는다 — 고정은 그대로 남는다. 그 알림의 기록(알림 센터)·벨 건수는 앱이 갖는다.
   */
  level?: 'normal' | 'pinned';
  /** 묶음 키. 같은 키의 알림 토스트가 떠 있으면 새 토스트 대신 건수만 더한다. */
  groupKey?: string;
  /** 이번 알림이 더하는 건수. 기본 1. */
  count?: number;
  /** `normal` 의 표시 시간(ms). 기본 8000. */
  duration?: number;
}

/** 알림 토스트 전용 Toaster — 행동 결과 토스트와 따로 쌓아 둘이 겹치면 알림이 위에 선다(규격 6절). */
const NOTIFICATION_TOASTER = 'ds-notification';
let notificationSequence = 0;
/** 지금 떠 있는 알림 토스트 하나(한 번에 하나). 사라졌는지는 sonner 의 활성 목록으로 확인한다 — 닫기·자동 닫힘 모두 즉시 빠진다. */
let currentNotification: NotificationSlot | null = null;

function NotificationBody({ source, title, href, linkLabel, onNavigate, id }:
  Pick<NotificationToastOptions, 'source' | 'href' | 'onNavigate'> & { title: string; linkLabel: string; id: string }) {
  const titleId = `${id}-title`;
  return <div data-slot="toast-notification" className="ds-toast-notification">
    {/* 출처·제목이 낭독 영역이다. 같은 묶음이 합쳐지면 이 글자만 바뀌어 polite 로 다시 읽힌다. */}
    <span data-slot="toast-message" role="status" className="ds-toast-notification-text">
      {source && <span data-slot="toast-source" className="ds-toast-notification-source">{source}</span>}
      <span data-slot="toast-title" id={titleId} className="ds-toast-notification-title">{title}</span>
    </span>
    {href && <a data-slot="toast-link" href={href} aria-describedby={titleId}
      className={buttonVariants({ variant: 'ghost', size: 'md', className: 'ds-toast-notification-link' })}
      onClick={event => { onNavigate?.(event); sonnerToast.dismiss(id); }}>{linkLabel}</a>}
  </div>;
}

/**
 * 알림 토스트를 띄운다. 한 번에 하나다 — 떠 있는 알림이 있으면 새로 쌓지 않고 그 자리를 바꾼다(같은 묶음 키면 건수만 더한다).
 * 단, 고정(pinned) 알림이 떠 있으면 일반 알림은 띄우지 않는다(규격 6절) — 이때 돌려주는 id 는 화면에 없는 새 id 라
 * `toast.dismiss(id)` 해도 고정 알림이 닫히지 않는다. 돌려주는 id 로 `toast.dismiss(id)` 할 수 있다.
 */
function notify(options: NotificationToastOptions) {
  const previous = currentNotification;
  const active = previous !== null && sonnerToast.getToasts().some(item => item.id === previous.id);
  const createId = () => `ds-notification-${++notificationSequence}`;
  const slot = nextNotification(previous, active, options, createId);
  if (slot === null) return createId();
  currentNotification = slot;
  const { id, count } = slot;
  const pinned = slot.level === 'pinned';
  const title = typeof options.title === 'function' ? options.title(count) : options.title;
  // 같은 id 로 다시 부르면 sonner 가 그 토스트를 제자리에서 바꾸고 타이머를 처음부터 다시 잰다.
  // 모양(className·아이콘·시간)은 매번 모두 넘긴다 — 일반 → 고정으로 바뀌어도 앞 값이 남지 않게.
  sonnerToast(<NotificationBody id={id} source={options.source} title={title} href={options.href}
    linkLabel={options.linkLabel ?? '이동'} onNavigate={options.onNavigate} />, {
    id, toasterId: NOTIFICATION_TOASTER, closeButton: true,
    duration: notificationDuration(slot.level, options.duration),
    icon: pinned ? <CircleAlert aria-hidden="true" /> : <Bell aria-hidden="true" />,
    className: pinned ? 'ds-toast-notice ds-toast-pinned' : 'ds-toast-notice',
  });
  return id;
}

/** 오류는 운영자가 읽고 닫을 때까지 남긴다. 원본 객체를 변형하지 않고 공개 메서드를 감싼다. */
export const toast: typeof sonnerToast & { notify: typeof notify } = Object.assign((message: Message, options?: ExternalToast) => sonnerToast(announcement(message), options), sonnerToast, {
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
  notify,
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
 * 한계: 포커스를 가진 알림이 toast.dismiss() 같은 API로 사라진 뒤 다른 알림을 닫으면, 최종 위치는 맞아도 그 낡은 요소에
 * focus·blur가 한 번 지나간다(sonner 내부 ref라 막을 수 없다). 그 요소가 blur 검증 입력이면 오류가 먼저 뜰 수 있다.
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
  const host = React.useRef<HTMLDivElement>(null);
  useNotificationLift(host);
  const shared = {
    ...props, theme, closeButton: true,
    icons: { success: <CircleCheck aria-hidden="true" />, error: <CircleAlert aria-hidden="true" />,
      info: <Info aria-hidden="true" />, warning: <TriangleAlert aria-hidden="true" />, close: <X aria-hidden="true" /> },
    toastOptions: { ...props.toastOptions, closeButtonAriaLabel: '알림 닫기', classNames: {
      toast: 'bg-background text-foreground border-border', description: 'text-muted-foreground',
      ...props.toastOptions?.classNames,
    } },
  };
  return <div ref={host} data-slot="toaster" onKeyDown={closeOnEscape} onFocus={remember} onClick={restoreAfterClose}>
    <Sonner {...shared} className="ds-toaster toaster group" containerAriaLabel="알림" />
    {/* 알림 토스트(toast.notify) 묶음. 단축키는 위 묶음(alt+T)만 쓴다 — 둘 다 걸면 서로 포커스를 빼앗는다. */}
    <Sonner {...shared} id={NOTIFICATION_TOASTER} hotkey={[]} customAriaLabel="업무 알림"
      className="ds-toaster ds-toaster-notification toaster group" />
  </div>;
}

const px = (element: HTMLElement, name: string) => Number.parseFloat(element.style.getPropertyValue(name)) || 0;
/**
 * 행동 결과 토스트 묶음이 차지한 높이(+ 간격). 알림 토스트 묶음을 그만큼 올려 둘이 겹치면 알림이 위에 선다(규격 6절 ·
 * Figma 217:1836). sonner 는 토스트를 절대 위치 + transform 으로 쌓아 목록 상자 높이가 0 이라 상자를 잴 수 없다 —
 * sonner 가 토스트에 적어 두는 값(--offset·--initial-height·목록의 --front-toast-height·--gap)으로 계산한다.
 * 펼침(마우스를 올림)이면 토스트마다 offset + 높이의 최대, 접힘이면 앞 토스트 높이 + 뒤로 비치는 토스트마다 gap 이다.
 */
function stackExtent(list: HTMLElement | null) {
  if (!list) return 0;
  const toasts = Array.from(list.querySelectorAll<HTMLElement>(':scope > [data-sonner-toast]'))
    .filter(item => item.dataset.removed !== 'true' && item.dataset.visible !== 'false');
  if (!toasts.length) return 0;
  const gap = px(list, '--gap');
  const extent = toasts.some(item => item.dataset.expanded === 'true')
    ? Math.max(...toasts.map(item => px(item, '--offset') + (px(item, '--initial-height') || item.offsetHeight)))
    : (px(list, '--front-toast-height') || toasts[0]!.offsetHeight) + (toasts.length - 1) * gap;
  return Math.ceil(extent + gap);
}
function useNotificationLift(host: React.RefObject<HTMLDivElement | null>) {
  React.useEffect(() => {
    const element = host.current;
    if (!element) return;
    let frame = 0;
    let last = '';
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = `${stackExtent(element.querySelector<HTMLElement>('[data-sonner-toaster]:not(.ds-toaster-notification)'))}px`;
        if (next === last) return; // 같은 값을 다시 쓰면 관찰이 또 불린다
        last = next;
        element.style.setProperty('--ds-toast-stack', next);
      });
    };
    const observer = new MutationObserver(measure);
    observer.observe(element, { subtree: true, childList: true, attributes: true,
      attributeFilter: ['style', 'data-expanded', 'data-removed', 'data-visible', 'data-front'] });
    measure();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [host]);
}
