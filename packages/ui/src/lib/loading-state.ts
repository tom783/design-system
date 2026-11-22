export type LoadingPhase = 'idle' | 'waiting' | 'visible';

export interface LoadingInput {
  phase: LoadingPhase;
  isLoading: boolean;
  now: number;
  startedAt: number | null;
  shownAt: number | null;
  delay: number;
  minVisible: number;
}

/**
 * at은 반환된 단계에 진입한 시각이다. idle은 시각을 보관하지 않는다.
 * @deprecated 다음 마이너에서 공개 API에서 뺀다. 로딩 표시 지연은 useDelayedLoading을 쓴다.
 */
export function nextPhase({ phase, isLoading, now, startedAt, shownAt, delay, minVisible }: LoadingInput): {
  phase: LoadingPhase; at: number | null;
} {
  if (phase === 'idle') return isLoading ? { phase: 'waiting', at: now } : { phase: 'idle', at: null };
  if (phase === 'waiting') {
    // 완료 판정을 먼저 해야 지연 경계에 도착한 빠른 응답도 로더를 띄우지 않는다.
    if (!isLoading) return { phase: 'idle', at: null };
    const at = startedAt ?? now;
    return now - at >= delay ? { phase: 'visible', at: now } : { phase: 'waiting', at };
  }
  const at = shownAt ?? now;
  return !isLoading && now - at >= minVisible ? { phase: 'idle', at: null } : { phase: 'visible', at };
}
