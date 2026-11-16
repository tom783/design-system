import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import * as Popover from '../../internal/popover';
import { cn } from '../../lib/cn';

export interface MultiSelectOption { value: string; label: string; disabled?: boolean }
export interface MultiSelectProps extends Pick<React.ComponentPropsWithRef<'button'>,
  'id' | 'ref' | 'className' | 'aria-label' | 'aria-labelledby' | 'aria-describedby' | 'aria-invalid' | 'aria-required'> {
  options: MultiSelectOption[];
  value?: string[];
  onValueChange?: (value: string[]) => void;
  placeholder?: string;
  /** 요약 문구를 앱이 바꾼다. 기본은 "{첫 라벨} 외 {n-1}개"다. */
  summary?: (selected: { value: string; label: string }[]) => string;
  clearLabel?: string;
  disabled?: boolean;
  invalid?: boolean;
  required?: boolean;
  maxHeight?: number | string;
}
const defaultSummary = (selected: MultiSelectOption[]) => selected.length === 1
  ? selected[0]!.label : `${selected[0]!.label} 외 ${selected.length - 1}개`;

export function MultiSelect({ options, value, onValueChange, placeholder = '선택하세요',
  summary = defaultSummary, clearLabel = '전체 해제', disabled, invalid, required,
  maxHeight = 240, className, ref, ...wiring }: MultiSelectProps) {
  const [localValue, setLocalValue] = React.useState<string[]>([]);
  const selectedValues = value ?? localValue;
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState<string>();
  const listRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  React.useImperativeHandle(ref, () => triggerRef.current!, []);
  const id = React.useId();
  const enabled = options.filter(option => !option.disabled);
  const activeValue = enabled.some(option => option.value === active) ? active : enabled[0]?.value;
  const activeIndex = options.findIndex(option => option.value === activeValue);
  const selected = selectedValues.flatMap(v => { const option = options.find(o => o.value === v); return option ? [option] : []; });
  const text = selected.length ? summary(selected) : placeholder;
  const update = (next: string[]) => { if (value === undefined) setLocalValue(next); onValueChange?.(next); };
  const toggle = (v: string) => update(selectedValues.includes(v) ? selectedValues.filter(item => item !== v) : [...selectedValues, v]);
  React.useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  React.useLayoutEffect(() => {
    // 목록 자체만 움직인다. scrollIntoView는 툴바와 아래 표까지 밀 수 있다.
    const list = listRef.current;
    const option = list?.querySelector<HTMLElement>('[data-active="true"]');
    if (!list || !option) return;
    const bounds = list.getBoundingClientRect(), rect = option.getBoundingClientRect();
    if (rect.top < bounds.top) list.scrollTop -= bounds.top - rect.top;
    else if (rect.bottom > bounds.bottom) list.scrollTop += rect.bottom - bounds.bottom;
  }, [open, activeValue]);
  return <Popover.Root open={open && !disabled} onOpenChange={setOpen}>
    <Popover.Trigger asChild>
      <button {...wiring} ref={triggerRef} type="button" data-slot="multi-select-trigger"
        className={cn('ds-multi-select-trigger', className)} disabled={disabled} title={text}
        aria-haspopup="listbox" aria-expanded={open && !disabled} aria-controls={open ? `${id}-list` : undefined}
        aria-invalid={invalid || wiring['aria-invalid'] || undefined} aria-required={required || wiring['aria-required']}
        data-placeholder={selected.length ? undefined : ''}
        onKeyDown={event => {
          if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault(); setActive((event.key === 'End' || event.key === 'ArrowUp') ? enabled.at(-1)?.value : enabled[0]?.value); setOpen(true);
          }
        }}>
        <span data-slot="multi-select-value">{text}</span><ChevronDown aria-hidden="true" />
      </button>
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content data-slot="multi-select-content" className="ds-multi-select-content" align="start" sideOffset={4}
        aria-label={wiring['aria-label'] ?? placeholder} aria-labelledby={wiring['aria-labelledby']}
        onOpenAutoFocus={event => { event.preventDefault(); listRef.current?.focus(); }}>
        <div ref={listRef} id={`${id}-list`} data-slot="multi-select-list" className="ds-multi-select-list"
          role="listbox" aria-multiselectable="true" tabIndex={0} style={{ maxHeight }}
          aria-label={wiring['aria-label'] ?? placeholder} aria-labelledby={wiring['aria-labelledby']}
          aria-describedby={wiring['aria-describedby']} aria-required={required || wiring['aria-required']}
          aria-invalid={invalid || wiring['aria-invalid'] || undefined}
          aria-activedescendant={activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
          onKeyDown={event => {
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
              event.preventDefault(); event.stopPropagation();
              const index = enabled.findIndex(option => option.value === activeValue);
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1
                : Math.max(0, Math.min(enabled.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
              setActive(enabled[next]?.value);
            } else if (event.key === ' ' || event.key === 'Enter') {
              event.preventDefault(); event.stopPropagation(); if (activeValue !== undefined) toggle(activeValue);
            }
          }}>
          {options.map((option, index) => <div key={option.value} id={`${id}-option-${index}`}
            data-slot="multi-select-option" className="ds-multi-select-option" role="option"
            aria-selected={selectedValues.includes(option.value)} aria-disabled={option.disabled || undefined}
            data-active={option.value === activeValue} title={option.label}
            onMouseDown={event => event.preventDefault()}
            onPointerMove={() => { if (!option.disabled) setActive(option.value); }}
            onClick={() => { if (!option.disabled) { setActive(option.value); toggle(option.value); listRef.current?.focus(); } }}>
            <span className="ds-multi-select-check">{selectedValues.includes(option.value) && <Check aria-hidden="true" />}</span>
            <span className="ds-multi-select-label">{option.label}</span>
          </div>)}
        </div>
        <div data-slot="multi-select-footer" className="ds-multi-select-footer">
          <button type="button" disabled={!selectedValues.length} onClick={() => update([])}>{clearLabel}</button>
          <span className="tabular" aria-live="polite">{selectedValues.length}개 선택</span>
        </div>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>;
}
