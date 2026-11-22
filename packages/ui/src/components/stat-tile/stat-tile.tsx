import * as React from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Slot } from '../../internal/slot';
import { cn } from '../../lib/cn';
import { Skeleton } from '../loading';
import { ErrorState } from '../state';
import { statDelta, statValue } from './format';

export interface StatTileProps extends React.HTMLAttributes<HTMLElement> {
  label: string;
  value?: string | number;
  /** 숫자의 ko-KR 표기 옵션. 기본은 만 이상 한국어 축약, 소수 첫째 자리까지다. */
  format?: Intl.NumberFormatOptions;
  /** 숫자 뒤 단위. 문자열 value에는 이미 포함해도 된다. */
  unit?: string;
  /** 미리 서식화한 문자열의 짧은 표시. 원문은 title과 접근성 이름에 보존한다. */
  compactValue?: string;
  /** percent는 12가 12%다. absolute는 deltaUnit을 붙인다. */
  delta?: number;
  deltaFormat?: 'percent' | 'absolute';
  deltaUnit?: string;
  deltaLabel?: string;
  goodDirection?: 'up' | 'down' | 'none';
  state?: 'idle' | 'loading' | 'error';
  errorMessage?: string;
  onRetry?: () => void;
  href?: string;
  /** 단일 자식 링크에 내용·속성을 합친다. href 대신 앱 라우터 링크를 줄 때 쓴다. */
  asChild?: boolean;
}

export function StatTile({ label, value, format, unit = '', compactValue, delta, deltaFormat = 'percent', deltaUnit = '',
  deltaLabel, goodDirection = 'up', state = 'idle', errorMessage = '지표를 불러오지 못했습니다', onRetry,
  href, asChild = false, children, className, ...props }: StatTileProps) {
  const formatted = value === undefined ? null : statValue(value, format, unit, compactValue);
  // 실패·비유한 값을 0으로 바꾸지 않는다. 로딩 중에도 이전 값·증감을 노출하지 않는다.
  const effective = state === 'idle' && !formatted ? 'error' : state;
  const change = delta !== undefined && Number.isFinite(delta) ? statDelta(delta, goodDirection, deltaFormat, deltaUnit) : null;
  const sentence = effective === 'loading' ? `${label}, 불러오는 중` : effective === 'error' ? `${label}, ${errorMessage}`
    : `${label} ${formatted!.full}${change ? `, ${deltaLabel ? `${deltaLabel} ` : ''}${change.spoken}` : ''}`;
  // 재시도 버튼이 링크 안에 중첩되지 않도록 상태 화면에서는 이동 자체를 제공하지 않는다.
  const linked = effective === 'idle' && (asChild || !!href);
  const child = asChild ? React.Children.only(children) : null;
  const content = <>
    <span data-slot="stat-tile-label" aria-hidden="true" className="ds-stat-tile-label">{label}</span>
    {effective === 'loading' ? <div data-slot="stat-tile-loading" role="status">
      <span className="sr-only">{label}, 불러오는 중</span>
      <div aria-hidden="true" className="ds-stat-tile-placeholder"><Skeleton variant="text" textStyle="title" width="70%" /><Skeleton variant="text" textStyle="caption" width="50%" /></div>
    </div> : effective === 'error' ? <ErrorState title={errorMessage} onRetry={onRetry} /> : <>
      <span data-slot="stat-tile-value" aria-hidden="true" className="ds-stat-tile-value tabular" title={formatted!.full}>{formatted!.display}</span>
      {change && <span data-slot="stat-tile-delta" aria-hidden="true" data-direction={change.direction} data-tone={change.tone} className="ds-stat-tile-delta tabular">
        <span data-slot="stat-tile-change">{change.direction === 'up' ? <ArrowUp /> : change.direction === 'down' ? <ArrowDown /> : <Minus />}{change.display}</span>
        {deltaLabel && <span data-slot="stat-tile-comparison">{deltaLabel}</span>}
      </span>}
    </>}
  </>;
  const Component = linked ? asChild ? Slot : 'a' : 'div';
  return <Component {...props} data-slot="stat-tile" data-state={effective} data-linked={linked || undefined}
    role={linked ? undefined : 'group'} aria-label={sentence} aria-busy={effective === 'loading'}
    href={linked && !asChild ? href : undefined} className={cn('ds-stat-tile', className)}>
    {linked && asChild && React.isValidElement<{ children?: React.ReactNode }>(child) ? React.cloneElement(child, undefined, content) : content}
  </Component>;
}
