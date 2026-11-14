import test from 'node:test';
import assert from 'node:assert/strict';
import { nextFocusable } from './next-focusable.ts';
for (const [name, items, from, dir, expected] of [
  ['비활성 건너뜀', [{}, { disabled: true }, {}], 0, 1, 2],
  ['끝에서는 제출 신호', [{}, {}], 1, 1, null],
  ['처음에서 역방향', [{}, {}], 0, -1, null],
  ['음수 tabindex', [{}, { tabIndex: -1 }, {}], 0, 1, 2],
  ['읽기 전용도 방문', [{}, { readOnly: true }, {}], 0, 1, 1],
  ['전부 비활성', [{ disabled: true }, { hidden: true }], -1, 1, null],
  ['빈 배열', [], -1, 1, null],
  ['역방향 숨김 건너뜀', [{}, { hidden: true }, {}], 2, -1, 0],
]) test(name, () => assert.equal(nextFocusable(items, from, dir), expected));
