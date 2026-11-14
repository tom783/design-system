import type { CSSProperties } from 'react';
import { cn } from '../../lib/cn';
import './loading.css';

export type SkeletonTextStyle = 'caption' | 'body-sm' | 'body' | 'title';
export interface SkeletonProps {
  /** text는 행간 대신 글자 높이(0.65em)를 칠한다. */
  variant?: 'text' | 'block' | 'circle';
  width?: string | number;
  height?: string | number;
  textStyle?: SkeletonTextStyle;
  animation?: 'pulse' | 'shimmer' | 'none';
  className?: string;
}

export function Skeleton({ variant = 'block', width, height, textStyle = 'body-sm', animation = 'pulse', className }: SkeletonProps) {
  return <span data-slot="skeleton" data-variant={variant} data-animation={animation} aria-hidden="true"
    className={cn('loading-skeleton', className)} style={{
      width, height: variant === 'text' ? `calc(var(--text-${textStyle}) * 0.65)` : height,
    }} />;
}

export interface SkeletonTextProps {
  lines?: number;
  textStyle?: SkeletonTextStyle;
  lastLineWidth?: string;
  className?: string;
}

export function SkeletonText({ lines = 3, textStyle = 'body-sm', lastLineWidth = '60%', className }: SkeletonTextProps) {
  const count = Number.isFinite(lines) ? Math.max(0, Math.floor(lines)) : 3;
  return <div data-slot="skeleton-text" aria-hidden="true" className={cn('loading-text', className)}
    style={{ '--loading-line-height': `var(--text-${textStyle}-lh)` } as CSSProperties}>
    {Array.from({ length: count }, (_, index) => <div data-slot="skeleton-text-line" key={index} className="loading-text-line">
      <Skeleton variant="text" textStyle={textStyle} width={index === count - 1 ? lastLineWidth : '100%'} />
    </div>)}
  </div>;
}
