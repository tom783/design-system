// 스토리 소스에서만 보이는 신호 — 부품 페이지 '실제 미리보기'가 대표 예시를 고르고 시험용 스토리를 '개발 확인용'으로 뒤로 보낼 때 쓴다.
// 스토리 객체(런타임)에는 이름·설명·태그만 있고, 무엇을 그리는지·어떤 주석이 붙었는지는 소스에만 있다. 그래서 스토리 파일을
// 읽어(oxc 구문 트리) 내보내기마다 붙인다: `__siteStoryNotes = { 내보내기 이름: { uses, draws, marks } }`(모양은 roles.ts StoryNote).
// - uses: 그 스토리가 그리는 길(render·args·같은 파일 도우미·가져온 예시 파일)에 나오는 매니페스트 이름 · draws: 그중 스토리 자신에 바로 나오는 이름
// - marks: 시험용 표식(하네스가 누르는 단추 · 화면 글자 '시험용·검증용·테스트' · 주석 '재현·회귀·검증용…')
// 판정(시험용인지, 무엇이 대표인지)은 src/stories/roles.ts 가 런타임 신호와 합쳐서 한다. 스토리 파일은 고치지 않는다.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseSync, type Plugin } from 'vite';
import type { StoryNote } from '../src/stories/roles';

export type { StoryNote };
/** 검사(docs/qa/site.test.mjs)·실측이 런타임 없이 같은 판정을 하도록 소스에서 함께 읽는 값. */
export interface StorySource extends StoryNote {
  exportName: string;
  /** `name: '…'` — 없으면 런타임처럼 내보내기 이름의 _ 를 빈칸으로 */
  name: string;
  /** parameters.docs.description.story */
  description: string | null;
  tags: string[];
  /** globals.theme 를 정한 스토리(다크 판) — 사이트는 빼고 테마 전환으로 보여 준다 */
  theme: boolean;
  /** tags 에 !autodocs·!dev — 사이트도 뺀다 */
  hidden: boolean;
}
export interface StoryFileSource {
  title: string | null;
  manifest: string[];
  metaTags: string[];
  stories: StorySource[];
}

/** 하네스가 누르는 단추 — 사용 예시(docs/examples)에는 없는 표식이다. */
const PROBE_ATTRIBUTES = new Set(['data-probe', 'data-testid']);
const BUTTON_ELEMENTS = new Set(['Button', 'button']);
/** 화면에 보이는 글자에 이 말이 있으면 시험용 손잡이다('행 하나 더 선택(시험용)', '검증용 로더 해제'). */
export const TEST_TEXT = /시험용|검증용|테스트/;
/** 스토리·도우미 주석이 이 말로 자기를 설명하면 시험용이다('도그푸딩 재현 화면', '…검증하는 예시다'). '하네스'만으로는 아니다 — 하네스는 사용 예시도 연다. */
export const TEST_COMMENT = /재현|회귀|검증용|검사용|시험용|검증한다|검증하는|검증합니다/;

type Node = { type: string; start: number; end: number; [key: string]: unknown };
interface Comment { type: string; value: string; start: number; end: number }

const isNode = (value: unknown): value is Node => typeof value === 'object' && value !== null && typeof (value as Node).type === 'string';
const children = (node: Node) => Object.entries(node).filter(([key]) => key !== 'type' && key !== 'start' && key !== 'end' && key !== 'range' && key !== 'loc')
  .flatMap(([key, value]) => (Array.isArray(value) ? value : [value]).filter(isNode).map((child) => [key, child] as const));

function unwrap(node: Node | null | undefined): Node | null {
  let current = node ?? null;
  while (current && /^(TSSatisfiesExpression|TSAsExpression|TSNonNullExpression|ParenthesizedExpression)$/.test(current.type)) current = current.expression as Node;
  return current;
}
const keyOf = (prop: Node) => {
  const key = prop.key as Node | undefined;
  if (!key) return null;
  if (key.type === 'Identifier') return key.name as string;
  if (key.type === 'Literal' && typeof key.value === 'string') return key.value;
  return null;
};
function prop(object: Node | null, key: string): Node | null {
  if (!object || object.type !== 'ObjectExpression') return null;
  for (const item of object.properties as Node[]) if (item.type === 'Property' && keyOf(item) === key) return unwrap(item.value as Node);
  return null;
}
function text(node: Node | null): string | null {
  if (!node) return null;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral' && (node.expressions as Node[]).length === 0) return ((node.quasis as Node[])[0]!.value as { cooked: string }).cooked;
  return null;
}
const strings = (node: Node | null) => node?.type === 'ArrayExpression'
  ? (node.elements as (Node | null)[]).map((element) => text(unwrap(element))).filter((value): value is string => value !== null)
  : [];

