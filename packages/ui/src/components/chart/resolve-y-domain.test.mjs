import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveYDomain } from './resolve-y-domain.ts';

test('auto: 밴드의 최저·최고에 각각 8% 여유를 더하고 눈금을 보정한다', () => {
  assert.deepEqual(resolveYDomain([{ value: 25, low: 20, high: 30 }, { value: 35, low: 30, high: 40 }], 'auto'), [18, 42]);
});

test('auto 기본값: 밴드가 없으면 값의 범위로 프레이밍한다', () => {
  assert.deepEqual(resolveYDomain([{ value: 10 }, { value: 20 }]), [9, 21]);
});

test('zero: 기존처럼 0·값·밴드를 모두 포함한다', () => {
  assert.deepEqual(resolveYDomain([{ value: 10 }, { value: 20 }], 'zero'), [0, 20]);
  assert.deepEqual(resolveYDomain([{ value: -20 }, { value: -10 }], 'zero'), [-20, 0]);
  assert.deepEqual(resolveYDomain([{ value: 30, low: 10, high: 20 }], 'zero'), [0, 30]);
  assert.deepEqual(resolveYDomain([{ value: 0 }], 'zero'), [0, 1]);
});

test('직접 지정한 튜플에는 여유나 nice를 적용하지 않는다', () => {
  const mode = [1.23, 9.87];
  assert.deepEqual(resolveYDomain([{ value: 5 }], mode), [1.23, 9.87]);
  assert.deepEqual(mode, [1.23, 9.87]);
});

test('뒤집힌 튜플은 정렬한다', () => {
  assert.deepEqual(resolveYDomain([{ value: 5 }], [9.87, 1.23]), [1.23, 9.87]);
});

test('동일값: 양수·0·음수·소수와 단일 시점도 유한한 범위의 중앙에 놓인다', () => {
  for (const value of [1284, 0, -120, 1.23]) {
    for (const points of [[{ value }], [{ value }, { value }], [{ value, low: value, high: value }]]) {
      const [low, high] = resolveYDomain(points);
      assert.ok(Number.isFinite(low) && Number.isFinite(high) && high > low);
      assert.ok(Math.abs((value - low) / (high - low) - 0.5) < 1e-10);
    }
  }
  assert.deepEqual(resolveYDomain([{ value: 5 }], [5, 5]), [4.5, 5.5]);
});

test('전부 음수: 0을 강제하지 않고 밴드 범위 양쪽에 여유를 둔다', () => {
  assert.deepEqual(resolveYDomain([{ value: -180, low: -200, high: -160 }, { value: -120, low: -140, high: -100 }]), [-210, -90]);
  assert.deepEqual(resolveYDomain([{ value: -200 }, { value: -100 }]), [-210, -90]);
});

test('빈 데이터는 유한한 기본 범위를 반환한다', () => {
  assert.deepEqual(resolveYDomain([]), [0, 1]);
});
