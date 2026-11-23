// 공개 API 규약(DESIGN.md §6.3) 게이트. 검사기는 scripts/check-api-conventions.mjs 에 있고,
// 이 파일은 pnpm test·pre-commit 의 테스트 목록에 걸리도록 packages/ui/src/lib 에 둔다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkApiConventions, loadInputs, parseIndexExports, classifyBases, usesForwardRef, hasDeprecatedTag, surveyTable,
} from '../../../../scripts/check-api-conventions.mjs';

const inputs = await loadInputs();

test('저장소 공개 API 가 규약을 지킨다 — 새 위반은 고치거나 이유와 함께 허용 목록에 둔다', () => {
  const { violations, errors } = checkApiConventions(inputs);
  assert.deepEqual(errors, []);
  assert.deepEqual(violations.map(item => `${item.rule} ${item.target} — ${item.message}`), []);
});

test('조사표는 매니페스트의 모든 부품을 한 줄씩 담는다', () => {
  const table = surveyTable(inputs);
  const components = inputs.manifest.components.filter(item => (item.kind ?? inputs.manifest.derived.kindDefault) === 'component');
  assert.equal(table.split('\n').length, components.length + 2);
  assert.match(table, /\| Button \| — \| — \| ref prop \|/);
});

// 합성 매니페스트 — 규칙마다 위반을 하나씩 만들어 실제로 잡히는지 본다.
const derived = inputs.manifest.derived;
const entry = (name, props = [], bases = [], extra = {}) => ({
  name, purpose: '', source: 'x.tsx', props: props.map(prop => typeof prop === 'string' ? { name: prop, type: 'string' } : prop),
  extends: bases, ...extra,
});
function run(components, { index = "export { A } from './a';", source = '', helpers = {}, deprecatedProps = [], allow = [] } = {}) {
  const names = components.map(item => item.name).join(', ');
  return checkApiConventions({
    manifest: { derived, components },
    indexSource: index.includes('{ A }') ? `export { ${names} } from './a';` : index,
    sources: new Map([['packages/ui/src/x.tsx', source]]),
    helpers, deprecatedProps, allow,
  });
}
const rules = result => result.violations.map(item => `${item.rule} ${item.target}`);

test('제어/비제어 쌍: X · defaultX · onXChange', () => {
  assert.deepEqual(rules(run([entry('A', ['value', 'defaultValue', 'onValueChange'])])), []);
  assert.deepEqual(rules(run([entry('A', ['onValueChange'])])), ['pair/handler-without-value A.onValueChange']);
  assert.deepEqual(rules(run([entry('A', ['value', 'onValueChange'])])), ['pair/no-default A.value']);
  assert.deepEqual(rules(run([entry('A', ['value', 'defaultValue'])])), ['pair/default-without-handler A.defaultValue']);
  assert.deepEqual(rules(run([entry('A', ['open'])])), ['pair/value-without-handler A.open']);
  // 표시값 value(ProgressTrack)·비제어 전용 초기값(DatePicker defaultMonth)은 쌍을 요구하지 않는다.
  assert.deepEqual(rules(run([entry('A', ['value', 'defaultMonth'])])), []);
});

test('핸들러: onChange 는 DOM 이벤트 전용, on{X}Change 는 이벤트가 아니라 값을 받는다', () => {
  assert.deepEqual(rules(run([entry('A', ['onChange'])])), ['handler/onChange A.onChange']);
  const alias = { component: 'A', prop: 'onChange', replacement: 'onValueChange' };
  const aliased = run([entry('A', ['value', 'defaultValue', 'onValueChange', 'onChange'])],
    { deprecatedProps: [alias], source: '/** @deprecated 옛 이름 */\n  onChange?: () => void;' });
  assert.deepEqual([...rules(aliased), ...aliased.errors], []);
  const untagged = run([entry('A', ['value', 'defaultValue', 'onValueChange', 'onChange'])], { deprecatedProps: [alias], source: 'onChange?: () => void;' });
  assert.match(untagged.errors.join('\n'), /@deprecated JSDoc 이 없다/);
  const event = { name: 'onValueChange', type: '(event: React.ChangeEvent<HTMLInputElement>) => void' };
  assert.deepEqual(rules(run([entry('A', ['value', 'defaultValue', event])])), ['handler/event-arg A.onValueChange']);
});