interface Parsed {
  program: { body: Node[] };
  comments: Comment[];
}
const parse = (file: string, source: string) => parseSync(file, source, { lang: file.endsWith('.ts') ? 'ts' : 'tsx' }) as unknown as Parsed;

interface ImportedFile { names: Set<string>; marks: Set<string> }

/**
 * 스토리 파일 하나를 읽는다. `names` 는 매니페스트 이름(uses 를 거른다), `file` 은 절대 경로(가져온 예시 파일을 따라간다).
 * 같은 폴더 도우미(./order-filters)·문서 예시(../../docs/examples/…)는 파일 전체를 그리는 길로 본다. 부품 소스(../components)는 따라가지 않는다.
 */
export function readStoryFile(source: string, file: string, names: ReadonlySet<string>, readFile: (path: string) => string = (path) => readFileSync(path, 'utf8')): StoryFileSource {
  const { program, comments } = parse(file, source);
  const imports = new Map<string, string>();
  const locals = new Map<string, { node: Node; statement: Node }>();
  const stories: { name: string; node: Node; statement: Node }[] = [];
  let metaNode: Node | null = null;
  let metaName: string | null = null;

  for (const statement of program.body) {
    const exported = statement.type === 'ExportNamedDeclaration';
    const declaration = exported ? statement.declaration as Node | null : statement;
    if (statement.type === 'ImportDeclaration') {
      for (const specifier of statement.specifiers as Node[]) imports.set((specifier.local as Node).name as string, (statement.source as Node).value as string);
    } else if (statement.type === 'ExportDefaultDeclaration') {
      const value = unwrap(statement.declaration as Node);
      if (value?.type === 'Identifier') metaName = value.name as string; else metaNode = value;
    } else if (declaration?.type === 'FunctionDeclaration' && declaration.id) {
      locals.set((declaration.id as Node).name as string, { node: declaration, statement });
    } else if (declaration?.type === 'VariableDeclaration') {
      for (const declarator of declaration.declarations as Node[]) {
        const id = declarator.id as Node;
        if (id.type !== 'Identifier' || !declarator.init) continue;
        const name = id.name as string;
        const init = unwrap(declarator.init as Node)!;
        locals.set(name, { node: init, statement });
        if (exported && !name.startsWith('__')) stories.push({ name, node: init, statement });
      }
    }
  }
  if (metaName) metaNode = locals.get(metaName)?.node ?? null;

  const statements = program.body;
  const leading = (statement: Node) => {
    const index = statements.indexOf(statement);
    const from = index > 0 ? statements[index - 1]!.end : 0;
    return comments.filter((comment) => comment.start >= from && comment.end <= statement.start);
  };

  const importedCache = new Map<string, ImportedFile | null>();
  const importedFile = (spec: string): ImportedFile | null => {
    if (importedCache.has(spec)) return importedCache.get(spec)!;
    let result: ImportedFile | null = null;
    const bare = spec.split('?')[0]!;
    const followed = bare.startsWith('.') && !bare.includes('/components/') && !/\.stories$/.test(bare) && bare !== '../index' && !spec.includes('?');
    if (followed) {
      const base = resolve(dirname(file), bare);
      const path = [base, `${base}.tsx`, `${base}.ts`].find((candidate) => /\.tsx?$/.test(candidate) && existsSync(candidate));
      if (path) {
        const found: ImportedFile = { names: new Set(), marks: new Set() };
        const parsed = parse(path, readFile(path));
        for (const statement of parsed.program.body) if (statement.type !== 'ImportDeclaration') scan(statement, found.names, found.marks, null);
        result = found;
      }
    }
    importedCache.set(spec, result);
    return result;
  };

  /** 그리는 길을 훑는다. play·parameters·loaders 는 그리는 길이 아니다(단정·문서 설정). */
  function scan(node: Node, used: Set<string>, marks: Set<string>, visit: ((name: string) => void) | null) {
    const stack: Node[] = [node];
    while (stack.length) {
      const current = stack.pop()!;
      if (current.type === 'Property' && /^(play|parameters|loaders)$/.test(keyOf(current) ?? '')) continue;
      if (current.type === 'Identifier' || current.type === 'JSXIdentifier') {
        const name = current.name as string;
        if (names.has(name)) used.add(name);
        visit?.(name);
      }
      if (current.type === 'JSXOpeningElement') {
        const tag = current.name as Node;
        const attributes = (current.attributes as Node[]).filter((attribute) => attribute.type === 'JSXAttribute').map((attribute) => (attribute.name as Node).name as string);
        if (tag.type === 'JSXIdentifier' && BUTTON_ELEMENTS.has(tag.name as string) && attributes.some((name) => PROBE_ATTRIBUTES.has(name))) {
          marks.add('하네스가 누르는 단추(Button 에 data-probe·data-testid)');
        }
      }
      const value = current.type === 'JSXText' ? current.value as string
        : current.type === 'Literal' && typeof current.value === 'string' ? current.value
          : current.type === 'TemplateElement' ? (current.value as { cooked: string }).cooked : null;
      if (value && TEST_TEXT.test(value)) marks.add(`화면 글자 '${value.trim().slice(0, 40)}'`);
      for (const [, child] of children(current)) stack.push(child);
    }
  }

  const fileStories: StorySource[] = [];
  for (const story of stories.filter((item) => item.node !== metaNode)) {
    const used = new Set<string>();
    const marks = new Set<string>();
    const seen = new Set<string>([story.name]);
    const commentMarks = (statement: Node) => {
      for (const comment of leading(statement)) {
        const line = comment.value.replace(/^\*+/, '').replace(/\s+/g, ' ').trim();
        if (TEST_COMMENT.test(line)) marks.add(`주석 '${line.slice(0, 60)}'`);
      }
    };
    const visit = (name: string) => {
      if (seen.has(name)) return;
      seen.add(name);
      const local = locals.get(name);
      if (local && local.node !== metaNode) {
        commentMarks(local.statement);
        scan(local.node, used, marks, visit);
        return;
      }
      const spec = imports.get(name);
      const imported = spec ? importedFile(spec) : null;
      if (imported) {
        for (const value of imported.names) used.add(value);
        for (const value of imported.marks) marks.add(value);
      }
    };
    commentMarks(story.statement);
    const object = story.node.type === 'ObjectExpression' ? story.node : null;
    const roots: Node[] = object
      ? ['render', 'args', 'decorators'].map((key) => prop(object, key)).filter((value): value is Node => value !== null)
      : [story.node];
    if (object && !prop(object, 'render')) {
      for (const key of ['render', 'component', 'args']) {
        const value = prop(metaNode, key);
        if (value) roots.push(value);
      }
    }
    const drawn = new Set<string>();
    for (const root of roots) scan(root, drawn, new Set(), null);
    for (const root of roots) scan(root, used, marks, visit);

    const name = text(prop(object, 'name')) ?? story.name.replace(/_/g, ' ');
    const description = text(prop(prop(prop(prop(object, 'parameters'), 'docs'), 'description'), 'story'));
    const tags = strings(prop(object, 'tags'));
    const globals = prop(object, 'globals');
    fileStories.push({
      exportName: story.name,
      name,
      description,
      tags,
      theme: globals?.type === 'ObjectExpression' && prop(globals, 'theme') !== null,
      hidden: tags.includes('!autodocs') || tags.includes('!dev'),
      uses: [...used].sort(),
      draws: [...drawn].sort(),
      marks: [...marks],
    });
  }
  const parameters = prop(metaNode, 'parameters');
  return {
    title: text(prop(metaNode, 'title')),
    manifest: strings(prop(parameters, 'manifest')),
    metaTags: strings(prop(metaNode, 'tags')),
    stories: fileStories,
  };
}

