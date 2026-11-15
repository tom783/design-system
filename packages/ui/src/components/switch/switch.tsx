import * as React from 'react';
import * as Primitive from '../../internal/switch';
import { cn } from '../../lib/cn';

/** 저장 대기 폼에는 Checkbox를 쓴다. Switch는 누르는 즉시 적용하는 설정이다. */
export function Switch({ className, ...props }: React.ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root {...props} data-slot="switch" className={cn('ds-switch', className)}>
    <Primitive.Thumb data-slot="switch-thumb" className="ds-switch-thumb" />
  </Primitive.Root>;
}
