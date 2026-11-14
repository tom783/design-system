import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePercentages, isBulletAchieved } from './normalize.ts';

for (const [name, input, expected] of [
  ['절대 건수', [200, 300, 500], [20, 30, 50]],
  ['이미 비율인 입력', [20, 30, 50], [20, 30, 50]],
  ['0~1 비율', [0.2, 0.3, 0.5], [20, 30, 50]],
  ['음수 방어', [-20, 50, 50], [0, 50, 50]],
  ['비정상 값 방어', [NaN, Infinity, 10], [0, 0, 100]],
  ['큰 절대값', [Number.MAX_VALUE, Number.MAX_VALUE], [50, 50]],
]) {
  test(`100% 정규화: ${name}`, () => {
    const original = [...input];
    const result = normalizePercentages(input);
    result.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) < 1e-10));
    assert.ok(Math.abs(result.reduce((sum, value) => sum + value, 0) - 100) < 1e-10);
    assert.deepEqual(input, original);
  });
}
for (const input of [[0, 0], [-10, -20], [], [NaN, Infinity]]) {
  test(`합계 0인 시점은 공백: ${String(input)}`, () => assert.equal(normalizePercentages(input), null));
}
for (const [name, actual, target, lower, expected] of [
  ['일반 달성', 110, 100, false, true], ['일반 미달', 90, 100, false, false],
  ['낮을수록 좋음 달성', 2, 3, true, true], ['낮을수록 좋음 미달', 4, 3, true, false],
  ['일반 경계값', 100, 100, false, true], ['낮을수록 좋음 경계값', 3, 3, true, true],
  ['비정상 실적', NaN, 3, true, false], ['비정상 목표', 3, Infinity, false, false],
]) {
  test(`불릿 판정: ${name}`, () => assert.equal(isBulletAchieved(actual, target, lower), expected));
}
