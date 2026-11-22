// 모든 검증 하네스를 순서대로 돌린다. 스토리북 정적 서버는 여기서 띄우고 내린다.
//
//   pnpm qa            (빌드는 미리 되어 있어야 한다 — pnpm build-storybook)
//   pnpm qa --build    (빌드부터)
//   pnpm qa --only steps-render-verify,mcp-client-verify
//   pnpm qa --timings .qa-shots/timings.json   (하네스마다 초·결과)
//
// 하네스 목록·인자 해석은 run-plan.mjs 에 있다.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { resolveHeadlessShell } from './browser.mjs';
import { USAGE, UsageError, harnessName, parseArgs, selectHarnesses } from './run-plan.mjs';

const root = new URL('../..', import.meta.url).pathname;
const PORT = 6099;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = performance.now(), startedAt = new Date();
const secs = (ms) => Math.round(ms / 100) / 10;

// 인자부터 본다. 틀린 인자로 서버를 띄우고 하네스를 돌기 시작하면 안 된다.
let opts, plan;
try {
  opts = parseArgs(process.argv.slice(2));
  plan = selectHarnesses(opts);
} catch (e) {
  if (!(e instanceof UsageError)) throw e;
  console.error(`${e.message}\n\n${USAGE}`);
  process.exit(2);
}
const HARNESSES = plan.harnesses;
if (opts.only) console.log(`--only: ${HARNESSES.length}개 하네스`);

// 브라우저부터 확인한다. 없으면 7개를 다 돌려놓고 마지막에 실패하는 것보다 낫다.
try {
  console.log(`브라우저: ${resolveHeadlessShell().replace(process.env.HOME, '~')}\n`);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

const tServer = performance.now();
if (opts.build || !existsSync(`${root}storybook-static/index.json`)) {
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
const serverSeconds = secs(performance.now() - tServer);

const failed = [];
const timings = {};
for (const [file, label] of HARNESSES) {
  process.stdout.write(`── ${label.padEnd(20)} `);
  const t = performance.now();
  const out = spawnSync('node', [`docs/qa/${file}`, `.qa-shots/${file.replace('.mjs', '')}`],
    { cwd: root, encoding: 'utf8' });
  const seconds = secs(performance.now() - t);
  const summary = (out.stdout ?? '').split('\n').reverse()
    .find((l) => l.includes('검사') && l.includes('통과')) ?? '';
  timings[harnessName(file)] = {
    seconds, status: out.status === 0 ? 'pass' : 'fail',
    exitCode: out.status, signal: out.signal ?? null, summary: summary.trim() || null,
  };
  if (out.status === 0) console.log(`✓ ${summary.trim()}`);
  else {
    console.log(`✗ ${summary.trim() || '실행 실패'}`);
    failed.push({ file, tail: ((out.stdout ?? '') + (out.stderr ?? '')).trim().split('\n').slice(-12).join('\n') });
  }
}
stop();

if (opts.timings) writeTimings(resolve(process.cwd(), opts.timings));

if (failed.length) {
  for (const f of failed) console.log(`\n══ ${f.file} ══\n${f.tail}`);
  console.log(`\n${failed.length}개 하네스 실패`);
  process.exit(1);
}
console.log('\n전부 통과');

// harnesses 맵은 기준선(timings/ci-*.json)과 같은 이름 키를 쓴다 — CI 에서 받은 것이 다음 기준선이 된다.
function writeTimings(path) {
  const git = (...args) => {
    const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    return r.status === 0 ? r.stdout.trim() : null;
  };
  const porcelain = git('status', '--porcelain');
  const values = Object.values(timings);
  const doc = {
    version: 1,
    source: {
      kind: 'run-all',
      sha: git('rev-parse', 'HEAD'),
      dirty: porcelain === null ? null : porcelain.length > 0,
      platform: `${process.platform}-${process.arch}`,
      node: process.version,
      ci: process.env.GITHUB_RUN_ID
        ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
        : null,
      only: opts.only,
      startedAt: startedAt.toISOString(),
      endedAt: new Date().toISOString(),
    },
    serverSeconds,
    totalSeconds: Math.round(values.reduce((a, v) => a + v.seconds, 0) * 10) / 10,
    wallSeconds: secs(performance.now() - t0),
    passed: values.filter((v) => v.status === 'pass').length,
    failed: values.filter((v) => v.status !== 'pass').length,
    harnesses: timings,
  };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`);
  console.log(`\n시간 기록: ${path} (하네스 ${values.length}개 · 합계 ${doc.totalSeconds}초)`);
}