test('ref: forwardRef 금지, DOM 을 펼치면 ref 타입 노출', () => {
  assert.deepEqual(rules(run([entry('A')], { source: 'export const A = React.forwardRef<HTMLDivElement, P>(() => null);' })), ['ref/forwardRef A']);
  assert.deepEqual(rules(run([entry('A', [], ['React.HTMLAttributes<HTMLDivElement>'])])), ['ref/missing A']);
  assert.deepEqual(rules(run([entry('A', [], ["Omit<React.ComponentPropsWithoutRef<'nav'>, 'children'>"])])), ['ref/missing A']);
  assert.deepEqual(rules(run([entry('A', [], ["React.ComponentProps<'div'>"])])), []);
  assert.deepEqual(rules(run([entry('A', [], ['React.HTMLAttributes<HTMLElement>', 'React.RefAttributes<HTMLElement>'])])), []);
  // Pick<…> 은 몇 개 배선 속성만 고른 것이라 DOM 펼침이 아니다(Select 의 id·aria-*).
  assert.deepEqual(rules(run([entry('A', [], ["Pick<React.ComponentPropsWithoutRef<'button'>, 'id'>"])])), []);
  // 합성 부품(DOM 속성을 상속하지 않음)은 ref 를 요구하지 않는다.
  assert.deepEqual(rules(run([entry('A', ['title'])])), []);
});

test('내보내기: export * 금지, 소문자 값은 공개 도우미 목록에 이유와 함께', () => {
  assert.deepEqual(rules(run([entry('A')], { index: "export * from './a';" })), ['export/star ./a']);
  const index = "export { A, helper, type HelperOptions } from './a';";
  assert.deepEqual(rules(run([entry('A')], { index })), ['export/helper helper']);
  assert.deepEqual(rules(run([entry('A')], { index, helpers: { helper: { use: '앱이 쓰는 이유' } } })), []);
  assert.match(run([entry('A')], { index, helpers: { helper: {} } }).errors.join('\n'), /use\(용도\) 또는 deprecated/);
  assert.match(run([entry('A')], { helpers: { gone: { use: 'x' } } }).errors.join('\n'), /helpers\.gone: index\.ts 가 내보내지 않는다/);
  const deprecated = { helper: { deprecated: '부품이 맡는다', source: 'x.tsx' } };
  assert.match(run([entry('A')], { index, helpers: deprecated, source: 'export function helper() {}' }).errors.join('\n'), /@deprecated JSDoc 이 없다/);
  assert.deepEqual(run([entry('A')], { index, helpers: deprecated, source: '/** @deprecated 뺀다 */\nexport function helper() {}' }).errors, []);
});

test('허용 목록: 덮은 위반은 통과, 고친 뒤 남은 항목과 이유 없는 항목은 오류', () => {
  const allowed = run([entry('A', ['value', 'onValueChange'])], { allow: [{ rule: 'pair/no-default', target: 'A.value', reason: '제어 전용' }] });
  assert.deepEqual([...rules(allowed), ...allowed.errors], []);
  assert.equal(allowed.allowed.length, 1);
  const stale = run([entry('A', ['value', 'defaultValue', 'onValueChange'])], { allow: [{ rule: 'pair/no-default', target: 'A.value', reason: '제어 전용' }] });
  assert.match(stale.errors.join('\n'), /더 이상 위반이 아니다/);
  const reasonless = run([entry('A', ['value', 'onValueChange'])], { allow: [{ rule: 'pair/no-default', target: 'A.value' }] });
  assert.match(reasonless.errors.join('\n'), /reason 이 비었다/);
});

test('도우미 파서·분류기', () => {
  assert.deepEqual(parseIndexExports(`// export * from './x';\nexport { A, b as c, type T } from './a';\nexport type { U } from './u';\nexport * from './s';`),
    { names: [{ name: 'A', type: false, from: './a' }, { name: 'c', type: false, from: './a' }, { name: 'T', type: true, from: './a' }, { name: 'U', type: true, from: './u' }], stars: ['./s'] });
  assert.deepEqual(classifyBases(["Pick<React.ComponentPropsWithRef<'button'>, 'id' | 'ref'>"]), { hasRef: true, domWithoutRef: false });
  assert.ok(usesForwardRef('const SelectItem = React.forwardRef<\n', 'SelectItem'));
  assert.ok(!usesForwardRef('function SelectItem({ ref }: P) {}', 'SelectItem'));
  assert.ok(hasDeprecatedTag('/**\n * 설명\n * @deprecated 뺀다\n */\nexport const x = 1;', 'x'));
  assert.ok(!hasDeprecatedTag('/** @deprecated 다른 것 */\nexport const y = 1;\nexport const x = 1;', 'x'));
});
