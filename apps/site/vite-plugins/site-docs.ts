// `virtual:site-docs` — 시작하기·AI로 쓰기 페이지가 쓰는 데이터. 모두 이 커밋의 파일과 MCP 서버 자신에게서 읽는다.
// - 설치·연결 명령: README.md · packages/mcp/README.md 의 코드 블록(제목으로 찾는다)
// - 설치 조건: packages/ui/package.json peerDependencies · packages/mcp/package.json engines
// - 도구·리소스·안내·추천 예시: packages/mcp/server.mjs 를 실제로 띄워 받은 initialize · tools/list · resources/list ·
//   which_component 응답(AI 가 받는 것과 같은 바이트에서 만든다 — 서버 정의를 사이트에 옮겨 적지 않는다)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';
import { codeIn, parseMarkdown, textIn } from './markdown';

/**
 * "질문 → 추천" 예시로 보일 질문. 지어내지 않고 which_component 정답 세트(실제 요청 문장)에서 고른다 —
 * 세트에 없는 문장이면 빌드를 멈춘다. 정답도 세트에서 읽어 함께 보인다.
 */
const AI_EXAMPLE_QUERIES = [
  '주문 목록을 표로 보여주고 열 기준으로 정렬하고 싶어',
  '목록 아래에 페이지 번호와 페이지당 개수 선택',
  'sortable order table where I can tick several rows',
];
const AI_EXAMPLE_LIMIT = 3;

/**
 * 시작하기·AI로 쓰기가 보이는 README 글 — [제목, 첫 글자]로 찾아 그 단락(목록이면 항목들)을 그대로 싣는다.
 * 사이트는 문장을 옮겨 적지 않는다. 찾는 글이 없어지면 빌드가 멈춘다.
 */
const README_TEXT = {
  intro: ['@s2life 디자인 시스템', 'B2B 커머스'],
  peer: ['기본 설치: Tailwind 없이 사용', 'React·React DOM'],
  entryCss: ['기본 설치: Tailwind 없이 사용', '앱의 공통 진입점에서'],
  font: ['기본 설치: Tailwind 없이 사용', '글꼴 파일은'],
  standalone: ['기본 설치: Tailwind 없이 사용', '`styles.css`는 토큰'],
  appWide: ['기본 설치: Tailwind 없이 사용', '`styles.css`는 앱 전체에'],
  utilities: ['기본 설치: Tailwind 없이 사용', '제공하는 유틸리티'],
  tailwindIntro: ['이미 Tailwind v4를 쓰는 앱', '사전 컴파일 CSS 대신'],
  tailwindEntry: ['이미 Tailwind v4를 쓰는 앱', '`tailwind.css`에는'],
  mcpCli: ['MCP 설치', '서버는 npm으로'],
} as const;
const MCP_README_TEXT = {
  intro: ['디자인 시스템 MCP', '읽기 전용 stdio 서버다'],
  connect: ['디자인 시스템 MCP', 'npm 패키지로 연결하려면'],
  npx: ['디자인 시스템 MCP', '`npx @s2life/mcp`로 직접'],
  devSteps: ['디자인 시스템 MCP', '저장소 루트에서'],
  cwd: ['디자인 시스템 MCP', '서버는 자신의 파일 위치를'],
} as const;

interface RpcResponse { id: number; result?: Record<string, unknown>; error?: { message: string } }

function askServer(server: string, calls: { method: string; params?: unknown }[]) {
  const messages = [
    { jsonrpc: '2.0', id: 0, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 's2life-site', version: '0' } } },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    ...calls.map((call, i) => ({ jsonrpc: '2.0', id: i + 1, ...call })),
  ];
  // 서버는 stdin 이 닫히면 끝난다. stdout 은 JSON-RPC 한 줄씩이다(packages/mcp/README.md).
  const out = execFileSync(process.execPath, [server], { input: `${messages.map((m) => JSON.stringify(m)).join('\n')}\n`, encoding: 'utf8', timeout: 30_000 });
  const responses = new Map(out.trim().split('\n').map((line) => JSON.parse(line) as RpcResponse).map((r) => [r.id, r]));
  const result = (id: number) => {
    const response = responses.get(id);
    if (!response?.result) throw new Error(`소개 사이트: MCP 서버 응답 ${id} 실패 — ${response?.error?.message ?? '응답 없음'}`);
    return response.result;
  };
  return { init: result(0), results: calls.map((_, i) => result(i + 1)) };
}

interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: { properties: Record<string, { type: string; enum?: string[]; minimum?: number; maximum?: number }>; required: string[] };
}

