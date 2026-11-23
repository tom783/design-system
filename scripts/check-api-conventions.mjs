// 공개 API 규약 검사 — 규약은 DESIGN.md §6.3, 예외 목록은 api-conventions-allow.mjs.
//
// 입력은 세 가지다. 생성된 매니페스트(packages/mcp/manifest.json — pre-commit 이 소스와 같음을 보장한다)에서
// 부품·자체 props·상속 타입을 읽고, 루트 index.ts 에서 공개 이름을 읽고, 매니페스트가 가리키는 소스에서
// forwardRef 와 @deprecated 표기를 읽는다. TypeScript 검사기를 띄우지 않으므로 pre-commit 에서도 빠르다.
//
// 기존 위반은 허용 목록에 이유와 함께 둔다. 고쳐서 더 이상 위반이 아닌 항목이 목록에 남아 있으면
// 그것도 실패다 — 목록이 "고칠 것" 목록으로만 줄어들게 한다.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { restoreComponent } from '../packages/mcp/catalog.mjs';
import { helpers as defaultHelpers, deprecatedProps as defaultDeprecatedProps, allow as defaultAllow } from './api-conventions-allow.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

/** 사용자가 바꾸는 UI 상태 이름. 이 이름의 자체 prop 은 on{X}Change 알림이 있어야 한다. value 는 표시값(ProgressTrack 등)과 겹쳐 뺀다. */
export const STATE_NAMES = ['open', 'checked', 'expanded', 'collapsed', 'pressed', 'selected'];

const upperFirst = (text) => text[0].toUpperCase() + text.slice(1);
const lowerFirst = (text) => text[0].toLowerCase() + text.slice(1);

/** 상속 타입 표기 분류. Pick<…> 은 몇 개 속성만 고른 배선(id·aria-*)이라 DOM 펼침으로 보지 않는다. */
export function classifyBases(bases) {
  const spread = bases.filter(base => !/^Pick</.test(base));
  return {
    // ComponentProps<…>(React 19 에서 ref 포함) · ComponentPropsWithRef · RefAttributes · Pick<…, 'ref'>
    hasRef: bases.some(base => /\bComponentProps<|\bComponentPropsWithRef<|\bRefAttributes</.test(base) || /^Pick<[\s\S]*'ref'/.test(base)),
    // *HTMLAttributes<…> · ComponentPropsWithoutRef<…> 를 펼치면 DOM 요소에 나머지 props 를 넘기는 부품이다.
    domWithoutRef: spread.some(base => /HTMLAttributes<|\bComponentPropsWithoutRef</.test(base)),
  };
}

/** 소스에서 `const Name = React.forwardRef` 선언을 찾는다. */
export function usesForwardRef(source, name) {
  return new RegExp(String.raw`(?:^|\n)\s*(?:export\s+)?const\s+${name}\s*=\s*(?:React\.)?forwardRef\b`).test(source);
}

/** 이름 바로 앞 JSDoc 에 @deprecated 가 있는가. prop(`name?:`)·함수(`export function name`)·상수 선언에 쓴다. */
export function hasDeprecatedTag(source, name) {
  const declaration = String.raw`(?:export\s+(?:function|const)\s+${name}\b|\b${name}\??\s*:)`;
  return new RegExp(String.raw`/\*\*(?:(?!\*/)[\s\S])*@deprecated(?:(?!\*/)[\s\S])*\*/\s*${declaration}`).test(source);
}

/** 루트 index.ts 의 `export { … } from` 목록을 읽는다. `export *` 는 이름을 알 수 없어 따로 센다. */
export function parseIndexExports(source) {
  const names = [];
  const stars = [];
  const code = source.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of code.matchAll(/export\s+\*\s+from\s+['"]([^'"]+)['"]/g)) stars.push(match[1]);
  for (const match of code.matchAll(/export\s+(type\s+)?\{([^}]*)\}\s*from\s+['"]([^'"]+)['"]/g)) {
    for (const raw of match[2].split(',').map(item => item.trim()).filter(Boolean)) {
      const typeOnly = Boolean(match[1]) || raw.startsWith('type ');
      const name = raw.replace(/^type\s+/, '').split(/\s+as\s+/).at(-1).trim();
      names.push({ name, type: typeOnly, from: match[3] });
    }
  }
  return { names, stars };
}

