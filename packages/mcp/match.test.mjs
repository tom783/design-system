import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { matchComponents } from './match.mjs';
const { components } = JSON.parse(await readFile(new URL('./manifest.json', import.meta.url), 'utf8'));

test('정확한 이름은 해당 컴포넌트가 1위', () => {
  for (const c of components.filter((c) => c.kind === 'component')) assert.equal(matchComponents(c.name, components)[0].name, c.name);
});
test('한국어 행 요약은 Peek, 복수 후보에 근거·사용 조건·금지사항 포함', () => {
  const candidates = matchComponents('표에서 행 요약을 보여주고 싶다', components);
  assert.equal(candidates[0].name, 'Peek');
  assert.ok(candidates.length > 1);
  for (const c of candidates) { assert.ok(c.reasons.length); assert.ok(c.useWhen.length); assert.ok(c.dont.length); }
});
test('안내 도구의 한국어 목적을 구분', () => {
  for (const [query, name] of [['호버로 컨트롤 설명', 'Tooltip'], ['새 기능을 한 번 알려줘', 'Hint'], ['온보딩 투어 단계', 'Tour']]) assert.equal(matchComponents(query, components)[0].name, name);
});
test('일치하지 않는 설명과 공백은 빈 배열', () => {
  assert.deepEqual(matchComponents('zxqv987654', components), []);
  assert.deepEqual(matchComponents('  ', components), []);
});
test('대소문자·공백 차이를 흡수하고 입력을 변경하지 않는다', () => {
  const before = JSON.stringify(components);
  assert.deepEqual(matchComponents('  p E e K  ', components), matchComponents('peek', components));
  assert.equal(JSON.stringify(components), before);
});
