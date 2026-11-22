import test from 'node:test';
import assert from 'node:assert/strict';
import { statValue, statDelta } from './format.ts';

test('지표 숫자는 한국어 단위 경계에서 축약하고 원문·부호·단위를 보존한다', () => {
  assert.deepEqual(statValue(0, undefined, '건'), { full: '0건', display: '0건' });
  assert.equal(statValue(9999).display, '9,999');
  assert.equal(statValue(10000).display, '1만');
  assert.deepEqual(statValue(1284000, undefined, '건'), { full: '1,284,000건', display: '128.4만건' });
  assert.equal(statValue(1284000000).display, '12.8억');
  assert.equal(statValue(-1284000000000).display, '-1.3조');
  assert.deepEqual(statValue('1,284,000,000원', undefined, '', '12.8억원'), { full: '1,284,000,000원', display: '12.8억원' });
  assert.equal(statValue('주문 ID 0012').full, '주문 ID 0012', '문자열은 숫자로 추측하지 않는다');
  for (const value of [NaN, Infinity, -Infinity]) assert.equal(statValue(value), null, '실패를 0으로 표시하지 않는다');
});
test('숫자 format은 통화·비율·소수 서식이며 접근성 원문에도 같은 단위를 쓴다', () => {
  assert.deepEqual(statValue(.1284, { style: 'percent', maximumFractionDigits: 2 }), { full: '12.84%', display: '12.84%' });
  const money = statValue(1284000000, { style: 'currency', currency: 'KRW' });
  assert.equal(money.full, '₩1,284,000,000'); assert.equal(money.display, '₩12.8억');
  assert.equal(statValue(1284000, { notation: 'standard' }).display, '1,284,000');
});
test('반품률 하락의 긍정 평가가 실제 감소 방향·부호·낭독 문장을 바꾸지 않는다', () => {
  assert.deepEqual(statDelta(-.4, 'down', 'absolute', '%p'), { direction: 'down', tone: 'success', display: '−0.4%p', spoken: '0.4%p 감소' });
  assert.equal(statDelta(.4, 'down', 'absolute', '%p').tone, 'danger');
  assert.equal(statDelta(12, 'up', 'percent', '').display, '+12%');
  assert.equal(statDelta(-12, 'up', 'percent', '').tone, 'danger');
  assert.equal(statDelta(12, 'none', 'percent', '').tone, 'neutral');
  for (const direction of ['up', 'down', 'none']) for (const zero of [0, -0]) {
    assert.deepEqual(statDelta(zero, direction, 'percent', ''), { direction: 'none', tone: 'neutral', display: '0%', spoken: '0% 변동 없음' });
  }
});
