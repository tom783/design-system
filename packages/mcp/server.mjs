import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { matchComponents } from './match.mjs';

const versions = ['2025-06-18', '2025-03-26', '2024-11-05'];
const objectSchema = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
const string = { type: 'string', minLength: 1 };
const definitions = [
  ['get_token','토큰 조회','토큰 이름으로 값·참조·용도·Tailwind 클래스와 라이트/다크 값을 조회한다.',objectSchema({ name: string }, ['name'])],
  ['search_tokens','토큰 검색','category 또는 부분 문자열 query로 토큰을 찾는다. 분류: primitive, semantic, typography, spacing, shape, sizing, motion, loading.',objectSchema({ category: string, query: string })],
  ['list_components','컴포넌트 목록','공개 컴포넌트와 상수의 이름·용도·import 구문을 조회한다.',objectSchema({})],
  ['get_component','컴포넌트 조회','props·slots·규칙·금지사항·관련 컴포넌트를 조회한다. inherited props는 표준 DOM 속성이다.',objectSchema({ name: string }, ['name'])],
  ['which_component','컴포넌트 선택','작업 설명을 단순 점수로 매칭해 후보·판단 근거·useWhen·dont를 함께 준다. 최종 선택은 호출자가 판단한다.',objectSchema({ description: string, limit: { type: 'integer', minimum: 1, maximum: 10 } }, ['description'])],
  ['get_rules','규칙 조회','주제별 하드 규칙과 DESIGN.md 출처를 조회한다. topic 생략 시 전체 규칙.',objectSchema({ topic: { type: 'string', enum: ['색','타이포','간격','로딩','폼','안내','차트','표'] } })],
].map(([name,title,description,inputSchema]) => ({ name,title,description,inputSchema }));
const resources = [
  { uri: 'design://tokens', name: 'tokens', title: '전체 토큰', description: '생성된 토큰의 값·참조·용도·테마·클래스', mimeType: 'application/json' },
  { uri: 'design://components', name: 'components', title: '컴포넌트 카탈로그', description: '공개 API와 선택 의도', mimeType: 'application/json' },
  { uri: 'design://principles', name: 'principles', title: '하드 규칙', description: '주제별 규칙과 출처', mimeType: 'text/markdown' },
];
class RpcError extends Error { constructor(code, message) { super(message); this.code = code; } }
const invalid = (message) => { throw new RpcError(-32602, message); };
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
function validateArguments(args, schema) {
  if (!isObject(args)) invalid('arguments는 객체여야 합니다.');
  for (const name of schema.required) if (!Object.hasOwn(args, name)) invalid(`필수 인자 누락: ${name}`);
  for (const [name, value] of Object.entries(args)) {
    const rule = Object.hasOwn(schema.properties, name) ? schema.properties[name] : undefined;
    if (!rule) invalid(`알 수 없는 인자: ${name}`);
    if (rule.type === 'string' && (typeof value !== 'string' || !value.trim())) invalid(`${name}: 비어 있지 않은 문자열이 필요합니다.`);
    if (rule.enum && !rule.enum.includes(value)) invalid(`${name}: ${rule.enum.join(', ')} 중 하나여야 합니다.`);
    if (rule.type === 'integer' && (!Number.isInteger(value) || value < rule.minimum || value > rule.maximum)) invalid(`${name}: ${rule.minimum}~${rule.maximum} 정수가 필요합니다.`);
  }
}
const structured = (data, isError = false) => ({ content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data, ...(isError ? { isError: true } : {}) });
const missing = (message) => structured({ message }, true);
const normalizeName = (name) => name.trim().replace(/^--/, '').toLowerCase();

