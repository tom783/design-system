import * as React from 'react';
import { cn } from '../../lib/cn';

export interface ClampTextProps extends React.ComponentProps<'div'> {
  /** 접었을 때 보여줄 줄 수. 기본 2. */
  lines?: number;
  /** 제어하려면 주고, 아니면 스스로 관리한다. */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  moreLabel?: string;
  lessLabel?: string;
}

export function ClampText({ lines = 2, expanded, onExpandedChange, moreLabel = '더보기',
  lessLabel = '간략히', children, className, ...props }: ClampTextProps) {
  const textId = React.useId();
  const textRef = React.useRef<HTMLDivElement>(null);
  const [localExpanded, setLocalExpanded] = React.useState(false);
  const [overflowing, setOverflowing] = React.useState(false);
  const isExpanded = expanded ?? localExpanded;
  const lineCount = Number.isFinite(lines) ? Math.max(1, Math.floor(lines)) : 2;
  const measure = React.useCallback(() => {
    const node = textRef.current;
    if (!node) return;
    // 펼친 높이로 재면 항상 false다. 같은 요소를 동기적으로 접어 재고 페인트 전에 복원한다.
    // 복제 노드를 만들지 않으므로 자식의 id·보조기기 텍스트가 중복되지 않는다.
    const previous = node.dataset.expanded;
    try {
      node.dataset.expanded = 'false';
      setOverflowing(node.scrollHeight > node.clientHeight);
    } finally { node.dataset.expanded = previous; }
  }, []);
  React.useLayoutEffect(measure, [measure, children, lineCount, isExpanded]);
  React.useEffect(() => {
    const node = textRef.current;
    if (!node) return;
    // 고정된 클램프 높이에서는 내용이 길어져도 RO가 울리지 않으므로 MO가 함께 필요하다.
    const resize = new ResizeObserver(measure);
    const mutation = new MutationObserver(measure);
    resize.observe(node);
    mutation.observe(node, { childList: true, characterData: true, subtree: true });
    let active = true;
    void document.fonts.ready.then(() => { if (active) measure(); });
    measure();
    return () => { active = false; resize.disconnect(); mutation.disconnect(); };
  }, [measure]);
  return <div {...props} data-slot="clamp-text" className={cn('ds-clamp-text', className)}>
    <div ref={textRef} id={textId} data-slot="clamp-text-content" data-expanded={isExpanded}
      className="ds-clamp-text-content" style={{ WebkitLineClamp: lineCount }}>{children}</div>
    {overflowing && <button type="button" data-slot="clamp-text-trigger" className="ds-clamp-text-trigger"
      aria-expanded={isExpanded} aria-controls={textId} aria-describedby={textId}
      onClick={() => {
        const next = !isExpanded;
        if (expanded === undefined) setLocalExpanded(next);
        onExpandedChange?.(next);
      }}>{isExpanded ? lessLabel : moreLabel}</button>}
  </div>;
}
