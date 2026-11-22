import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDate, parseDateTime, snapTime, withTime, quickRange, quickDate, formatValue, outOfRange } from './date-value.ts';
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
test('단일 빠른 선택의 어제·내일은 윤일·연도·DST 경계에서도 달력 날짜다', () => {
  const original = process.env.TZ;
  try {
    process.env.TZ = 'America/New_York';
    for (const [label, now, expected] of [
      ['오늘', new Date(2026, 10, 15, 23), '2026-11-15'],
      ['어제', new Date(2024, 2, 1, 23), '2024-02-29'],
      ['내일', new Date(2026, 11, 31, 23), '2027-01-01'],
      ['어제', new Date(2026, 2, 9, 23), '2026-03-08'],
      ['내일', new Date(2026, 10, 1, 23), '2026-11-02'],
    ]) {
      const before = now.getTime(), date = quickDate(label, now);
      assert.equal(formatValue(date), expected);
      assert.equal(date.getHours(), 0);
      assert.equal(now.getTime(), before, '기준일을 변경하지 않는다');
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test('일시는 24시간·실제 날짜·시각만 지역 Date로 파싱한다', () => {
  for (const text of ['2026-02-30 09:00', '2026-11-15 24:00', '2026-11-15 09:60', '2026-11-15 9:00', '2026-11-15', '2026-11-15 오전 09:00']) {
    assert.equal(parseDateTime(text), undefined, text);
  }
  const date = parseDateTime('2026-11-15 23:59');
  assert.equal(date.getHours(), 23); assert.equal(date.getMinutes(), 59);
  assert.equal(formatValue(date, true), '2026-11-15 23:59');
  assert.equal(formatValue(parseDateTime('2024-02-29 00:00'), true), '2024-02-29 00:00');
});
test('분 칸은 최근접·동률 올림이며 시·일·월·년 경계를 넘긴다', () => {
  for (const [step, input, expected] of [
    [1, '2026-11-15 09:17', '2026-11-15 09:17'],
    [5, '2026-11-15 09:17', '2026-11-15 09:15'],
    [10, '2026-11-15 09:14', '2026-11-15 09:10'],
    [10, '2026-11-15 09:15', '2026-11-15 09:20'],
    [15, '2026-11-15 09:58', '2026-11-15 10:00'],
    [30, '2026-11-15 09:15', '2026-11-15 09:30'],
    [30, '2026-12-31 23:59', '2027-01-01 00:00'],
  ]) {
    const date = parseDateTime(input), before = date.getTime();
    assert.equal(formatValue(snapTime(date, step), true), expected);
    assert.equal(date.getTime(), before, '원본 Date를 변경하지 않는다');
  }
});
test('날짜·빠른 선택은 기존 시각을 유지하며 첫 선택은 09:00이다', () => {
  const previous = new Date(2026, 10, 15, 23, 30);
  assert.equal(formatValue(withTime(new Date(2026, 11, 1), previous), true), '2026-12-01 23:30');
  assert.equal(formatValue(withTime(quickRange('오늘', new Date(2026, 10, 20)).to, previous), true), '2026-11-20 23:30');
  assert.equal(formatValue(withTime(new Date(2026, 0, 1)), true), '2026-01-01 09:00');
  assert.equal(previous.getDate(), 15);
});

test('지역 시간은 UTC로 파싱하지 않고 DST에 없는 직접 입력은 거부한다', () => {
  const original = process.env.TZ;
  try {
    process.env.TZ = 'Asia/Seoul';
    assert.equal(parseDateTime('2026-11-15 09:00').toISOString(), '2026-11-15T00:00:00.000Z');
    process.env.TZ = 'America/New_York';
    assert.equal(parseDateTime('2026-03-08 02:30'), undefined);
    assert.equal(formatValue(snapTime(parseDateTime('2026-03-08 01:59'), 10), true), '2026-03-08 03:00');
    assert.equal(formatValue(withTime(new Date(2026, 2, 9), parseDateTime('2026-03-07 13:30')), true), '2026-03-09 13:30');
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test('형식이 맞고 범위가 틀린 입력은 무엇을 고칠지 말한다 — 형식 오류와 구분', () => {
  for (const [text, time, expected] of [
    ['2026-11-15 25:00', true, '시각은 00:00~23:59로 입력하세요.'],
    ['2026-11-15 24:00', true, '시각은 00:00~23:59로 입력하세요.'],
    ['2026-11-15 13:60', true, '시각은 00:00~23:59로 입력하세요.'],
    ['2026-02-30 10:00', true, '2026년 2월은 01~28일로 입력하세요.'],
    ['2026-02-29', false, '2026년 2월은 01~28일로 입력하세요.'],
    ['2026-11-00', false, '2026년 11월은 01~30일로 입력하세요.'],
    ['2026-13-01', false, '월은 01~12로 입력하세요.'],
    ['2026-00-10 09:00', true, '월은 01~12로 입력하세요.'],
    // 날짜와 시각이 함께 틀리면 날짜부터 고친다.
    ['2026-02-30 25:00', true, '2026년 2월은 01~28일로 입력하세요.'],
  ]) assert.equal(outOfRange(text, time), expected, text);
  // 윤년 규칙(4·100·400)과 4자리 연도를 그대로 쓴다. Date(24, …)는 1924년이 된다.
  assert.equal(outOfRange('2024-02-29'), undefined);
  assert.equal(outOfRange('1900-02-29'), '1900년 2월은 01~28일로 입력하세요.');
  assert.equal(outOfRange('2000-02-29'), undefined);
  assert.equal(outOfRange('0024-02-30'), '0024년 2월은 01~29일로 입력하세요.');
  // DST로 없는 시각은 범위 문제가 아니다. 컴포넌트가 '지역 시간에 없는 시각'으로 따로 알린다.
  assert.equal(outOfRange('2026-03-08 02:30', true), undefined);
  // 형식이 틀리면 범위를 말하지 않는다. 형식 문구가 맡는다.
  for (const [text, time] of [['2026-11-15', true], ['2026-11-15 9:00', true], ['2026-1-01', false], ['한', false], ['2026-11-15 23:59', true], ['2026-11-15', false]]) {
    assert.equal(outOfRange(text, time), undefined, text);
  }
});
