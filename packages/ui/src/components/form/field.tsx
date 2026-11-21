import * as React from 'react';
import { CircleAlert } from 'lucide-react';
import { cn } from '../../lib/cn';
import { FieldErrorContext } from './field-error-context';
import { FieldLabelContext } from './field-label-context';

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
  const labelId = `${generatedId}-label`;
  const errorId = `${generatedId}-error`;
  const descriptionId = `${generatedId}-description`;
  const hasError = Boolean(error);
  const [errorContainer, setErrorContainer] = React.useState<HTMLDivElement | null>(null);
  // DESIGN.md 11.4: 시각 순서와 달리 급한 오류를 먼저 읽도록 aria-describedby는 오류 → 설명 순서를 유지한다.
  const describedBy = [...new Set([
    hasError ? errorId : '', description ? descriptionId : '',
    ...(child.props['aria-describedby']?.split(/\s+/) ?? []),
  ].filter(Boolean))].join(' ') || undefined;
  const isRequired = Boolean(required || child.props.required);
  return <div {...props} data-slot="field" className={cn('ds-field', className)}>
    <label data-slot="field-label" id={labelId} htmlFor={id}>{label}{isRequired && <span data-slot="field-required" role="img" aria-label="필수 입력"> *</span>}</label>
    {description && <div data-slot="field-description" id={descriptionId}>{description}</div>}
    <FieldLabelContext.Provider value={labelId}>
      <FieldErrorContext.Provider value={{ id: errorId, container: errorContainer, hasError }}>
        {React.cloneElement(child, {
          id, required: isRequired || undefined,
          'aria-describedby': describedBy,
          'aria-invalid': hasError ? true : child.props['aria-invalid'],
        })}
      </FieldErrorContext.Provider>
    </FieldLabelContext.Provider>
    <div ref={setErrorContainer} data-slot="field-error" id={errorId} aria-live="polite" aria-atomic="true">
      {hasError && <><CircleAlert aria-hidden="true" /><span>{error}</span></>}
    </div>
  </div>;
}
