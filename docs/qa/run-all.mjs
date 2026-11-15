// 모든 검증 하네스를 순서대로 돌린다. 스토리북 정적 서버는 여기서 띄우고 내린다.
//
//   pnpm qa            (빌드는 미리 되어 있어야 한다 — pnpm build-storybook)
//   pnpm qa --build    (빌드부터)
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolveHeadlessShell } from './browser.mjs';

const root = new URL('../..', import.meta.url).pathname;
const PORT = 6099;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 브라우저부터 확인한다. 없으면 7개를 다 돌려놓고 마지막에 실패하는 것보다 낫다.
try {
  console.log(`브라우저: ${resolveHeadlessShell().replace(process.env.HOME, '~')}\n`);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

if (process.argv.includes('--build') || !existsSync(`${root}storybook-static/index.json`)) {
  console.log('스토리북 빌드…');
  const b = spawnSync('pnpm', ['build-storybook', '--quiet'], { cwd: root, stdio: 'inherit' });
  if (b.status !== 0) process.exit(b.status ?? 1);
}

const server = spawn('npx', ['--yes', 'http-server', 'storybook-static', '-p', String(PORT), '-s'],
  { cwd: root, stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch { /* 이미 내려감 */ } };
process.on('exit', stop);
process.on('SIGINT', () => { stop(); process.exit(130); });

let up = false;
for (let i = 0; i < 60; i++) {
  try { await fetch(`http://localhost:${PORT}/index.json`); up = true; break; } catch { /* 대기 */ }
  await sleep(500);
}
if (!up) { stop(); console.error(`스토리북 서버가 ${PORT} 에 뜨지 않았습니다.`); process.exit(1); }

const HARNESSES = [
  ['render-verify.mjs', '기본 컴포넌트·테이블'],
  ['charts-render-verify.mjs', '차트 로딩·오류'],
  ['loading-render-verify.mjs', '스켈레톤·진행률'],
  ['state-render-verify.mjs', '상태·아바타·썸네일'],
  ['guide-render-verify.mjs', 'Tooltip·Hint·Tour'],
  ['form-render-verify.mjs', '폼·한글 IME'],
  ['peek-render-verify.mjs', 'Peek·다녀온 행'],
  ['mcp-client-verify.mjs', 'MCP 서버'],
  ['list-screen-render-verify.mjs', '목록 필터·행 액션·알림'],
];

const failed = [];
for (const [file, label] of HARNESSES) {
  process.stdout.write(`── ${label.padEnd(20)} `);
  const out = spawnSync('node', [`docs/qa/${file}`, `.qa-shots/${file.replace('.mjs', '')}`],
    { cwd: root, encoding: 'utf8' });
  const summary = (out.stdout ?? '').split('\n').reverse()
    .find((l) => l.includes('검사') && l.includes('통과')) ?? '';
  if (out.status === 0) console.log(`✓ ${summary.trim()}`);
  else {
    console.log(`✗ ${summary.trim() || '실행 실패'}`);
    failed.push({ file, tail: ((out.stdout ?? '') + (out.stderr ?? '')).trim().split('\n').slice(-12).join('\n') });
  }
}
stop();

if (failed.length) {
  for (const f of failed) console.log(`\n══ ${f.file} ══\n${f.tail}`);
  console.log(`\n${failed.length}개 하네스 실패`);
  process.exit(1);
}
console.log('\n전부 통과');
