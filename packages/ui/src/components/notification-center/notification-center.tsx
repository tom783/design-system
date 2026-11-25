import * as React from 'react';
import { Bell, CircleAlert, LoaderCircle, Settings, X } from 'lucide-react';
import * as Popover from '../../internal/popover';
import * as DialogPrimitive from '../../internal/dialog';
import { cn } from '../../lib/cn';
import { layerCollisionPadding } from '../../lib/layer';
import { useAutomaticRail } from '../app-shell/app-shell';
import { Button } from '../button';
import { CountBadge } from '../count-badge/count-badge';
import { Dialog, DialogClose, DialogTrigger } from '../dialog';
import { Skeleton } from '../loading/skeleton';
import { SheetContent } from '../sheet';
import { EmptyState, ErrorState } from '../state/empty-state';
import { bellName, detailText, formatNotificationTime, notificationName, truncateSource, type NotificationItem } from './notification-format';

export type { NotificationItem } from './notification-format';

export interface NotificationCenterProps {
  /** 안 읽음 개수 — 벨의 개수 표식. 0 은 숨김, null 은 개수를 불러오지 못한 것(숫자 숨김), 100 이상은 "99+". */
  count?: number | null;
  /** 급한 알림이 있다 — 벨 표식이 위험 색 + 점, 이름에 ", 급한 알림 있음". */
  urgent?: boolean;
  /** 알림 목록(앱이 탭·필터를 적용한 결과). */
  items?: NotificationItem[];
  /** 목록 상태. loading = 스켈레톤 4줄, error = 오류 + 다시 시도(`onRetry`). */
  state?: 'idle' | 'loading' | 'error';
  onRetry?: () => void;
  /** 비어 있을 때 제목·설명(탭별 문구는 앱이 준다). 기본 "알림이 없습니다". */
  emptyTitle?: string;
  emptyDescription?: string;
  /** 머리 아래 탭 자리 — 기존 Tabs(TabsList)를 넣는다. */
  tabs?: React.ReactNode;
  /** 도구 줄 슬롯 하나 — 출처 필터 등 기존 Select. */
  toolbar?: React.ReactNode;
  /** "모두 읽음". 주지 않으면 버튼을 그리지 않는다. 급한(미처리) 알림의 기한 표시는 읽어도 남는다. */
  onMarkAllRead?: () => void;
  /** 알림 설정 화면 주소(설정 아이콘 링크). */
  settingsHref?: string;
  /** 더 불러올 알림이 있다 — 맨 아래 "더 불러오기". 없으면 "더 이상 알림이 없습니다". */
  hasMore?: boolean;
  /** 다음 목록을 불러오는 중 — "더 불러오기" 자리에 스피너 + "불러오는 중". */
  loadingMore?: boolean;
  onLoadMore?: () => void;
  /** 열린 채 새로 도착해 아직 반영하지 않은 알림 수 — 목록 맨 위 고정 줄 "새 알림 n개 · 보기". 목록은 저절로 밀리지 않는다. */
  pendingCount?: number;
  /** "보기"를 눌렀다 — 앱이 새 알림을 목록에 반영한다. 목록은 맨 위로 간다. */
  onShowPending?: () => void;
  /** 알림 링크를 눌렀다. 앱 라우터로 옮길 때 `event.preventDefault()` 뒤 직접 이동한다. 패널은 닫힌다. */
  onNavigate?: (item: NotificationItem, event: React.MouseEvent<HTMLAnchorElement>) => void;
  /** 상대 시각의 기준(기본: 그린 시각). 화면 시험·스토리에서 고정할 때 쓴다. */
  now?: Date | number;
  /** 열림(제어). */
  open?: boolean;
  /** 비제어 초기 열림. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/** 알림 진입 — 기존 Button ghost iconOnly + CountBadge 조합(규격 4절). 38×38(1024 미만 44×44) · 아이콘 20 · 열림 = 선택 바탕. */
function NotificationBell({ count, urgent, className, ...props }: React.ComponentProps<'button'> & { count?: number | null; urgent?: boolean }) {
  return <Button {...props} variant="ghost" iconOnly data-slot="notification-bell" aria-label={bellName(count, urgent)}
    className={cn('ds-notification-bell relative [&_svg]:size-5 max-lg:size-[var(--tap-min)] aria-expanded:bg-[var(--bg-selected)] aria-expanded:text-fg', className)}>
    <Bell aria-hidden="true" />
    <CountBadge count={count} urgent={urgent} aria-hidden="true" className="ds-notification-bell-count" />
  </Button>;
}

/** 알림 한 줄(규격 5절 · Figma 223:311 · 223:300 · 223:320 · 223:326). 한 줄 전체가 링크다. */
function NotificationRow({ item, now, onNavigate }: { item: NotificationItem; now: Date | number; onNavigate: (item: NotificationItem, event: React.MouseEvent<HTMLAnchorElement>) => void }) {
  const time = formatNotificationTime(item.time, now);
  const detail = detailText(item);
  const source = truncateSource(item.source);
  return <a href={item.href} data-slot="notification-row" className="ds-notification-row" aria-label={notificationName(item, now)}
    data-read={item.read ? '' : undefined} data-urgent={item.urgent ? '' : undefined} onClick={event => onNavigate(item, event)}>
    <span className="ds-notification-row-meta">
      <span className="ds-notification-row-source" title={source === item.source ? undefined : item.source}>{source}</span>
      <time className="ds-notification-row-time" dateTime={time.iso} title={time.full}>{time.text}</time>
    </span>
    {!item.read && <span className="ds-notification-row-dot" aria-hidden="true" />}
    <span className="ds-notification-row-title">
      {item.urgent && <CircleAlert aria-hidden="true" className="ds-notification-row-urgent" />}
      <span className="ds-notification-row-title-text" title={item.title}>{item.title}</span>
    </span>
    {detail && <span className="ds-notification-row-detail" data-level={item.deadline?.level ?? 'normal'}>{detail}</span>}
  </a>;
}

export interface NotificationPanelProps extends Omit<NotificationCenterProps, 'count' | 'urgent' | 'open' | 'defaultOpen' | 'onOpenChange' | 'className'> {
  titleId?: string;
  /** 1024 미만 Sheet — 닫기 버튼을 머리에 두고 제목은 대화상자 제목이다. */
  sheet: boolean;
  onClose: () => void;
}

/** 패널 내용 — 팝오버(1024 이상)와 Sheet(미만)가 같이 쓴다. 시험이 바로 그리도록 내보낸다(공개 진입점에는 없다). */
export function NotificationPanel({ items = [], state = 'idle', onRetry, emptyTitle = '알림이 없습니다', emptyDescription, tabs, toolbar,
  onMarkAllRead, settingsHref, hasMore = false, loadingMore = false, onLoadMore, pendingCount = 0, onShowPending, onNavigate, now,
  titleId, sheet, onClose }: NotificationPanelProps) {
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const base = now ?? Date.now();
  // Sheet 에서는 대화상자 제목(Radix Title)이 id 를 붙인다 — id 를 undefined 로라도 넘기면 그 id 를 덮어 이름이 사라진다.
  // 제목은 대화상자 이름일 뿐 초점을 받지 않는다 — 열면 초점은 패널 자체다(아래 NotificationCenter).
  const title = <h2 {...(titleId ? { id: titleId } : {})} data-slot="notification-center-title" className="ds-notification-center-title">알림</h2>;
  const navigate = (item: NotificationItem, event: React.MouseEvent<HTMLAnchorElement>) => {
    onNavigate?.(item, event);
    // 새 탭·창(⌘/Ctrl·가운데)이 아니면 패널을 닫는다 — 이동한 화면을 가리지 않는다.
    if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) onClose();
  };
  let body: React.ReactNode;
  if (state === 'loading') {
    body = <div data-slot="notification-center-loading" className="ds-notification-center-loading" aria-busy="true">
      {[60, 42, 60, 42].map((width, index) => <div key={index} className="ds-notification-center-skeleton">
        <Skeleton width="var(--space-12)" height="var(--space-12)" />
        <Skeleton width={`${width}%`} height="calc(var(--space-8) + var(--space-2))" />
      </div>)}
      <span className="sr-only" role="status">알림을 불러오는 중</span>
    </div>;
  } else if (state === 'error') {
    body = <ErrorState className="ds-notification-center-state" title="알림을 불러오지 못했습니다" onRetry={onRetry} />;
  } else if (!items.length) {
    body = <EmptyState className="ds-notification-center-state" title={emptyTitle} description={emptyDescription} />;
  } else {
    body = <>
      <ul className="ds-notification-center-list" aria-label="알림 목록">
        {items.map(item => <li key={item.id} className="ds-notification-center-list-item">
          <NotificationRow item={item} now={base} onNavigate={navigate} />
        </li>)}
      </ul>
      {loadingMore ? <div data-slot="notification-center-loading-more" className="ds-notification-center-loading-more" role="status">
        <LoaderCircle aria-hidden="true" className="ds-notification-center-spinner" />불러오는 중
      </div> : hasMore ? <div className="ds-notification-center-more">
        <Button variant="secondary" className="max-lg:h-[var(--tap-min)]" onClick={onLoadMore}>더 불러오기</Button>
      </div> : <p data-slot="notification-center-end" className="ds-notification-center-end">더 이상 알림이 없습니다</p>}
    </>;
  }
  return <>
    <div className="ds-notification-center-header">
      <div className="ds-notification-center-head">
        {sheet ? <DialogPrimitive.Title asChild>{title}</DialogPrimitive.Title> : title}
        <div className="ds-notification-center-actions">
          {onMarkAllRead && <Button variant="ghost" size="sm" className="ds-notification-center-hit" onClick={onMarkAllRead}>모두 읽음</Button>}
          {settingsHref && <Button asChild variant="ghost" iconOnly className="[&_svg]:size-5 max-lg:size-[var(--tap-min)]">
            <a href={settingsHref} aria-label="알림 설정"><Settings aria-hidden="true" /></a>
          </Button>}
          {sheet && <DialogClose asChild><Button variant="ghost" iconOnly aria-label="닫기" className="[&_svg]:size-5 size-[var(--tap-min)]">
            <X aria-hidden="true" />
          </Button></DialogClose>}
        </div>
      </div>
      {tabs && <div data-slot="notification-center-tabs" className="ds-notification-center-tabs">{tabs}</div>}
      {toolbar && <div data-slot="notification-center-toolbar" className="ds-notification-center-toolbar">{toolbar}</div>}
    </div>
    <div ref={bodyRef} data-slot="notification-center-body" className="ds-notification-center-body">
      {state === 'idle' && pendingCount > 0 && items.length > 0 && <button type="button" data-slot="notification-center-pending"
        className="ds-notification-center-pending" onClick={() => { onShowPending?.(); bodyRef.current?.scrollTo({ top: 0 }); }}>
        새 알림 {pendingCount}개 · 보기
      </button>}
      {body}
    </div>
  </>;
}

