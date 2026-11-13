import test from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from './export-csv.ts';

test('콤마가 포함된 필드는 따옴표로 감싼다', () => {
  assert.equal(toCsv([['서울, 부산', '수취인']]), '\uFEFF"서울, 부산",수취인');
});

test('필드 안의 따옴표를 두 번 기록한다', () => {
  assert.equal(toCsv([['상품 "선물"']]), '\uFEFF"상품 ""선물"""');
});

test('개행과 CR을 포함한 필드를 감싸고 행 구분은 CRLF를 쓴다', () => {
  assert.equal(toCsv([['첫째\n둘째'], ['셋째\r넷째']]), '\uFEFF"첫째\n둘째"\r\n"셋째\r넷째"');
});

test('한글 파일의 첫 바이트는 UTF-8 BOM이다', () => {
  assert.deepEqual([...Buffer.from(toCsv([['수취인']])).subarray(0, 3)], [0xef, 0xbb, 0xbf]);
});

test('빈 배열에도 BOM을 보존한다', () => {
  assert.equal(toCsv([]), '\uFEFF');
});

test('원본 숫자 문자열과 빈 필드는 변형하지 않는다', () => {
  assert.equal(toCsv([['금액', '메모'], ['1248500000', '']]), '\uFEFF금액,메모\r\n1248500000,');
});