export function siteDocs(repo: string): Plugin {
  const virtualId = 'virtual:site-docs';
  const resolved = `\0${virtualId}`;
  const files = {
    readme: `${repo}README.md`,
    mcpReadme: `${repo}packages/mcp/README.md`,
    ui: `${repo}packages/ui/package.json`,
    mcp: `${repo}packages/mcp/package.json`,
    server: `${repo}packages/mcp/server.mjs`,
    manifest: `${repo}packages/mcp/manifest.json`,
    match: `${repo}packages/mcp/match.mjs`,
    catalog: `${repo}packages/mcp/catalog.mjs`,
    golden: `${repo}docs/qa/fixtures/which-component-golden.json`,
  };
  return {
    name: 'site:docs',
    resolveId(spec) {
      if (spec === virtualId) return resolved;
    },
    load(id) {
      if (id !== resolved) return;
      for (const path of Object.values(files)) this.addWatchFile(path);
      const read = (path: string) => readFileSync(path, 'utf8');
      const readme = parseMarkdown(read(files.readme));
      const mcpReadme = parseMarkdown(read(files.mcpReadme));
      const ui = JSON.parse(read(files.ui));
      const mcpPackage = JSON.parse(read(files.mcp));
      const golden: { cases: { query: string; expected: string | string[] | null; lang: string }[] } = JSON.parse(read(files.golden));

      const examples = AI_EXAMPLE_QUERIES.map((query) => {
        const entry = golden.cases.find((item) => item.query === query);
        if (!entry) throw new Error(`소개 사이트: AI 예시 질문이 which_component 정답 세트에 없다 — '${query}'`);
        return entry;
      });
      const { init, results: [toolList, resourceList, ...answers] } = askServer(files.server, [
        { method: 'tools/list' },
        { method: 'resources/list' },
        ...examples.map((entry) => ({ method: 'tools/call', params: { name: 'which_component', arguments: { description: entry.query, limit: AI_EXAMPLE_LIMIT } } })),
      ]);
      const serverInfo = init.serverInfo as { name: string; version: string };
      const tools = (toolList!.tools as ToolDefinition[]).map((tool) => ({
        name: tool.name,
        title: tool.title,
        description: tool.description,
        params: Object.entries(tool.inputSchema.properties).map(([name, rule]) => ({
          name,
          required: tool.inputSchema.required.includes(name),
          type: rule.type,
          enum: rule.enum ?? null,
          range: rule.minimum !== undefined && rule.maximum !== undefined ? [rule.minimum, rule.maximum] : null,
        })),
      }));

      const texts = <K extends string>(file: string, parsed: typeof readme, wanted: Record<K, readonly [string, string]>) =>
        Object.fromEntries(Object.entries<readonly [string, string]>(wanted).map(([key, [section, start]]) => [key, textIn(file, parsed, section, start).items])) as Record<K, string[]>;
      const data = {
        readme: {
          headings: readme.headings.map(({ text, slug }) => ({ text, slug })),
          text: texts('README.md', readme, README_TEXT),
          install: codeIn('README.md', readme, '기본 설치: Tailwind 없이 사용', 'sh'),
          entry: codeIn('README.md', readme, '기본 설치: Tailwind 없이 사용', 'tsx'),
          tailwind: codeIn('README.md', readme, '이미 Tailwind v4를 쓰는 앱', 'css'),
          mcp: codeIn('README.md', readme, 'MCP 설치', 'sh'),
        },
        mcpReadme: {
          headings: mcpReadme.headings.map(({ text, slug }) => ({ text, slug })),
          text: texts('packages/mcp/README.md', mcpReadme, MCP_README_TEXT),
          connect: codeIn('packages/mcp/README.md', mcpReadme, '디자인 시스템 MCP', 'sh'),
          devConfig: codeIn('packages/mcp/README.md', mcpReadme, '디자인 시스템 MCP', 'json'),
        },
        requirements: {
          react: ui.peerDependencies?.react ?? null,
          reactDom: ui.peerDependencies?.['react-dom'] ?? null,
          node: mcpPackage.engines?.node ?? null,
        },
        mcp: {
          name: serverInfo.name,
          version: serverInfo.version,
          protocolVersion: init.protocolVersion as string,
          instructions: init.instructions as string,
          tools,
          resources: resourceList!.resources as { uri: string; name: string; title: string; description: string; mimeType: string }[],
          examples: examples.map((entry, i) => {
            const structured = answers[i]!.structuredContent as { candidates: { name: string; score: number; reasons: string[] }[] };
            return {
              query: entry.query,
              lang: entry.lang,
              expected: entry.expected === null ? null : ([] as string[]).concat(entry.expected),
              call: { name: 'which_component', arguments: { description: entry.query, limit: AI_EXAMPLE_LIMIT } },
              candidates: structured.candidates.map(({ name, score, reasons }) => ({ name, score, reasons })),
            };
          }),
        },
      };
      return `export default ${JSON.stringify(data)};`;
    },
  };
}
