import type { ComponentProps } from 'react';
import { Check, TriangleAlert } from 'lucide-react';
import { cn } from '../../lib/cn';

export type StepStatus = 'complete' | 'current' | 'upcoming' | 'error';
export interface StepItem {
  label: string;
  description?: string;
  /** 오류만 자동 계산 상태보다 우선한다. */
  status?: 'error';
}
export interface StepsProps extends Omit<ComponentProps<'div'>, 'children'> {
  steps: readonly StepItem[];
  /** steps 배열과 같은 0 기준 인덱스. */
  current: number;
  onStepClick?: (index: number) => void;
}

const statusText: Record<StepStatus, string> = {
  complete: '완료', current: '진행 중', upcoming: '예정', error: '오류',
};

export function Steps({ steps, current, onStepClick, className, ...props }: StepsProps) {
  // 잘못된 외부 인덱스도 현재 위치를 하나만 남긴다. 외부 상태는 변경하지 않는다.
  const active = Math.min(steps.length - 1, Math.max(0, Number.isFinite(current) ? Math.trunc(current) : 0));
  return <div {...props} data-slot="steps" className={cn('ds-steps', className)}>
    <ol data-slot="steps-list" aria-label={`진행 단계, 총 ${steps.length}단계`}>
      {steps.map((step, index) => {
        const status: StepStatus = step.status ?? (index < active ? 'complete' : index === active ? 'current' : 'upcoming');
        const name = `${index + 1}단계 ${step.label}, ${statusText[status]}`;
        const content = <>
          <span data-slot="steps-marker" aria-hidden="true">
            {status === 'complete' ? <Check /> : status === 'error' ? <TriangleAlert /> : index + 1}
          </span>
          <span data-slot="steps-content">
            <span data-slot="steps-heading">
              <span data-slot="steps-count" aria-hidden="true" className="tabular">{index + 1} / {steps.length} · </span>
              <span data-slot="steps-label" title={step.label}>{step.label}</span>
            </span>
            <span data-slot="steps-status">{statusText[status]}</span>
            {step.description && <span data-slot="steps-description" title={step.description}>{step.description}</span>}
          </span>
        </>;
        return <li key={index} data-slot="steps-item" data-status={status}
          aria-current={index === active ? 'step' : undefined} aria-label={name}>
          {status === 'complete' && index < active && onStepClick
            ? <button type="button" data-slot="steps-button" aria-label={name} onClick={() => onStepClick(index)}>{content}</button>
            : <div data-slot="steps-static">{content}</div>}
        </li>;
      })}
    </ol>
  </div>;
}
