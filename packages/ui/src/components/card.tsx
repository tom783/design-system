import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * 카드
 *
 * 설계 근거 — A 정밀 플랫
 * - 그림자를 쓰지 않는다. 경계선과 배경 명도 차이로만 면을 분리한다.
 *   행이 1,000개로 늘어나도 시각 비용이 선형으로만 증가하는 것이 이 선택의 이유다.
 *   그림자는 떠 있는 레이어(팝오버·모달)에만 `--shadow-overlay` 로 허용한다.
 * - 최소 너비 240px. 좁은 컨테이너에서 카드 내부 내용이 겹치지 않는 하한값.
 */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'min-w-[var(--card-min-w)] rounded-[var(--radius-lg)]',
        'border border-line-strong bg-surface',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-header"
      className={cn('flex items-center justify-between gap-3 p-4 pb-2.5', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      data-slot="card-title"
      className={cn(
        'text-[length:var(--text-body-lg)] leading-[var(--text-body-lg-lh)]',
        'font-semibold text-fg',
        className,
      )}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-body" className={cn('p-4 pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center justify-between gap-3 border-t border-line px-4 py-2.5',
        'text-[length:var(--text-caption)] text-fg-muted',
        className,
      )}
      {...props}
    />
  );
}
