import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { API, SymbolFlags, SignatureKind } from 'typescript/unstable/sync';
import * as ast from 'typescript/unstable/ast';
import { checkBoundaries } from '../../scripts/check-boundaries.mjs';
import intents, { principles } from './component-intent.mjs';
import { restoreComponent } from '../../packages/mcp/catalog.mjs';
import { checkConsumerGuidance } from './consumer-guidance.mjs';

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
    // 공개로 내보내는 타입 이름. extends 에서 이 이름들은 펼치지 않고 그대로 남긴다.
    const publicTypeNames = new Set(exports.map((symbol) => symbol.name));
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
      const allProps = propsType ? checker.getPropertiesOfType(propsType) : [];
      const uiRoot = resolve(root, 'packages/ui/src') + '/';
      // 선언 원점으로 분리한다. VariantProps의 mapped prop도 원점이 로컬 cva 키면 자체 API다.
      const props = allProps.filter((prop) => (prop.declarations ?? []).some((d) =>
        d.resolve()?.getSourceFile().fileName.startsWith(uiRoot),
      )).map((prop) => {
        const nodes = (prop.declarations ?? []).map((d) => d.resolve());
        const doc = nodes.flatMap((node) => (node?.jsDoc ?? []).map((comment) =>
          ast.getTextOfJSDocComment(comment.comment),
        )).filter(Boolean).join('\n');
        return {
          name: prop.name,
          type: checker.typeToString(checker.getTypeOfSymbolAtLocation(prop, declaration)),
          required: !(prop.flags & SymbolFlags.Optional),
          ...(doc ? { doc } : {}),
        };
      });
      const bases = new Set();
      const visitedTypes = new Set();
      // depth 0 은 컴포넌트 자신의 props 타입이다. 그건 언제나 펼친다 —
      // 보존하면 \"DataTable extends DataTableProps<T>\" 라는 순환이 된다.
      function recordBase(node, depth = 0) {
        if (!node || visitedTypes.has(node)) return;
        visitedTypes.add(node);
        if (ast.isIntersectionTypeNode(node) || ast.isUnionTypeNode(node)) { node.types.forEach(child => recordBase(child, depth)); return; }
        if (!ast.isTypeReferenceNode(node) && !ast.isExpressionWithTypeArguments(node)) return;
        let symbol = checker.getSymbolAtLocation(node.typeName ?? node.expression);
        if (symbol?.flags & SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
        const localTypes = (symbol?.declarations ?? []).map(d => d.resolve()).filter(d =>
          d && (ast.isInterfaceDeclaration(d) || ast.isTypeAliasDeclaration(d)) && d.getSourceFile().fileName.startsWith(uiRoot),
        );
        // 공개로 내보내는 타입은 펼치지 않고 이름을 남긴다. 소비자가 찾아볼 수 있는
        // 계약이기 때문이다. 펼치면 UseDataTableOptions<T> 같은 포인터가 사라진다.
        if (depth > 0 && localTypes.length && publicTypeNames.has(symbol?.name)) {
          bases.add(node.getText(node.getSourceFile()));
        } else if (localTypes.length) {
          for (const type of localTypes) {
            // 별칭은 같은 층이다. 이름만 다른 같은 타입이라 홉이 아니다 —
            // depth 를 올리면 ComboboxProps = A | B 의 A·B 가 "중첩" 으로 보여 보존된다.
            if (ast.isTypeAliasDeclaration(type)) recordBase(type.type, depth);
            else for (const clause of type.heritageClauses ?? []) for (const base of clause.types) recordBase(base, depth + 1);
          }
        } else if (!(symbol?.declarations ?? []).some(d => d.resolve()?.getSourceFile().fileName.startsWith(uiRoot))) {
          bases.add(node.getText(node.getSourceFile()));
        }
      }
      // 일반 함수의 인자 타입과 forwardRef의 props 타입 인자를 모두 소스 그대로 보존한다.
      for (const handle of param?.declarations ?? []) {
        const node = handle.resolve();
        if (node?.getSourceFile().fileName.startsWith(uiRoot)) recordBase(node.type);
      }
      const initializer = declaration.initializer;
      if (initializer && ast.isCallExpression(initializer) && initializer.expression.getText(source).endsWith('forwardRef'))
        recordBase(initializer.typeArguments?.at(-1));
      const slots = new Set();
      const visited = new Set();
      function visit(node) {
        if (visited.has(node)) return;
        visited.add(node);
        const nodeSource = node.getSourceFile();
        if (ast.isJsxAttribute(node) && node.name.getText(nodeSource) === 'data-slot' && node.initializer && ast.isStringLiteral(node.initializer)) slots.add(node.initializer.text);
        // 판별 유니온으로 분기하는 로컬 구현도 공개 컴포넌트의 슬롯이다.
        // DOM 태그·외부 라이브러리는 따라가지 않아 라이브러리 내부 슬롯이 새지 않게 한다.
        if (ast.isJsxOpeningElement(node) || ast.isJsxSelfClosingElement(node)) {
          let symbol = checker.getSymbolAtLocation(node.tagName);
          if (symbol?.flags & SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
          const implementation = symbol?.valueDeclaration?.resolve();
          if (implementation?.getSourceFile().fileName.startsWith(uiRoot)) visit(implementation);
        }
        node.forEachChild(visit);
      }
      visit(declaration);
      return [{ name: symbol.name, kind: signature ? 'component' : 'constant', source: relative(root, source.fileName), props, extends: [...bases], propNames: allProps.map((p) => p.name), slots: [...slots].sort() }];
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
  const errors = checkConsumerGuidance(intents).map(error => `[8 guidance] ${JSON.stringify(error)}`);
  const names = new Set(intents.map((item) => item.name));
  const sourceNames = new Set(components.map((item) => item.name));
  const tokenNames = new Set(tokens.map((item) => item.name));
  for (const c of components) if (!names.has(c.name)) errors.push(`[1 export] ${c.name}: 의도 항목 누락 (${c.source})`);
  for (const item of intents) {
    const source = components.find((c) => c.name === item.name);
    if (!source) errors.push(`[1 export] ${item.name}: 공개 소스 export 없음`);
    if (intents.filter((c) => c.name === item.name).length !== 1) errors.push(`[1 export] ${item.name}: 중복 항목`);
    for (const prop of item.props) if (!source?.propNames.includes(prop)) errors.push(`[2 props] ${item.name}.${prop}: 실제 props에 없음`);
    for (const slot of item.slots) if (!source?.slots.includes(slot)) errors.push(`[3 slot] ${item.name}: data-slot="${slot}" 없음`);
    for (const related of item.related ?? []) if (!names.has(related) || !sourceNames.has(related)) errors.push(`[5 related] ${item.name} → ${related}: 항목 없음`);
    for (const token of item.tokens ?? []) if (!tokenNames.has(token)) errors.push(`[6 token] ${item.name} → ${token}: tokens.json에 없음`);
    if (Object.hasOwn(item, 'partOf')) {
      const parent = intents.find((c) => c.name === item.partOf);
      if (!parent || !sourceNames.has(item.partOf)) errors.push(`[7 parts] ${item.name} → ${item.partOf}: 부모 없음`);
      else if (parent === item || parent.partOf || !parent.parts?.includes(item.name)) errors.push(`[7 parts] ${item.name} → ${item.partOf}: 루트 부모의 parts와 불일치`);
      for (const field of ['useWhen', 'dont', 'rules', 'related', 'keywords', 'category'])
        if (Object.hasOwn(item, field)) errors.push(`[7 parts] ${item.name}.${field}: 공통 의도는 부모에만 보관`);
    }
    for (const name of item.parts ?? []) {
      const part = intents.find((c) => c.name === name);
      if (!part || !sourceNames.has(name) || part.partOf !== item.name) errors.push(`[7 parts] ${item.name}.parts → ${name}: 부품의 partOf와 불일치`);
    }
    if (new Set(item.parts).size !== (item.parts ?? []).length) errors.push(`[7 parts] ${item.name}: 부품 중복`);
  }
  for (const item of [...intents.flatMap((c) => c.rules ?? []), ...principles]) {
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

// 예산은 **AI 에게 실제로 가는 바이트**를 잰다. 파일의 pretty 형식이 아니다.
// 처음에는 파일 크기를 쟀는데, 그건 서버가 보내는 양보다 53% 크다
// (155.5KB vs 101.7KB). 아무도 읽지 않는 들여쓰기 때문에 게이트가 먼저 터진다.
// 파일은 git 에서 읽기 쉽도록 pretty 로 두고, 재는 것은 compact 쪽이다.
export function assertSizeBudget(catalog, manifest) {
  const sizes = [
    ['components (전송)', Buffer.byteLength(JSON.stringify(catalog)), 80_000],
    ['전체 (전송)', Buffer.byteLength(JSON.stringify(manifest)), 160_000],
  ];
  for (const [name, bytes, limit] of sizes)
    console.error(`MCP 크기 ${name}: ${bytes}바이트 / ${limit}바이트 (${(bytes / 1000).toFixed(2)}KB / ${limit / 1000}KB)`);
  if (sizes.some(([, bytes, limit]) => bytes > limit)) throw new Error('MCP 크기 예산 초과');
}

export function compactCatalog(catalog) {
  const optionalTypeSuffix = ' | undefined';
  const derived = {
    importTemplate: "import { NAME } from '@s2life/ui';",
    sourceRoot: 'packages/ui/src/',
    kindDefault: 'component',
    requiredDefault: false,
    optionalTypeSuffix,
    // ReactNode처럼 이미 undefined를 포함하는 별칭은 검사기도 접미사를 붙이지 않는다.
    // 예외 이름을 하드코딩하지 않고 실제 타입 표기에서 한 번만 모은다.
    optionalTypeSuffixExceptions: [...new Set(catalog.flatMap(component => component.props
      .filter(prop => !prop.required && !prop.type.endsWith(optionalTypeSuffix)).map(prop => prop.type)))],
    description: 'import는 importTemplate의 NAME을 name으로 치환한다. source는 sourceRoot + 항목의 source다. kind 생략은 kindDefault, props[].required 생략은 requiredDefault다. 선택 prop의 type에는 optionalTypeSuffix를 붙이되 optionalTypeSuffixExceptions의 타입은 이미 undefined를 포함하므로 그대로 쓴다. get_component와 list_components는 복원된 값을 응답한다.',
  };
  const components = catalog.map(({ import: _import, ...component }) => {
    if (!component.source.startsWith(derived.sourceRoot)) throw new Error(`MCP sourceRoot 밖의 소스: ${component.source}`);
    if (component.kind === derived.kindDefault) delete component.kind;
    return {
      ...component,
      source: component.source.slice(derived.sourceRoot.length),
      props: component.props.map(({ name, required, type, ...details }) => ({
        name,
        type: !required && type.endsWith(optionalTypeSuffix) ? type.slice(0, -optionalTypeSuffix.length) : type,
        ...(required ? { required: true } : {}),
        ...details,
      })),
    };
  });
  // 새로운 타입 별칭이나 import 예외가 생겨도 조용히 응답을 바꾸지 않고 생성 단계에서 막는다.
  if (!isDeepStrictEqual(components.map(component => restoreComponent(component, derived)), catalog))
    throw new Error('MCP 파생 필드 복원 불일치');
  return { derived, components };
}

export async function build() {
  await checkBoundaries();
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
    const { propNames: _propNames, ...api } = source;
    // R11-B의 요약 계약은 Button의 네 속성만 펼친다. iconOnly는 VariantProps 상속으로 보존한다.
    if (api.name === 'Button') api.props = api.props.filter((p) => p.name !== 'iconOnly');
    return { ...intent, ...api, import: `import { ${intent.name} } from '@s2life/ui';` };
  });
  const resource = compactCatalog(catalog);
  const manifest = { schemaVersion: 1, derived: resource.derived, tokens, components: resource.components, principles };
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  // 리소스 소비자도 스스로 복원할 수 있어야 하므로 derived 전송량까지 예산에 포함한다.
  assertSizeBudget(resource, manifest);
  await writeFile(resolve(root, 'packages/mcp/manifest.json'), serialized);
  console.error(`MCP 검증 8종 통과: export ${catalog.length}개 · 부품 ${catalog.filter((c) => c.partOf).length}개 · 토큰 ${tokens.length}개 · 규칙 ${principles.length}개`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
