import { endOfMonth, format, isValid, parse, startOfDay, startOfMonth, subDays, subMonths } from 'date-fns';
import type { DateRange } from 'react-day-picker';
export type TimeStep = 1 | 5 | 10 | 15 | 30;
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
/** 브라우저 지역 시각을 왕복 검증한다. DST로 존재하지 않는 시각도 조용히 바꾸지 않는다. */
export function parseDateTime(text: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text)) return undefined;
  const date = parse(text, 'yyyy-MM-dd HH:mm', new Date(2000, 0, 1));
  return isValid(date) && format(date, 'yyyy-MM-dd HH:mm') === text ? date : undefined;
}
/** 가장 가까운 분 칸, 동률은 올림: 예약을 동률에서 더 일찍 실행하지 않기 위해서다. 자정은 다음 날짜로 넘긴다. */
export function snapTime(date: Date, step: TimeStep): Date {
  const next = new Date(date);
  next.setMinutes(Math.floor((date.getMinutes() + step / 2) / step) * step, 0, 0);
  return next;
}
/** 처음 고르는 시각은 09:00. 고른 날짜가 오늘·과거·미래인지에 따라 기본 시각이 달라지지 않게 한다. */
export function withTime(day: Date, previous?: Date): Date {
  const next = new Date(day);
  next.setHours(previous?.getHours() ?? 9, previous?.getMinutes() ?? 0, previous?.getSeconds() ?? 0, previous?.getMilliseconds() ?? 0);
  return next;
}
export function formatValue(value: Date | DateRange | undefined, time = false) {
  if (value instanceof Date) return format(value, time ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd');
  return value?.from ? `${format(value.from, 'yyyy-MM-dd')}${value.to ? ` ~ ${format(value.to, 'yyyy-MM-dd')}` : ''}` : '';
}
