import { endOfMonth, format, isValid, parse, startOfDay, startOfMonth, subDays, subMonths } from 'date-fns';
import type { DateRange } from 'react-day-picker';
export type TimeStep = 1 | 5 | 10 | 15 | 30;
export type QuickPeriod = '오늘' | '최근 7일' | '이번 달' | '지난 달';
/** 단일 날짜는 기간의 끝날로 대신하지 않는다. 자정·DST 경계도 달력 날짜로 이동한다. */
export function quickDate(day: '오늘' | '어제' | '내일', now = new Date()): Date {
  return subDays(startOfDay(now), day === '어제' ? 1 : day === '내일' ? -1 : 0);
}
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
/**
 * 형식은 맞지만 값이 범위를 벗어난 입력에 고치는 법을 돌려준다. 형식이 틀렸으면 undefined.
 * "2026-11-15 25:00"에 형식 문구를 보여주면 사용자는 이미 맞는 형식을 다시 들여다본다 — 무엇이 틀렸는지 말해야 한다.
 * 날짜를 시각보다 먼저 본다. 말일은 Date 대신 산술로 구한다(new Date(24, …)는 1924년이 된다).
 * 13px 실측: 가장 긴 "2026년 12월은 01~31일로 입력하세요." 205px ≤ 단일 날짜 오류 폭 220px.
 */
export function outOfRange(text: string, time = false): string | undefined {
  const match = (time ? /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/ : /^(\d{4})-(\d{2})-(\d{2})$/).exec(text);
  if (!match) return undefined;
  // 연도는 입력한 네 자리 그대로 말한다("0024년"). 나머지는 숫자로 비교한다.
  const yearText = match[1] ?? '';
  const [month = 0, day = 0, hours = 0, minutes = 0] = match.slice(2).map(Number);
  if (month < 1 || month > 12) return '월은 01~12로 입력하세요.';
  const year = Number(yearText);
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const last = month === 2 ? (leap ? 29 : 28) : [4, 6, 9, 11].includes(month) ? 30 : 31;
  if (day < 1 || day > last) return `${yearText}년 ${month}월은 01~${last}일로 입력하세요.`;
  if (time && (hours > 23 || minutes > 59)) return '시각은 00:00~23:59로 입력하세요.';
  return undefined;
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
