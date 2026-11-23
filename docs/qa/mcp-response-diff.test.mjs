// MCP 응답 바이트 대조 도구 자체의 검사(R49). git 없이 작업 트리 서버 사본끼리 비교한다.
// 같은 서버 둘은 차이 0, 매니페스트 한 글자를 바꾼 사본은 그 글자가 나가는 응답만 달라야 한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareServers, formatReport } from './mcp-response-diff.mjs';

const server = fileURLToPath(new URL('../../packages/mcp/server.mjs', import.meta.url));

test('같은 서버 둘은 모든 요청(모든 리소스 읽기 포함)에서 바이트가 같다', { timeout: 60_000 }, async () => {
  const result = await compareServers({ baseServer: server, headServer: server });
  assert.ok(result.total > 1000, `요청 ${result.total}건`);
  assert.deepEqual(result.changed, []);
  assert.deepEqual(result.resourceUris.sort(), ['design://components', 'design://principles', 'design://tokens']);
});

test('한 부품의 purpose 를 바꾸면 그 값을 싣는 응답만 다르고, 기대 목록 밖은 의도하지 않은 변경이다', { timeout: 60_000 }, async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'mcp-diff-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await cp(fileURLToPath(new URL('../../packages/mcp/', import.meta.url)), dir, { recursive: true });
  const manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
  manifest.components.find(c => c.name === 'Peek').purpose += '!';
  await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest));
  const expected = ['tools/call get_component Peek', 'tools/call list_components', 'resources/read design://components'];
  const result = await compareServers({ baseServer: server, headServer: join(dir, 'server.mjs'), expected: [...expected, 'tools/call get_rules 전체'] });
  const keys = result.changed.map(row => row.key);
  for (const key of expected) assert.ok(keys.includes(key), key);
  // Peek 를 후보로 내는 which_component 응답도 purpose 를 싣는다. 기대에 없으니 의도하지 않은 변경으로 잡혀야 한다.
  assert.ok(result.unexpected.length > 0 && result.unexpected.every(row => row.key.startsWith('tools/call which_component')));
  assert.ok(!keys.some(key => key.startsWith('tools/call get_token') || key === 'resources/read design://tokens'));
  assert.deepEqual(result.staleExpectations, ['tools/call get_rules 전체'], '기대했는데 같으면 낡은 기대로 보고한다');
  const report = formatReport(result, { baseLabel: 'a', headLabel: 'b' });
  assert.match(report, /\| tools\/call get_component Peek \| \d+ \| \d+ \| 의도한 변경 \|/);
  assert.match(report, /✗ 의도하지 않음/);
});
