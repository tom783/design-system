import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Command } from '../../internal/command';
import * as Popover from '../../internal/popover';
import { useComposition } from '../form/use-composition';
import { cn } from '../../lib/cn';
import { comboboxFilter } from './combobox-filter';

export interface ComboboxOption { value: string; label: string; disabled?: boolean }
export interface ComboboxProps extends Pick<React.ComponentPropsWithRef<'button'>,
  'id' | 'ref' | 'className' | 'aria-label' | 'aria-labelledby' | 'aria-describedby' | 'aria-invalid' | 'aria-required'> {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  filter?: (query: string, option: ComboboxOption) => boolean;
  disabled?: boolean;
  invalid?: boolean;
  required?: boolean;
  maxHeight?: number | string;
}
const defaultFilter = (query: string, option: ComboboxOption) => comboboxFilter(query, option.label);

export function Combobox({ options, value, onValueChange, placeholder = '선택하세요',
  searchPlaceholder = '검색어를 입력하세요', emptyText = '결과가 없습니다', filter = defaultFilter,
  disabled, invalid, required, maxHeight = 240, className, ref, ...wiring }: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [composing, setComposing] = React.useState(false);
  const composition = useComposition();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [listId, setListId] = React.useState<string>();
  // 포털이 부모 layout effect보다 늦게 마운트될 수도 있으므로 실제 목록 ref에서 연결한다.
  const registerList = React.useCallback((node: HTMLDivElement | null) => setListId(node?.id), []);
  React.useEffect(() => {
    if (disabled) {
      // 열린 입력이 비활성화되며 제거돼도 조합 상태가 다음 열기까지 남지 않게 한다.
      setOpen(false); setQuery(''); setComposing(false); composition.bind.onCompositionEnd();
    }
  }, [disabled, composition]);
  const filtered = React.useMemo(() => options.filter(option => filter(query, option)), [options, query, filter]);
  const lastNonEmpty = React.useRef<ComboboxOption[]>([]);
  React.useLayoutEffect(() => {
    if (filtered.length > 0) lastNonEmpty.current = filtered;
  }, [filtered]);
  const visible = composing && filtered.length === 0
    ? lastNonEmpty.current.flatMap(previous => {
      const current = options.find(option => option.value === previous.value);
      return current ? [current] : [];
    }) : filtered;
  const selected = options.find(option => option.value === value);
  const hasError = invalid || wiring['aria-invalid'];
  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery(''); setComposing(false); composition.bind.onCompositionEnd();
    }
  };
  return <Popover.Root open={open && !disabled} onOpenChange={changeOpen}>
    <Popover.Trigger asChild>
      {/* 트리거에 role="combobox" 를 주면 **열린 동안 콤보박스가 두 개**가 된다 —
          실측에서 트리거와 cmdk 입력이 둘 다 role=combobox 로, 둘 다 aria-hidden 조상
          없이 같은 listbox 를 가리켰다. 스크린리더는 콤보박스 두 개를 본다.
          콤보박스는 aria-activedescendant 와 aria-controls 를 소유하는 **입력 하나**다.
          트리거는 그 입력이 든 팝오버를 여는 버튼이다. (shadcn 은 둘 다 주지만 그건 흠이다.) */}
      <button {...wiring} ref={ref} type="button" data-slot="combobox-trigger"
        className={cn('ds-combobox-trigger', className)} disabled={disabled}
        aria-haspopup="dialog" aria-expanded={open && !disabled}
        aria-invalid={hasError || undefined} aria-required={required || wiring['aria-required']}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); changeOpen(true);
          }
        }}
        data-placeholder={selected ? undefined : ''} title={selected?.label}>
        <span data-slot="combobox-value">{selected?.label ?? placeholder}</span>
        <ChevronDown aria-hidden="true" />
      </button>
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content data-slot="combobox-content" className="ds-combobox-content" align="start" sideOffset={4}
        aria-label={wiring['aria-label'] ?? placeholder} aria-labelledby={wiring['aria-labelledby']}
        onOpenAutoFocus={event => { event.preventDefault(); inputRef.current?.focus(); }}
        onEscapeKeyDown={event => {
          // Radix는 document capture에서 Escape를 받으므로 React의 키 가드보다 먼저 보호한다.
          if (composition.isComposing()) event.preventDefault();
        }}>
        <Command data-slot="combobox" label={wiring['aria-label'] ?? placeholder} shouldFilter={false}
          onKeyDownCapture={event => {
            if (composition.isComposing() && ['Enter', 'ArrowUp', 'ArrowDown', 'Escape', 'Home', 'End'].includes(event.key)) {
              // 기본 동작은 IME에 남긴다. cmdk와 조상 FormFlow에만 전달하지 않는다.
              event.stopPropagation();
            }
          }}>
          <Command.Input ref={inputRef} data-slot="combobox-input" className="ds-combobox-input"
            placeholder={searchPlaceholder} value={query} onValueChange={setQuery}
            aria-describedby={wiring['aria-describedby']} aria-invalid={hasError || undefined}
            onCompositionStart={() => { composition.bind.onCompositionStart(); setComposing(true); }}
            onCompositionEnd={event => {
              composition.bind.onCompositionEnd(); setComposing(false); setQuery(event.currentTarget.value);
            }} />
          <Command.List ref={registerList} data-slot="combobox-list" className="ds-combobox-list"
            label="선택 후보" style={{ maxHeight }}>
            {visible.map(option => <Command.Item key={option.value} value={option.value}
              data-slot="combobox-option" className="ds-combobox-option" disabled={option.disabled}
              data-value-selected={option.value === value} title={option.label}
              // 옵션은 가상 포커스만 받는다. 비활성 항목을 눌러도 입력 포커스를 잃지 않는다.
              onMouseDown={event => event.preventDefault()}
              onSelect={() => {
                if (composition.isComposing()) return;
                onValueChange?.(option.value); changeOpen(false);
              }}>
              <span className="ds-combobox-option-label">{option.label}</span>
              {option.value === value && <><Check aria-hidden="true" /><span className="sr-only">선택한 값</span></>}
            </Command.Item>)}
            {!composing && visible.length === 0 && <div data-slot="combobox-empty" className="ds-combobox-empty" role="status">{emptyText}</div>}
          </Command.List>
        </Command>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>;
}
