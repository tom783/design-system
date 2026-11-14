import { useEffect, useRef, useState } from 'react';
import tokens from '../../../../docs/research/tokens.json';
import { nextPhase, type LoadingPhase } from './loading-state';

export interface DelayedLoadingOptions { delay?: number; minVisible?: number }

function duration(name: keyof typeof tokens.loading): number {
  // CSS 덮어쓰기를 존중하며 SSR·스타일 미주입 환경도 생성된 토큰을 기본값으로 쓴다.
  const css = typeof document === 'undefined' ? '' : getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  const value = css || tokens.loading[name];
  const parsed = Number.parseFloat(value) * (value.endsWith('ms') ? 1 : 1000);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.parseFloat(tokens.loading[name]);
}

export function useDelayedLoading(isLoading: boolean, opts: DelayedLoadingOptions = {}): boolean {
  const [visible, setVisible] = useState(false);
  const state = useRef<{ phase: LoadingPhase; at: number | null }>({ phase: 'idle', at: null });
  const delay = opts.delay;
  const minVisible = opts.minVisible;

  useEffect(() => {
    const safe = (value: number | undefined, fallback: number) => value !== undefined && Number.isFinite(value) ? Math.max(0, value) : fallback;
    const wait = safe(delay, duration('loading-delay'));
    const minimum = safe(minVisible, duration('loading-min-visible'));
    let timer: ReturnType<typeof setTimeout> | undefined;
    const advance = () => {
      const now = performance.now();
      const current = state.current;
      const next = nextPhase({
        phase: current.phase, isLoading, now,
        startedAt: current.phase === 'waiting' ? current.at : null,
        shownAt: current.phase === 'visible' ? current.at : null,
        delay: wait, minVisible: minimum,
      });
      state.current = next;
      setVisible(next.phase === 'visible');
      const remaining = next.phase === 'waiting' ? wait - (now - next.at!)
        : next.phase === 'visible' && !isLoading ? minimum - (now - next.at!) : null;
      if (remaining !== null) timer = setTimeout(advance, Math.max(0, remaining));
    };
    advance();
    // 입력 변경·StrictMode 재실행·언마운트 모두 같은 타이머 정리 경로를 쓴다.
    return () => { if (timer !== undefined) clearTimeout(timer); };
  }, [isLoading, delay, minVisible]);

  return visible;
}
