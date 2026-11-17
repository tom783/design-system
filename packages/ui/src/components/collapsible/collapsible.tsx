import * as React from 'react';
import * as Primitive from '../../internal/collapsible';
import { cn } from '../../lib/cn';

export function Collapsible(props: React.ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root data-slot="collapsible" {...props} />;
}

/** 라벨은 앱이 맥락에 맞게 제공한다. ARIA·상태는 Radix가 소유한다. */
export function CollapsibleTrigger({ className, ...props }: React.ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Trigger data-slot="collapsible-trigger" className={cn('ds-collapsible-trigger', className)} {...props} />;
}

export function CollapsibleContent({ className, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Content data-slot="collapsible-content" className={cn('ds-collapsible-content', className)} {...props} />;
}
