import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDate, quickRange, formatValue } from './date-value.ts';
test('실재하는 날짜만 확정한다: 윤년·월말·미완성 입력', () => {
  for (const text of ['2026-02-29', '2026-02-30', '2026-13-01', '2026-1-01', '2026-11-', '한']) assert.equal(parseDate(text), undefined);
  assert.equal(formatValue(parseDate('2024-02-29')), '2024-02-29');
});
test('최근 7일은 오늘 포함이며 연도 경계를 넘는다', () => {
  assert.equal(formatValue(quickRange('최근 7일', new Date(2026, 0, 3, 23))), '2025-12-28 ~ 2026-01-03');
});
test('빠른 선택은 윤년·지난해 12월·오늘을 달력 날짜로 계산한다', () => {
  assert.equal(formatValue(quickRange('지난 달', new Date(2026, 0, 15))), '2025-12-01 ~ 2025-12-31');
  assert.equal(formatValue(quickRange('이번 달', new Date(2024, 1, 15))), '2024-02-01 ~ 2024-02-29');
  assert.equal(formatValue(quickRange('오늘', new Date(2026, 10, 15, 23))), '2026-11-15 ~ 2026-11-15');
});
