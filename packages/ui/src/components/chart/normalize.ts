/** 음수·비정상 값은 구성비를 가질 수 없으므로 0으로 취급한다. */
export function nonNegative(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

/** 합계 0은 비율이 정의되지 않는다. 호출자가 공백 구간으로 처리하도록 null을 반환한다. */
export function normalizePercentages(values: readonly number[]): number[] | null {
  const safe = values.map(nonNegative);
  const largest = Math.max(0, ...safe);
  if (largest === 0) return null;
  // 큰 절대 건수의 합계가 Infinity가 되는 경우에도 비율 계산을 보존한다.
  const scaled = safe.map((value) => value / largest);
  const total = scaled.reduce((sum, value) => sum + value, 0);
  return scaled.map((value) => value / total * 100);
}

export function isBulletAchieved(actual: number, target: number, lowerIsBetter = false): boolean {
  if (!Number.isFinite(actual) || !Number.isFinite(target)) return false;
  return lowerIsBetter ? actual <= target : actual >= target;
}
