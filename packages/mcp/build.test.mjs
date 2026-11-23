import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extractComponents, normalizeTokens, validate, assertSizeBudget, compactCatalog, designSections } from '../../docs/research/mcp-build.mjs';
import { restoreComponent, listComponents, getComponent, componentIndex } from './catalog.mjs';
import { BUDGETS, RESERVE_FAMILIES, measureResponses } from './budget.mjs';
import intents, { principles } from '../../docs/research/component-intent.mjs';
const data = JSON.parse(await readFile(new URL('../../docs/research/tokens.json', import.meta.url), 'utf8'));
const design = await readFile(new URL('../../DESIGN.md', import.meta.url), 'utf8');
const components = extractComponents();
const tokens = normalizeTokens(data);
const sections = designSections(design);
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
  // R49: 리소스는 저장 형태 대신 선택 색인을 보낸다. 색인 실측 23,191B + 309B. 목록 19,873B(FormRow 포함) + 77B.
  assert.ok(Buffer.byteLength(JSON.stringify(componentIndex(manifest))) <= 23_500);
  // 최대 상세 4,576B + 224B, 토큰 67,002B + 298B, 규칙 4,151B + 249B.
  assert.ok(Buffer.byteLength(JSON.stringify(listComponents(manifest))) <= 19_950);
  assert.ok(Math.max(...manifest.components.map(component => Buffer.byteLength(JSON.stringify(getComponent(manifest, component))))) <= 4_800);
  // 2026-11-22 표 선택 행 토큰(bg-selected-row) 추가: 토큰 67,503B + 297B. 운영 상한 80KB 는 유지한다.
  assert.ok(Buffer.byteLength(JSON.stringify(manifest.tokens)) <= 67_800);
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

// 합집합 갈래마다 같은 선언이 다시 잡혀 doc 이 두 번 이어 붙던 결함(목표 49 1b에서 발견).
test('합집합 갈래마다 다시 잡히는 같은 JSDoc은 한 번만 남긴다', () => {
  const doc = (name, prop) => components.find((c) => c.name === name).props.find((p) => p.name === prop).doc;
  assert.equal(doc('DatePicker', 'onValueChange'), '확정한 값을 받는다. 입력 중 초안은 보내지 않는다.');
  assert.equal(doc('SegmentedControl', 'aria-label'), 'Defines a string value that labels the current element.');
});
test('자체 prop은 선언 원점으로 보존하고 DOM prop은 상속 이름으로 요약', () => {
  const button = components.find((c) => c.name === 'Button');
  assert.deepEqual(button.props.map((p) => p.name).sort(), ['asChild', 'iconOnly', 'leadingIcon', 'size', 'trailingIcon', 'variant']);
  assert.deepEqual(button.extends, ["React.ComponentProps<'button'>", 'VariantProps<typeof buttonVariants>']);
  assert.ok(button.props.find((p) => p.name === 'leadingIcon').doc.includes('라벨 왼쪽'));
  assert.ok(button.propNames.includes('onClick'));
  const card = components.find((c) => c.name === 'CardTitle');
  assert.deepEqual(card.props, []);
  assert.deepEqual(card.extends, ["React.ComponentProps<'h3'>"]);
  assert.ok(components.find((c) => c.name === 'FormFlow').props.some((p) => p.name === 'onSubmit'));
});
test('Button 카탈로그는 요청한 네 prop만 펼치고 상속 계약은 보존', async () => {
  const manifest = JSON.parse(await readFile(new URL('./manifest.json', import.meta.url), 'utf8'));
  const button = manifest.components.find((c) => c.name === 'Button');
  assert.deepEqual(button.props.map((p) => p.name).sort(), ['asChild', 'leadingIcon', 'size', 'trailingIcon', 'variant']);
  assert.deepEqual(button.extends, components.find((c) => c.name === 'Button').extends);
  assert.ok(manifest.components.every((c) => !Object.hasOwn(c, 'propNames')));
});
// R49 예산: 요약(색인·목록)은 항목당·전체·큰 묶음 예약, 상세·토큰·규칙은 고정 상한. 모두 compact UTF-8 로
// 정확한 경계는 통과하고 +1바이트는 막는다. 검사 하나씩 떼어 보려고 나머지 상한은 넉넉하게 둔다.
const entry = (name, extra = {}) => ({ name, kind: 'component', purpose: '', source: 'packages/ui/src/test.tsx',
  props: [], extends: [], slots: [], import: `import { ${name} } from '@s2life/ui';`, ...extra });
