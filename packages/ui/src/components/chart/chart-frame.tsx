import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { useElementWidth } from '../../lib/use-element-width';

export interface ChartLegendItem { label: string; color: string }
export interface ChartFrameProps {
  title?: string;
  summary: string;
  legend?: ChartLegendItem[];
  empty?: boolean;
  className?: string;
  children: (width: number) => ReactNode;
}

export function ChartFrame({ title, summary, legend = [], empty, className, children }: ChartFrameProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  return <figure data-slot="chart-frame" className={cn('m-0 min-w-0 rounded-[var(--radius-lg)] border border-line-strong bg-surface p-4', className)}>
    {title && <figcaption data-slot="chart-title" className="mb-3 text-[length:var(--text-body-lg)] font-semibold text-fg">{title}</figcaption>}
    {legend.length > 0 && <ul data-slot="chart-legend" aria-label="범례" className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[length:var(--text-caption)] text-fg-muted">
      {legend.map((item, index) => <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-2">
        <span aria-hidden="true" className="h-2 w-3 shrink-0" style={{ backgroundColor: item.color }} />
        <span className="min-w-0 break-words">{item.label}</span>
      </li>)}
    </ul>}
    <div ref={ref} data-slot="chart-plot" className="min-w-0">
      {empty ? <p data-slot="chart-empty" aria-label={summary} className="py-8 text-center text-[length:var(--text-body-sm)] text-fg-muted">표시할 데이터가 없습니다</p> : width > 0 ? children(width) : null}
    </div>
  </figure>;
}

// DESIGN.md 3절의 최소 13px와 수치 전용 서체를 SVG에도 동일하게 적용한다.
export const numericStyle: CSSProperties = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' };
export const axisLabel = () => ({ fill: 'var(--chart-axis)', fontSize: 13, style: numericStyle });
export const dateFormat = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;
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
