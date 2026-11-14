import type { CSSProperties, ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
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
  loadingLabel?: string;
  skeleton?: ReactNode;
  className?: string;
  children: (width: number) => ReactNode;
}

export function ChartFrame({ title, summary, legend = [], empty, state = 'idle', emptyMessage = '표시할 데이터가 없습니다', errorMessage = '데이터를 불러오지 못했습니다', loadingLabel = '불러오는 중', skeleton, className, children }: ChartFrameProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const effectiveState = state === 'idle' && empty ? 'empty' : state;
  return <figure aria-busy={effectiveState === 'loading'} data-slot="chart-frame" className={cn('m-0 min-w-0 rounded-[var(--radius-lg)] border border-line-strong bg-surface p-4', className)}>
    {title && <figcaption data-slot="chart-title" className="mb-3 text-[length:var(--text-body-lg)] font-semibold text-fg">{title}</figcaption>}
    {legend.length > 0 && <ul data-slot="chart-legend" aria-label="범례" className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[length:var(--text-caption)] text-fg-muted">
      {legend.map((item, index) => <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-2">
        <span aria-hidden="true" className="h-2 w-3 shrink-0" style={{ backgroundColor: item.color }} />
        <span className="min-w-0 break-words">{item.label}</span>
      </li>)}
    </ul>}
    <div ref={ref} data-slot="chart-plot" className="min-w-0">
      {effectiveState === 'loading' ? <div data-slot="chart-loading" role="status">
        <span className="sr-only">{loadingLabel}</span>
        <div aria-hidden="true">{skeleton}</div>
      </div> : effectiveState === 'error' ? <p data-slot="chart-error" role="alert" className="flex items-center justify-center gap-2 bg-danger-tint py-8 text-[length:var(--text-body-sm)] text-danger-ink">
        <CircleAlert aria-hidden="true" className="size-5 shrink-0" />{errorMessage}
      </p> : effectiveState === 'empty' ? <p data-slot="chart-empty" role="status" className="py-8 text-center text-[length:var(--text-body-sm)] text-fg-muted">{emptyMessage}</p> : width > 0 ? children(width) : null}
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
