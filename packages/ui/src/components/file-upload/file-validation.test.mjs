import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptsFile, acceptMessage, formatFileSize, validateFiles } from './file-validation.ts';
const file = (name, type = '', size = 1) => new File([new Uint8Array(size)], name, { type });
test('선택·드롭의 확장자·정확한 MIME·와일드카드·빈 MIME 검증', () => {
  assert.ok(acceptsFile(file('상품.PNG'), '.jpg, .PNG'));
  assert.ok(acceptsFile(file('상품', 'image/png'), 'image/*'));
  assert.ok(acceptsFile(file('상품', 'image/png'), 'image/jpeg,image/png'));
  assert.ok(!acceptsFile(file('상품.png'), 'image/png'));
  assert.ok(!acceptsFile(file('상품.png.exe'), '.png'));
  assert.ok(acceptsFile(file('상품.xlsx'), ''));
  assert.equal(acceptMessage('image/jpeg,image/png'), 'JPG·PNG만 올릴 수 있습니다');
});
test('유효한 파일만 순서대로 추가하고 크기 경계·기존 개수·단일 교체를 지킨다', () => {
  const a = file('가.png', 'image/png', 1000), b = file('나.png', 'image/png', 1001), c = file('다.csv');
  const result = validateFiles([a, b, c, a], { multiple: true, count: 2, maxFiles: 3, maxSize: 1000, accept: 'image/png' });
  assert.deepEqual(result.accepted, [a]);
  assert.deepEqual(result.rejected.map(item => item.reason), ['1KB 이하만 올릴 수 있습니다', 'PNG만 올릴 수 있습니다', '최대 3개까지 올릴 수 있습니다']);
  assert.deepEqual(validateFiles([a], { count: 1 }).accepted, [a], '단일 선택은 기존 파일을 교체한다');
  assert.equal(validateFiles([a, a], { count: 0 }).rejected.length, 1);
  assert.equal(validateFiles([a], { count: 0, multiple: true, maxFiles: 0 }).accepted.length, 0);
  assert.equal(validateFiles([b], { count: 0, maxSize: 1001 }).accepted.length, 1);
});
test('십진 바이트 표기로 안내의 5MB와 실제 한도를 일치시킨다', () => {
  for (const [input, expected] of [[0, '0B'], [999, '999B'], [1000, '1KB'], [1_200_000, '1.2MB'], [5_000_000, '5MB'], [1_000_000_000, '1GB']]) assert.equal(formatFileSize(input), expected);
});
