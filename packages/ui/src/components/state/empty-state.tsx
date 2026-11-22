import type { ReactNode } from 'react';
import { CircleAlert, Inbox } from 'lucide-react';
import { Button } from '../button';
import { cn } from '../../lib/cn';

export interface EmptyStateProps {
  title: string;
  description?: string;
  graphic?: ReactNode;
  action?: { label: string; onClick: () => void };
  className?: string;
}
export interface ErrorStateProps {
  title: string;
  description?: string;
  graphic?: ReactNode;
  onRetry?: () => void;
  className?: string;
}

export function EmptyState({ title, description, graphic, action, className }: EmptyStateProps) {
  return <div data-slot="empty-state" role="status" className={cn('ds-state', className)}>
    <div data-slot="state-graphic" aria-hidden="true">{graphic ?? <Inbox size={20} />}</div>
    <p data-slot="state-title">{title}</p>
    {description && <p data-slot="state-description">{description}</p>}
    {action && <Button variant="secondary" size="sm" onClick={action.onClick}>{action.label}</Button>}
  </div>;
}

export function ErrorState({ title, description, graphic, onRetry, className }: ErrorStateProps) {
  return <div data-slot="error-state" role="alert" className={cn('ds-state ds-state-error', className)}>
    <div data-slot="state-graphic" aria-hidden="true">{graphic ?? <CircleAlert size={20} />}</div>
    <p data-slot="state-title">{title}</p>
    {description && <p data-slot="state-description">{description}</p>}
    {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>다시 시도</Button>}
  </div>;
}
