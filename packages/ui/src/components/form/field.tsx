import * as React from 'react';
import { CircleAlert } from 'lucide-react';
import { cn } from '../../lib/cn';

type FieldChildProps = React.AriaAttributes & { id?: string; required?: boolean };
export interface FieldProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  label: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  children: React.ReactElement<FieldChildProps>;
}

export function Field({ label, description, error, required, children, className, ...props }: FieldProps) {
  const generatedId = React.useId();
  const child = React.Children.only(children);
  const id = child.props.id ?? generatedId;
  const errorId = `${generatedId}-error`;
  const descriptionId = `${generatedId}-description`;
  const hasError = Boolean(error);
  const describedBy = [...new Set([
    hasError ? errorId : '', description ? descriptionId : '',
    ...(child.props['aria-describedby']?.split(/\s+/) ?? []),
  ].filter(Boolean))].join(' ') || undefined;
  const isRequired = Boolean(required || child.props.required);
  return <div {...props} data-slot="field" className={cn('ds-field', className)}>
    <label data-slot="field-label" htmlFor={id}>{label}{isRequired && <span data-slot="field-required" role="img" aria-label="필수 입력"> *</span>}</label>
    {React.cloneElement(child, {
      id, required: isRequired || undefined,
      'aria-describedby': describedBy,
      'aria-invalid': hasError ? true : child.props['aria-invalid'],
    })}
    {description && <div data-slot="field-description" id={descriptionId}>{description}</div>}
    <div data-slot="field-error" id={errorId} aria-live="polite" aria-atomic="true">
      {hasError && <><CircleAlert aria-hidden="true" /><span>{error}</span></>}
    </div>
  </div>;
}
