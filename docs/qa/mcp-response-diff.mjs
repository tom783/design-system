// MCP 응답 불변 증명 — 기준 커밋의 서버와 새 서버를 나란히 띄워 같은 요청을 보내고 응답 줄을 바이트로 대조한다.
//
//   node docs/qa/mcp-response-diff.mjs                              # HEAD ↔ 작업 트리
//   node docs/qa/mcp-response-diff.mjs --base main --head HEAD      # 두 커밋끼리
//   node docs/qa/mcp-response-diff.mjs --base main \
//     --expect resources/list --expect "resources/read design://components" --report out.md
//
// 왜 이것인가: compare-guidance-baseline 은 커밋된 기준선 파일끼리 비교하는 재승인 도구라 실제 응답을 보지 않고,
// server.test 의 기준선 대조는 부품 8개 + 목록뿐이며, 생성기의 복원 자기검증은 isDeepStrictEqual 이라
// 키 순서를 보지 않는다(R33b). 그래서 두 서버 프로세스의 stdout 줄을 그대로 비교한다.
//
// 범위: 핸드셰이크·tools/list·resources/list·**resources/read(양쪽 목록의 모든 URI)**·모든 도구.
// get_component·get_token 은 양쪽 매니페스트의 모든 이름, which_component 는 골든 세트·R38 전체 질의·
// 모든 이름, search_tokens 는 모든 분류·토큰 이름, get_rules 는 모든 주제와 전체. 오류 경로도 함께 보낸다.
//
// 판정: --expect 로 적은 키 밖에서 한 바이트라도 다르면 exit 1. 적었는데 같으면(기대가 낡음) 역시 exit 1.
import { spawn, execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const union = (...lists) => [...new Set(lists.flat())];

// 두 서버에 보낼 요청. 이름·URI 는 양쪽의 합집합이라 한쪽에만 있는 항목도 대조된다.
export async function requestPlan({ manifests, resourceUris = [] }) {
  const golden = existsSync(join(root, 'docs/qa/fixtures/which-component-golden.json'))
    ? (await readJson(join(root, 'docs/qa/fixtures/which-component-golden.json'))).cases.map(item => item.query) : [];
  const r38 = (await readJson(join(root, 'docs/qa/fixtures/r38-match-baseline.json'))).map(item => item.query);
  const names = union(...manifests.map(m => m.components.map(c => c.name)));
  const tokens = union(...manifests.map(m => m.tokens.map(t => t.name)));
  const categories = union(...manifests.map(m => m.tokens.map(t => t.category)));
  const topics = ['색', '타이포', '간격', '로딩', '폼', '안내', '차트', '표'];
  const plan = [];
  const add = (key, method, params) => plan.push({ key, method, params });
  const tool = (key, name, args) => add(`tools/call ${key}`, 'tools/call', { name, arguments: args });
  for (const version of ['2025-06-18', '2025-03-26', '2024-11-05', '1999-01-01'])
    add(`initialize ${version}`, 'initialize', { protocolVersion: version, capabilities: {}, clientInfo: { name: 'response-diff', version: '1' } });
  add('ping', 'ping', {});
  add('tools/list', 'tools/list', {});
  add('resources/list', 'resources/list', {});
  for (const uri of union(resourceUris, ['design://missing'])) add(`resources/read ${uri}`, 'resources/read', { uri });
  add('resources/read (uri 없음)', 'resources/read', {});
  tool('list_components', 'list_components', {});
  for (const name of names) tool(`get_component ${name}`, 'get_component', { name });
  for (const name of [' Button ', 'BUTTON', 'selecttrigger', '없는컴포넌트']) tool(`get_component "${name}"`, 'get_component', { name });
  const queries = union(golden, r38, names, ['zzzz 아무 관련 없는 말', '  p E e K  ']);
  for (const description of queries) tool(`which_component "${description}"`, 'which_component', { description });
  for (const description of golden) tool(`which_component "${description}" limit 10`, 'which_component', { description, limit: 10 });
  tool('get_rules 전체', 'get_rules', {});
  for (const topic of topics) tool(`get_rules ${topic}`, 'get_rules', { topic });
  for (const name of tokens) tool(`get_token ${name}`, 'get_token', { name });
  for (const name of ['--bg-surface', 'BG-SURFACE', '없는토큰']) tool(`get_token "${name}"`, 'get_token', { name });
  tool('search_tokens 전체', 'search_tokens', {});
  for (const category of categories) tool(`search_tokens category ${category}`, 'search_tokens', { category });
  for (const query of [...tokens, 'brand', '--text', '없는검색어']) tool(`search_tokens query ${query}`, 'search_tokens', { query });
  // 오류 경로도 응답이다. 메시지 문구가 바뀌어도 잡는다.
  tool('없는 도구', '없는도구', {});
  tool('get_token 인자 누락', 'get_token', {});
  tool('get_token 모르는 인자', 'get_token', { name: 'bg-surface', extra: true });
  tool('which_component limit 0', 'which_component', { description: '요약', limit: 0 });
  tool('get_rules 없는 주제', 'get_rules', { topic: '없는주제' });
  add('모르는 메서드', '모르는/메서드', {});
  return plan;
}

// 요청을 모두 파이프로 보내고 응답 줄을 순서대로 받는다. 서버는 한 줄씩 동기 처리하므로 순서가 곧 짝이다.
export function runServer(serverPath, plan, { timeoutMs = 60_000 } = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [serverPath], { stdio: ['pipe', 'pipe', 'pipe'] });
    const lines = []; let stderr = '';
    child.stderr.setEncoding('utf8'); child.stderr.on('data', chunk => { stderr += chunk; });
    createInterface({ input: child.stdout }).on('line', line => lines.push(line));
    const timer = setTimeout(() => { child.kill(); reject(new Error(`${serverPath}: ${timeoutMs}ms 안에 끝나지 않음 (응답 ${lines.length}/${plan.length})`)); }, timeoutMs);
    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`${serverPath}: 종료 코드 ${code}\n${stderr}`));
      if (lines.length !== plan.length) return reject(new Error(`${serverPath}: 응답 ${lines.length}줄 ≠ 요청 ${plan.length}개`));
      lines.forEach((line, index) => {
        const id = JSON.parse(line).id;
        if (id !== index + 1) reject(new Error(`${serverPath}: ${index + 1}번째 응답의 id 가 ${id}`));
      });
      resolvePromise({ responses: plan.map((request, index) => ({ key: request.key, line: lines[index] })), stderr });
    });
    child.stdin.end(plan.map((request, index) => `${JSON.stringify({ jsonrpc: '2.0', id: index + 1, method: request.method, params: request.params })}\n`).join(''));
  });
}

