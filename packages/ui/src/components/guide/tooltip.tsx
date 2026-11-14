import * as React from 'react';
import { readGuideToken, useAnchored, useGuideChild, type GuideChild } from './use-anchored';

export interface TooltipProps {
  children: GuideChild;
  /** 상호작용 없는 짧은 설명. 액션이 필요하면 Hint를 사용한다. */
  content: string;
  disabled?: boolean;
}
export function Tooltip({ children, content, disabled = false }: TooltipProps) {
  const id = React.useId();
  const { target, ref } = useGuideChild(children);
  const [open, setOpen] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hovered = React.useRef(false);
  const focused = React.useRef(false);
  const enabled = !disabled && !children.props.disabled && !!content.trim();
  const clear = () => { clearTimeout(timer.current); timer.current = undefined; };
  const close = () => { clear(); setOpen(false); };
  const { bubbleRef, anchorName } = useAnchored({ target, open: open && enabled, onClose: close });
  React.useEffect(() => { if (!enabled) { clear(); setOpen(false); } return clear; }, [enabled]);
  const show = (immediate: boolean) => {
    clear();
    if (!enabled) return;
    if (immediate) setOpen(true);
    else timer.current = setTimeout(() => setOpen(true), target ? readGuideToken(target, '--tooltip-delay-in', 400) : 400);
  };
  const hide = () => {
    clear();
    if (focused.current || hovered.current) return;
    timer.current = setTimeout(() => setOpen(false), target ? readGuideToken(target, '--tooltip-delay-out', 120) : 120);
  };
  return <>
    {React.cloneElement(children, {
      ref,
      style: { ...children.props.style, anchorName: [children.props.style?.anchorName === 'none' ? '' : children.props.style?.anchorName, anchorName].filter(Boolean).join(', ') },
      'aria-describedby': [children.props['aria-describedby'], enabled ? id : null].filter(Boolean).join(' ') || undefined,
      onMouseEnter: (event) => { children.props.onMouseEnter?.(event); hovered.current = true; show(focused.current); },
      onMouseLeave: (event) => { children.props.onMouseLeave?.(event); hovered.current = false; hide(); },
      onFocus: (event) => { children.props.onFocus?.(event); focused.current = true; show(true); },
      onBlur: (event) => { children.props.onBlur?.(event); focused.current = false; hide(); },
    })}
    {enabled && <div ref={bubbleRef} data-slot="guide-bubble" className="p-0" popover="manual" id={id} role="tooltip" style={{ borderColor: 'transparent', background: 'transparent' }}
      onMouseEnter={() => { hovered.current = true; clear(); }} onMouseLeave={() => { hovered.current = false; hide(); }}>
      <div data-slot="guide-tooltip" style={{ borderRadius: 'inherit' }}>{content}</div>
    </div>}
  </>;
}
