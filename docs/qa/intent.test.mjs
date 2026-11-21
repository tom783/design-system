import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolveIntent, resolvePageIntents } from '../../packages/ui/docs/_intent-data.ts';
import { restoreComponent } from '../../packages/mcp/catalog.mjs';

const entry = (name, extra = {}) => ({ name, purpose: `${name}의 목적`, source: `${name}.tsx`, ...extra });

test('Intent: 이름이 없으면 조용히 비우지 않고 실패한다', () => {
  assert.throws(() => resolveIntent([entry('Input')], '사라진컴포넌트'), /매니페스트.*사라진컴포넌트/);
});
test('Intent: 부품과 모든 부모를 보존하고 관련 링크는 합쳐 중복을 제거한다', () => {
  const entries = [
    entry('Root', { rules: [{ text: '부모 규칙', source: 'DESIGN.md 16' }], related: ['Other'] }),
    entry('Part', { partOf: 'Root', related: ['Other', 'Root'] }),
    entry('Child', { partOf: 'Part', rules: [{ text: '자체 규칙', source: 'DESIGN.md 6' }], related: ['Other'] }),
    entry('Other'),
  ];
  const before = structuredClone(entries);
  const result = resolveIntent(entries, 'Child');
  assert.equal(result.component.name, 'Child');
  assert.deepEqual(result.component.rules, entries[2].rules);
  assert.deepEqual(result.parents.map(parent => parent.name), ['Part', 'Root']);
  assert.deepEqual(result.parents[1].rules, entries[0].rules);
  assert.deepEqual(result.related.map(related => related.name), ['Other']);
  assert.deepEqual(entries, before, '매니페스트를 변경하지 않는다');
});
test('Intent: 부모나 관련 이름이 사라져도 실패한다', () => {
  assert.throws(() => resolveIntent([entry('Part', { partOf: 'MissingParent' })], 'Part'), /MissingParent/);
  assert.throws(() => resolveIntent([entry('Root', { related: ['MissingRelated'] })], 'Root'), /MissingRelated/);
});
test('Intent: partOf 순환 참조는 무한 루프 대신 실패한다', () => {
  assert.throws(() => resolveIntent([entry('A', { partOf: 'B' }), entry('B', { partOf: 'A' })], 'A'), /순환 참조/);
});

test('페이지 Intent: 같은 부모는 첫 부품 아래 한 번만 소개하고 페이지 간에는 독립적이다', () => {
  const entries = [entry('Root'), entry('Part', { partOf: 'Root' }), entry('Child', { partOf: 'Part' }), entry('Sibling', { partOf: 'Root' })];
  const before = structuredClone(entries);
  const names = ['Child', 'Sibling'];
  const resolved = resolvePageIntents(entries, names);
  assert.deepEqual(resolved.map(intent => intent.component.name), names);
  assert.deepEqual(resolved.map(intent => intent.parents.map(parent => parent.name)), [['Part', 'Root'], []]);
  assert.deepEqual(resolvePageIntents(entries, names), resolved, '재렌더와 다른 페이지에 공유 상태가 새지 않는다');
  assert.deepEqual(resolvePageIntents(entries, ['Root', 'Part', 'Sibling']).map(intent => [intent.component.name, intent.parents]), [['Root', []]]);
  assert.deepEqual(resolvePageIntents(entries, ['Root', 'Child']).map(intent => [intent.component.name, intent.parents.map(parent => parent.name)]), [['Root', []], ['Child', ['Part']]]);
  assert.deepEqual(entries, before);
});

const docs = new URL('../../packages/ui/docs/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('../../packages/mcp/manifest.json', import.meta.url), 'utf8'));
const components = manifest.components.map(component => restoreComponent(component, manifest.derived, manifest.components));
const pages = readdirSync(docs).filter(file => file.endsWith('.mdx')).sort();

test('여섯 MDX 페이지의 모든 Intent 이름·부모·관련 이름을 실제 매니페스트로 해소한다', () => {
  assert.equal(pages.length, 6);
  const names = pages.flatMap(file => [...readFileSync(new URL(file, docs), 'utf8')
    .matchAll(/<Intent name="([^"]+)"\s*\/>/g)].map(match => match[1]));
  assert.ok(names.length >= 10, 'Intent 호출이 없어 검사가 공회전하면 안 된다');
  for (const name of names) {
    const resolved = resolveIntent(components, name);
    assert.ok(resolved.component.purpose);
    for (const component of [resolved.component, ...resolved.parents, ...resolved.related]) {
      const restored = components.find(entry => entry.name === component.name);
      assert.equal(component.source, restored.source);
      assert.deepEqual(component.rules, restored.rules, '문서의 규칙 출처도 복원된 값이다');
      assert.ok(component.source.startsWith('packages/ui/src/'));
      assert.ok(existsSync(new URL(`../../${component.source}`, import.meta.url)), `${component.name} 소스 링크가 실제 파일을 가리킨다`);
    }
  }
  assert.ok(resolveIntent(components, 'SelectTrigger').parents.some(parent => parent.name === 'Select'));
  assert.ok(resolveIntent(components, 'DialogContent').parents.some(parent => parent.name === 'Dialog'));
});
test('문서에 적은 토큰 이름은 모두 매니페스트에 존재한다', () => {
  const tokens = new Set(manifest.tokens.map(token => token.cssVariable));
  const source = readFileSync(new URL('05-tokens.mdx', docs), 'utf8');
  for (const match of source.matchAll(/--[a-z][a-z0-9-]+/g)) assert.ok(tokens.has(match[0]), match[0]);
});
