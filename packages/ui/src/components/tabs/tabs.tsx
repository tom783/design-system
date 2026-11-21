import * as React from 'react';
import * as Primitive from '../../internal/tabs';
import { cn } from '../../lib/cn';

/** automatic 기본값을 유지한다. 서버 요청이 있는 패널은 앱에서 manual을 명시한다. */
export function Tabs(props: React.ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root data-slot="tabs" {...props} />;
}

export function TabsList({ className, ref, onFocusCapture, ...props }: React.ComponentProps<typeof Primitive.List>) {
  const localRef = React.useRef<HTMLDivElement>(null);
  const reveal = React.useCallback((tab: HTMLElement | null) => {
    const list = localRef.current;
    if (!list || !tab) return;
    // scrollIntoView 를 쓰면 안 된다. 스크롤 가능한 조상을 전부 움직이기 때문에
    // block:'nearest' 로도 문서가 세로로 밀렸다 — 실측 scrollY 244 → 266.
    // 화살표로 탭을 지나갈 때마다 페이지가 튄다. 목록만 가로로 움직인다.
    const bounds = list.getBoundingClientRect(), target = tab.getBoundingClientRect();
    const style = getComputedStyle(list);
    // 좌우 여백만큼 더 당겨 탭 가장자리를 보존한다. 포커스 링은 잘리지 않도록 안쪽에 그린다 (§16.1).
    const before = target.left - (bounds.left + (parseFloat(style.paddingLeft) || 0));
    const after = target.right - (bounds.right - (parseFloat(style.paddingRight) || 0));
    const delta = before < 0 ? before : after > 0 ? after : 0;
    if (delta === 0) return;
    list.scrollTo({ left: list.scrollLeft + delta,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, []);
  React.useEffect(() => {
    const list = localRef.current;
    if (!list) return;
    const selected = () => reveal(list.querySelector<HTMLElement>('[data-slot="tabs-trigger"][data-state="active"]'));
    // Radix의 data-state를 관찰하므로 uncontrolled/controlled 선택을 중복 소유하지 않는다.
    const observer = new MutationObserver(selected);
    observer.observe(list, { subtree: true, attributes: true, attributeFilter: ['data-state'], childList: true });
    const resize = new ResizeObserver(selected);
    resize.observe(list); selected();
    return () => { observer.disconnect(); resize.disconnect(); };
  }, [reveal]);
  return <Primitive.List {...props} data-slot="tabs-list" className={cn('ds-tabs-list', className)}
    ref={React.useCallback((node: HTMLDivElement | null) => {
      localRef.current = node;
      if (typeof ref === 'function') return ref(node);
      if (ref) ref.current = node;
    }, [ref])}
    onFocusCapture={event => {
      onFocusCapture?.(event);
      if (!event.defaultPrevented) reveal((event.target as HTMLElement).closest<HTMLElement>('[data-slot="tabs-trigger"]'));
    }} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Trigger data-slot="tabs-trigger" className={cn('ds-tabs-trigger', className)} {...props} />;
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Content data-slot="tabs-content" className={cn('ds-tabs-content', className)} {...props} />;
}
