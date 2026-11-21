import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import intents from '../research/component-intent.mjs';
import { checkConsumerGuidance, forbiddenTerms } from '../research/consumer-guidance.mjs';

test('모든 컴포넌트의 소비자 지침에 구현 메모·장문·복제가 없다', async () => {
  assert.deepEqual(checkConsumerGuidance(intents), []);
  const manifest = JSON.parse(await readFile(new URL('../../packages/mcp/manifest.json', import.meta.url), 'utf8'));
  assert.deepEqual(checkConsumerGuidance(manifest.components), []);
});

test('금지어는 네 필드와 부품 purpose에서 대소문자 구분 없이 검출한다', () => {
  for (const term of forbiddenTerms) {
    for (const field of ['purpose', 'useWhen', 'dont', 'rules']) {
      const text = `${term.toUpperCase()} 내부 설명`;
      const component = { name: '검사', purpose: '목적', [field]: field === 'purpose' ? text : field === 'rules' ? [{ text }] : [text] };
      assert.ok(checkConsumerGuidance([component]).some(error => error.term === term && error.field === field));
    }
  }
  assert.equal(checkConsumerGuidance([{ name: '부품', partOf: '부모', purpose: 'Radix 설명' }]).length, 1);
});

test('규칙은 유니코드 120자까지 허용하고 컴포넌트 사이의 복제만 차단한다', () => {
  const component = (name, text) => ({ name, purpose: '목적', rules: [{ text }] });
  assert.deepEqual(checkConsumerGuidance([component('가', '가'.repeat(120))]), []);
  assert.equal(checkConsumerGuidance([component('가', '가'.repeat(121))])[0].kind, 'length');
  assert.deepEqual(checkConsumerGuidance([component('가', '😀'.repeat(120))]), []);
  assert.equal(checkConsumerGuidance([component('가', '동일'), component('나', '동일')])[0].kind, 'duplicate');
  assert.deepEqual(checkConsumerGuidance([{ ...component('가', '동일'), rules: [{ text: '동일' }, { text: '동일' }] }]), []);
  assert.deepEqual(checkConsumerGuidance([component('부모', '규칙'), { name: '부품', purpose: '목적', partOf: '부모' }]), []);
});

test('허용은 이름·필드·원문·금지어와 이유가 모두 맞는 항목 하나에만 적용한다', () => {
  const component = { name: '검사', purpose: 'popover API' };
  const exception = { name: '검사', field: 'purpose', text: component.purpose, term: 'popover', reason: '소비자 API 예시' };
  assert.deepEqual(checkConsumerGuidance([component], [exception]), []);
  for (const change of [{ name: '다름' }, { field: 'dont' }, { text: '다름' }, { term: 'Radix' }, { reason: '' }]) {
    assert.ok(checkConsumerGuidance([component], [{ ...exception, ...change }]).some(error => error.kind === 'forbidden'));
  }
  assert.ok(checkConsumerGuidance([{ ...component, purpose: '새 설명' }], [exception]).some(error => error.kind === 'unused-allowance'));
});