/**
 * 알림 센터 — 벨(알림 진입)과 패널(상단 바 규격 4·5절 · Figma 223:977 · 223:1139 · 223:1579 · 223:2044).
 * 1024 이상은 벨 아래 오른쪽 맞춤 팝오버(폭 400 · 최대 높이 min(640, 화면 − 96)), 미만은 오른쪽 Sheet(390 에서는 전체 폭).
 * 패널은 대화상자 "알림" — 열면 패널 자체에 초점(링 없음), Tab 으로 모두 읽음·설정·탭·필터·알림 링크, Esc 로 닫고 벨로 돌아간다.
 * 권한·폴링·등급 규칙은 넣지 않는다 — 앱이 개수·목록·상태를 데이터로 넘긴다.
 */
export function NotificationCenter({ count, urgent = false, open, defaultOpen = false, onOpenChange, className, ...panel }: NotificationCenterProps) {
  const narrow = useAutomaticRail();
  const [innerOpen, setInnerOpen] = React.useState(defaultOpen);
  const isOpen = open ?? innerOpen;
  const titleId = React.useId();
  const setOpen = React.useCallback((next: boolean) => {
    if (open === undefined) setInnerOpen(next);
    onOpenChange?.(next);
  }, [open, onOpenChange]);
  // 1024 를 넘나들면 닫는다 — 팝오버와 Sheet 는 다른 층이라 열린 채 바꾸면 초점과 막이 어긋난다.
  const previous = React.useRef(narrow);
  React.useEffect(() => {
    if (previous.current !== narrow && isOpen) setOpen(false);
    previous.current = narrow;
  }, [narrow, isOpen, setOpen]);
  // 열면 초점은 패널 자체(대화상자 "알림", tabindex −1 — Radix 초점 범위가 붙인다)다. 첫 Tab 이 "모두 읽음"으로 간다(11-25 구현 검수 B).
  // 기본(첫 누를 것에 초점)이면 "모두 읽음"을 실수로 누르기 쉽고, 제목에 두면 제목 둘레에 링 상자가 떴다. 이벤트는 패널에서 생긴다.
  const focusPanel = (event: Event) => { event.preventDefault(); (event.target as HTMLElement | null)?.focus({ preventScroll: true }); };
  const bell = <NotificationBell count={count} urgent={urgent} className={className} />;
  const content = <NotificationPanel {...panel} titleId={narrow ? undefined : titleId} sheet={narrow} onClose={() => setOpen(false)} />;
  if (narrow) return <Dialog open={isOpen} onOpenChange={setOpen}>
    <DialogTrigger asChild>{bell}</DialogTrigger>
    <SheetContent side="right" size="sm" showClose={false} data-slot="notification-center" className="ds-notification-center ds-notification-sheet"
      aria-describedby={undefined} tabIndex={-1} onOpenAutoFocus={focusPanel}>{content}</SheetContent>
  </Dialog>;
  return <Popover.Root open={isOpen} onOpenChange={setOpen}>
    <Popover.Trigger asChild>{bell}</Popover.Trigger>
    <Popover.Portal>
      <Popover.Content data-slot="notification-center" className="ds-notification-center ds-notification-popover" align="end" sideOffset={4}
        collisionPadding={layerCollisionPadding} aria-labelledby={titleId} tabIndex={-1} onOpenAutoFocus={focusPanel}>{content}</Popover.Content>
    </Popover.Portal>
  </Popover.Root>;
}
