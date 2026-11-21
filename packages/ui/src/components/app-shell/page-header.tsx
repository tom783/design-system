import * as React from 'react';
import { cn } from '../../lib/cn';

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title' | 'children'> {
  title: string;
  description?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  status?: React.ReactNode;
  actions?: React.ReactNode;
}
export function PageHeader({ title, description, breadcrumb, status, actions, className, ...props }: PageHeaderProps) {
  return <header {...props} data-slot="page-header" className={cn('ds-page-header', className)}>
    {breadcrumb != null && <div data-slot="page-header-breadcrumb">{breadcrumb}</div>}
    <div className="ds-page-header-row">
      <div className="ds-page-header-copy">
        <div className="ds-page-header-heading">
          <h1 data-slot="page-header-title">{title}</h1>
          {status != null && <div data-slot="page-header-status">{status}</div>}
        </div>
        {description != null && <div data-slot="page-header-description" className="ds-page-header-description">{description}</div>}
      </div>
      {actions != null && <div data-slot="page-header-actions" className="ds-page-header-actions">{actions}</div>}
    </div>
  </header>;
}