const manifestOf = entries => ({ ...compactCatalog(entries), tokens: [], principles: [] });
const loose = { index: { total: 1e9, entry: 1e9 }, list: { total: 1e9, entry: 1e9 }, detail: 1e9, tokens: 1e9, rules: 1e9 };
const bytes = value => Buffer.byteLength(JSON.stringify(value));
const quiet = { log: () => {} };
// 응답 크기가 정확히 target 이 되도록 한 문자열 필드를 채운다(ASCII 1바이트씩).
function fill(manifest, response, set, target) {
  set(manifest, '');
  set(manifest, 'x'.repeat(target - bytes(response(manifest))));
  assert.equal(bytes(response(manifest)), target);
}

test('R49 예산 수치는 문서의 구조와 같다', () => {
  assert.deepEqual(BUDGETS, { index: { total: 40_000, entry: 800 }, list: { total: 36_000, entry: 320 }, detail: 6_000, tokens: 80_000, rules: 8_000 });
  assert.equal(RESERVE_FAMILIES, 4);
});

test('R49 요약 응답: 항목당 상한과 전체 상한은 경계를 허용하고 1바이트 초과를 막는다', () => {
  const purpose = (m, value) => { m.components[0].purpose = value; };
  for (const [kind, response] of [['index', m => componentIndex(m).components[0]], ['list', m => listComponents(m).components[0]]]) {
    const m = manifestOf([entry('테스트')]);
    const budgets = { ...loose, [kind]: { total: 1e9, entry: 500 } };
    fill(m, response, purpose, 500);
    assert.doesNotThrow(() => assertSizeBudget(m, { ...quiet, budgets, reserve: 0 }), `${kind} 항목 500B`);
    m.components[0].purpose += 'x';
    assert.throws(() => assertSizeBudget(m, { ...quiet, budgets, reserve: 0 }), /항목 테스트 501바이트 > 500바이트/);
  }
  for (const [kind, response] of [['index', componentIndex], ['list', listComponents]]) {
    const m = manifestOf([entry('가'), entry('나')]);
    const budgets = { ...loose, [kind]: { total: 900, entry: 1e9 } };
    fill(m, response, purpose, 900);
    assert.doesNotThrow(() => assertSizeBudget(m, { ...quiet, budgets, reserve: 0 }), `${kind} 전체 900B`);
    m.components[0].purpose += '가';
    assert.equal(bytes(response(m)), 903, 'UTF-8 바이트로 잰다');
    assert.throws(() => assertSizeBudget(m, { ...quiet, budgets, reserve: 0 }), /전체 903바이트 > 900바이트/);
  }
});

test('R49 예약: 가장 큰 가족 N개를 더 받을 여유가 없으면 상한 안이어도 막는다', () => {
  const m = manifestOf([entry('Root', { category: 'layout', useWhen: ['쓸 때'], dont: ['금지'], parts: ['RootPart'] }), entry('RootPart', { partOf: 'Root' }), entry('Solo')]);
  for (const kind of ['index', 'list']) {
    const summary = measureResponses(m, { budgets: loose, reserve: 4 }).summaries[kind === 'index' ? 0 : 1];
    assert.equal(summary.largestFamily.name, 'Root');
    assert.equal(summary.largestFamily.count, 2);
    const exact = { ...loose, [kind]: { total: summary.projected, entry: 1e9 } };
    assert.doesNotThrow(() => assertSizeBudget(m, { ...quiet, budgets: exact, reserve: 4 }));
    const short = { ...loose, [kind]: { total: summary.projected - 1, entry: 1e9 } };
    assert.throws(() => assertSizeBudget(m, { ...quiet, budgets: short, reserve: 4 }), /예약 부족: 가장 큰 가족 4개/);
    assert.doesNotThrow(() => assertSizeBudget(m, { ...quiet, budgets: short, reserve: 0 }), '예약을 빼면 같은 크기가 통과한다');
  }
});

