import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative } from 'node:path';
import { API, SymbolFlags, SignatureKind } from 'typescript/unstable/sync';
import * as ast from 'typescript/unstable/ast';
import intents, { principles } from './component-intent.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (path) => readFile(resolve(root, path), 'utf8');

// 타입 검사기의 공개 export 해석을 써야 export *, 타입 전용 export, 상속 props도 정확히 구분된다.
export function extractComponents() {
  const api = new API({ cwd: root });
  try {
    const snapshot = api.updateSnapshot({ openProjects: [resolve(root, 'tsconfig.json')] });
    const { program, checker } = snapshot.getProject(resolve(root, 'tsconfig.json'));
    const index = program.getSourceFile(resolve(root, 'packages/ui/src/index.ts'));
    const exports = checker.getExportsOfModule(checker.getSymbolAtLocation(index));
    return exports.filter((symbol) => /^[A-Z]/.test(symbol.name)).flatMap((symbol) => {
      if ((symbol.declarations ?? []).some((handle) => {
        let node = handle.resolve();
        while (node && !ast.isSourceFile(node)) {
          if (node.isTypeOnly) return true;
          node = node.parent;
        }
        return false;
      })) return [];
      const target = symbol.flags & SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
      if (!(target.flags & SymbolFlags.Value)) return [];
      const declaration = target.valueDeclaration.resolve();
      const source = declaration.getSourceFile();
      const type = checker.getTypeOfSymbolAtLocation(target, declaration);
      const signature = checker.getSignaturesOfType(type, SignatureKind.Call)[0];
      const param = signature?.getParameters()[0];
      const propsType = param && checker.getTypeOfSymbolAtLocation(param, declaration);
      const props = propsType ? checker.getPropertiesOfType(propsType).map((prop) => ({
        name: prop.name,
        type: checker.typeToString(checker.getTypeOfSymbolAtLocation(prop, declaration)),
        required: !(prop.flags & SymbolFlags.Optional),
        // 표준 DOM 속성은 별도로 표시한다. 커스텀 API가 수백 개 DOM 속성에 묻히지 않게 한다.
        inherited: !(prop.declarations ?? []).some((d) => (d.resolve()?.getSourceFile().fileName ?? "").startsWith(resolve(root, 'packages/ui/src'))),
      })) : [];
      const slots = new Set();
      function visit(node) {
        if (ast.isJsxAttribute(node) && node.name.getText(source) === 'data-slot' && node.initializer && ast.isStringLiteral(node.initializer)) slots.add(node.initializer.text);
        node.forEachChild(visit);
      }
      visit(declaration);
      return [{ name: symbol.name, kind: signature ? 'component' : 'constant', source: relative(root, source.fileName), props, slots: [...slots].sort() }];
    });
  } finally { api.close(); }
}

export function normalizeTokens(data) {
  const tokens = [];
  const add = (name, category, light, dark = light, purpose = `${category} 토큰`, tailwind = []) => {
    tokens.push({ name, cssVariable: `--${name}`, category, purpose, light, dark, tailwind });
  };
  for (const [hue, steps] of Object.entries(data.primitives)) for (const [step, value] of Object.entries(steps)) {
    add(`color-${hue}-${step}`, 'primitive', { value: value.hex, ref: null, oklch: value.oklch }, undefined, '원시 팔레트. 컴포넌트에서는 의미 토큰을 사용한다.');
  }
  for (const [name, light] of Object.entries(data.semantic.light)) {
    const dark = data.semantic.dark[name];
    if (!dark) throw new Error(`토큰 ${name}: 다크 테마 값 누락`);
    add(name, 'semantic', { value: light.hex, ref: light.ref }, { value: dark.hex, ref: dark.ref }, light.purpose);
  }
  if (Object.keys(data.semantic.dark).some((name) => !Object.hasOwn(data.semantic.light, name))) throw new Error('라이트·다크 토큰 이름 불일치');
  for (const item of data.typography) {
    for (const [suffix, value] of [['', `${item.size}px`], ['-lh', `${item.lineHeight}px`], ['-ls', item.letterSpacing], ['-weight', item.weight]]) {
      add(`text-${item.token}${suffix}`, 'typography', { value, ref: null }, undefined, item.purpose,
        suffix === '' ? [`text-${item.token}`, `text-[length:var(--text-${item.token})]`] : []);
    }
  }
  for (const value of data.spacing) add(`space-${value}`, 'spacing', { value: `${value}px`, ref: null }, undefined, '4px 격자 간격. Tailwind --spacing 배수를 덮어쓰지 않는다.', [`[gap:var(--space-${value})]`]);
  for (const category of ['shape','sizing','motion','loading']) for (const [name, value] of Object.entries(data[category])) {
    add(name, category, { value, ref: null }, { value: name === 'shadow-overlay' ? data.shape['shadow-overlay-dark'] : value, ref: name === 'shadow-overlay' ? 'shadow-overlay-dark' : null }, `${category}: ${name}`);
    // 임의의 CSS property 클래스는 제안하지 않는다. 역할이 문맥에 따라 달라지는 토큰은 var()로 소비한다.
    tokens.at(-1).tailwind = name.startsWith('radius-') ? [`rounded-${name.slice(7)}`] : name === 'shadow-overlay' ? ['shadow-overlay'] : [];
  }
  return tokens;
}

