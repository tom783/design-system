import test from 'node:test';
import assert from 'node:assert/strict';
import { nextPhase } from './loading-state.ts';

const base = { phase: 'idle', isLoading: false, now: 0, startedAt: null, shownAt: null, delay: 200, minVisible: 400 };
const step = (input) => nextPhase({ ...base, ...input });

test('로딩 시작은 표시 없이 waiting 진입', () => {
  assert.deepEqual(step({ isLoading: true, now: 10 }), { phase: 'waiting', at: 10 });
});
test('delay 전에는 waiting, 정확히 경과하면 visible', () => {
  for (const [now, phase, at] of [[209.999, 'waiting', 10], [210, 'visible', 210], [211, 'visible', 211]]) {
    assert.deepEqual(step({ phase: 'waiting', startedAt: 10, now, isLoading: true }), { phase, at });
  }
});
test('waiting 중 종료는 경계에서도 로더 없이 idle', () => {
  for (const now of [150, 200, 220]) assert.deepEqual(step({ phase: 'waiting', startedAt: 0, now }), { phase: 'idle', at: null });
});
test('visible 중 종료해도 최소 유지 미경과면 표시 시각 보존', () => {
  assert.deepEqual(step({ phase: 'visible', shownAt: 200, now: 599.999 }), { phase: 'visible', at: 200 });
});
test('최소 유지 경과 경계부터 즉시 idle', () => {
  for (const now of [600, 900]) assert.deepEqual(step({ phase: 'visible', shownAt: 200, now }), { phase: 'idle', at: null });
});
test('로딩 중이면 최소 유지 이후에도 visible', () => {
  assert.deepEqual(step({ phase: 'visible', shownAt: 200, now: 900, isLoading: true }), { phase: 'visible', at: 200 });
});
test('빠른 켜짐·꺼짐 반복은 지연 시간을 합산하지 않는다', () => {
  let state = { phase: 'idle', at: null };
  for (const [now, isLoading] of [[0, true], [100, false], [120, true], [219, false], [230, true], [400, false]]) {
    state = step({ phase: state.phase, startedAt: state.at, now, isLoading });
    assert.notEqual(state.phase, 'visible');
  }
  assert.deepEqual(state, { phase: 'idle', at: null });
});
test('최소 유지 중 재시작은 기존 표시를 끊거나 지연을 다시 시작하지 않는다', () => {
  for (const [now, isLoading] of [[300, false], [350, true], [500, false]]) {
    assert.deepEqual(step({ phase: 'visible', shownAt: 200, now, isLoading }), { phase: 'visible', at: 200 });
  }
});
test('지연 0도 waiting 경유 후 표시, 최소 유지 0은 즉시 숨김', () => {
  assert.deepEqual(step({ isLoading: true, delay: 0 }), { phase: 'waiting', at: 0 });
  assert.deepEqual(step({ phase: 'waiting', startedAt: 0, isLoading: true, delay: 0 }), { phase: 'visible', at: 0 });
  assert.deepEqual(step({ phase: 'visible', shownAt: 0, minVisible: 0 }), { phase: 'idle', at: null });
});
test('idle에서는 완료 입력을 반복해도 그대로 유지', () => {
  assert.deepEqual(step({ now: 500 }), { phase: 'idle', at: null });
});
