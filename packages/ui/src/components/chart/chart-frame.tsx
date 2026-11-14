import type { CSSProperties, ReactNode } from 'react';
import { EmptyState, ErrorState } from '../state';
import { ChartSkeleton } from '../loading/skeleton-patterns';
import { cn } from '../../lib/cn';
import { useElementWidth } from '../../lib/use-element-width';

export interface ChartLegendItem { label: string; color: string }
export interface ChartFrameProps {
  title?: string;
  summary: string;
  legend?: ChartLegendItem[];
  empty?: boolean;
  state?: 'idle' | 'loading' | 'empty' | 'error';
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
  height?: number;
  skeletonVariant?: 'plot' | 'bullet';
  skeletonRows?: number;
  loadingLabel?: string;
  skeleton?: ReactNode;
  className?: string;
  children: (width: number, height: number) => ReactNode;
}

export function ChartFrame({ title, summary, legend = [], empty, state = 'idle', emptyMessage = '표시할 데이터가 없습니다', errorMessage = '데이터를 불러오지 못했습니다', onRetry, height, skeletonVariant = 'plot', skeletonRows = 3, loadingLabel = '불러오는 중', skeleton, className, children }: ChartFrameProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const effectiveState = state === 'idle' && empty ? 'empty' : state;
  // 네 상태의 플롯과 스켈레톤은 이 값 하나를 공유한다. 미지정 값은 SSR에서도 CSS 토큰으로 예약한다.
  const rows = Number.isFinite(skeletonRows) ? Math.max(0, Math.floor(skeletonRows)) : 3;
  const plotHeight = skeletonVariant === 'bullet' ? rows * 44
    : height !== undefined && Number.isFinite(height) && height > 0 ? Math.max(100, height) : undefined;
  const plotStyle = { blockSize: plotHeight ?? 'var(--chart-h-default)', '--chart-skeleton-h': plotHeight === undefined ? 'var(--chart-h-default)' : `${plotHeight}px` } as CSSProperties;
  return <figure aria-busy={effectiveState === 'loading'} data-slot="chart-frame" className={cn('m-0 min-w-0 rounded-[var(--radius-lg)] border border-line-strong bg-surface p-4', className)}>
    {title && <figcaption data-slot="chart-title" className="mb-3 text-[length:var(--text-body-lg)] font-semibold text-fg">{title}</figcaption>}
    {legend.length > 0 && <ul data-slot="chart-legend" aria-label="범례" className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[length:var(--text-caption)] text-fg-muted">
      {legend.map((item, index) => <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-2">
        <span aria-hidden="true" className="h-2 w-3 shrink-0" style={{ backgroundColor: item.color }} />
        <span className="min-w-0 break-words">{item.label}</span>
      </li>)}
    </ul>}
    <div ref={ref} data-slot="chart-plot" className="min-w-0" style={plotStyle}>
      {effectiveState === 'loading' ? <div data-slot="chart-loading" role="status">
        <span className="sr-only">{loadingLabel}</span>
        <div aria-hidden="true">{skeleton ?? <ChartSkeleton variant={skeletonVariant} rows={rows} legend={false} />}</div>
      </div> : effectiveState === 'error' ? <div data-slot="chart-error"><ErrorState title={errorMessage} onRetry={onRetry} /></div>
        : effectiveState === 'empty' ? <div data-slot="chart-empty"><EmptyState title={emptyMessage} /></div>
          : width > 0 ? children(width, plotHeight ?? defaultChartHeight()) : null}
    </div>
  </figure>;
}

// DESIGN.md 3절의 최소 13px와 수치 전용 서체를 SVG에도 동일하게 적용한다.
export const numericStyle: CSSProperties = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' };
export const axisLabel = () => ({ fill: 'var(--chart-axis)', fontSize: 13, style: numericStyle });
export const dateFormat = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;
// SVG 좌표 계산에는 숫자가 필요하다. 폭 측정 후 호출하므로 SSR에서는 DOM을 읽지 않는다.
//
// 폴백이 반드시 있어야 한다. 토큰을 못 읽으면(소비 앱이 tokens.css 를 안 불러왔거나,
// CSS 가 JS 보다 늦게 적용되는 첫 렌더) parseFloat('') 가 NaN 이 되고,
// Math.max(100, NaN) 은 100 이 아니라 NaN 이라 호출부의 바닥값이 막아주지 못한다.
// 그러면 height="NaN" 으로 차트 전체가 조용히 깨진다 — 실측으로 확인한 동작이다.
const CHART_H_FALLBACK = 220;
export const defaultChartHeight = (): number => {
  const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--chart-h-default'));
  return Number.isFinite(value) && value > 0 ? value : CHART_H_FALLBACK;
};
export function timeDomain(dates: Date[]): [Date, Date] {
  const first = dates[0]!;
  const last = dates[dates.length - 1]!;
  // 단일 시점도 유효한 시간축을 가지도록 앞뒤 하루를 확보한다.
  return +first === +last ? [new Date(+first - 86400000), new Date(+last + 86400000)] : [first, last];
}
export function timeTicks(dates: Date[], plotWidth: number): Date[] {
  const count = Math.max(2, Math.floor(plotWidth / 72));
  return dates.filter((_, i) => i === 0 || i === dates.length - 1 || i % Math.max(1, Math.ceil((dates.length - 1) / (count - 1))) === 0);
}