export function diffResponses(base, head, expected = []) {
  const rows = base.responses.map((item, index) => {
    const next = head.responses[index];
    if (next.key !== item.key) throw new Error(`요청 순서 불일치: ${item.key} ≠ ${next.key}`);
    const same = Buffer.from(item.line).equals(Buffer.from(next.line));
    return { key: item.key, same, baseBytes: Buffer.byteLength(item.line), headBytes: Buffer.byteLength(next.line) };
  });
  const changed = rows.filter(row => !row.same);
  const expectedSet = new Set(expected);
  return {
    total: rows.length,
    identical: rows.length - changed.length,
    changed,
    unexpected: changed.filter(row => !expectedSet.has(row.key)),
    staleExpectations: expected.filter(key => !changed.some(row => row.key === key)),
    stderr: { base: base.stderr, head: head.stderr },
  };
}

// 기준 커밋의 packages/mcp 를 임시 폴더에 푼다. 서버는 자기 위치 기준으로 manifest·package.json 을 읽는다.
export async function extractPackage(ref) {
  const dir = await mkdtemp(join(tmpdir(), 'mcp-response-diff-'));
  const archive = execFileSync('git', ['archive', '--format=tar', ref, 'packages/mcp'], { cwd: root, maxBuffer: 64 * 1024 * 1024 });
  execFileSync('tar', ['-x', '-C', dir], { input: archive });
  return { dir, server: join(dir, 'packages/mcp/server.mjs') };
}

