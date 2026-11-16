import * as React from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import * as Popover from '../../internal/popover';
import { cn } from '../../lib/cn';
import { useComposition } from '../form/use-composition';
import { comboboxFilter } from './combobox-filter';
import type { ComboboxOption, MultipleComboboxProps } from './combobox';

const defaultFilter = (query: string, option: ComboboxOption) => comboboxFilter(query, option.label);

export function MultipleCombobox({ options, value, onValueChange, placeholder = '선택하세요',
  searchPlaceholder = '검색어를 입력하세요', emptyText = '결과가 없습니다', filter = defaultFilter,
  disabled, invalid, required, maxHeight = 240, className, ref, multiple: _multiple, ...wiring }: MultipleComboboxProps) {
  const [localValue, setLocalValue] = React.useState<string[]>([]);
  const values = value ?? localValue;
  const selected = values.flatMap(v => { const option = options.find(o => o.value === v); return option ? [option] : []; });
  const [open, setOpen] = React.useState(false);
  const listId = React.useId();
  const [active, setActive] = React.useState<string>();
  const listRef = React.useRef<HTMLDivElement>(null);
  const [query, setQuery] = React.useState('');
  const [composing, setComposing] = React.useState(false);
  const composition = useComposition();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const controlRef = React.useRef<HTMLDivElement>(null);
  const areaRef = React.useRef<HTMLDivElement>(null);
  const chipRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const [roving, setRoving] = React.useState<string>();
  const [armed, setArmed] = React.useState<string>();
  const pendingFocus = React.useRef<{ value?: string } | undefined>(undefined);
  const rovingValue = selected.some(option => option.value === roving) ? roving : selected[0]?.value;
  React.useImperativeHandle(ref, () => inputRef.current!, []);
  React.useLayoutEffect(() => {
    const target = pendingFocus.current;
    if (target === undefined) return;
    // 제어 부모가 값을 반영한 렌더 뒤에만 이웃을 찾는다. 사라지는 버튼에 포커스하지 않는다.
    pendingFocus.current = undefined;
    if (target.value === undefined) inputRef.current?.focus();
    else (chipRefs.current.get(target.value) ?? inputRef.current)?.focus();
  }, [values]);
  React.useLayoutEffect(() => {
    const area = areaRef.current;
    const target = armed !== undefined ? chipRefs.current.get(armed) : inputRef.current;
    if (!area || !target || (armed === undefined && document.activeElement !== inputRef.current)) return;
    // 칩을 더 골라도 커서와 두 번 삭제의 강조가 가려지지 않게 내부 영역만 스크롤한다.
    const bounds = area.getBoundingClientRect(), rect = target.getBoundingClientRect();
    if (rect.top < bounds.top) area.scrollTop -= bounds.top - rect.top;
    else if (rect.bottom > bounds.bottom) area.scrollTop += rect.bottom - bounds.bottom;
  }, [values, armed]);
  React.useEffect(() => {
    if (disabled) { setOpen(false); setQuery(''); setArmed(undefined); setComposing(false); composition.bind.onCompositionEnd(); }
  }, [disabled, composition]);
  const filtered = React.useMemo(() => options.filter(option => filter(query, option)), [options, query, filter]);
  const lastNonEmpty = React.useRef<ComboboxOption[]>([]);
  React.useLayoutEffect(() => { if (filtered.length) lastNonEmpty.current = filtered; }, [filtered]);
  const visible = composing && !filtered.length ? lastNonEmpty.current.flatMap(previous => {
    const current = options.find(option => option.value === previous.value); return current ? [current] : [];
  }) : filtered;
  const enabled = visible.filter(option => !option.disabled);
  const activeValue = enabled.some(option => option.value === active) ? active : enabled[0]?.value;
  const activeIndex = visible.findIndex(option => option.value === activeValue);
  React.useLayoutEffect(() => {
    const list = listRef.current, option = list?.querySelector<HTMLElement>('[data-selected="true"]');
    if (!list || !option) return;
    const bounds = list.getBoundingClientRect(), rect = option.getBoundingClientRect();
    if (rect.top < bounds.top) list.scrollTop -= bounds.top - rect.top;
    else if (rect.bottom > bounds.bottom) list.scrollTop += rect.bottom - bounds.bottom;
  }, [activeValue, open]);
  const update = (next: string[]) => { if (value === undefined) setLocalValue(next); onValueChange?.(next); setArmed(undefined); };
  const remove = (v: string, focusNeighbor: boolean) => {
    const index = selected.findIndex(option => option.value === v);
    const next = selected[index + 1]?.value ?? selected[index - 1]?.value;
    if (focusNeighbor) { pendingFocus.current = { value: next }; setRoving(next); }
    update(values.filter(item => item !== v));
  };
  const focusChip = (v: string) => { setRoving(v); chipRefs.current.get(v)?.focus(); };
  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (!next) { setQuery(''); setComposing(false); composition.bind.onCompositionEnd(); }
  };
  const hasError = invalid || wiring['aria-invalid'];
  return <Popover.Root open={open && !disabled} onOpenChange={changeOpen}>
    <div data-slot="combobox-multiple"
      onKeyDownCapture={event => {
        if (composition.isComposing()) {
          // Backspace도 IME가 소유한다. 강조·삭제·목록 탐색 모두 조합 종료까지 양보한다.
          if (['Enter', 'ArrowUp', 'ArrowDown', 'Escape', 'Home', 'End', 'Backspace', 'Delete'].includes(event.key)) event.stopPropagation();
          return;
        }
        if (event.target !== inputRef.current) return;
        if (event.key !== 'Backspace') setArmed(undefined);
        if (!open && ['Enter', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
          event.preventDefault(); event.stopPropagation(); changeOpen(true); return;
        }
        if (['Enter', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault(); event.stopPropagation();
          if (event.key === 'Enter') {
            if (activeValue !== undefined) update(values.includes(activeValue) ? values.filter(v => v !== activeValue) : [...values, activeValue]);
          } else {
            const index = enabled.findIndex(option => option.value === activeValue);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1
              : Math.max(0, Math.min(enabled.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
            setActive(enabled[next]?.value);
          }
        }
        if (!query && event.key === 'Backspace' && selected.length) {
          event.preventDefault(); event.stopPropagation();
          const last = selected.at(-1)!;
          if (armed === last.value) remove(last.value, false);
          else setArmed(last.value);
        }
      }}>
      <Popover.Anchor asChild>
        <div ref={controlRef} data-slot="combobox-multiple-control" className={cn('ds-combobox-multiple-control', className)}
          data-disabled={disabled || undefined} data-invalid={hasError || undefined}
          onClick={event => {
            if (!disabled && !(event.target as HTMLElement).closest('button')) { inputRef.current?.focus(); changeOpen(true); }
          }}>
          <div ref={areaRef} data-slot="combobox-chip-area" className="ds-combobox-chip-area">
            {/* 같은 flex 흐름 안에 묶음과 입력을 두어 입력 커서가 마지막 칩 뒤에 이어진다. */}
            <div role="group" aria-label="선택한 값" data-slot="combobox-chips" className="ds-combobox-chips">
              {selected.map((option, index) => <span key={option.value} data-slot="combobox-chip"
                className="ds-combobox-chip" data-armed={armed === option.value || undefined}>
                <span title={option.label} className="ds-combobox-chip-label">{option.label}</span>
                <button ref={node => { if (node) chipRefs.current.set(option.value, node); else chipRefs.current.delete(option.value); }}
                  type="button" data-slot="combobox-chip-remove" aria-label={`${option.label} 선택 해제`}
                  tabIndex={option.value === rovingValue ? 0 : -1} disabled={disabled}
                  onFocus={() => { setRoving(option.value); setArmed(undefined); }}
                  onKeyDown={event => {
                    if (composition.isComposing()) return;
                    if (['ArrowLeft', 'ArrowRight', 'Delete', 'Backspace', 'Enter', ' '].includes(event.key)) {
                      event.stopPropagation();
                      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                        event.preventDefault();
                        const neighbor = selected[Math.max(0, Math.min(selected.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1)))];
                        if (neighbor) focusChip(neighbor.value);
                      } else if (event.key === 'Delete' || event.key === 'Backspace') {
                        event.preventDefault(); remove(option.value, true);
                      }
                    }
                  }} onClick={() => remove(option.value, true)}><X aria-hidden="true" /></button>
              </span>)}
            </div>
            <input {...wiring} role="combobox" aria-autocomplete="list"
              aria-label={wiring['aria-label'] ?? (wiring['aria-labelledby'] || wiring.id ? undefined : placeholder)}
              aria-controls={open ? listId : undefined} aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined} ref={inputRef} data-slot="combobox-input" className="ds-combobox-multiple-input"
              disabled={disabled} autoComplete="off" spellCheck={false}
              placeholder={selected.length ? searchPlaceholder : placeholder}
              value={query} onChange={event => { setQuery(event.currentTarget.value); setArmed(undefined); changeOpen(true); }}
              // Field id와 상태는 실제 검색 입력 하나에 연결한다.
              aria-expanded={open && !disabled} aria-required={required || wiring['aria-required']}
              aria-invalid={hasError || undefined}
              onBlur={() => setArmed(undefined)}
              onCompositionStart={() => { composition.bind.onCompositionStart(); setComposing(true); setArmed(undefined); }}
              onCompositionEnd={event => { composition.bind.onCompositionEnd(); setComposing(false); setQuery(event.currentTarget.value); }} />
          </div>
          <ChevronDown aria-hidden="true" />
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content data-slot="combobox-content" className="ds-combobox-content ds-combobox-multiple-content" align="start" sideOffset={4}
          aria-label={wiring['aria-label'] ?? placeholder} aria-labelledby={wiring['aria-labelledby']}
          onOpenAutoFocus={event => { event.preventDefault(); inputRef.current?.focus(); }}
          onCloseAutoFocus={event => event.preventDefault()}
          onInteractOutside={event => {
            // 입력과 칩은 포털 밖의 앵커다. 그 안에서 작업할 때는 닫지 않는다.
            if (event.target instanceof Node && controlRef.current?.contains(event.target)) event.preventDefault();
          }}
          onEscapeKeyDown={event => {
            if (composition.isComposing()) event.preventDefault();
            else inputRef.current?.focus();
          }}>
          <div ref={listRef} id={listId} role="listbox" aria-label="선택 후보" data-slot="combobox-list" className="ds-combobox-list"
            aria-multiselectable="true" style={{ maxHeight }}>
            {visible.map((option, index) => <div key={option.value} id={`${listId}-${index}`} role="option" aria-disabled={option.disabled || undefined}
              aria-selected={values.includes(option.value)} data-disabled={option.disabled || undefined} data-selected={option.value === activeValue}
              data-slot="combobox-option" className="ds-combobox-option" data-value-selected={values.includes(option.value)} title={option.label}
              onMouseDown={event => event.preventDefault()}
              onPointerMove={() => { if (!option.disabled) setActive(option.value); }}
              onClick={() => {
                if (composition.isComposing() || option.disabled) return;
                update(values.includes(option.value) ? values.filter(v => v !== option.value) : [...values, option.value]);
                inputRef.current?.focus();
              }}>
              <span className="ds-combobox-option-label">{option.label}</span>
              {values.includes(option.value) && <><Check aria-hidden="true" /><span className="sr-only">선택한 값</span></>}
            </div>)}
            {!composing && !visible.length && <div data-slot="combobox-empty" className="ds-combobox-empty" role="status">{emptyText}</div>}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </div>
  </Popover.Root>;
}
