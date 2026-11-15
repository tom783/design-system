import test from 'node:test';
import assert from 'node:assert/strict';
import { comboboxFilter } from './combobox-filter.ts';

for (const [label, query, value, expected] of [
  ['빈 질의', '', '서울 본사', true],
  ['공백 질의', ' \t ', '서울 본사', true],
  ['부분 문자열', '서울', '서울 본사', true],
  ['공백 제거', '서울본 사', '서울 본사', true],
  ['영문 대소문자', 'WARE', 'Warehouse', true],
  ['NFD 질의', '서울'.normalize('NFD'), '서울 본사', true],
  ['NFD 후보', '서울', '서울 본사'.normalize('NFD'), true],
  ['초성 연속 검색', 'ㅅㅇ', '서울 본사', true],
  ['초성 한 자', 'ㅅ', '부산 지점', true],
  ['쌍초성', 'ㄲㄸ', '까딱', true],
  ['초성 비연속 제외', 'ㅅㅂ', '서울 본사', false],
  ['완성 음절과 자모 혼합', '물ㄹ', '서산 물류센터', true],
  ['중성 혼합', 'ㅓ울', '서울 본사', true],
  ['받침 분해', 'ㄹ', '서울', true],
  ['겹받침', 'ㄺ', '맑음', true],
  ['일반 문자열 불일치', '없는창고', '서울 본사', false],
  ['정상 조합 중간도 실제 매칭은 0', '설', '서울 본사', false],
  ['빈 후보', '서울', '', false],
  ['기호 보존', 'A-B', 'a-b 창고', true],
  ['이모지', '📦', '📦 서울', true],
]) test(`한글 필터: ${label}`, () => assert.equal(comboboxFilter(query, value), expected));

test('서울 조합 단계의 매칭과 표시 보존 책임을 구분한다', () => {
  const options = ['서울 본사', '서산 물류센터', '성남 지점', '부산 지점', '대구 물류센터', '수원 창고'];
  assert.deepEqual(['ㅅ', '서', '설', '서울'].map(query => options.filter(value => comboboxFilter(query, value)).length), [6, 3, 0, 1]);
});
