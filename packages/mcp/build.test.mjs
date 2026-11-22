import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extractComponents, normalizeTokens, validate, assertSizeBudget, compactCatalog } from '../../docs/research/mcp-build.mjs';
import { restoreComponent, listComponents, getComponent } from './catalog.mjs';
import intents, { principles } from '../../docs/research/component-intent.mjs';
const data = JSON.parse(await readFile(new URL('../../docs/research/tokens.json', import.meta.url), 'utf8'));
const design = await readFile(new URL('../../DESIGN.md', import.meta.url), 'utf8');
const components = extractComponents();
const tokens = normalizeTokens(data);
const sections = new Set([...design.matchAll(/^#{2,6}\s+(\d+(?:\.\d+)*)(?:\.|\s)/gm)].map((m) => m[1]));
const fixture = () => ({ components: structuredClone(components), intents: structuredClone(intents), sections: new Set(sections), tokens: structuredClone(tokens), expectedNames: new Set(tokens.map((t) => t.name)), principles: structuredClone(principles) });
const expectGate = (number, change) => { const input = fixture(); change(input); assert.ok(validate(input).some((message) => message.startsWith(`[${number} `))); };
test('실제 공개 export·상속 props·export *·슬롯을 추출하고 메타데이터와 일치', () => {
  assert.deepEqual(validate(fixture()), []);
  assert.ok(components.some((c) => c.name === 'Peek'));
  assert.ok(components.find((c) => c.name === 'DataTable').props.some((p) => p.name === 'getRowId'));
  assert.equal(components.find((c) => c.name === 'SELECTION_COLUMN_ID').kind, 'constant');
  assert.ok(!components.some((c) => c.name === 'ButtonProps'));
  assert.deepEqual(components.find((c) => c.name === 'CardTitle').slots, ['card-title']);
});
test('1: 새 export 누락·잘못된 항목·중복을 차단', () => {
  expectGate(1, (f) => f.intents.pop());
  expectGate(1, (f) => f.intents.push({ ...f.intents[0], name: '없는컴포넌트' }));
  expectGate(1, (f) => f.intents.push(f.intents[0]));
});
test('2: 다른 컴포넌트에만 존재하는 prop도 거부', () => expectGate(2, (f) => f.intents.find((c) => c.name === 'CardTitle').props.push('tone')));
test('3: 같은 파일의 형제 컴포넌트 슬롯을 잘못 기재해도 거부', () => expectGate(3, (f) => f.intents.find((c) => c.name === 'CardTitle').slots.push('card-body')));
test('4: 실제 제목이 아닌 절 번호와 잘못된 출처를 차단', () => {
  expectGate(4, (f) => { f.intents[0].rules[0].source = 'DESIGN.md 999.1'; });
  expectGate(4, (f) => { f.principles[0].source = '가짜문서.md 2'; });
});
test('5: 없는 related 대상을 차단', () => expectGate(5, (f) => f.intents[0].related.push('Missing')));
test('6: 토큰 누락·추가·중복·끊긴 참조·브리지 이름 drift를 차단', () => {
  expectGate(6, (f) => f.tokens.pop());
  expectGate(6, (f) => f.tokens.push({ name: '없는토큰', light: {}, dark: {} }));
  expectGate(6, (f) => f.tokens.push(f.tokens[0]));
  expectGate(6, (f) => { f.tokens[0].light.ref = 'missing-500'; });
  expectGate(6, (f) => { f.bridgeTargets = ['missing-token']; });
  expectGate(6, (f) => { f.intents[0].tokens = ['missing-token']; });
});
test('7: 부모·부품의 양방향 관계와 단일 보관을 검증', () => {
  expectGate(7, (f) => { f.intents.find((c) => c.name === 'SelectTrigger').partOf = 'Missing'; });
  expectGate(7, (f) => { f.intents.find((c) => c.name === 'Select').parts = []; });
  expectGate(7, (f) => { delete f.intents.find((c) => c.name === 'SelectTrigger').partOf; });
  expectGate(7, (f) => { f.intents.find((c) => c.name === 'Select').parts.push('Missing'); });
  expectGate(7, (f) => { f.intents.find((c) => c.name === 'Select').parts.push('CardSkeleton'); });
  expectGate(7, (f) => { f.intents.find((c) => c.name === 'Select').parts.push('SelectTrigger'); });
  expectGate(7, (f) => { f.intents.find((c) => c.name === 'SelectTrigger').partOf = 'SelectTrigger'; });
  expectGate(7, (f) => { f.intents.find((c) => c.name === 'SelectTrigger').partOf = 'CardBody'; });
  expectGate(7, (f) => { f.intents.find((c) => c.name === 'SelectTrigger').rules = []; });
});
test('8: 소비자 지침의 구현 메모·장문·복제를 생성 단계에서 차단', () => {
  expectGate(8, f => { f.intents[0].purpose = 'Observer 구현'; });
  expectGate(8, f => { f.intents[0].rules[0].text = '가'.repeat(121); });
  expectGate(8, f => { f.intents[1].purpose = 'Radix 부품'; });
  expectGate(8, f => { f.intents.find(c => c.name === 'Hint').rules[0].text = f.intents[0].rules[0].text; });
});
test('부품은 고유 API만 보관하고 목적·부모 목록을 보존', async () => {
  const { components: catalog, derived } = JSON.parse(await readFile(new URL('./manifest.json', import.meta.url), 'utf8'));
  for (const part of catalog.filter((c) => c.partOf)) {
    assert.ok(Object.keys(part).every(key => ['name', 'partOf', 'purpose', 'props', 'extends', 'slots', 'source', 'useWhen', 'dont', 'related', 'keywords'].includes(key)));
    assert.equal(part.purpose, intents.find((c) => c.name === part.name).purpose);
    assert.ok(catalog.find((c) => c.name === part.partOf).parts.includes(part.name));
    const restored = restoreComponent(part, derived, catalog);
    const api = components.find(component => component.name === part.name);
    for (const field of ['source', 'props', 'extends', 'slots']) assert.deepEqual(restored[field], api[field]);
  }
});
test('R23: 모든 항목의 API·의도는 저장을 줄였다가 복원해도 추출 원본과 동일하다', async () => {
  const manifest = JSON.parse(await readFile(new URL('./manifest.json', import.meta.url), 'utf8'));
  const full = intents.map(({ props: _props, slots: _slots, ...intent }) => {
    const { propNames: _propNames, ...api } = components.find(component => component.name === intent.name);
    if (api.name === 'Button') api.props = api.props.filter(prop => prop.name !== 'iconOnly');
    return { ...intent, ...api, import: `import { ${intent.name} } from '@s2life/ui';` };
  });
  const before = structuredClone(full);
  const compact = compactCatalog(full);
  assert.deepEqual(full, before, '추출 결과를 변경하지 않는다');
  assert.deepEqual(compact, { derived: manifest.derived, components: manifest.components });
  const restored = compact.components.map(component => restoreComponent(component, compact.derived, compact.components));
  assert.deepEqual(restored, full);
  assert.equal(JSON.stringify(restored), JSON.stringify(full), '응답의 키 순서도 보존한다');
  for (const component of compact.components) {
    assert.ok(!Object.hasOwn(component, 'import'));
    assert.ok(!Object.hasOwn(component, 'kind') || component.kind !== 'component');
    assert.ok(!component.source?.startsWith(compact.derived.sourceRoot));
    if (component.partOf) {
      const original = full.find(entry => entry.name === component.name);
      const parent = full.find(entry => entry.name === component.partOf);
      assert.equal(Object.hasOwn(component, 'source'), original.source !== parent.source, '부모와 다른 소스는 남긴다');
    }
    for (const field of ['props', 'extends', 'slots']) assert.notDeepEqual(component[field], [], '빈 API 배열은 생략한다');
    for (const prop of component.props ?? []) {
      assert.ok(!Object.hasOwn(prop, 'required') || prop.required === true);
      if (!prop.required) assert.ok(!prop.type.endsWith(compact.derived.optionalTypeSuffix));
    }
  }
  // R43: 카탈로그 88,161B + 289B, 목록 19,679B + 271B. 운영 예산은 유지한다.
  assert.ok(Buffer.byteLength(JSON.stringify(compact)) <= 88_450);
  // 최대 상세 4,576B + 224B, 토큰 67,002B + 298B, 규칙 4,151B + 249B.
  assert.ok(Buffer.byteLength(JSON.stringify(listComponents(manifest))) <= 19_950);
  assert.ok(Math.max(...manifest.components.map(component => Buffer.byteLength(JSON.stringify(getComponent(manifest, component))))) <= 4_800);
  assert.ok(Buffer.byteLength(JSON.stringify(manifest.tokens)) <= 67_300);
  assert.ok(Buffer.byteLength(JSON.stringify({ rules: manifest.principles })) <= 4_400);
});
test('R33b: 다른 부품 소스·접두어 없는 규칙·절 번호 충돌도 무손실로 복원한다', () => {
  const entry = (name, extra = {}) => {
    const { source = 'packages/ui/src/root.tsx', ...intent } = extra;
    return { name, ...intent, kind: 'component', source, props: [], extends: [], slots: [],
      import: `import { ${name} } from '@s2life/ui';` };
  };
  const full = [
    entry('SameSource', { partOf: 'Root' }),
    entry('OtherSource', { partOf: 'Root', source: 'packages/ui/src/other.tsx' }),
    entry('Root', { rules: [
      { text: '일반 출처', source: 'DESIGN.md 8' },
      { text: '다른 문서', source: 'POLICY.md 2' },
      { text: '접두어 없는 절 번호', source: '7.1' },
      { text: '절 번호 충돌', source: 'DESIGN.md 7.1' },
      { text: '접두어로 시작하는 절', source: 'DESIGN.md DESIGN.md 8' },
    ] }),
    entry('EmptyRules', { rules: [] }),
  ];
  const before = structuredClone(full);
  const { components: compact, derived } = compactCatalog(full);
  assert.ok(!Object.hasOwn(compact[0], 'source'));
  assert.equal(compact[1].source, 'other.tsx');
  for (const field of ['props', 'extends', 'slots']) assert.ok(!Object.hasOwn(compact[0], field));
  assert.deepEqual(compact[2].rules.map(rule => rule.source), ['8', 'POLICY.md 2', '7.1', 'DESIGN.md 7.1', 'DESIGN.md DESIGN.md 8']);
  assert.deepEqual(compact[3].rules, [], '빈 rules는 키까지 보존한다');
  const restored = compact.map(component => restoreComponent(component, derived, compact));
  assert.deepEqual(restored, full);
  assert.equal(JSON.stringify(restored), JSON.stringify(full));
  assert.deepEqual(full, before, '압축과 복원이 입력을 변경하지 않는다');
  assert.throws(() => restoreComponent(compact[0], derived, []), /소스 복원 실패.*SameSource/);
});
test('생성된 매니페스트의 토큰 이름·값은 tokens.json 정규화 결과와 동일', async () => {
  const manifest = JSON.parse(await readFile(new URL('./manifest.json', import.meta.url), 'utf8'));
  assert.deepEqual(manifest.tokens.map(({ name, light, dark }) => ({ name, light, dark })), tokens.map(({ name, light, dark }) => ({ name, light, dark })));
});

test('자체 prop은 선언 원점으로 보존하고 DOM prop은 상속 이름으로 요약', () => {
  const button = components.find((c) => c.name === 'Button');
  assert.deepEqual(button.props.map((p) => p.name).sort(), ['asChild', 'iconOnly', 'leadingIcon', 'size', 'trailingIcon', 'variant']);
  assert.deepEqual(button.extends, ['React.ButtonHTMLAttributes<HTMLButtonElement>', 'VariantProps<typeof buttonVariants>']);
  assert.ok(button.props.find((p) => p.name === 'leadingIcon').doc.includes('라벨 왼쪽'));
  assert.ok(button.propNames.includes('onClick'));
  const card = components.find((c) => c.name === 'CardTitle');
  assert.deepEqual(card.props, []);
  assert.deepEqual(card.extends, ['React.HTMLAttributes<HTMLHeadingElement>']);
  assert.ok(components.find((c) => c.name === 'FormFlow').props.some((p) => p.name === 'onSubmit'));
});
test('Button 카탈로그는 요청한 네 prop만 펼치고 상속 계약은 보존', async () => {
  const manifest = JSON.parse(await readFile(new URL('./manifest.json', import.meta.url), 'utf8'));
  const button = manifest.components.find((c) => c.name === 'Button');
  assert.deepEqual(button.props.map((p) => p.name).sort(), ['asChild', 'leadingIcon', 'size', 'trailingIcon', 'variant']);
  assert.deepEqual(button.extends, components.find((c) => c.name === 'Button').extends);
  assert.ok(manifest.components.every((c) => !Object.hasOwn(c, 'propNames')));
});
// 다섯 응답 예산 모두 compact UTF-8 기준으로 정확한 경계와 +1바이트를 검사한다.
test('크기 예산 다섯 개는 경계값을 허용하고 1바이트 초과를 차단', (t) => {
  t.mock.method(console, 'error', () => {});
  const fixture = () => {
    const resource = compactCatalog([{ name: '테스트', kind: 'component', purpose: '', source: 'packages/ui/src/test.tsx',
      props: [], extends: [], slots: [], import: "import { 테스트 } from '@s2life/ui';" }]);
    return { resource, manifest: { ...resource, tokens: [{}], principles: [{}] } };
  };
  const bytes = value => Buffer.byteLength(JSON.stringify(value));
  const scenarios = [
    [90_000, f => f.resource, f => f.resource, 'padding'],
    [80_000, f => f.manifest.tokens, f => f.manifest.tokens[0], 'padding'],
    [8_000, f => ({ rules: f.manifest.principles }), f => f.manifest.principles[0], 'padding'],
    [24_000, f => listComponents(f.manifest), f => f.manifest.components[0], 'purpose'],
    [6_000, f => getComponent(f.manifest, f.manifest.components[0]), f => f.manifest.components[0], 'detail'],
  ];
  for (const [limit, response, target, key] of scenarios) {
    const f = fixture();
    target(f)[key] = '';
    target(f)[key] = 'x'.repeat(limit - bytes(response(f)));
    assert.equal(bytes(response(f)), limit);
    // 목록 경계는 여러 항목 합산 예산이다. 개별 상세 예산에 먼저 걸리지 않게 나눈다.
    if (limit === 24_000) {
      f.manifest.components[0].purpose = '';
      f.manifest.components = Array.from({ length: 8 }, (_, i) => ({ ...f.manifest.components[0], name: `Test${i}`, purpose: '' }));
      const remaining = limit - bytes(response(f));
      for (let i = 0; i < 8; i++) f.manifest.components[i].purpose = 'x'.repeat(Math.floor(remaining / 8) + (i < remaining % 8 ? 1 : 0));
      assert.equal(bytes(response(f)), limit);
    }
    assert.doesNotThrow(() => assertSizeBudget(f.resource, f.manifest), `허용 ${limit}`);
    if (limit === 24_000) f.manifest.components[0].purpose += 'x';
    else target(f)[key] += 'x';
    assert.equal(bytes(response(f)), limit + 1);
    assert.throws(() => assertSizeBudget(f.resource, f.manifest), /크기 예산 초과/);
  }
  const f = fixture();
  f.resource.padding = 'x'.repeat(90_000 - bytes({ ...f.resource, padding: '' }));
  f.resource.padding = f.resource.padding.slice(0, -2) + '가';
  assert.equal(bytes(f.resource), 90_001);
  assert.throws(() => assertSizeBudget(f.resource, f.manifest), /크기 예산 초과/);
});

test('전체 저장 크기는 응답 예산과 무관하며 토큰·규칙의 UTF-8 초과를 차단한다', t => {
  t.mock.method(console, 'error', () => {});
  const resource = compactCatalog([]);
  const manifest = { ...resource, tokens: [], principles: [], padding: 'x'.repeat(160_001) };
  assert.doesNotThrow(() => assertSizeBudget(resource, manifest));
  const bytes = value => Buffer.byteLength(JSON.stringify(value));
  for (const [key, limit, response] of [
    ['tokens', 80_000, () => manifest.tokens],
    ['principles', 8_000, () => ({ rules: manifest.principles })],
  ]) {
    manifest[key] = [{ text: '' }];
    manifest[key][0].text = 'x'.repeat(limit - bytes(response()) - 2) + '가';
    assert.equal(bytes(response()), limit + 1);
    assert.throws(() => assertSizeBudget(resource, manifest), /크기 예산 초과/);
    manifest[key] = [];
  }
});
