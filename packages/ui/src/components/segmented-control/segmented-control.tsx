import * as React from 'react';
import { cn } from '../../lib/cn';

export interface SegmentedControlOption {
  value: string;
  /** 아이콘 전용에서도 접근성 이름과 전체값으로 남는다. */
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}
type GroupName = { 'aria-label': string; 'aria-labelledby'?: string }
  | { 'aria-label'?: string; 'aria-labelledby': string };
export type SegmentedControlProps = Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange' | 'children'> & GroupName & {
  /** value는 그룹 안에서 고유해야 한다. */
  options: readonly SegmentedControlOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  iconOnly?: boolean;
  disabled?: boolean;
};

/** 폼 제출값 없이 화면의 보기·필터 단위를 즉시 바꾸는 단일 선택이다. */
export function SegmentedControl({ options, value, defaultValue, onValueChange, size = 'md', fullWidth = false,
  iconOnly = false, disabled = false, className, onKeyDown, ...props }: SegmentedControlProps) {
  const [internal, setInternal] = React.useState(defaultValue);
  const requested = value === undefined ? internal : value;
  const firstEnabled = options.find(option => !option.disabled);
  // 항목이 제거되면 첫 활성 항목으로 표시를 복구한다. 외부 상태를 임의로 갱신하지 않는다.
  const selected = options.find(option => option.value === requested) ?? firstEnabled;
  const tabValue = selected && !selected.disabled ? selected.value : firstEnabled?.value;
  function select(next: string) {
    if (disabled || next === selected?.value) return;
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  }
  return <div {...props} role="radiogroup" aria-orientation="horizontal" aria-disabled={disabled || undefined}
    data-slot="segmented-control" data-size={size} data-full-width={fullWidth || undefined}
    data-icon-only={iconOnly || undefined} className={cn('ds-segmented-control', className)}
    onKeyDown={event => {
      onKeyDown?.(event);
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || disabled) return;
      const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'];
      if (!keys.includes(event.key)) return;
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-slot="segmented-control-item"]:not(:disabled)'));
      const index = buttons.indexOf(event.target as HTMLButtonElement);
      if (index < 0) return;
      event.preventDefault();
      const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
      const forward = event.key === 'ArrowDown' || event.key === (rtl ? 'ArrowLeft' : 'ArrowRight');
      const next = event.key === 'Home' ? buttons[0] : event.key === 'End' ? buttons.at(-1)
        : buttons[(index + (forward ? 1 : -1) + buttons.length) % buttons.length];
      // 한 줄 축약이므로 문서·조상 스크롤을 움직일 필요가 없다.
      next?.focus({ preventScroll: true });
      next?.click();
    }}>
    {options.map(option => <button key={option.value} type="button" role="radio"
      data-slot="segmented-control-item" aria-checked={selected?.value === option.value}
      aria-label={option.label} title={option.label} disabled={disabled || option.disabled}
      tabIndex={!disabled && option.value === tabValue ? 0 : -1} onClick={() => select(option.value)}>
      {option.icon && <span data-slot="segmented-control-icon" aria-hidden="true">{option.icon}</span>}
      <span data-slot="segmented-control-label" className={iconOnly ? 'sr-only' : undefined}>{option.label}</span>
    </button>)}
  </div>;
}
