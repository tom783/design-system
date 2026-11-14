import * as React from 'react';
import { Button } from '../button';
import { useAnchored, useGuideChild, type GuideChild } from '../guide/use-anchored';

export interface PeekItem { label: string; value: React.ReactNode; numeric?: boolean }
export interface PeekProps {
  children: GuideChild;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: PeekItem[];
  /** 요약에서 상세로 이동하는 단일 읽기 액션. */
  action?: { label: string; onClick: () => void };
}
export function Peek({ children, open, onOpenChange, title, items, action }: PeekProps) {
  const id = React.useId();
  const { target, ref } = useGuideChild(children);
  const { bubbleRef } = useAnchored({ target, open: open && !!target, onClose: () => onOpenChange(false), dialog: true });
  React.useEffect(() => {
    if (items.length > 6 && import.meta.env.DEV) console.warn('[Peek] 요약은 최대 6줄을 권장합니다. 더 많은 정보는 상세 페이지로 옮기세요.');
  }, [items.length]);
  React.useEffect(() => {
    if (!open || !target) return;
    return () => { if (target.isConnected) target.focus({ preventScroll: true }); };
  }, [open, target]);
  return <>
    {React.cloneElement(children, { ref, 'aria-haspopup': 'dialog', 'aria-expanded': open, 'aria-controls': id,
      onClick: (event) => { children.props.onClick?.(event); if (!event.defaultPrevented && !children.props.disabled) onOpenChange(!open); } })}
    <div ref={bubbleRef} id={id} data-slot="guide-bubble" data-peek="" popover="manual" role="dialog" tabIndex={-1} aria-labelledby={`${id}-title`}>
      <div data-slot="peek">
        <div className="flex items-start justify-between gap-4">
          <h2 id={`${id}-title`} className="min-w-0 truncate font-semibold" title={title}>{title}</h2>
          <Button size="sm" variant="ghost" aria-label="닫기" onClick={() => onOpenChange(false)}>×</Button>
        </div>
        <dl data-slot="peek-items">{items.map((item, index) => <div data-slot="peek-item" key={index}>
          <dt title={item.label}>{item.label}</dt>
          <dd className={item.numeric ? 'tabular text-right' : undefined}
            title={typeof item.value === 'string' || typeof item.value === 'number' ? String(item.value) : undefined}>{item.value}</dd>
        </div>)}</dl>
        {action && <Button className="mt-4" onClick={action.onClick}>{action.label}</Button>}
      </div>
    </div>
  </>;
}
