import * as React from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '../lib/cn';

export interface CheckboxProps extends Omit<React.ComponentProps<'input'>, 'type'> {
  indeterminate?: boolean;
}

/** 네이티브 입력을 유지해야 키보드 조작과 스크린리더의 혼합 선택 상태가 함께 보존된다. */
export function Checkbox({ className, indeterminate = false, checked, ref: forwardedRef, ...props }: CheckboxProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const setRef = React.useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof forwardedRef === 'function') return forwardedRef(node);
    if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);

  React.useLayoutEffect(() => {
    // indeterminate는 HTML 속성이 아니므로 렌더링 후 DOM 프로퍼티에 반영한다.
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate, checked]);

  return (
    <span data-slot="checkbox-control" className="relative inline-flex size-4 shrink-0 align-middle">
      <input
        {...props}
        ref={setRef}
        type="checkbox"
        data-slot="checkbox"
        checked={checked}
        aria-checked={indeterminate ? 'mixed' : checked}
        className={cn(
          'peer m-0 size-4 shrink-0 cursor-pointer appearance-none rounded-[var(--radius-sm)] border border-field bg-surface',
          'checked:border-action-edge checked:bg-action indeterminate:border-action-edge indeterminate:bg-action',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      />
      {indeterminate
        ? <Minus aria-hidden="true" className="pointer-events-none absolute inset-0 size-4 text-fg-on-brand" />
        : <Check aria-hidden="true" className="pointer-events-none absolute inset-0 size-4 text-fg-on-brand opacity-0 peer-checked:opacity-100" />}
    </span>
  );
}
