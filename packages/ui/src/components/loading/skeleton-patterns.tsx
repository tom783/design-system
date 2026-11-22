import type { CSSProperties } from 'react';
import { Card, CardHeader, CardBody, CardFooter } from '../card';
import { cn } from '../../lib/cn';
import { Skeleton, SkeletonText } from './skeleton';

export interface SkeletonPatternProps { label?: string; className?: string }
export interface ListSkeletonProps extends SkeletonPatternProps { rows?: number }
export interface FormSkeletonProps extends SkeletonPatternProps { fields?: number }
const countOf = (value: number, fallback: number) => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;

export function CardSkeleton({ label = '불러오는 중', className }: SkeletonPatternProps) {
  // Card 자체의 padding·radius·경계선을 재사용해 원본 변경도 함께 따라간다.
  return <Card data-slot="card-skeleton" role="status" aria-busy="true" className={className}>
    <span className="sr-only">{label}</span>
    <CardHeader><div className="ds-loading-card-title"><Skeleton height="calc(var(--text-body-lg) * 0.65)" width="60%" /></div></CardHeader>
    <CardBody><SkeletonText lines={2} textStyle="body" /></CardBody>
    <CardFooter><div className="ds-loading-card-footer"><Skeleton variant="text" textStyle="caption" width="40%" /></div></CardFooter>
  </Card>;
}

export function ListSkeleton({ rows = 4, label = '불러오는 중', className }: ListSkeletonProps) {
  return <div data-slot="list-skeleton" role="status" aria-busy="true" className={cn('ds-loading-list', className)}>
    <span className="sr-only">{label}</span>
    {Array.from({ length: countOf(rows, 4) }, (_, index) => <div data-slot="list-skeleton-row" className="ds-loading-list-row" key={index}>
      <Skeleton variant="text" width={index % 2 ? '60%' : '80%'} />
    </div>)}
  </div>;
}

export function FormSkeleton({ fields = 3, label = '불러오는 중', className }: FormSkeletonProps) {
  return <div data-slot="form-skeleton" role="status" aria-busy="true" className={cn('ds-loading-form', className)}>
    <span className="sr-only">{label}</span>
    {Array.from({ length: countOf(fields, 3) }, (_, index) => <div data-slot="form-skeleton-field" className="ds-loading-form-field" key={index}>
      <SkeletonText lines={1} textStyle="caption" lastLineWidth="30%" />
      <Skeleton height="var(--control-h-md)" className="ds-loading-form-input" />
    </div>)}
  </div>;
}

export interface ChartSkeletonProps extends SkeletonPatternProps {
  height?: number;
  legend?: boolean;
  variant?: 'plot' | 'bullet';
  rows?: number;
}

export function ChartSkeleton({ height, legend = true, variant = 'plot', rows = 3, label = '불러오는 중', className }: ChartSkeletonProps) {
  const style = height !== undefined && Number.isFinite(height) && height > 0
    ? { '--chart-skeleton-h': `${height}px` } as CSSProperties : undefined;
  return <div data-slot="chart-skeleton" data-variant={variant} style={style} role="status" aria-busy="true" className={cn('ds-loading-chart', className)}>
    <span className="sr-only">{label}</span>
    {legend && <div className="ds-loading-chart-legend"><Skeleton variant="text" textStyle="caption" width="30%" /></div>}
    {/* 실제 차트와 --chart-h-default를 공유하고 TrendBand의 축 여백(좌 44·상 24·하 28)을 보존한다. */}
    {variant === 'bullet' ? <div data-slot="chart-skeleton-bullets" aria-hidden="true">
      {Array.from({ length: countOf(rows, 3) }, (_, index) => <div data-slot="chart-skeleton-bullet-row" className="ds-loading-chart-bullet-row" key={index}>
        <Skeleton variant="text" textStyle="caption" width="30%" />
        <Skeleton height={18} />
      </div>)}
    </div> : <div data-slot="chart-skeleton-plot" className="ds-loading-chart-plot" aria-hidden="true">
      <div className="ds-loading-chart-axis"><Skeleton height="100%" /></div>
    </div>}
  </div>;
}
