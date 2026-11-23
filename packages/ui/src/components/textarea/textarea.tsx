import * as React from 'react';
import { cn } from '../../lib/cn';

export interface TextareaProps extends React.ComponentProps<'textarea'> {
  invalid?: boolean;
  autoGrow?: boolean;
  /** 자동 높이 상한. 기본 240px는 본문 약 10줄이며 이후에는 칸 안에서 스크롤한다. */
  maxHeight?: React.CSSProperties['maxHeight'];
}

export function Textarea({ rows = 3, autoGrow = false, maxHeight = 240, invalid, className, style, onInput, ref, ...props }: TextareaProps) {
  const localRef = React.useRef<HTMLTextAreaElement | null>(null);
  const setRef = React.useCallback((node: HTMLTextAreaElement | null) => {
    localRef.current = node;
    if (typeof ref === 'function') return ref(node);
    if (ref) ref.current = node;
  }, [ref]);
  const grow = React.useCallback(() => {
    const node = localRef.current;
    if (!node || !autoGrow) return;
    // auto로 rows의 자연 높이를 복원한다. border-box의 scrollHeight에는 경계선이 없다.
    node.style.height = 'auto';
    const css = getComputedStyle(node);
    node.style.height = `${node.scrollHeight + parseFloat(css.borderTopWidth) + parseFloat(css.borderBottomWidth)}px`;
    node.style.overflowY = node.scrollHeight > node.clientHeight ? 'auto' : 'hidden';
  }, [autoGrow]);
  const wasAutoGrow = React.useRef(false);
  React.useLayoutEffect(() => {
    if (autoGrow) grow();
    else if (wasAutoGrow.current && localRef.current) {
      localRef.current.style.height = style?.height === undefined ? '' : typeof style.height === 'number' ? `${style.height}px` : style.height;
      localRef.current.style.overflowY = style?.overflowY ?? '';
    }
    wasAutoGrow.current = autoGrow;
  });
  React.useEffect(() => {
    const node = localRef.current;
    if (!node || !autoGrow) return;
    let frame = 0;
    let width = node.getBoundingClientRect().width;
    const observer = new ResizeObserver(() => {
      const next = node.getBoundingClientRect().width;
      // 자신의 높이 변경으로 재계산이 반복되지 않도록 줄바꿈이 달라지는 너비만 감시한다.
      if (next !== width) { width = next; grow(); }
    });
    observer.observe(node);
    const reset = () => { frame = requestAnimationFrame(grow); };
    const form = node.form;
    form?.addEventListener('reset', reset);
    return () => { observer.disconnect(); form?.removeEventListener('reset', reset); cancelAnimationFrame(frame); };
  }, [autoGrow, grow, props.form]);
  return <textarea {...props} ref={setRef} rows={rows} data-slot="textarea"
    aria-invalid={invalid || props['aria-invalid'] || undefined} className={cn('ds-textarea', className)}
    style={{ ...style, ...(autoGrow ? { maxHeight, resize: 'none', overflowY: 'hidden' } : {}) }}
    onInput={event => { onInput?.(event); grow(); }} />;
}
