import * as React from 'react';
import { createPortal } from 'react-dom';
import { CalendarIcon, CircleAlert } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { Input } from '../input';
import { Button } from '../button';
import { useComposition } from '../form';
import { FieldErrorContext } from '../form/field-error-context';
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
  const fieldError = React.useContext(FieldErrorContext);
  const describedBy = [...new Set([
    error ? fieldError?.id ?? errorId : '',
    ...(inputProps['aria-describedby']?.split(/\s+/) ?? []),
  ].filter(Boolean))].join(' ') || undefined;
  const errorMessage = <span className="flex items-start gap-1"><CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{error}</span>;
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
    // 오류가 날 때는 입력에 글자가 있어 placeholder 가 보이지 않는다 — 문구가 고치는 법(형식·순서)을 말해야 한다.
    // 동시에 Field 의 20px 한 줄 예약 안에 들어가야 한다. 13px 실측: 단일 194px ≤ 220(240-아이콘·간격),
    // 범위 272px ≤ 286(306-아이콘·간격). "기간을 YYYY-MM-DD ~ YYYY-MM-DD 순서로 입력하세요." 는 313px 로 넘쳤다.
    setError(mode === 'single' ? 'YYYY-MM-DD 형식으로 입력하세요.' : '시작일 ~ 종료일 순서, YYYY-MM-DD로 입력하세요.');
  };
  const pick = (next: Date | DateRange | undefined) => {
    (onChange as (v: Date | DateRange | undefined) => void)(next);
    setDraft(formatValue(next)); setError('');
    if (mode === 'single') setOpen(false);
  };
  // 도그푸딩 G2: 같은 계산 스타일 span에서 범위 값 216px·placeholder 238px.
  // 입력 264px = 최대 글폭 238 + 좌우 padding 24 + border 2, 루트는 버튼 38 + gap 4를 더한다.
  return <div data-slot="date-picker" className={cn('relative', mode === 'single' ? 'min-w-[240px]' : 'min-w-[306px]', className)}>
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-1">
        <Input {...inputProps} disabled={disabled} value={draft} className={cn('tabular flex-1', mode === 'single' ? 'min-w-0' : 'min-w-[264px]')}
          placeholder={mode === 'single' ? 'YYYY-MM-DD' : 'YYYY-MM-DD ~ YYYY-MM-DD'}
          invalid={Boolean(error) || inputProps.invalid}
          aria-invalid={error ? true : inputProps['aria-invalid'] ?? inputProps.invalid}
          aria-describedby={describedBy}
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
    {fieldError ? fieldError.container && !fieldError.hasError && error && createPortal(
      <div data-slot="date-picker-error">{errorMessage}</div>, fieldError.container,
    ) : <div id={errorId} data-slot="date-picker-error" aria-live="polite" aria-atomic="true"
      className="absolute inset-x-0 top-full bg-surface text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] text-danger-ink">
      {error && errorMessage}
    </div>}
  </div>;
}
