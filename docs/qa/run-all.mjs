// 모든 검증 하네스를 돌린다. 스토리북 정적 서버는 여기서(같은 프로세스) 띄우고 내린다.
//
//   pnpm qa            (빌드는 미리 되어 있어야 한다 — pnpm build-storybook)
//   pnpm qa --build    (빌드부터)
//   pnpm qa --only steps-render-verify,mcp-client-verify
//   pnpm qa --shard 1/4 --timings .qa-shots/timings-1.json
//   pnpm qa --jobs 2   (서버 하나에 브라우저 2개)
//   pnpm qa --group storybook --shard 1/2   (CI: 정적 서버가 필요한 하네스만 2등분)
//
// 하네스 목록·인자·샤드 배분은 run-plan.mjs 에 있다.
//
// 남의 서버를 검사하지 않는다 — 2026-11-22 에 다른 작업 폴더의 6099 를 검사하고 통과한 적이 있다.
//  · 포트는 기본 0(OS 가 빈 포트), --port n 이 차 있으면 즉시 실패(static-server.mjs)
//  · 빌드 폴더에 무작위 nonce 를 쓰고 서버에서 같은 값을 읽어야 진행
//  · 서버의 build-info.json sha 가 HEAD 와 다르면 거부, dirty 는 CI·pre-push 에서 거부
// 하네스에는 DS_SB_URL·DS_SB_NONCE 로 넘기고, 하네스도 같은 확인을 한 번 더 한다(storybook-target.mjs).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { resolveHeadlessShell } from './browser.mjs';
import { BASELINE_FILE, EXCLUSIVE, NO_STORYBOOK, USAGE, UsageError, harnessName, parseArgs, selectHarnesses } from './run-plan.mjs';
import { startStaticServer } from './static-server.mjs';
import { STATIC_DIR, checkStorybook, writeNonce } from './storybook-target.mjs';

const root = new URL('../..', import.meta.url).pathname;
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
if (opts.group && !plan.shard) console.log(`--group ${opts.group}: ${HARNESSES.length}개 하네스`);
if (plan.shard) {
  const { index, total, seconds, unknown, fallback } = plan.shard;
  console.log(`${opts.group ? `--group ${opts.group} ` : ''}--shard ${index}/${total}: ${HARNESSES.length}개 하네스 · 예상 ${seconds}초 (기준선 ${BASELINE_FILE.pathname.split('/').pop()})`);
  if (unknown.length) console.log(`  기준선에 없어 중간값 ${fallback}초로 계산: ${unknown.join(', ')}`);
}

