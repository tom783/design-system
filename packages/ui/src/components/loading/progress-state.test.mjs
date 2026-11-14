import test from 'node:test';
import assert from 'node:assert/strict';
import { progressValue, progressEta } from './progress-state.ts';

test('진행률 범위와 잘못된 값은 접근성 속성에도 안전하게 전달된다', () => {
  for (const [input, expected] of [[-1, 0], [0, 0], [0.5, 0.5], [1, 1], [2, 1], [NaN, undefined], [Infinity, undefined], [undefined, undefined]]) {
    assert.equal(progressValue(input), expected);
  }
});
test('ETA는 10초 미만에서 곧 완료, 이후 10초 단위 반올림', () => {
  for (const [input, expected] of [[0, '곧 완료'], [9.999, '곧 완료'], [10, '약 10초 남음'], [14.9, '약 10초 남음'], [15, '약 20초 남음'], [26, '약 30초 남음'], [undefined, undefined], [-1, undefined], [NaN, undefined], [Infinity, undefined]]) {
    assert.equal(progressEta(input), expected);
  }
});
