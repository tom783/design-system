export function statValue(value: string | number, format?: Intl.NumberFormatOptions, unit = '', compactValue?: string) {
  if (typeof value === 'string') return { full: value + unit, display: (compactValue ?? value) + unit };
  if (!Number.isFinite(value)) return null;
  const full = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 20, ...format, notation: 'standard' }).format(value) + unit;
  // 200px 타일의 내용 폭은 166px. 십억 단위의 원문은 이를 넘으므로 만·억·조로 통일한다.
  const display = new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 1, notation: Math.abs(value) >= 10_000 ? 'compact' : 'standard', ...format,
  }).format(value) + unit;
  return { full, display };
}

export function statDelta(delta: number, goodDirection: 'up' | 'down' | 'none', format: 'percent' | 'absolute', unit: string) {
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'none';
  const tone = direction === 'none' || goodDirection === 'none' ? 'neutral' : direction === goodDirection ? 'success' : 'danger';
  const magnitude = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 20 }).format(Math.abs(delta));
  const suffix = format === 'percent' ? '%' : unit;
  return { direction, tone, display: `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${magnitude}${suffix}`,
    spoken: direction === 'none' ? `${magnitude}${suffix} 변동 없음` : `${magnitude}${suffix} ${direction === 'up' ? '증가' : '감소'}` };
}
