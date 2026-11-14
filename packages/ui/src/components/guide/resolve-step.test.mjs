import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveStep } from './resolve-step.ts';
const steps = ['a', 'b', 'c'].map(id => ({ id, target: `#${id}`, title: id, body: id }));
const targets = steps.map(() => ({}));
const all = step => targets[steps.indexOf(step)];
const missingMiddle = step => step.id === 'b' ? null : all(step);
test('전부 존재: 전진·후진', () => {
  for (const dir of [1, -1]) for (let index = 0; index < 3; index++) {
    assert.deepEqual(resolveStep(steps, index, dir, all, 'skip'), { index, target: targets[index] });
  }
});
test('가운데 누락: 양방향 skip', () => {
  assert.deepEqual(resolveStep(steps, 1, 1, missingMiddle, 'skip'), { index: 2, target: targets[2] });
  assert.deepEqual(resolveStep(steps, 1, -1, missingMiddle, 'skip'), { index: 0, target: targets[0] });
});
test('전부 누락: null', () => {
  for (const dir of [1, -1]) assert.equal(resolveStep(steps, 1, dir, () => null, 'skip'), null);
});
test('center는 빈 대상인 단계 유지', () => assert.deepEqual(resolveStep(steps, 1, 1, missingMiddle, 'center'), { index: 1, target: null }));
test('마지막에서 전진', () => assert.equal(resolveStep(steps, 3, 1, all, 'skip'), null));
test('처음에서 후진', () => assert.equal(resolveStep(steps, -1, -1, all, 'skip'), null));
test('빈 목록', () => assert.equal(resolveStep([], 0, 1, all, 'skip'), null));
