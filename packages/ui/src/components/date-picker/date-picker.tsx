import * as React from 'react';
import { CalendarIcon, CircleAlert } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { Input } from '../input';
import { Button } from '../button';
import { useComposition } from '../form';
import { Calendar } from './calendar';
import { Popover, PopoverTrigger, PopoverContent } from './popover';
import { formatValue, parseDate, quickRange, type QuickPeriod } from './date-value';
import { cn } from '../../lib/cn';

type Common = Omit<React.ComponentProps<typeof Input>, 'value' | 'defaultValue' | 'onChange' | 'type'> & {
  defaultMonth?: Date;
  /** 빠른 선택의 기준일. 기본은 운영자의 로컬 오늘이며 스토리에서는 고정할 수 있다. */
  today?: Date;
};
export type DatePickerProps = Common & (
  { mode: 'single'; value?: Date; onChange: (value: Date | undefined) => void } |
  { mode?: 'range'; value?: DateRange; onChange: (value: DateRange | undefined) => void }
);
/** 기간 필터를 우선한다. 입력 초안과 확정값을 분리해 IME 조합·미완성 날짜가 필터를 망가뜨리지 않는다. */
export function DatePicker({ mode = 'range', value, onChange, today, defaultMonth, className,
  onBlur, onKeyDown, onCompositionStart, onCompositionEnd, disabled, ...inputProps }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(() => formatValue(value));
  const [error, setError] = React.useState('');
  const [month, setMonth] = React.useState(defaultMonth ?? (value instanceof Date ? value : value?.from) ?? today ?? new Date());
  const composition = useComposition();
  const errorId = React.useId();
  React.useEffect(() => { setDraft(formatValue(value)); setError(''); }, [value]);
  const commit = () => {
    if (composition.isComposing()) return;
    if (!draft.trim()) { (onChange as (v: undefined) => void)(undefined); setError(''); return; }
    if (mode === 'single') {
      const date = parseDate(draft.trim());
      if (date) { (onChange as (v: Date) => void)(date); setMonth(date); setError(''); return; }
    } else {
      const parts = draft.split('~').map(s => s.trim());
      const from = parseDate(parts[0] ?? ''); const to = parseDate(parts[1] ?? '');
      if (parts.length === 2 && from && to && from <= to) {
        (onChange as (v: DateRange) => void)({ from, to }); setMonth(from); setError(''); return;
      }
    }
    setError(mode === 'single' ? '날짜를 YYYY-MM-DD 형식으로 입력하세요.' : '기간을 YYYY-MM-DD ~ YYYY-MM-DD 순서로 입력하세요.');
  };
  const pick = (next: Date | DateRange | undefined) => {
    (onChange as (v: Date | DateRange | undefined) => void)(next);
    setDraft(formatValue(next)); setError('');
    if (mode === 'single') setOpen(false);
  };
  return <div data-slot="date-picker" className={cn('min-w-[240px]', className)}>
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-1">
        <Input {...inputProps} disabled={disabled} value={draft} className="tabular min-w-0 flex-1"
          placeholder={mode === 'single' ? 'YYYY-MM-DD' : 'YYYY-MM-DD ~ YYYY-MM-DD'}
          invalid={Boolean(error) || inputProps.invalid}
          aria-invalid={error ? true : inputProps['aria-invalid'] ?? inputProps.invalid}
          aria-describedby={[error ? errorId : '', inputProps['aria-describedby']].filter(Boolean).join(' ') || undefined}
          onChange={event => setDraft(event.target.value)}
          onCompositionStart={event => { composition.bind.onCompositionStart(); onCompositionStart?.(event); }}
          onCompositionEnd={event => { composition.bind.onCompositionEnd(); onCompositionEnd?.(event); }}
          onBlur={event => { commit(); onBlur?.(event); }}
          onKeyDown={event => { onKeyDown?.(event); if (!event.defaultPrevented && event.key === 'Enter' && !composition.isComposing()) { event.preventDefault(); commit(); } }} />
        <PopoverTrigger asChild><Button disabled={disabled} iconOnly aria-label="달력 열기" leadingIcon={<CalendarIcon />} /></PopoverTrigger>
      </div>
      <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] p-0" aria-label="날짜 선택">
        <div data-slot="date-picker-presets" className="flex flex-wrap gap-1 border-b border-border p-2">
          {(['오늘', '최근 7일', '이번 달', '지난 달'] as QuickPeriod[]).map(period => <Button key={period} size="sm" variant="ghost"
            onClick={() => { const range = quickRange(period, today); pick(mode === 'single' ? range.to : range); setMonth(range.from!); setOpen(false); }}>{period}</Button>)}
        </div>
        <Calendar locale={ko} month={month} onMonthChange={setMonth} today={today}
          formatters={{ formatCaption: date => format(date, 'yyyy년 M월', { locale: ko }), formatWeekdayName: date => format(date, 'EEEEE', { locale: ko }) }}
          {...(mode === 'single' ? { mode: 'single' as const, selected: value as Date | undefined, onSelect: pick } :
            { mode: 'range' as const, selected: value as DateRange | undefined, onSelect: pick })} />
        <div className="border-t border-border p-2 text-right"><Button size="sm" onClick={() => setOpen(false)}>완료</Button></div>
      </PopoverContent>
    </Popover>
    <div id={errorId} data-slot="date-picker-error" className="min-h-[var(--text-caption-lh)] text-[length:var(--text-caption)] text-[var(--status-danger-fg)]" aria-live="polite">
      {error && <span className="flex items-center gap-1"><CircleAlert aria-hidden="true" className="size-4" />{error}</span>}
    </div>
  </div>;
}
