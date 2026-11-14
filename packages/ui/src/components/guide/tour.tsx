import * as React from 'react';
import { Button } from '../button';
import { resolveStep, type TourStep } from './resolve-step';
import { useAnchored } from './use-anchored';

export type { TourStep } from './resolve-step';
export type UseTourOptions = {
  steps: TourStep[];
  onFinish?: () => void;
  onSkip?: (atIndex: number) => void;
  onMissingTarget?: 'skip' | 'center';
};
type ActiveStep = { index: number; target: Element | null };

function findTarget(step: TourStep): Element | null {
  try {
    const target = typeof step.target === 'string' ? document.querySelector(step.target) : step.target();
    return target?.isConnected ? target : null;
  } catch { return null; }
}

// 스크롤 중 좌표를 쓰지 않도록 scrollend 미지원 환경에서도 대상 사각형이 안정될 때까지 기다린다.
function revealTarget(target: Element, signal: AbortSignal): Promise<boolean> {
  const rect = target.getBoundingClientRect();
  if (rect.top >= 0 && rect.left >= 0 && rect.bottom <= innerHeight && rect.right <= innerWidth) return Promise.resolve(true);
  target.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  return new Promise((resolve) => {
    let frame = 0;
    let last = target.getBoundingClientRect();
    let stableSince = performance.now();
    const started = stableSince;
    const finish = (ready: boolean) => { cancelAnimationFrame(frame); signal.removeEventListener('abort', abort); resolve(ready); };
    const abort = () => finish(false);
    signal.addEventListener('abort', abort, { once: true });
    const check = (now: number) => {
      if (signal.aborted || !target.isConnected) return finish(false);
      const next = target.getBoundingClientRect();
      if (next.top !== last.top || next.left !== last.left) stableSince = now;
      last = next;
      if (now - stableSince >= 160) return finish(true);
      // 외부 스크롤이 계속되면 오래된 좌표로 열지 않고 종료한다.
      if (now - started > 4000) return finish(false);
      frame = requestAnimationFrame(check);
    };
    frame = requestAnimationFrame(check);
  });
}

export function useTour(options: UseTourOptions) {
  const optionsRef = React.useRef(options);
  optionsRef.current = options;
  const [active, setActive] = React.useState<ActiveStep | null>(null);
  const activeRef = React.useRef<ActiveStep | null>(null);
  const origin = React.useRef<HTMLElement | null>(null);
  const controller = React.useRef<AbortController | null>(null);
  const mounted = React.useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; controller.current?.abort(); origin.current?.focus({ preventScroll: true }); };
  }, []);
  React.useEffect(() => {
    if (options.steps.length > 3 && import.meta.env.DEV) console.warn('[안내] 투어는 3단계를 권장합니다. 완주율은 3단계 72%, 4단계 45%, 7단계 16%입니다 (DESIGN.md 10.1).');
  }, [options.steps.length]);
  const stop = React.useCallback(() => {
    controller.current?.abort();
    activeRef.current = null; setActive(null);
    if (origin.current?.isConnected) origin.current.focus({ preventScroll: true });
  }, []);
  const move = React.useCallback(async (from: number, dir: 1 | -1) => {
    controller.current?.abort();
    const task = new AbortController(); controller.current = task;
    setActive(null);
    const { steps, onMissingTarget = 'skip' } = optionsRef.current;
    let resolved = resolveStep(steps, from, dir, findTarget, onMissingTarget);
    while (resolved) {
      activeRef.current = resolved;
      if (resolved.target) {
        const ready = await revealTarget(resolved.target, task.signal);
        if (task.signal.aborted || !mounted.current) return;
        if (!ready || !resolved.target.isConnected) {
          if (!resolved.target.isConnected) {
            resolved = resolveStep(steps, resolved.index, dir, findTarget, onMissingTarget);
            continue;
          }
          stop(); return;
        }
      }
      if (!task.signal.aborted && mounted.current) setActive(resolved);
      return;
    }
    if (!task.signal.aborted) { stop(); if (dir === 1) optionsRef.current.onFinish?.(); }
  }, [stop]);
  const start = React.useCallback(() => {
    if (!activeRef.current) origin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    void move(0, 1);
  }, [move]);
  const next = React.useCallback(() => { if (activeRef.current) void move(activeRef.current.index + 1, 1); }, [move]);
  const previous = React.useCallback(() => { if (activeRef.current) void move(activeRef.current.index - 1, -1); }, [move]);
  const skip = React.useCallback(() => {
    const index = activeRef.current?.index;
    stop();
    if (index !== undefined) optionsRef.current.onSkip?.(index);
  }, [stop]);
  return { steps: options.steps, active, start, next, previous, skip };
}
export type TourProps = ReturnType<typeof useTour>;

export function Tour({ steps, active, next, previous, skip }: TourProps) {
  const id = React.useId();
  const step = active ? steps[active.index] : undefined;
  const { bubbleRef } = useAnchored({ target: active?.target ?? null, open: !!step, onClose: skip, dialog: true, ring: true });
  return <div ref={bubbleRef} data-slot="guide-bubble" className="p-0" popover="manual" role="dialog" tabIndex={-1}
    aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`}>
    {step && <div data-slot="guide-hint" style={{ borderRadius: 'inherit' }}>
      <div className="flex items-start justify-between gap-4"><h2 id={`${id}-title`} className="font-semibold">{step.title}</h2>
        <Button size="sm" variant="ghost" aria-label="닫기" onClick={skip}>×</Button></div>
      <p id={`${id}-body`} className="mt-2">{step.body}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="tabular" aria-label="진행 단계">{active!.index + 1} / {steps.length}</span>
        <Button size="sm" variant="ghost" onClick={skip}>건너뛰기</Button>
        <Button size="sm" disabled={active!.index === 0} onClick={previous}>이전</Button>
        <Button size="sm" variant="primary" onClick={next}>{active!.index === steps.length - 1 ? '완료' : '다음'}</Button>
      </div>
    </div>}
  </div>;
}
