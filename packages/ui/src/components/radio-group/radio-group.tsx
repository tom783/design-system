import * as React from 'react';
import * as Primitive from '../../internal/radio-group';
import { cn } from '../../lib/cn';

/** 선택·포커스·순환은 Radix의 ARIA 라디오 패턴을 그대로 쓴다. */
export function RadioGroup({ className, ...props }: React.ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root {...props} data-slot="radio-group" className={cn('ds-radio-group', className)} />;
}
export function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof Primitive.Item>) {
  return <Primitive.Item {...props} data-slot="radio-group-item" className={cn('ds-radio-group-item', className)}>
    <Primitive.Indicator data-slot="radio-group-indicator" className="ds-radio-group-indicator" />
  </Primitive.Item>;
}
