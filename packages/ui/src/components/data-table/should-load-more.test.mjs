import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldLoadMore } from './should-load-more.ts';

const input = { lastIndex: 39, rowCount: 50, hasMore: true, loadingMore: false, lastRequestedLength: null };

for (const [name, overrides, expected] of [
  ['임계 미달에서는 요청하지 않는다', {}, false],
  ['10행 전 임계에 도달하면 요청한다', { lastIndex: 40 }, true],
  ['마지막 행에서도 요청한다', { lastIndex: 49 }, true],
  ['추가 로딩 중에는 요청하지 않는다', { lastIndex: 49, loadingMore: true }, false],
  ['남은 데이터가 없으면 요청하지 않는다', { lastIndex: 49, hasMore: false }, false],
  ['남은 데이터 여부를 모르면 요청하지 않는다', { lastIndex: 49, hasMore: undefined }, false],
  ['같은 길이로 재요청하지 않는다', { lastIndex: 49, lastRequestedLength: 50 }, false],
  ['행이 추가되면 다음 길이에서 요청한다', { lastIndex: 90, rowCount: 100, lastRequestedLength: 50 }, true],
  ['빈 목록도 최초 요청할 수 있다', { lastIndex: -1, rowCount: 0 }, true],
  ['빈 목록에서도 중복 요청을 막는다', { lastIndex: -1, rowCount: 0, lastRequestedLength: 0 }, false],
]) {
  test(name, () => assert.equal(shouldLoadMore({ ...input, ...overrides }), expected));
}