// 브라우저부터 확인한다. 없으면 7개를 다 돌려놓고 마지막에 실패하는 것보다 낫다.
try {
  console.log(`브라우저: ${resolveHeadlessShell().replace(process.env.HOME, '~')}\n`);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

// pack-verify·mcp-client-verify 만 고른 샤드는 스토리북이 필요 없다.
const needsStorybook = HARNESSES.some(([file]) => !NO_STORYBOOK.has(file));
let stop = async () => {};
const harnessEnv = { ...process.env };
const tServer = performance.now();
if (needsStorybook) {
  if (opts.build || !existsSync(`${STATIC_DIR}/index.json`)) {
    console.log('스토리북 빌드…');
    const b = spawnSync('pnpm', ['build-storybook', '--quiet'], { cwd: root, stdio: 'inherit' });
    if (b.status !== 0) process.exit(b.status ?? 1);
  }

  const nonce = writeNonce(STATIC_DIR);
  let server;
  try {
    server = await startStaticServer({ root: STATIC_DIR, port: opts.port });
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  stop = server.close;
  process.on('SIGINT', () => { server.close(); process.exit(130); });
  try {
    const { warning, buildInfo } = await checkStorybook({ base: server.url, env: { ...process.env, DS_SB_NONCE: nonce } });
    console.log(`스토리북: ${server.url} · 빌드 ${buildInfo.sha.slice(0, 7)}${buildInfo.dirty ? '(dirty)' : ''} · nonce 확인`);
    if (warning) console.log(warning);
  } catch (e) {
    await stop();
    console.error(e.message);
    process.exit(1);
  }
  Object.assign(harnessEnv, { DS_SB_URL: server.url, DS_SB_NONCE: nonce });
} else {
  console.log('(스토리북이 필요 없는 하네스만 — 빌드·정적 서버 생략)\n');
}
const serverSeconds = secs(performance.now() - tServer);

// 정적 서버가 이 프로세스 안에 있어 spawnSync 로 기다리면 서버가 응답하지 못한다. 비동기로 돌린다.
function runHarness(file) {
  return new Promise((done) => {
    const child = spawn('node', [`docs/qa/${file}`, `.qa-shots/${file.replace('.mjs', '')}`],
      { cwd: root, env: harnessEnv, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.setEncoding('utf8').on('data', (d) => { stdout += d; });
    child.stderr.setEncoding('utf8').on('data', (d) => { stderr += d; });
    child.on('error', (e) => { stderr += String(e); });
    child.on('close', (status, signal) => done({ status, signal, stdout, stderr }));
  });
}

const results = new Map(); // 파일 → { seconds, out, summary }
async function exec(file) {
  const t = performance.now();
  const out = await runHarness(file);
  const summary = ((out.stdout ?? '').split('\n').reverse()
    .find((l) => l.includes('검사') && l.includes('통과')) ?? '').trim();
  const r = { seconds: secs(performance.now() - t), out, summary };
  results.set(file, r);
  return r;
}
const mark = ({ out, summary }) => (out.status === 0 ? `✓ ${summary}` : `✗ ${summary || '실행 실패'}`);

if (opts.jobs === 1) {
  // 순차: 지금 무엇이 도는지 보이도록 이름을 먼저 쓴다(예전 형식 그대로).
  for (const [file, label] of HARNESSES) {
    process.stdout.write(`── ${label.padEnd(20)} `);
    console.log(mark(await exec(file)));
  }
} else {
  // 병렬: 하네스 출력은 각자 모았다가, 끝난 하네스마다 한 줄을 통째로 찍는다 — 줄이 섞이지 않는다.
  const solo = HARNESSES.filter(([f]) => EXCLUSIVE.has(f));
  const pool = HARNESSES.filter(([f]) => !EXCLUSIVE.has(f));
  console.log(`--jobs ${opts.jobs}: 브라우저 ${opts.jobs}개 병렬${solo.length ? ` (${solo.map(([f]) => harnessName(f)).join('·')} 는 혼자 먼저)` : ''}`);
  const line = ([file, label]) => console.log(`── ${label.padEnd(20)} ${mark(results.get(file))}`);
  for (const h of solo) { await exec(h[0]); line(h); }
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(opts.jobs, pool.length) }, async () => {
    while (next < pool.length) { const h = pool[next++]; await exec(h[0]); line(h); }
  }));
}
await stop();

// 기록·실패 목록은 실행 순서와 관계없이 HARNESSES 순서로 — 같은 입력이면 같은 모양.
const failed = [];
const timings = {};
for (const [file] of HARNESSES) {
  const { seconds, out, summary } = results.get(file);
  timings[harnessName(file)] = {
    seconds, status: out.status === 0 ? 'pass' : 'fail',
    exitCode: out.status, signal: out.signal ?? null, summary: summary || null,
  };
  if (out.status !== 0) {
    failed.push({ file, tail: ((out.stdout ?? '') + (out.stderr ?? '')).trim().split('\n').slice(-12).join('\n') });
  }
}

if (opts.timings) writeTimings(resolve(process.cwd(), opts.timings));

if (failed.length) {
  for (const f of failed) console.log(`\n══ ${f.file} ══\n${f.tail}`);
  console.log(`\n${failed.length}개 하네스 실패`);
  process.exit(1);
}
console.log('\n전부 통과');

// 모양은 기준선(timings/ci-*.json)과 같다 — harnesses[이름].seconds 를 run-plan 이 그대로 읽는다.
// 샤드별 파일을 harnesses 끼리 합치면 다음 기준선이 된다.
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
      shard: opts.shard ? `${opts.shard.index}/${opts.shard.total}` : null,
      jobs: opts.jobs,
      group: opts.group,
      startedAt: startedAt.toISOString(),
      endedAt: new Date().toISOString(),
    },
    serverSeconds: needsStorybook ? serverSeconds : 0,
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