/** 매니페스트 이름 — uses 를 이 이름으로만 거른다(도우미 함수·지역 이름은 빠진다). */
export function manifestNames(manifestPath: string) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { components: { name: string }[] };
  return new Set(manifest.components.map((component) => component.name));
}

/**
 * 스토리 모듈 끝에 `export const __siteStoryNotes = {…}` 를 붙인다(storyExportOrder 와 같은 자리 — 원본 소스).
 * 가져온 예시·도우미 파일이 바뀌면 다시 읽도록 감시 목록에 넣는다.
 */
export function storyNotes(manifestPath: string): Plugin {
  const storyFile = /\/packages\/ui\/src\/stories\/[^/]+\.stories\.tsx$/;
  return {
    name: 'site:story-notes',
    enforce: 'pre',
    transform(code, file) {
      if (!storyFile.test(file) || code.includes('__siteStoryNotes')) return;
      this.addWatchFile(manifestPath);
      const read = (path: string) => { this.addWatchFile(path); return readFileSync(path, 'utf8'); };
      const { stories } = readStoryFile(code, file, manifestNames(manifestPath), read);
      const notes: Record<string, StoryNote> = Object.fromEntries(stories.map((story) => [story.exportName, { uses: story.uses, draws: story.draws, marks: story.marks }]));
      return { code: `${code}\nexport const __siteStoryNotes = ${JSON.stringify(notes)};\n`, map: null };
    },
  };
}
