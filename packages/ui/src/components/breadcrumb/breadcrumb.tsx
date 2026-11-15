import * as React from 'react';
import { ChevronRight, Ellipsis } from 'lucide-react';
import { Slot } from '../../internal/slot';
import { cn } from '../../lib/cn';

export function Breadcrumb(props: React.ComponentProps<'nav'>) {
  // shadcn 은 "breadcrumb" 를 쓰지만 이 시스템의 보조기기 문구는 전부 한국어다
  // (닫기·필수 입력·범례·달력 열기·알림). 영어 한 개만 남기지 않는다.
  return <nav aria-label="경로" data-slot="breadcrumb" {...props} />;
}
export function BreadcrumbList({ className, ...props }: React.ComponentProps<'ol'>) {
  return <ol data-slot="breadcrumb-list" className={cn('ds-breadcrumb-list', className)} {...props} />;
}
export function BreadcrumbItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="breadcrumb-item" className={cn('ds-breadcrumb-item', className)} {...props} />;
}
export function BreadcrumbLink({ asChild = false, className, ...props }: React.ComponentProps<'a'> & { asChild?: boolean }) {
  const Component = asChild ? Slot : 'a';
  return <Component data-slot="breadcrumb-link" className={cn('ds-breadcrumb-link', className)} {...props} />;
}
export function BreadcrumbPage({ className, ...props }: React.ComponentProps<'span'>) {
  return <span {...props} data-slot="breadcrumb-page" aria-current="page" className={cn('ds-breadcrumb-page', className)} />;
}
export function BreadcrumbSeparator({ className, children, ...props }: React.ComponentProps<'li'>) {
  return <li {...props} data-slot="breadcrumb-separator" role="presentation" aria-hidden="true"
    className={cn('ds-breadcrumb-separator', className)}>{children ?? <ChevronRight />}</li>;
}
export function BreadcrumbEllipsis({ count, className, ...props }: React.ComponentProps<'span'> & { count: number }) {
  return <span {...props} data-slot="breadcrumb-ellipsis" className={cn('ds-breadcrumb-ellipsis', className)}>
    <Ellipsis aria-hidden="true" /><span className="sr-only">생략된 경로 {count}개</span>
  </span>;
}