/**
 * 규약 검사. 위반(violations)은 허용 목록으로 덮을 수 있고, 오류(errors)는 목록 자체가 틀린 것이라 덮을 수 없다.
 * @returns {{ violations: {rule: string, target: string, message: string}[], errors: string[], allowed: object[] }}
 */
export function checkApiConventions({ manifest, indexSource, sources, helpers = defaultHelpers,
  deprecatedProps = defaultDeprecatedProps, allow = defaultAllow }) {
  const violations = [];
  const errors = [];
  const add = (rule, target, message) => violations.push({ rule, target, message });
  const components = manifest.components.map(entry => restoreComponent(entry, manifest.derived, manifest.components));
  const aliases = new Set(deprecatedProps.map(item => `${item.component}.${item.prop}`));

  for (const component of components) {
    if (component.kind !== 'component') continue;
    const own = new Set(component.props.map(prop => prop.name));
    const { name } = component;
    // 1. 제어/비제어 쌍: X · defaultX · onXChange
    for (const prop of component.props) {
      const handler = /^on([A-Z]\w*)Change$/.exec(prop.name);
      if (handler) {
        const value = lowerFirst(handler[1]);
        if (!own.has(value)) add('pair/handler-without-value', `${name}.${prop.name}`, `${prop.name} 가 있는데 제어 값 ${value} 가 없다`);
        else if (!own.has(`default${handler[1]}`)) add('pair/no-default', `${name}.${value}`, `${value}·${prop.name} 는 있는데 비제어 초기값 default${handler[1]} 가 없다(제어 전용)`);
        if (/Event\b|Event</.test(prop.type)) add('handler/event-arg', `${name}.${prop.name}`, `${prop.name} 는 이벤트가 아니라 새 값을 받는다: ${prop.type}`);
      }
      const initial = /^default([A-Z]\w*)$/.exec(prop.name);
      if (initial && own.has(lowerFirst(initial[1])) && !own.has(`on${initial[1]}Change`))
        add('pair/default-without-handler', `${name}.${prop.name}`, `${lowerFirst(initial[1])}·${prop.name} 는 있는데 on${initial[1]}Change 가 없다`);
      if (STATE_NAMES.includes(prop.name) && !own.has(`on${upperFirst(prop.name)}Change`))
        add('pair/value-without-handler', `${name}.${prop.name}`, `상태 ${prop.name} 를 받는데 on${upperFirst(prop.name)}Change 가 없다`);
    }
    // 2. 핸들러 이름: onChange 는 DOM change 이벤트(상속) 전용이다. 자체 prop 으로 다시 정의하지 않는다.
    if (own.has('onChange') && !aliases.has(`${name}.onChange`))
      add('handler/onChange', `${name}.onChange`, '값을 알리는 핸들러는 on{X}Change(예: onValueChange)다. onChange 는 DOM 이벤트용으로 남긴다');
    // 3. ref: ref-as-prop. forwardRef 를 쓰지 않고, DOM 에 나머지 props 를 펼치는 부품은 ref 타입을 노출한다.
    const source = sources.get(component.source);
    if (source === undefined) errors.push(`${name}: 소스 ${component.source} 를 읽지 못했다`);
    const forwardRef = source !== undefined && usesForwardRef(source, name);
    if (forwardRef) add('ref/forwardRef', name, 'forwardRef 대신 ref 를 prop 으로 받는다(React 19)');
    const bases = classifyBases(component.extends);
    if (!forwardRef && bases.domWithoutRef && !bases.hasRef && !own.has('ref'))
      add('ref/missing', name, `DOM 속성을 펼치는데 ref 타입이 없다: ${component.extends.join(' · ')}`);
  }

  // 4. 내보내기 범위
  const { names: exported, stars } = parseIndexExports(indexSource);
  for (const from of stars) add('export/star', from, `index.ts 의 export * from '${from}' — 공개 이름을 나열한다`);
  const values = exported.filter(item => !item.type);
  const valueNames = new Set(values.map(item => item.name));
  const manifestNames = new Set(manifest.components.map(item => item.name));
  for (const item of values) {
    if (/^[A-Z]/.test(item.name)) {
      if (!manifestNames.has(item.name)) errors.push(`${item.name}: index.ts 가 내보내는 대문자 값인데 매니페스트에 없다`);
    } else if (!Object.hasOwn(helpers, item.name)) {
      add('export/helper', item.name, `공개 도우미 목록(api-conventions-allow.mjs helpers)에 없는 소문자 export`);
    }
  }
  if (!stars.length) {
    for (const name of manifestNames) if (!valueNames.has(name)) errors.push(`${name}: 매니페스트에는 있는데 index.ts 이름 목록에 없다(파서 또는 내보내기 누락)`);
    for (const name of Object.keys(helpers)) if (!valueNames.has(name)) errors.push(`helpers.${name}: index.ts 가 내보내지 않는다 — 목록에서 지운다`);
  }
  for (const [name, entry] of Object.entries(helpers)) {
    if (!entry.use && !entry.deprecated) errors.push(`helpers.${name}: use(용도) 또는 deprecated(뺄 이유)가 필요하다`);
    if (entry.deprecated) {
      const source = sources.get(`packages/ui/src/${entry.source}`);
      if (source === undefined) errors.push(`helpers.${name}: source ${entry.source} 를 읽지 못했다`);
      else if (!hasDeprecatedTag(source, name)) errors.push(`helpers.${name}: 목록은 deprecated 인데 ${entry.source} 선언에 @deprecated JSDoc 이 없다`);
    }
  }
  // 5. deprecated 별칭 prop: 새 이름이 함께 있고 소스에 @deprecated 가 있어야 한다.
  for (const item of deprecatedProps) {
    const component = components.find(c => c.name === item.component);
    const own = new Set(component?.props.map(prop => prop.name) ?? []);
    if (!component) { errors.push(`deprecatedProps ${item.component}: 매니페스트에 없다`); continue; }
    if (!own.has(item.prop)) errors.push(`deprecatedProps ${item.component}.${item.prop}: prop 이 없다 — 별칭을 지웠다면 목록에서도 지운다`);
    if (!own.has(item.replacement)) errors.push(`deprecatedProps ${item.component}.${item.prop}: 새 이름 ${item.replacement} 이 없다`);
    const source = sources.get(component.source);
    if (source !== undefined && !hasDeprecatedTag(source, item.prop)) errors.push(`deprecatedProps ${item.component}.${item.prop}: ${component.source} 에 @deprecated JSDoc 이 없다`);
  }

  // 허용 목록 대조: 덮인 위반은 빼고, 아무것도 덮지 않는 항목은 오류다.
  const key = (item) => `${item.rule} ${item.target}`;
  const allowKeys = new Map(allow.map(item => [key(item), item]));
  for (const item of allow) {
    if (!item.reason) errors.push(`allow ${key(item)}: reason 이 비었다`);
    if (allow.filter(other => key(other) === key(item)).length > 1) errors.push(`allow ${key(item)}: 중복`);
  }
  const seen = new Set(violations.map(key));
  for (const item of allow) if (!seen.has(key(item))) errors.push(`allow ${key(item)}: 더 이상 위반이 아니다 — 허용 목록에서 지운다`);
  return {
    violations: violations.filter(item => !allowKeys.has(key(item))),
    allowed: violations.filter(item => allowKeys.has(key(item))),
    errors: [...new Set(errors)],
    all: violations,
  };
}

