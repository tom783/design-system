import test from 'node:test';
import assert from 'node:assert/strict';
import { pageItems } from './page-items.ts';

test('경계와 중간에서 처음·현재 이웃·끝을 보존한다', () => {
  assert.deepEqual(pageItems(1, 25), [1, 2, 3, 'ellipsis-end', 25]);
  assert.deepEqual(pageItems(12, 25), [1, 'ellipsis-start', 11, 12, 13, 'ellipsis-end', 25]);
  assert.deepEqual(pageItems(25, 25), [1, 'ellipsis-start', 23, 24, 25]);
});
test('적은 페이지·한 번호의 틈과 매우 큰 전체 페이지 수', () => {
  assert.deepEqual(pageItems(1, 1), [1]);
  assert.deepEqual(pageItems(2, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(pageItems(4, 25), [1, 2, 3, 4, 5, 'ellipsis-end', 25]);
  assert.deepEqual(pageItems(500_000, 1_000_000), [1, 'ellipsis-start', 499_999, 500_000, 500_001, 'ellipsis-end', 1_000_000]);
});
