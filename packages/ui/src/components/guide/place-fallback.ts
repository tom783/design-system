export type Rect = { top: number; left: number; width: number; height: number };
export type Placement = 'top' | 'bottom';

/** 내부 — useAnchored 의 앵커 위치 지원이 없을 때의 위치 계산. 0.6.0 에서 공개 API 에서 뺐다(0.4.0 예고). */
export function placeFallback(
  target: Rect,
  tip: { width: number; height: number },
  viewport: { width: number; height: number },
  opts: { gap: number; pad: number },
): { x: number; y: number; placement: Placement } {
  const { gap, pad } = opts;
  const below = target.top + target.height + gap;
  const above = target.top - gap - tip.height;
  const fitsBelow = below + tip.height + pad <= viewport.height;
  const y = fitsBelow ? below : Math.max(pad, above);
  const x = Math.min(
    Math.max(pad, target.left + target.width / 2 - tip.width / 2),
    Math.max(pad, viewport.width - tip.width - pad),
  );
  return { x, y, placement: fitsBelow ? 'bottom' : 'top' };
}
