export type Rect = { top: number; left: number; width: number; height: number };
export type Placement = 'top' | 'bottom';

/** @deprecated 다음 마이너에서 공개 API에서 뺀다. 위치는 Tooltip·Hint·Tour가 정한다. */
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
