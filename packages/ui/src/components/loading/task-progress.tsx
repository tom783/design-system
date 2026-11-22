import { useId } from 'react';
import { Check, Circle, ArrowRight } from 'lucide-react';
import { Button } from '../button';
import { cn } from '../../lib/cn';
import { ProgressTrack } from './progress-track';

export interface TaskProgressProps {
  title: string;
  value?: number;
  steps?: { label: string; done: boolean }[];
  etaSeconds?: number;
  onDismiss?: () => void;
  className?: string;
}

export function TaskProgress({ title, value, steps = [], etaSeconds, onDismiss, className }: TaskProgressProps) {
  const titleId = useId();
  const current = steps.findIndex((step) => !step.done);
  return <section data-slot="task-progress" className={cn('ds-loading-task', className)} aria-labelledby={titleId}>
    <h3 id={titleId} className="ds-loading-task-title" title={title}>{title}</h3>
    {steps.length > 0 && <ol data-slot="task-steps" className="ds-loading-task-steps" aria-label="작업 단계">
      {steps.map((step, index) => <li key={index} data-slot="task-step" data-done={step.done || undefined}
        aria-current={index === current ? 'step' : undefined} className="ds-loading-task-step">
        {step.done ? <Check aria-hidden="true" /> : index === current ? <ArrowRight aria-hidden="true" /> : <Circle aria-hidden="true" />}
        <span className="min-w-0 break-words">{step.label}</span>
        <span className="ds-loading-task-step-state">{step.done ? '완료' : index === current ? '진행 중' : '대기'}</span>
      </li>)}
    </ol>}
    <ProgressTrack value={value} label={current >= 0 ? `${steps[current]!.label} 처리 중` : steps.length > 0 ? '모든 단계 완료' : `${title} 진행률`} etaSeconds={etaSeconds} />
    {/* 문서가 처리 대기열에서 결과 더미로 이동한다. 임의의 장식 대신 일괄 처리의 흐름을 설명한다. */}
    <svg data-slot="task-motion" className="ds-loading-task-motion" viewBox="0 0 160 56" width="160" height="56" aria-hidden="true" focusable="false">
      <path d="M12 48H148 M20 40H48 M112 40H140 M112 36H140" fill="none" stroke="var(--chart-axis)" />
      <rect x="20" y="12" width="28" height="24" rx="2" fill="var(--skeleton-bg)" />
      <rect x="112" y="12" width="28" height="20" rx="2" fill="var(--skeleton-bg)" />
      <g data-slot="task-document" className="ds-loading-task-document">
        <rect x="20" y="8" width="28" height="24" rx="2" fill="var(--progress-fill)" />
        <path d="M27 16H41 M27 22H37" fill="none" stroke="var(--skeleton-bg)" />
      </g>
    </svg>
    {onDismiss && <Button onClick={onDismiss} className="self-start max-w-full">백그라운드로 보내기</Button>}
  </section>;
}
