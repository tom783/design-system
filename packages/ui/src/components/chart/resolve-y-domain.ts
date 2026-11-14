import { scaleLinear } from '@visx/scale';

type YDomain = 'auto' | 'zero' | [number, number];
type DomainPoint = { value: number; low?: number; high?: number };

/** 유효한 시점의 y축 범위만 계산해 렌더링 없이 축 규칙을 검증한다. */
export function resolveYDomain(points: readonly DomainPoint[], mode: YDomain = 'auto'): [number, number] {
  if (Array.isArray(mode)) {
    const low = Math.min(...mode);
    const high = Math.max(...mode);
    return high === low ? [low - 0.5, low + 0.5] : [low, high];
  }
  if (!points.length) return [0, 1];

  let low = Math.min(...points.map((d) => d.low ?? d.value));
  let high = Math.max(...points.map((d) => d.high ?? d.value));
  if (mode === 'zero') {
    // 0 포함 모드는 값과 밴드를 모두 포괄하는 기존 범위를 유지한다.
    low = Math.min(0, low, ...points.map((d) => d.value));
    high = Math.max(0, high, ...points.map((d) => d.value));
    return scaleLinear({ domain: [low, high === low ? low + 1 : high], nice: true }).domain() as [number, number];
  }

  const flat = high === low;
  const center = low;
  // 변화가 없을 때도 폭 1을 확보하되 양쪽에 나눠 선을 중앙에 둔다.
  if (flat) { low -= 0.5; high += 0.5; }
  // 선·상하한 밴드는 변화가 읽히도록 데이터 범위의 양쪽에 각각 8%만 더한다.
  const padding = (high - low) * 0.08;
  const domain = scaleLinear({ domain: [low - padding, high + padding], nice: true }).domain() as [number, number];
  if (flat) {
    // nice가 한쪽만 더 넓혀도 동일값의 중앙 위치는 보존한다.
    const radius = Math.max(center - domain[0], domain[1] - center);
    return [center - radius, center + radius];
  }
  return domain;
}
