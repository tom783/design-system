import { useId } from 'react';
import { cn } from '../../lib/cn';
import { progressEta, progressValue } from './progress-state';
import './loading.css';

export interface ProgressTrackProps {
  /** 0~1. 생략하면 불확정 진행률. */
  value?: number;
  label: string;
  etaSeconds?: number;
  className?: string;
}

export function ProgressTrack({ value, label, etaSeconds, className }: ProgressTrackProps) {
  const id = useId();
  const normalized = progressValue(value);
  const percent = normalized === undefined ? undefined : Math.round(normalized * 100);
  const eta = progressEta(etaSeconds);
  return <div data-slot="progress-track" className={cn('loading-progress', className)}>
    <div className="loading-progress-labels">
      <span id={`${id}-label`} className="loading-progress-label" title={label}>{label}</span>
      {percent !== undefined && <span data-slot="progress-percent" className="loading-progress-percent tabular">{percent}%</span>}
    </div>
    <div data-slot="progress-bar" className="loading-progress-bar" role="progressbar"
      aria-labelledby={`${id}-label`} aria-describedby={eta ? `${id}-eta` : undefined}
      aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <span data-slot="progress-fill" className="loading-progress-fill" data-indeterminate={normalized === undefined || undefined}
        style={normalized === undefined ? undefined : { width: `${normalized * 100}%` }} />
    </div>
    {eta && <span id={`${id}-eta`} data-slot="progress-eta" className="loading-progress-eta">{eta}</span>}
  </div>;
}
