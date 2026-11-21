import * as React from 'react';
import * as Primitive from '../../internal/radio-group';
import { cn } from '../../lib/cn';
import { FieldLabelContext } from '../form/field-label-context';

/** 선택·포커스·순환은 Radix의 ARIA 라디오 패턴을 그대로 쓴다. */
export function RadioGroup({ className, ...props }: React.ComponentProps<typeof Primitive.Root>) {
  const fieldLabelId = React.useContext(FieldLabelContext);
  // aria-labelledby가 aria-label보다 우선하므로 소비자가 이름을 주면 Field의 기본 연결을 넣지 않는다.
  const labelledBy = props['aria-labelledby'] ?? (props['aria-label'] === undefined ? fieldLabelId : undefined);
  return <Primitive.Root {...props} aria-labelledby={labelledBy} data-slot="radio-group" className={cn('ds-radio-group', className)} />;
}
export function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof Primitive.Item>) {
  return <Primitive.Item data-form-control="advance" {...props} data-slot="radio-group-item" className={cn('ds-radio-group-item', className)}>
    <Primitive.Indicator data-slot="radio-group-indicator" className="ds-radio-group-indicator" />
  </Primitive.Item>;
}
