import test from 'node:test';
import assert from 'node:assert/strict';
import { fitChipCount } from './fit-chips.ts';

// 칩 120px 세 개 · 간격 8 · `+N` 36 · 초기화 52 (시안 1440 의 대략값)
const base = { chips: [120, 120, 120], gap: 8, more: 36, reset: 52 };

test('칩이 없으면 0', () => assert.equal(fitChipCount({ ...base, chips: [], available: 500 }), 0));
test('전부 들어가면 +N 없이 전부', () => {
  // 120·3 + 52 + 간격 3개 = 436
  assert.equal(fitChipCount({ ...base, available: 436 }), 3);
});
test('1px 모자라면 하나를 +N 으로 보내고 +N 폭까지 넣어 다시 잰다', () => {
  // k=2: 240 + 36 + 52 + 간격 3개 = 352
  assert.equal(fitChipCount({ ...base, available: 435 }), 2);
  assert.equal(fitChipCount({ ...base, available: 352 }), 2);
  assert.equal(fitChipCount({ ...base, available: 351 }), 1);
});
test('하나도 안 들어가면 0 — +N 과 초기화만 남는다', () => {
  assert.equal(fitChipCount({ ...base, available: 100 }), 0);
  assert.equal(fitChipCount({ ...base, chips: [600], available: 400 }), 0);
});
test('소수 폭 합의 반올림 오차로 마지막 칩을 빼지 않는다', () => {
  assert.equal(fitChipCount({ chips: [100.3, 100.3], gap: 8, more: 30, reset: 50, available: 266.4 }), 2);
});
test('앞 칩이 길면 뒤 칩이 짧아도 순서를 건너뛰지 않는다', () => {
  // 순서를 지킨다: 긴 첫 칩이 안 들어가면 짧은 둘째 칩만 보이는 일은 없다.
  assert.equal(fitChipCount({ chips: [400, 40], gap: 8, more: 30, reset: 50, available: 300 }), 0);
});
