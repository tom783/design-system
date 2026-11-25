// 알림 센터·알림 진입(벨)의 순수 규칙 — 상단 바 규격 4·5절 · Figma 223:977 · 223:1139 · 223:1579. 단위 시험: notification-center.test.mjs.
import { countDisplay } from '../count-badge/count';

/** 알림 한 줄. 권한·폴링·등급 판단은 앱이 하고 결과만 데이터로 넘긴다(규격 원칙). */
export interface NotificationItem {
  id: string;
  /** 출처 표식(예: "판매관리 · 스토어 A"). 20자를 넘으면 말줄임, 전체는 툴팁. */
  source: string;
  /** 제목. 최대 2줄. */
  title: string;
  /** 발생 시각. 상대 표기("방금"·"12분 전"·"어제 14:20")로 보이고 툴팁에 전체 일시. */
  time: Date | number | string;
  /** 이동할 주소. 한 줄 전체가 이 링크다. */
  href: string;
  /** 읽음. 안 읽음 = 왼쪽 점 8 + 제목 600, 읽음 = 점 없음 + 400(바탕은 같다). */
  read?: boolean;
  /** 급함 — 제목 앞 경고 아이콘 16 + 위험 색 기한. 바탕은 칠하지 않는다. */
  urgent?: boolean;
  /** 묶음 건수(3줄, 예: "37건"). */
  count?: number;
  /** 처리 기한(3줄). 남음 `normal` · 임박 `soon`(주의 색) · 초과 `overdue`(위험 색). 등급은 앱이 정한다. */
  deadline?: { text: string; level?: 'normal' | 'soon' | 'overdue' };
}

/** 출처 표식 글자 수 상한(규격 5절 "20자 말줄임"). */
export const SOURCE_MAX = 20;
export function truncateSource(source: string): string {
  const chars = [...source];
  return chars.length > SOURCE_MAX ? `${chars.slice(0, SOURCE_MAX).join('')}…` : source;
}

const pad = (value: number) => String(value).padStart(2, '0');
const toDate = (time: Date | number | string) => time instanceof Date ? time : new Date(time);
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * 발생 시각 표기(규격 5절 시간 표기). 기기의 지역 시간대로 센다.
 * 1분 미만 "방금" · 60분 미만 "n분 전" · 24시간 미만 "n시간 전" · 어제 "어제 HH:MM" · 같은 해 "MM.DD HH:MM" · 다른 해 "YYYY.MM.DD".
 * 앞선 시각(시계 차이)은 "방금"이다. `full` 은 툴팁용 전체 일시 "YYYY.MM.DD HH:MM".
 */
export function formatNotificationTime(time: Date | number | string, now: Date | number = Date.now()): { text: string; full: string; iso: string } {
  const date = toDate(time), base = toDate(now);
  if (Number.isNaN(date.getTime())) return { text: '', full: '', iso: '' };
  const full = `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const iso = date.toISOString();
  const diff = base.getTime() - date.getTime();
  const minute = 60_000, hour = 60 * minute;
  if (diff < minute) return { text: '방금', full, iso };
  if (diff < hour) return { text: `${Math.floor(diff / minute)}분 전`, full, iso };
  if (diff < 24 * hour) return { text: `${Math.floor(diff / hour)}시간 전`, full, iso };
  const yesterday = new Date(base.getFullYear(), base.getMonth(), base.getDate() - 1);
  if (sameDay(date, yesterday)) return { text: `어제 ${pad(date.getHours())}:${pad(date.getMinutes())}`, full, iso };
  if (date.getFullYear() === base.getFullYear()) return { text: `${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`, full, iso };
  return { text: `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`, full, iso };
}

/** 3줄 글자: "37건 · 4시간 남음". 둘 다 없으면 null(3줄을 그리지 않는다). */
export function detailText(item: Pick<NotificationItem, 'count' | 'deadline'>): string | null {
  const parts = [item.count != null && item.count > 0 ? `${Math.floor(item.count)}건` : null, item.deadline?.text || null].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

/** 한 줄의 링크 이름 "<출처>, <제목>, <건수>, <기한>, <시각>, 안 읽음/읽음"(규격 5절 낭독). 없는 칸은 건너뛴다. */
export function notificationName(item: NotificationItem, now: Date | number = Date.now()): string {
  return [item.source, item.title, item.count != null && item.count > 0 ? `${Math.floor(item.count)}건` : null, item.deadline?.text || null,
    formatNotificationTime(item.time, now).text || null, item.read ? '읽음' : '안 읽음'].filter(Boolean).join(', ');
}

/**
 * 알림 진입(벨)의 접근 이름(규격 4절 낭독). 0·개수 실패는 "알림" — 숫자를 숨긴 것과 같은 말이다.
 * "알림, 안 읽음 3개" · "알림, 안 읽음 99개 이상" · 급함이면 ", 급한 알림 있음" 을 덧붙인다.
 */
export function bellName(count: number | null | undefined, urgent = false): string {
  const display = countDisplay(count);
  if (!display) return '알림';
  return `알림, 안 읽음 ${display.spoken}${urgent ? ', 급한 알림 있음' : ''}`;
}
