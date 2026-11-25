import * as React from 'react';
import { cn } from '../../lib/cn';
import { countDisplay, countSpoken } from './count';

export interface CountBadgeProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  /** 개수. 0·음수면 그리지 않는다. null·undefined 는 불러오기 실패로 보고 숨긴다(0 으로 보이지 않는다). 100 이상은 "99+". */
  count: number | null | undefined;
  /** 급함 — 위험 채움 알약 + 알약 왼쪽 위험색 점 6px. 색만으로 구분하지 않고 낭독에도 "급함"을 더한다. 점 표식이면 바탕색 링 2px. */
  urgent?: boolean;
  /** 숫자 없이 점 8px 만 — 접힌 레일처럼 숫자 자리가 없을 때. 낭독 글자는 그대로 남는다. */
  dot?: boolean;
  /** 낭독 단위. 기본 "개"("12개", "99개 이상"). 주문 같은 레코드는 "건"(DESIGN.md §25). */
  unit?: string;
}

/**
 * 개수 표식 — 알림 벨·SideNav 항목·Tabs 가 같이 쓰는 작은 알약(상단 바 규격 3절 · Figma 223:912).
 * 높이 18 · 최소 폭 18 · 좌우 4 · 둥근 알약 · 숫자 13 600 고정폭. 일반은 중립 반전(글자색 바탕 + 표면색 글자),
 * 급함은 위험 채움 알약(위험 버튼 채움 바탕 + 브랜드 채움 위 글자색) + 알약 왼쪽 위험색 점 6(11-25 구현 검수 A — 연한 위험 바탕은
 * 라이트에서 일반보다 약해 보였다). 알약 크기는 일반과 같고, 점은 알약 밖 왼쪽이라 급함이면 전체 폭이 점 6 + 간격 2 만큼 넓다.
 * 화면 글자는 낭독에서 숨기고 "12개"·"99개 이상"을 따로 읽힌다.
 */
export function CountBadge({ count, urgent = false, dot = false, unit = '개', className, ...props }: CountBadgeProps) {
  const display = countDisplay(count, unit);
  if (!display) return null;
  return <span {...props} data-slot="count-badge" data-variant={dot ? 'dot' : 'count'} data-urgent={urgent ? '' : undefined}
    className={cn('ds-count-badge', className)}>
    {!dot && <>
      {urgent && <span className="ds-count-badge-dot" aria-hidden="true" />}
      <span className="ds-count-badge-pill" aria-hidden="true">{display.text}</span>
    </>}
    <span className="sr-only">{countSpoken(count, urgent, unit)}</span>
  </span>;
}