function callTool(manifest, params) {
  if (!isObject(params) || typeof params.name !== 'string') invalid('tools/call에는 name이 필요합니다.');
  const definition = definitions.find((tool) => tool.name === params.name);
  if (!definition) invalid(`알 수 없는 도구: ${params.name}`);
  const args = params.arguments === undefined ? {} : params.arguments;
  validateArguments(args, definition.inputSchema);
  switch (params.name) {
    case 'get_token': {
      const token = manifest.tokens.find((t) => t.name.toLowerCase() === normalizeName(args.name));
      return token ? structured(token) : missing('그런 토큰이 없습니다. search_tokens로 이름을 찾아보세요.');
    }
    case 'search_tokens': {
      const query = args.query?.trim().toLowerCase().replace(/^--/, '') ?? '';
      const tokens = manifest.tokens.filter((t) => (!args.category || t.category === args.category.trim().toLowerCase()) && `${t.name} ${t.purpose} ${t.tailwind.join(' ')}`.toLowerCase().includes(query));
      return tokens.length ? structured({ tokens }) : missing('일치하는 토큰이 없습니다. category를 생략하거나 search_tokens의 query를 짧게 해보세요.');
    }
    case 'list_components': return structured({ components: manifest.components.map(({ name, kind, purpose, import: statement }) => ({ name, kind, purpose, import: statement })) });
    case 'get_component': {
      const component = manifest.components.find((c) => c.name.toLowerCase() === args.name.trim().toLowerCase());
      return component ? structured(component) : missing('그런 컴포넌트가 없습니다. list_components로 이름을 확인하세요.');
    }
    case 'which_component': {
      const candidates = matchComponents(args.description, manifest.components, args.limit);
      return candidates.length ? structured({ candidates }) : missing('일치하는 후보가 없습니다. list_components를 보세요.');
    }
    case 'get_rules': return structured({ rules: manifest.principles.filter((p) => !args.topic || p.topic === args.topic) });
  }
}
function dispatch(manifest, method, params) {
  switch (method) {
    case 'initialize':
      if (!isObject(params) || typeof params.protocolVersion !== 'string' || !isObject(params.capabilities) || !isObject(params.clientInfo) || typeof params.clientInfo.name !== 'string' || typeof params.clientInfo.version !== 'string') invalid('initialize에 protocolVersion, capabilities, clientInfo가 필요합니다.');
      return { protocolVersion: versions.includes(params.protocolVersion) ? params.protocolVersion : versions[0], capabilities: { tools: {}, resources: {} }, serverInfo: { name: 'commerce-ds', version: '0.1.0' }, instructions: '작업 설명으로 which_component를 먼저 호출하고 후보의 useWhen·dont를 비교하세요. 선택한 컴포넌트는 get_component로 props·slots·규칙을 확인하고, 색·치수는 search_tokens와 get_token으로 찾으세요. get_rules로 주제별 하드 규칙을 확인하며 원시 색 대신 의미 토큰을 사용하세요. 전체 목록은 list_components와 design:// 리소스에서 조회할 수 있습니다. 이 서버는 읽기 전용입니다.' };
    case 'ping': return {};
    case 'tools/list': return { tools: definitions };
    case 'tools/call': return callTool(manifest, params);
    case 'resources/list': return { resources };
    case 'resources/read': {
      if (!isObject(params) || typeof params.uri !== 'string') invalid('resources/read에는 uri가 필요합니다.');
      const resource = resources.find((r) => r.uri === params.uri);
      if (!resource) throw new RpcError(-32002, `없는 리소스: ${params.uri}`);
      const value = params.uri === 'design://tokens' ? manifest.tokens : params.uri === 'design://components' ? manifest.components
        : manifest.principles.map((p) => `- **${p.topic}** ${p.text} (${p.source})`).join('\n');
      return { contents: [{ uri: resource.uri, mimeType: resource.mimeType, text: typeof value === 'string' ? value : JSON.stringify(value) }] };
    }
    default: throw new RpcError(-32601, `알 수 없는 메서드: ${method}`);
  }
}

async function main() {
  const manifest = JSON.parse(await readFile(new URL('./manifest.json', import.meta.url), 'utf8'));
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  // stdout을 쓰는 유일한 지점이다. JSON.stringify가 문자열 내부 개행도 이스케이프한다.
  const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
  for await (const line of lines) {
    let message;
    try { message = JSON.parse(line); }
    catch { send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON 파싱 실패' } }); continue; }
    const hasId = isObject(message) && Object.hasOwn(message, 'id');
    const validId = hasId && (message.id === null || typeof message.id === 'string' || (typeof message.id === 'number' && Number.isFinite(message.id)));
    if (!isObject(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string' || (hasId && !validId)) {
      // 유효한 알림에는 어떤 응답도 보내지 않는다. 잘못된 요청의 id는 null로 돌려준다.
      if (isObject(message) && !hasId && typeof message.method === 'string') continue;
      send({ jsonrpc: '2.0', id: validId ? message.id : null, error: { code: -32600, message: '잘못된 JSON-RPC 요청' } }); continue;
    }
    if (!hasId) continue;
    try { send({ jsonrpc: '2.0', id: message.id, result: dispatch(manifest, message.method, message.params) }); }
    catch (error) { send({ jsonrpc: '2.0', id: message.id, error: { code: error instanceof RpcError ? error.code : -32603, message: error instanceof RpcError ? error.message : '내부 오류' } }); }
  }
}
main().catch((error) => { console.error(`MCP 시작 실패: ${error.message}`); process.exitCode = 1; });
