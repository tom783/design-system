import type { ReactNode, MouseEvent } from 'react';
import { CircleAlert, Inbox } from 'lucide-react';
import { Button } from '../button';
import { cn } from '../../lib/cn';

/**
 * 보조 행동. `href` 를 주면 링크로 그린다(목록·안내 문서처럼 다른 화면으로 가는 행동). `onClick` 은 둘 다에서 불린다 —
 * 앱 라우터로 옮길 때는 `href` 를 주고 `onClick` 에서 기본 이동을 막는다.
 */
export interface StateAction {
  label: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  href?: string;
}

export interface EmptyStateProps {
  title: string;
  /** 설명. 대상 이름처럼 굵게 둘 말은 `<strong>` 으로 넘긴다. */
  description?: ReactNode;
  graphic?: ReactNode;
  /** 주 행동. 타입은 그대로다 — DataTable `emptyAction` 이 이 타입을 쓴다(MCP 기준선 고정 · DESIGN.md §13). */
  action?: { label: string; onClick: () => void };
  /** 보조 행동(ghost). `size="page"` 에서 주 행동 옆에 둔다. */
  secondaryAction?: StateAction;
  /**
   * `page` 는 본문 전체를 대신하는 화면(권한 없음·찾을 수 없음)이다 — 위 96 · 최대 폭 480 · 아이콘 40 · 제목 h1(body-lg 600) ·
   * 주 행동 primary. 기본은 표·차트·목록 자리를 채운다(DESIGN.md §14.6).
   */
  size?: 'default' | 'page';
  className?: string;
}
export interface ErrorStateProps {
  title: string;
  description?: ReactNode;
  graphic?: ReactNode;
  onRetry?: () => void;
  /** 보조 행동(ghost). `size="page"` 에서 다시 시도 옆에 둔다. */
  secondaryAction?: StateAction;
  /** `page` 는 본문 전체를 대신하는 화면이다(EmptyState 와 같은 치수). */
  size?: 'default' | 'page';
  className?: string;
}

function ActionButton({ action, variant, size }: { action: StateAction; variant: 'primary' | 'secondary' | 'ghost'; size: 'sm' | 'md' }) {
  if (action.href) return <Button asChild variant={variant} size={size}><a href={action.href} onClick={action.onClick}>{action.label}</a></Button>;
  return <Button variant={variant} size={size} onClick={action.onClick}>{action.label}</Button>;
}

/** 기본 크기는 지금 모양(secondary sm 하나)을 그대로 둔다. 페이지 크기만 주(primary md) + 보조(ghost md)다(규격 8절). */
function Actions({ primary, secondary, page }: { primary?: StateAction; secondary?: StateAction; page: boolean }) {
  if (!primary && !secondary) return null;
  if (!page) return <>
    {primary && <ActionButton action={primary} variant="secondary" size="sm" />}
    {secondary && <ActionButton action={secondary} variant="ghost" size="sm" />}
  </>;
  // data-slot 을 달지 않는다 — 상태 화면을 품은 DataTable 의 슬롯 목록이 MCP 기준선(R28)으로 고정돼 있다. 덮어쓰기는 클래스로.
  return <div className="ds-state-actions">
    {primary && <ActionButton action={primary} variant="primary" size="md" />}
    {secondary && <ActionButton action={secondary} variant="ghost" size="md" />}
  </div>;
}

/** 페이지 크기의 제목은 그 화면의 h1 이다 — 셸 안 본문 자리를 통째로 대신하므로 PageHeader 가 따로 없다. */
function Title({ page, children }: { page: boolean; children: string }) {
  return page ? <h1 data-slot="state-title">{children}</h1> : <p data-slot="state-title">{children}</p>;
}

export function EmptyState({ title, description, graphic, action, secondaryAction, size = 'default', className }: EmptyStateProps) {
  const page = size === 'page';
  return <div data-slot="empty-state" data-size={size} role="status" className={cn('ds-state', className)}>
    <div data-slot="state-graphic" aria-hidden="true">{graphic ?? <Inbox size={page ? 40 : 20} />}</div>
    <Title page={page}>{title}</Title>
    {description && <p data-slot="state-description">{description}</p>}
    <Actions primary={action} secondary={secondaryAction} page={page} />
  </div>;
}

export function ErrorState({ title, description, graphic, onRetry, secondaryAction, size = 'default', className }: ErrorStateProps) {
  const page = size === 'page';
  return <div data-slot="error-state" data-size={size} role="alert" className={cn('ds-state ds-state-error', className)}>
    <div data-slot="state-graphic" aria-hidden="true">{graphic ?? <CircleAlert size={page ? 40 : 20} />}</div>
    <Title page={page}>{title}</Title>
    {description && <p data-slot="state-description">{description}</p>}
    <Actions primary={onRetry ? { label: '다시 시도', onClick: onRetry } : undefined} secondary={secondaryAction} page={page} />
  </div>;
}
