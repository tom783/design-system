// 알림 토스트(toast.notify)의 순수 규칙 — 상단 바 규격 6절. React·sonner 없이 단위 시험한다(notification.test.mjs).

/** 일반 알림 기본 8초(규격 6절 · Figma 216:1569). 행동 결과 토스트(sonner 기본 4초)보다 길다 — 읽고 이동할 시간이다. */
export const NOTIFICATION_DURATION = 8000;

export type NotificationLevel = 'normal' | 'pinned';

/** 지금 떠 있는 알림 토스트 하나. */
export interface NotificationSlot {
  id: string;
  groupKey?: string;
  count: number;
  level: NotificationLevel;
}

/**
 * 다음 알림 토스트 자리. 알림 토스트는 한 번에 하나다.
 * - 떠 있는 것이 없으면(`active` 거짓) 새 id 로 시작한다 — 닫히는 중인 토스트를 되살리지 않게.
 * - 떠 있으면 같은 id 를 다시 쓴다(sonner 가 제자리에서 바꾼다). 같은 묶음 키면 건수를 더하고, 아니면 이번 건수로 바꾼다.
 * - **고정(pinned)이 떠 있으면 일반(normal)은 띄우지 않는다 — `null`**(규격 6절 '고정과 일반 동시', 11-25 디자인 총괄 답 ⑩).
 *   고정은 닫을 때까지 남아야 하는 일이라 일반이 그 자리를 덮으면 안 된다. 묶음 키가 같아도 건수를 더하지 않는다 — 고정 토스트는
 *   그대로 둔다. 그 일반 알림의 기록(알림 센터)·벨 건수는 앱 몫이다. 고정 → 고정, 일반 → 고정은 지금처럼 자리를 바꾼다.
 * - 건수는 1 이상 정수다. 빈 값·0·음수·소수는 1(또는 내림)로 센다.
 */
export function nextNotification(current: NotificationSlot | null, active: boolean,
  input: { groupKey?: string; count?: number; level?: NotificationLevel }, createId: () => string): NotificationSlot | null {
  const live = active ? current : null;
  const level = input.level ?? 'normal';
  if (live?.level === 'pinned' && level === 'normal') return null;
  const add = Math.max(1, Math.floor(input.count ?? 1) || 1);
  const merged = live !== null && input.groupKey !== undefined && live.groupKey === input.groupKey;
  return { id: live?.id ?? createId(), groupKey: input.groupKey, count: merged ? live.count + add : add, level };
}

/** 등급별 표시 시간. 고정(pinned)은 닫을 때까지(오류 토스트와 같은 방식), 일반은 앱이 준 시간 또는 8초. */
export function notificationDuration(level: NotificationLevel | undefined, duration?: number) {
  return level === 'pinned' ? Infinity : duration ?? NOTIFICATION_DURATION;
}
