import * as React from 'react';
import { createPortal } from 'react-dom';
import { CalendarIcon, CircleAlert, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { Input } from '../input';
import { Button } from '../button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../select';
import { useComposition } from '../form';
import { FieldErrorContext } from '../form/field-error-context';
import { Calendar } from './calendar';
import { Popover, PopoverTrigger, PopoverContent } from './popover';
import { formatValue, parseDate, parseDateTime, snapTime, withTime, quickRange, quickDate, outOfRange, rangeInputError } from './date-value';
import { cn } from '../../lib/cn';

type Common = Omit<React.ComponentProps<typeof Input>, 'value' | 'defaultValue' | 'onChange' | 'type'> & {
  defaultMonth?: Date;
  /** 빠른 선택의 기준일. 기본은 운영자의 로컬 오늘이며 스토리에서는 고정할 수 있다. */
  today?: Date;
};
// 값 알림은 onValueChange 다(DESIGN.md §6.3). onChange 는 옛 이름으로, Input 의 DOM 이벤트 onChange 와
// 이름은 같고 인자가 달라 헷갈렸다. 둘 다 주면 onValueChange 만 부른다.
type Handlers<T> = {
  /** 확정한 값을 받는다. 입력 중 초안은 보내지 않는다. */
  onValueChange?: (value: T | undefined) => void;
  /**
   * 옛 이름. onValueChange와 같다.
   * @deprecated onValueChange로 바꿨다(목표 49). 다음 마이너에서 뺀다.
   */
  onChange?: (value: T | undefined) => void;
};
export type DatePickerProps = Common & (
  ({ mode: 'single'; value?: Date } & Handlers<Date> & {
    /** 단일 날짜의 지역 시각 입력. true는 10분, step은 분 단위다. */
    time?: true | { step: 1 | 5 | 10 | 15 | 30 } }) |
  ({ mode?: 'range'; value?: DateRange } & Handlers<DateRange> & { time?: never })
);
/** 기간 필터를 우선한다. 입력 초안과 확정값을 분리해 IME 조합·미완성 날짜가 필터를 망가뜨리지 않는다. */
export function DatePicker({ mode = 'range', value, onValueChange, onChange, today, defaultMonth, time, className,
  onBlur, onKeyDown, onCompositionStart, onCompositionEnd, disabled, ...inputProps }: DatePickerProps) {
  const emit = (onValueChange ?? onChange) as ((next: Date | DateRange | undefined) => void) | undefined;
  const hasTime = mode === 'single' && Boolean(time);
  // 조회 기간·조회 날짜·예약 일시의 작업 방향에 맞는 빠른 선택만 제공한다.
  const presets = mode === 'range'
    ? (['오늘', '최근 7일', '이번 달', '지난 달'] as const).map(label => ({ label, getValue: () => quickRange(label, today) }))
    : (['오늘', hasTime ? '내일' : '어제'] as const).map(label => ({ label, getValue: () => quickDate(label, today) }));
  const step = typeof time === 'object' ? time.step : 10;
  const [notice, setNotice] = React.useState<{ value: number; text: string }>();
  const noticeId = React.useId();
  const noticeText = value instanceof Date && notice?.value === value.getTime() ? notice.text : '';
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(() => formatValue(value, hasTime));
  const [error, setError] = React.useState('');
  const [month, setMonth] = React.useState(defaultMonth ?? (value instanceof Date ? value : value?.from) ?? today ?? new Date());
  const composition = useComposition();
  const errorId = React.useId();
  const fieldError = React.useContext(FieldErrorContext);
  const describedBy = [...new Set([
    error ? fieldError?.id ?? errorId : '',
    noticeText ? noticeId : '',
    ...(inputProps['aria-describedby']?.split(/\s+/) ?? []),
  ].filter(Boolean))].join(' ') || undefined;
  const errorMessage = <span className="flex items-start gap-1"><CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{error}</span>;
  React.useEffect(() => { setDraft(formatValue(value, hasTime)); setError(''); }, [value, hasTime]);
  const commit = () => {
    if (composition.isComposing()) return;
    // Enter로 이미 확정한 값을 blur에서 재발행하면 방금 읽어야 할 보정 알림까지 지워진다.
    if (hasTime && draft === formatValue(value, true)) { setError(''); return; }
    if (!draft.trim()) { pick(undefined); return; }
    if (mode === 'single') {
      const date = hasTime ? parseDateTime(draft.trim()) : parseDate(draft.trim());
      if (date) {
        const next = hasTime ? snapTime(date, step) : date;
        publish(next);
        setNotice(next.getTime() !== date.getTime()
          ? { value: next.getTime(), text: `${step}분 단위로 ${formatValue(next, true)}에 맞췄습니다.` } : undefined);
        setMonth(next); return;
      }
    } else {
      const parts = draft.split('~').map(s => s.trim());
      const from = parseDate(parts[0] ?? ''); const to = parseDate(parts[1] ?? '');
      if (parts.length === 2 && from && to && from <= to) {
        emit?.({ from, to }); setMonth(from); setError(''); return;
      }
    }
    // 오류가 날 때는 입력에 글자가 있어 placeholder 가 보이지 않는다 — 문구가 고치는 법(형식·범위·순서)을 말해야 한다.
    // Field 는 20px 한 줄을 예약한다. 13px 실측: 단일 형식 194px ≤ 220(240-아이콘·간격), 일시 형식 241px ≤ 260.
    // 기간 형식 255px·순서 230px·없는 날짜 최대 245px ≤ 286(306-아이콘·간격) — 기간 오류 규칙은 rangeInputError.
    // 단일은 형식이 맞으면 범위 오류(달력에 없는 날짜·25시)를 먼저 말한다. 범위도 맞는데 실패한 일시는 DST로 없는 시각이다.
    setNotice(undefined);
    const text = draft.trim();
    if (mode !== 'single') { setError(rangeInputError(text) ?? 'YYYY-MM-DD ~ YYYY-MM-DD로 입력하세요.'); return; }
    const range = outOfRange(text, hasTime);
    if (range) { setError(range); return; }
    if (hasTime && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text)) { setError('지역 시간에 없는 시각입니다.'); return; }
    setError(hasTime ? 'YYYY-MM-DD HH:mm 형식으로 입력하세요.' : 'YYYY-MM-DD 형식으로 입력하세요.');
  };
  const publish = (next: Date | DateRange | undefined) => {
    emit?.(next);
    setDraft(formatValue(next, hasTime)); setError(''); setNotice(undefined);
  };
  const pick = (next: Date | DateRange | undefined) => {
    if (hasTime && next instanceof Date) {
      const dated = withTime(next, value as Date | undefined);
      if (value instanceof Date && (dated.getHours() !== value.getHours() || dated.getMinutes() !== value.getMinutes())) {
        setNotice(undefined); setError('지역 시간에 없는 시각입니다.'); return;
      }
      publish(dated);
    } else publish(next);
    // 시각 입력이 남아 있으므로 달력을 고른 뒤에도 레이어와 포커스를 유지한다.
    if (mode === 'single' && !hasTime) setOpen(false);
  };
  const clock = value instanceof Date ? value : withTime(today ?? new Date());
  const changeTime = (part: 'hours' | 'minutes', text: string) => {
    const next = new Date(clock);
    if (part === 'hours') next.setHours(Number(text), next.getMinutes(), 0, 0);
    else next.setMinutes(Number(text), 0, 0);
    // DST 전환으로 없는 시각을 Date가 조용히 다음 시각으로 바꾸면 예약 의도가 달라진다.
    if ((part === 'hours' && next.getHours() !== Number(text)) ||
        (part === 'minutes' && next.getMinutes() !== Number(text))) {
      setNotice(undefined); setError('지역 시간에 없는 시각입니다.'); return;
    }
    publish(next); setMonth(next);
  };
  // 도그푸딩 G2: 시스템 대체 글꼴에서 범위 값 216px·placeholder 238px, Pretendard 에서는 placeholder 185px (R30).
  // 입력 264px = 더 넓은 대체 글꼴 238 + 좌우 padding 24 + border 2 — 앱이 글꼴을 못 불러와도 잘리지 않는다.
  // 루트는 버튼 38 + gap 4를 더한다.
  // R40 CoreText 계측(렌더 실측 아님): 시각 placeholder 최대 144.46px + 입력 여백·경계 26 + 버튼·gap 42 = 212.46px.
  // 오류 최대 249.88px + 아이콘·gap 20 + caption 자간 여유 <5px를 280px에 담는다. 브라우저 검사는 신규 하네스에 둔다.
  return <div data-slot="date-picker" className={cn('relative', hasTime ? 'min-w-[280px]' : mode === 'single' ? 'min-w-[240px]' : 'min-w-[306px]', className)}>
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-1">
        <Input {...inputProps} disabled={disabled} value={draft} className={cn('tabular flex-1', mode === 'single' ? 'min-w-0' : 'min-w-[264px]')}
          placeholder={mode === 'single' ? (hasTime ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD') : 'YYYY-MM-DD ~ YYYY-MM-DD'}
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
          {presets.map(({ label, getValue }) => <Button key={label} size="sm" variant="ghost"
            onClick={() => { const next = getValue(); pick(next); setMonth(next instanceof Date ? next : next.from!); if (!hasTime) setOpen(false); }}>{label}</Button>)}
        </div>
        <Calendar locale={ko} month={month} onMonthChange={setMonth} today={today}
          formatters={{ formatCaption: date => format(date, 'yyyy년 M월', { locale: ko }), formatWeekdayName: date => format(date, 'EEEEE', { locale: ko }) }}
          {...(mode === 'single' ? { mode: 'single' as const, selected: value as Date | undefined, onSelect: pick } :
            { mode: 'range' as const, selected: value as DateRange | undefined, onSelect: pick })} />
        {hasTime && <div data-slot="date-picker-time" className="flex items-end gap-2 border-t border-border p-3">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-[length:var(--text-caption)]">시
            <Select value={String(clock.getHours())} onValueChange={text => changeTime('hours', text)} disabled={disabled}>
              <SelectTrigger aria-describedby={describedBy} aria-invalid={error ? true : inputProps['aria-invalid']} aria-label="시" className="tabular min-w-20"><SelectValue /></SelectTrigger>
              <SelectContent>{Array.from({ length: 24 }, (_, hour) => <SelectItem key={hour} value={String(hour)}>{String(hour).padStart(2, '0')}</SelectItem>)}</SelectContent>
            </Select>
          </label>
          <span aria-hidden="true" className="pb-2">:</span>
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-[length:var(--text-caption)]">분
            <Select value={String(clock.getMinutes())} onValueChange={text => changeTime('minutes', text)} disabled={disabled}>
              <SelectTrigger aria-describedby={describedBy} aria-invalid={error ? true : inputProps['aria-invalid']} aria-label="분" className="tabular min-w-20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {clock.getMinutes() % step !== 0 && <SelectItem value={String(clock.getMinutes())} disabled>{String(clock.getMinutes()).padStart(2, '0')}</SelectItem>}
                {Array.from({ length: 60 / step }, (_, index) => index * step).map(minute => <SelectItem key={minute} value={String(minute)}>{String(minute).padStart(2, '0')}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
        </div>}
        <div className="border-t border-border p-2 text-right"><Button size="sm" onClick={() => setOpen(false)}>완료</Button></div>
      </PopoverContent>
    </Popover>
    {hasTime && <div id={noticeId} data-slot="date-picker-notice" role="status" aria-live="polite" aria-atomic="true"
      className="text-[length:var(--text-caption)] text-fg-subtle">
      {noticeText && <span className="flex items-start gap-1"><Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{noticeText}</span>}
    </div>}
    {/* Field 밖 오류는 그 자리 바탕 그대로(투명) 입력 아래 20px 에 걸친다. 흰 상자는 툴바·카드 바탕과 달라 떠 보였다.
        겹침은 조립이 막는다 — 필터 툴바 아래 20px 이상 간격(DESIGN §11.3). */}
    {fieldError ? fieldError.container && !fieldError.hasError && error && createPortal(
      <div data-slot="date-picker-error">{errorMessage}</div>, fieldError.container,
    ) : <div id={errorId} data-slot="date-picker-error" aria-live="polite" aria-atomic="true"
      className="absolute inset-x-0 top-full text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] text-danger-ink">
      {error && errorMessage}
    </div>}
  </div>;
}
