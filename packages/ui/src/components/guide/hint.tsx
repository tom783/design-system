import * as React from 'react';
import { Button } from '../button';
import { useAnchored, useGuideChild, type GuideChild } from './use-anchored';

export interface HintProps {
  children: GuideChild;
  open: boolean;
  title: string;
  body?: string;
  onDismiss: () => void;
  action?: { label: string; onClick: () => void };
}
export function Hint({ children, open, title, body, onDismiss, action }: HintProps) {
  const id = React.useId();
  const { target, ref } = useGuideChild(children);
  const { bubbleRef, anchorName } = useAnchored({ target, open: open && !!target, onClose: onDismiss, dialog: true, ring: true });
  React.useEffect(() => {
    if (!open || !target) return;
    return () => { if (target.isConnected) target.focus({ preventScroll: true }); };
  }, [open, target]);
  return <>
    {React.cloneElement(children, { ref, style: { ...children.props.style, anchorName: [children.props.style?.anchorName === 'none' ? '' : children.props.style?.anchorName, anchorName].filter(Boolean).join(', ') } })}
    <div ref={bubbleRef} data-slot="guide-bubble" className="p-0" popover="manual" role="dialog" tabIndex={-1}
      aria-labelledby={`${id}-title`} aria-describedby={body ? `${id}-body` : undefined}>
      <div data-slot="guide-hint" style={{ borderRadius: 'inherit' }}>
        <div className="flex items-start justify-between gap-4"><h2 id={`${id}-title`} className="font-semibold">{title}</h2>
          <Button size="sm" variant="ghost" aria-label="닫기" onClick={onDismiss}>×</Button></div>
        {body && <p id={`${id}-body`} className="mt-2">{body}</p>}
        {action && <Button className="mt-4" onClick={action.onClick}>{action.label}</Button>}
      </div>
    </div>
  </>;
}
