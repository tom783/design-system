import { endOfMonth, format, isValid, parse, startOfDay, startOfMonth, subDays, subMonths } from 'date-fns';
import type { DateRange } from 'react-day-picker';
export type QuickPeriod = '오늘' | '최근 7일' | '이번 달' | '지난 달';
/** 최근 7일은 오늘을 포함한 달력 날짜 7개다. 밀리초 차감은 DST에서 틀리므로 날짜 연산을 쓴다. */
export function quickRange(period: QuickPeriod, now = new Date()): DateRange {
  const today = startOfDay(now);
  if (period === '오늘') return { from: today, to: today };
  if (period === '최근 7일') return { from: subDays(today, 6), to: today };
  const month = period === '지난 달' ? subMonths(today, 1) : today;
  return { from: startOfMonth(month), to: startOfDay(endOfMonth(month)) };
}
/** 엄격한 왕복 검증으로 2월 30일 보정이나 불완전 입력을 확정값으로 전달하지 않는다. */
export function parseDate(text: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return undefined;
  const date = parse(text, 'yyyy-MM-dd', new Date(2000, 0, 1));
  return isValid(date) && format(date, 'yyyy-MM-dd') === text ? date : undefined;
}
export function formatValue(value: Date | DateRange | undefined) {
  if (value instanceof Date) return format(value, 'yyyy-MM-dd');
  return value?.from ? `${format(value.from, 'yyyy-MM-dd')}${value.to ? ` ~ ${format(value.to, 'yyyy-MM-dd')}` : ''}` : '';
}