/** 저장소의 실제 입력을 읽는다. */
export async function loadInputs(base = root) {
  const manifest = JSON.parse(await readFile(resolve(base, 'packages/mcp/manifest.json'), 'utf8'));
  const indexSource = await readFile(resolve(base, 'packages/ui/src/index.ts'), 'utf8');
  const paths = new Set(manifest.components.map(entry => restoreComponent(entry, manifest.derived, manifest.components).source));
  for (const entry of Object.values(defaultHelpers)) if (entry.source) paths.add(`packages/ui/src/${entry.source}`);
  const sources = new Map();
  for (const path of paths) sources.set(path, await readFile(resolve(base, path), 'utf8').catch(() => undefined));
  return { manifest, indexSource, sources };
}

/** 부품별 조사표(마크다운). 값 props 는 자체 prop 만 본다 — Radix 에서 상속한 값은 상속 열에 남는다. */
export function surveyTable({ manifest, sources }) {
  const components = manifest.components.map(entry => restoreComponent(entry, manifest.derived, manifest.components));
  const rows = [['부품', '값 (X · defaultX · onXChange)', '그 밖의 핸들러', 'ref', '상속']];
  for (const component of components) {
    if (component.kind !== 'component') continue;
    const own = new Set(component.props.map(prop => prop.name));
    const states = new Set();
    for (const prop of own) {
      const handler = /^on([A-Z]\w*)Change$/.exec(prop)?.[1];
      const initial = /^default([A-Z]\w*)$/.exec(prop)?.[1];
      if (handler) states.add(lowerFirst(handler));
      if (initial && own.has(lowerFirst(initial))) states.add(lowerFirst(initial));
      if (STATE_NAMES.includes(prop)) states.add(prop);
    }
    const pairs = [...states].map(x => `${x}${own.has(x) ? '' : '✗'} · ${own.has(`default${upperFirst(x)}`) ? `default${upperFirst(x)}` : '✗'} · ${own.has(`on${upperFirst(x)}Change`) ? `on${upperFirst(x)}Change` : '✗'}`);
    const others = component.props.map(prop => prop.name).filter(prop => /^on[A-Z]/.test(prop) && !/^on[A-Z]\w*Change$/.test(prop));
    const source = sources.get(component.source) ?? '';
    const bases = classifyBases(component.extends);
    const ref = usesForwardRef(source, component.name) ? 'forwardRef'
      : bases.hasRef || own.has('ref') ? 'ref prop' : bases.domWithoutRef ? '미노출' : '없음(합성)';
    rows.push([component.partOf ? `${component.name} ⊂ ${component.partOf}` : component.name, pairs.join('<br>') || '—',
      others.join(', ') || '—', ref, component.extends.map(base => `\`${base.replace(/\s+/g, ' ').replace(/\|/g, '\\|')}\``).join('<br>') || '—']);
  }
  return rows.map(row => `| ${row.join(' | ')} |`).toSpliced(1, 0, `|${' --- |'.repeat(rows[0].length)}`).join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const inputs = await loadInputs();
  if (process.argv.includes('--table')) {
    console.log(surveyTable(inputs));
  } else {
    const { violations, errors, allowed } = checkApiConventions(inputs);
    for (const item of allowed) console.error(`  (허용) ${item.rule} ${item.target}`);
    if (violations.length || errors.length) {
      console.error(`공개 API 규약 위반 ${violations.length}건 · 목록 오류 ${errors.length}건 (DESIGN.md §6.3):`);
      for (const item of violations) console.error(`  ✗ ${item.rule} ${item.target} — ${item.message}`);
      for (const error of errors) console.error(`  ✗ ${error}`);
      process.exitCode = 1;
    } else console.error(`공개 API 규약 통과 — 허용 목록 ${allowed.length}건`);
  }
}