test('R49 예약 계산은 실제로 가장 큰 가족 4개를 복제해 넣은 응답 크기와 바이트까지 같다 — P3 4가족을 받는다', async () => {
  const manifest = JSON.parse(await readFile(new URL('./manifest.json', import.meta.url), 'utf8'));
  const { summaries } = measureResponses(manifest);
  for (const [summary, response] of [[summaries[0], m => componentIndex(m)], [summaries[1], m => listComponents(m)]]) {
    const family = manifest.components.filter(c => (c.partOf ?? c.name) === summary.largestFamily.name);
    const grown = { ...manifest, components: [...manifest.components, ...Array.from({ length: RESERVE_FAMILIES }, () => family).flat()] };
    assert.equal(bytes(response(grown)), summary.projected, summary.label);
    assert.ok(summary.projected <= summary.limit, `${summary.label}: 가장 큰 가족 ${RESERVE_FAMILIES}개를 더한 ${summary.projected}B > ${summary.limit}B`);
  }
  assert.doesNotThrow(() => assertSizeBudget(manifest, quiet), '현재 매니페스트는 예약까지 포함해 모든 예산 안이다');
});

test('R49 상세·토큰·규칙 상한과 저장 총량 무관', () => {
  const m = manifestOf([entry('테스트')]);
  fill(m, mm => getComponent(mm, mm.components[0]), (mm, v) => { mm.components[0].purpose = v; }, 700);
  assert.doesNotThrow(() => assertSizeBudget(m, { ...quiet, budgets: { ...loose, detail: 700 }, reserve: 0 }));
  m.components[0].purpose += 'x';
  assert.throws(() => assertSizeBudget(m, { ...quiet, budgets: { ...loose, detail: 700 }, reserve: 0 }), /get_component 최대 테스트 701바이트 > 700바이트/);
  for (const [key, limit, response, label] of [
    ['tokens', 'tokens', mm => mm.tokens, 'design://tokens'],
    ['principles', 'rules', mm => ({ rules: mm.principles }), 'get_rules 전체'],
  ]) {
    const mm = manifestOf([entry('테스트')]);
    mm[key] = [{ text: '' }];
    fill(mm, response, (x, v) => { x[key][0].text = v; }, 300);
    assert.doesNotThrow(() => assertSizeBudget(mm, { ...quiet, budgets: { ...loose, [limit]: 300 }, reserve: 0 }));
    mm[key][0].text = mm[key][0].text.slice(0, -1) + '가';
    assert.throws(() => assertSizeBudget(mm, { ...quiet, budgets: { ...loose, [limit]: 300 }, reserve: 0 }), new RegExp(`${label} 302바이트 > 300바이트`));
  }
  // 저장 형태(compact 카탈로그·매니페스트 전체)는 응답이 아니다. 아무리 커도 예산과 무관하다.
  const big = { ...manifestOf([entry('테스트')]), padding: 'x'.repeat(500_000) };
  big.derived = { ...big.derived, filler: 'x'.repeat(200_000) };
  assert.doesNotThrow(() => assertSizeBudget(big, quiet));
});

test('DESIGN.md 절 번호는 유일하다 — 실제 문서', () => {
  const headings = [...design.matchAll(/^#{2,6}\s+(\d+(?:\.\d+)*)(?:\.|\s)/gm)].map((m) => m[1]);
  assert.equal(sections.size, headings.length);
  for (const number of ['12.2', '13.3.1', '15.9.1', '16.4.1']) assert.ok(sections.has(number), number);
});
test('DESIGN.md 절 번호가 두 번 나오면 줄 번호와 함께 실패한다', () => {
  const doc = ['# 제목', '## 12. 요약', '### 12.1 가', '### 12.2 나', '본문', '### 12.2 나', '#### 13.3.1 다', '#### 13.3.1 다'].join('\n');
  assert.throws(() => designSections(doc), (error) => {
    assert.match(error.message, /절 번호 중복 2개/);
    assert.match(error.message, /§12\.2: 4·6행/);
    assert.match(error.message, /§13\.3\.1: 7·8행/);
    return true;
  });
});
test('DESIGN.md 절 번호 — 펜스 코드 안의 줄과 번호 없는 제목은 세지 않는다', () => {
  const doc = ['## 1. 원칙', '```md', '## 1. 예시 속 제목', '```', '~~~', '### 1.1 예시', '~~~', '## 부록', '## 부록', '### 1.1 실제'].join('\n');
  assert.deepEqual([...designSections(doc)], ['1', '1.1']);
});
