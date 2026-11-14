import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeRecord, decodeRecord } from './return-record.ts';
const record = { itemKey: 'order-300', scrollTop: 12000, at: 1000 };
test('정상 기록과 TTL 경계는 그대로 복원한다', () => {
  assert.deepEqual(decodeRecord(encodeRecord(record), 1600, 600), record);
  assert.deepEqual(decodeRecord(encodeRecord(record), 1000, 0), record);
});
for (const [name, raw] of [
  ['null', null], ['빈 문자열', ''], ['깨진 JSON', '{'], ['배열', '[]'], ['문자열', '"x"'], ['JSON null', 'null'],
  ...[{}, { ...record, itemKey: 3 }, { ...record, itemKey: null }, { ...record, scrollTop: '3' },
    { ...record, scrollTop: -1 }, { ...record, scrollTop: NaN }, { ...record, scrollTop: Infinity },
    { ...record, at: '1000' }, { ...record, at: null }, { ...record, at: Infinity },
    { itemKey: record.itemKey, at: record.at }, { scrollTop: 0, at: record.at },
    { itemKey: record.itemKey, scrollTop: 0 }].map((r, i) => [`필드 오류 ${i}`, JSON.stringify(r)]),
  ['JSON 무한대', '{"itemKey":"a","scrollTop":1e999,"at":1000}'],
]) test(`${name} → null (throw 없음)`, () => assert.equal(decodeRecord(raw, 1600, 600), null));
test('만료·미래 기록은 버린다', () => {
  assert.equal(decodeRecord(encodeRecord(record), 1601, 600), null);
  assert.equal(decodeRecord(encodeRecord(record), 999, 600), null);
});
test('잘못된 시계·TTL도 거부한다', () => {
  for (const [now, ttl] of [[NaN, 600], [Infinity, 600], [1600, -1], [1600, Infinity], [1600, NaN]]) {
    assert.equal(decodeRecord(encodeRecord(record), now, ttl), null);
  }
});
