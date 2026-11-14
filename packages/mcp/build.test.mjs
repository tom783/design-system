import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extractComponents, normalizeTokens, validate, assertSizeBudget } from '../../docs/research/mcp-build.mjs';
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
test('생성된 매니페스트의 토큰 이름·값은 tokens.json 정규화 결과와 동일', async () => {
  const manifest = JSON.parse(await readFile(new URL('./manifest.json', import.meta.url), 'utf8'));
  assert.deepEqual(manifest.tokens.map(({ name, light, dark }) => ({ name, light, dark })), tokens.map(({ name, light, dark }) => ({ name, light, dark })));
});

test('자체 prop은 선언 원점으로 보존하고 DOM prop은 상속 이름으로 요약', () => {
  const button = components.find((c) => c.name === 'Button');
  assert.deepEqual(button.props.map((p) => p.name).sort(), ['iconOnly', 'leadingIcon', 'size', 'trailingIcon', 'variant']);
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
  assert.deepEqual(button.props.map((p) => p.name).sort(), ['leadingIcon', 'size', 'trailingIcon', 'variant']);
  assert.deepEqual(button.extends, components.find((c) => c.name === 'Button').extends);
  assert.ok(manifest.components.every((c) => !Object.hasOwn(c, 'propNames')));
});
test('크기 예산은 경계값을 허용하고 UTF-8 바이트 초과를 차단', (t) => {
  t.mock.method(console, 'error', () => {});
  const catalog = ['x'.repeat(80_000 - Buffer.byteLength(JSON.stringify([''], null, 2)))];
  assert.doesNotThrow(() => assertSizeBudget(catalog, 'x'.repeat(160_000)));
  assert.throws(() => assertSizeBudget([catalog[0] + '가'], ''), /크기 예산 초과/);
  assert.throws(() => assertSizeBudget([], 'x'.repeat(159_998) + '가'), /크기 예산 초과/);
});
