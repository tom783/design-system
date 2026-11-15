import * as React from 'react';
import * as Primitive from '../../internal/label';
import { cn } from '../../lib/cn';

export interface LabelProps extends React.ComponentProps<typeof Primitive.Root> {
  required?: boolean;
}
/** Field를 쓰지 않는 가로 배치 컨트롤 이름. Field의 레이아웃·오류 처리는 별도로 유지한다. */
export function Label({ className, required, children, ...props }: LabelProps) {
  return <Primitive.Root {...props} data-slot="label" className={cn('ds-label', className)}>
    {children}{required && <span data-slot="label-required" role="img" aria-label="필수 입력"> *</span>}
  </Primitive.Root>;
}