export async function compareServers({ baseServer, headServer, expected = [] }) {
  const manifests = await Promise.all([baseServer, headServer].map(server => readJson(join(server, '../manifest.json'))));
  const listing = await Promise.all([baseServer, headServer].map(server => runServer(server, [{ key: 'resources/list', method: 'resources/list', params: {} }])));
  const resourceUris = union(...listing.map(({ responses }) => JSON.parse(responses[0].line).result.resources.map(r => r.uri)));
  const plan = await requestPlan({ manifests, resourceUris });
  const [base, head] = await Promise.all([runServer(baseServer, plan), runServer(headServer, plan)]);
  return { ...diffResponses(base, head, expected), resourceUris };
}

export function formatReport(result, { baseLabel, headLabel }) {
  const escape = value => String(value).replaceAll('|', '\\|');
  const table = rows => ['| 요청 | 기준 바이트 | 새 바이트 | 의도 |', '|---|---:|---:|---|',
    ...rows.map(row => `| ${escape(row.key)} | ${row.baseBytes} | ${row.headBytes} | ${result.unexpected.includes(row) ? '✗ 의도하지 않음' : '의도한 변경'} |`)].join('\n');
  return [`# MCP 응답 바이트 대조`, '',
    `기준 \`${baseLabel}\` ↔ 새 \`${headLabel}\` · 요청 ${result.total}건 · 동일 ${result.identical}건 · 다름 ${result.changed.length}건`
      + ` (의도 ${result.changed.length - result.unexpected.length} · 의도하지 않음 ${result.unexpected.length})`, '',
    `resources/read 대상: ${result.resourceUris.join(' · ')}`, '',
    result.changed.length ? table(result.changed) : '차이 없음.', '',
    ...(result.staleExpectations.length ? [`기대했지만 같았던 키: ${result.staleExpectations.join(' · ')}`, ''] : []),
  ].join('\n');
}

function parseArgs(argv) {
  const args = { base: 'HEAD', head: null, expected: [], report: null };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i], value = argv[i + 1];
    if (!['--base', '--head', '--expect', '--report'].includes(flag) || value === undefined) {
      console.error(`모르는 인자: ${flag}\n사용: node docs/qa/mcp-response-diff.mjs [--base ref] [--head ref] [--expect key]... [--report file.md]`);
      process.exit(2);
    }
    if (flag === '--expect') args.expected.push(value); else args[flag.slice(2)] = value;
    i++;
  }
  return args;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const label = ref => `${ref} (${execFileSync('git', ['rev-parse', '--short', ref], { cwd: root, encoding: 'utf8' }).trim()})`;
  const base = await extractPackage(args.base);
  const head = args.head ? await extractPackage(args.head) : { dir: null, server: join(root, 'packages/mcp/server.mjs') };
  const dirty = !args.head && execFileSync('git', ['status', '--porcelain', '--', 'packages/mcp'], { cwd: root, encoding: 'utf8' }).trim() !== '';
  try {
    const result = await compareServers({ baseServer: base.server, headServer: head.server, expected: args.expected });
    const report = formatReport(result, { baseLabel: label(args.base), headLabel: args.head ? label(args.head) : `작업 트리 ${label('HEAD')}${dirty ? ' + 수정' : ''}` });
    console.log(report);
    if (args.report) await writeFile(resolve(args.report), report);
    if (result.stderr.base || result.stderr.head) console.error(`stderr 기준 ${result.stderr.base.length}자 · 새 ${result.stderr.head.length}자`);
    if (result.unexpected.length || result.staleExpectations.length) process.exitCode = 1;
  } finally {
    await Promise.all([base.dir, head.dir].filter(Boolean).map(dir => rm(dir, { recursive: true, force: true })));
  }
}