export function validate({ components, intents, sections, tokens, expectedNames, principles, bridgeTargets = [] }) {
  const errors = [];
  const names = new Set(intents.map((item) => item.name));
  const sourceNames = new Set(components.map((item) => item.name));
  const tokenNames = new Set(tokens.map((item) => item.name));
  for (const c of components) if (!names.has(c.name)) errors.push(`[1 export] ${c.name}: 의도 항목 누락 (${c.source})`);
  for (const item of intents) {
    const source = components.find((c) => c.name === item.name);
    if (!source) errors.push(`[1 export] ${item.name}: 공개 소스 export 없음`);
    if (intents.filter((c) => c.name === item.name).length !== 1) errors.push(`[1 export] ${item.name}: 중복 항목`);
    for (const prop of item.props) if (!source?.props.some((p) => p.name === prop)) errors.push(`[2 props] ${item.name}.${prop}: 실제 props에 없음`);
    for (const slot of item.slots) if (!source?.slots.includes(slot)) errors.push(`[3 slot] ${item.name}: data-slot="${slot}" 없음`);
    for (const related of item.related) if (!names.has(related) || !sourceNames.has(related)) errors.push(`[5 related] ${item.name} → ${related}: 항목 없음`);
    for (const token of item.tokens ?? []) if (!tokenNames.has(token)) errors.push(`[6 token] ${item.name} → ${token}: tokens.json에 없음`);
  }
  for (const item of [...intents.flatMap((c) => c.rules), ...principles]) {
    const section = /^DESIGN\.md (\d+(?:\.\d+)*)$/.exec(item.source)?.[1];
    if (!sections.has(section)) errors.push(`[4 source] ${item.source}: 실제 DESIGN.md 제목 없음 (${item.text})`);
  }
  for (const name of expectedNames) if (!tokenNames.has(name)) errors.push(`[6 token] ${name}: 매니페스트 토큰 누락`);
  for (const token of tokens) {
    if (!expectedNames.has(token.name)) errors.push(`[6 token] ${token.name}: tokens.json에 없는 이름`);
    for (const theme of ['light','dark']) {
      const ref = token[theme]?.ref;
      if (ref && !ref.startsWith('#') && !tokenNames.has(`color-${ref}`) && !tokenNames.has(ref)) errors.push(`[6 token] ${token.name}.${theme} → ${ref}: 참조 없음`);
    }
  }
  if (tokens.length !== tokenNames.size) errors.push('[6 token] 토큰 이름 중복');
  for (const name of bridgeTargets) if (!tokenNames.has(name) && !name.startsWith('font-')) errors.push(`[6 token] Tailwind 브리지 → ${name}: tokens.json에 없음`);
  return errors;
}

export async function build() {
  const data = JSON.parse(await read('docs/research/tokens.json'));
  const design = await read('DESIGN.md');
  const components = extractComponents();
  const tokens = normalizeTokens(data);
  // 클래스 별칭은 이미 생성된 브리지에서 읽는다. 색 이름을 두 번째 수동 목록으로 복제하지 않는다.
  const bridge = await read('packages/tokens/theme.css');
  const mappings = [...bridge.matchAll(/--color-([\w-]+)\s*:\s*var\(--([\w-]+)\)/g)];
  for (const [, alias, name] of mappings) {
    const token = tokens.find((t) => t.name === name);
    if (!token || token.category === 'primitive') continue;
    const prefix = name.startsWith('text-') || name.endsWith('-fg') || name === 'chart-axis' ? 'text'
      : name.startsWith('border-') || name.endsWith('-border') ? (name === 'border-focus' ? 'outline' : 'border') : 'bg';
    token.tailwind.push(`${prefix}-${alias}`);
    // SVG·링·테두리도 같은 별칭을 쓸 수 있다. 역할을 소비자가 선택한다.
    token.tailwindAliases = { color: alias, examples: [`bg-${alias}`, `text-${alias}`, `border-${alias}`, `fill-${alias}`, `stroke-${alias}`] };
  }
  const sections = new Set([...design.matchAll(/^#{2,6}\s+(\d+(?:\.\d+)*)(?:\.|\s)/gm)].map((m) => m[1]));
  const errors = validate({ components, intents, sections, tokens, expectedNames: new Set(normalizeTokens(data).map((t) => t.name)), principles, bridgeTargets: mappings.map((m) => m[2]) });
  if (errors.length) throw new Error(`MCP 생성 검증 실패:\n${errors.join('\n')}`);
  const catalog = intents.map(({ props: _props, slots: _slots, ...intent }) => {
    const source = components.find((c) => c.name === intent.name);
    return { ...intent, ...source, import: `import { ${intent.name} } from '@commerce-ds/ui';` };
  });
  const manifest = { schemaVersion: 1, tokens, components: catalog, principles };
  await writeFile(resolve(root, 'packages/mcp/manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.error(`MCP 검증 6종 통과: export ${catalog.length}개 · 토큰 ${tokens.length}개 · 규칙 ${principles.length}개`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
