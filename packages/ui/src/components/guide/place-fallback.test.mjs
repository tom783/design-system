import test from 'node:test';
import assert from 'node:assert/strict';
import { placeFallback } from './place-fallback.ts';
const viewport = { width: 500, height: 500 };
const tip = { width: 100, height: 60 };
const opts = { gap: 8, pad: 8 };
for (const [name, target, size, view, expected] of [
  ['위아래 여유', { top: 200, left: 200, width: 40, height: 40 }, tip, viewport, { x: 170, y: 248, placement: 'bottom' }],
  ['하단 뒤집기', { top: 460, left: 200, width: 40, height: 40 }, tip, viewport, { x: 170, y: 392, placement: 'top' }],
  ['위아래 부족', { top: 20, left: 200, width: 40, height: 40 }, { width: 100, height: 500 }, viewport, { x: 170, y: 8, placement: 'top' }],
  ['좌측 경계', { top: 200, left: 0, width: 20, height: 20 }, tip, viewport, { x: 8, y: 228, placement: 'bottom' }],
  ['우측 경계', { top: 200, left: 480, width: 20, height: 20 }, tip, viewport, { x: 392, y: 228, placement: 'bottom' }],
  ['뷰포트보다 넓음', { top: 200, left: 0, width: 20, height: 20 }, { width: 600, height: 60 }, viewport, { x: 8, y: 228, placement: 'bottom' }],
]) test(name, () => {
  const result = placeFallback(target, size, view, opts);
  assert.deepEqual(result, expected);
  assert.ok(Number.isFinite(result.x) && Number.isFinite(result.y));
});
test('작은 뷰포트·큰 말풍선에서도 좌표가 유한하다', () => {
  for (const width of [0, 1, 100, 1000]) for (const height of [0, 1, 100, 1000]) {
    const result = placeFallback({ top: 0, left: 0, width: 0, height: 0 }, tip, { width, height }, opts);
    assert.ok(Number.isFinite(result.x) && Number.isFinite(result.y));
    assert.ok(result.x >= opts.pad && result.y >= opts.pad);
  }
});
