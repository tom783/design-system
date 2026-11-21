import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compareGuidanceBaseline } from './compare-guidance-baseline.mjs';

const raw = await readFile(new URL('./fixtures/get-component-baseline.json', import.meta.url), 'utf8');
const fixture = JSON.parse(raw);
test('기준선 비교는 허용 문구만 가리고 API·배열·상속·원문 바이트 변화를 검출한다', () => {
  const change = mutate => { const value = structuredClone(fixture); mutate(value); return JSON.stringify(value, null, 2) + '\n'; };
  assert.doesNotThrow(() => compareGuidanceBaseline(raw, change(value => {
    value.ClampText.rules.push({ text: '새 규칙', source: 'DESIGN.md 21' });
    value.__list[0].purpose = '새 목적';
  })));
  for (const mutate of [
    value => { value.ClampText.props[0].type = '새 타입'; },
    value => { value.ClampText.slots.reverse(); },
    value => { value.ClampText.source += '변경'; },
    value => { value.__list.reverse(); },
    value => { value.__list[0].import += '변경'; },
    value => { value.__list.push(value.__list[0]); },
  ]) assert.throws(() => compareGuidanceBaseline(raw, change(mutate)));
  assert.throws(() => compareGuidanceBaseline(raw, raw.replace('"props":', '"props" :')));
});
