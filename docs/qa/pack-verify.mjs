// 실제 tarball만 설치한다. 저장소 alias·Tailwind·소스 링크가 소비 앱에 섞이면 안 된다.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, copyFile, readdir, access, constants, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { launchBrowser, resolveHeadlessShell } from './browser.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const packDir = process.env.S2_PACK_DIR ?? '/tmp/s2';
const consumer = process.env.S2_CONSUMER_DIR ?? '/tmp/s2-consumer';
// 샌드박스에서도 홈 디렉터리에 쓰지 않도록 리허설 캐시를 임시 경로에 둔다.
const env = { ...process.env, npm_config_cache: join(packDir, 'npm-cache') };
const run = (command, args, cwd = root) => execFileSync(command, args, { cwd, env, stdio: 'inherit', timeout: 180000 });
const json = async (path) => JSON.parse(await readFile(path, 'utf8'));
const save = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
const packages = await Promise.all(['tokens', 'ui', 'mcp'].map((name) => json(join(root, `packages/${name}/package.json`))));
assert.equal(new Set(packages.map((p) => p.version)).size, 1, '3개 패키지의 버전이 같아야 한다');
assert.equal(packages[1].dependencies['@s2life/tokens'], packages[0].version);
assert.equal(Object.keys(packages[2].dependencies ?? {}).length, 0, 'MCP 런타임 의존성 0개');
run('pnpm', ['build']);
await mkdir(packDir, { recursive: true });
await mkdir(consumer, { recursive: true });
const tarballs = [];
for (const [i, name] of ['tokens', 'ui', 'mcp'].entries()) {
  // --json 출력은 prepack 로그를 포함할 수 있어 파일명은 패키지 메타데이터로 정한다.
  run('npm', ['pack', '--workspace', `packages/${name}`, '--pack-destination', packDir]);
  const tarball = join(packDir, `s2life-${name}-${packages[i].version}.tgz`);
  const listing = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' });
  assert(!/\.test\.|\.stories\.|package\/src\//.test(listing), `${name}: 테스트·원본 소스는 배포에서 제외`);
  if (name === 'mcp') assert(listing.includes('package/match.mjs') && listing.includes('package/manifest.json'));
  tarballs.push(tarball);
}
const rootPkg = await json(join(root, 'package.json'));
await save(join(consumer, 'package.json'), {
  name: 's2life-pack-consumer', private: true, type: 'module',
  dependencies: Object.fromEntries(packages.map((p, i) => [p.name, `file:${tarballs[i]}`]).concat([
    ['react', rootPkg.dependencies.react], ['react-dom', rootPkg.dependencies['react-dom']],
  ])),
  devDependencies: Object.fromEntries(['vite', 'typescript', '@types/react', '@types/react-dom'].map((name) => [name, rootPkg.devDependencies[name]])),
});
await copyFile(new URL('./pack-consumer/main.tsx', import.meta.url), join(consumer, 'main.tsx'));
await copyFile(new URL('./pack-consumer/public-api.tsx', import.meta.url), join(consumer, 'public-api.tsx'));
await writeFile(join(consumer, 'index.html'), '<!doctype html><html lang="ko"><meta charset="UTF-8"><div id="root"></div><script type="module" src="/main.tsx"></script></html>');
await save(join(consumer, 'tsconfig.json'), { compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx', types: ['vite/client'], strict: true, skipLibCheck: true, noEmit: true }, include: ['main.tsx', 'public-api.tsx'] });
// 같은 버전의 tarball을 다시 만들어도 이전 설치본이 남아 거짓 통과하지 않게 한다.
await rm(join(consumer, 'node_modules'), { recursive: true, force: true });
await rm(join(consumer, 'package-lock.json'), { force: true });
await rm(join(consumer, 'pnpm-lock.yaml'), { force: true });
// 평탄화가 누락된 공개 API를 가리지 않게 pnpm의 엄격한 의존성 격리를 사용한다.
run('pnpm', ['install', '--ignore-workspace', '--no-frozen-lockfile', '--ignore-scripts', '--config.node-linker=isolated', '--config.hoist=false', '--config.shamefully-hoist=false'], consumer);
run('node', ['--input-type=module', '-e', `import assert from 'node:assert/strict';
  for (const name of ['@tanstack/react-table', 'tailwindcss']) {
    assert.throws(() => import.meta.resolve(name), {code:'ERR_MODULE_NOT_FOUND'}, name + ' 직접 의존성 없음');
  }`], consumer);
run('npx', ['--no-install', 'tsc', '--noEmit', '--strict', '-p', 'tsconfig.json'], consumer);
run('node', ['--input-type=module', '-e', `import assert from 'node:assert/strict'; import {Button,DataTable,Select} from '@s2life/ui'; assert(Button&&DataTable&&Select); assert.throws(()=>import.meta.resolve('@s2life/ui/internal'),{code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});`], consumer);
run('npx', ['--no-install', 'vite', 'build'], consumer);
const installed = join(consumer, 'node_modules/@s2life');
await access(join(installed, 'mcp/server.mjs'), constants.X_OK);
assert((await readFile(join(installed, 'mcp/server.mjs'), 'utf8')).startsWith('#!/usr/bin/env node\n'));
const css = await readFile(join(installed, 'ui/dist/styles.css'), 'utf8');
// 모든 컴포넌트 CSS 목록이 진입점에 있으며, 각각의 고유 선택자가 최종 CSS에도 남아야 한다.
const markers = { avatar: '.avatar', 'data-table': '[data-slot=data-table', form: '.ds-field', guide: '[data-slot=guide-tooltip]', loading: '.loading-skeleton', peek: '[data-slot=peek]', state: '.state', thumbnail: '.thumbnail', toast: '.ds-toaster' };
const components = await readFile(join(root, 'packages/ui/src/components.css'), 'utf8');
const imports = [...components.matchAll(/@import "(.+?)";/g)].map((m) => m[1]);
const actualFiles = [];
async function cssFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await cssFiles(path);
    else if (entry.name.endsWith('.css')) actualFiles.push(path);
  }
}
await cssFiles(join(root, 'packages/ui/src/components'));
assert.equal(imports.length, actualFiles.length, '모든 컴포넌트 CSS가 단일 목록에 있어야 한다');
for (const path of actualFiles) assert(imports.some((item) => join(root, 'packages/ui/src', item) === path));
for (const [name, marker] of Object.entries(markers)) assert(css.replaceAll('"', '').includes(marker), `${name} CSS가 누락됨`);
assert(!/@import|@tailwind|@source/.test(css), '사전 컴파일 CSS에는 미해결 지시문이 없어야 한다');
assert.match(css, /--control-h-md/);
const js = await readFile(join(installed, 'ui/dist/index.js'), 'utf8');
assert(js.startsWith('"use client";'));
assert.match(js, /from "react(?:\/jsx-runtime)?"/);
assert(!/\.css["']/.test(js), 'JS 번들에는 CSS import가 없어야 한다');
console.log(`CSS ${Buffer.byteLength(css)}바이트 · 컴포넌트 CSS ${imports.length}개 포함`);
// 두 번째 설치 경로도 실제 설치된 dist JS를 스캔해 확인한다.
await mkdir(join(consumer, 'src'), { recursive: true });
await writeFile(join(consumer, 'src/tailwind.css'), `@import "${join(root, 'node_modules/tailwindcss/index.css')}" source(none);
@import "@s2life/ui/tailwind.css";
@source "../node_modules/@s2life/ui/dist";
@source "../main.tsx";
`);
run('pnpm', ['exec', 'tailwindcss', '-i', join(consumer, 'src/tailwind.css'), '-o', join(consumer, 'dist/combined.css'), '--minify']);
const combined = await readFile(join(consumer, 'dist/combined.css'), 'utf8');
assert.equal([...combined.matchAll(/\.inline-flex\{/g)].length, 1, 'Tailwind 유틸리티는 한 번만 생성되어야 한다');
for (const marker of Object.values(markers)) assert(combined.replaceAll('"', '').includes(marker));
console.log('기존 Tailwind v4 통합 CSS 빌드 통과');


// npm exec는 설치된 패키지의 단일 bin을 선택한다. 레지스트리의 미배포 버전은 요청하지 않는다.
const proc = spawn('npx', ['--no-install', '@s2life/mcp'], { cwd: consumer, env, stdio: ['pipe', 'pipe', 'pipe'] });
try {
  const response = await new Promise((resolve, reject) => {
    let output = '', stderr = '';
    const timer = setTimeout(() => reject(new Error(`MCP initialize 타임아웃: ${stderr}`)), 10000);
    proc.on('error', reject);
    proc.on('exit', (code) => { if (code) reject(new Error(`MCP 종료 ${code}: ${stderr}`)); });
    proc.stderr.on('data', (d) => { stderr += d; });
    proc.stdout.on('data', (d) => {
      output += d;
      if (output.includes('\n')) {
        clearTimeout(timer);
        try { resolve(JSON.parse(output.split('\n')[0])); } catch (error) { reject(error); }
      }
    });
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'pack-verify', version: '1' } } }) + '\n');
  });
  assert.equal(response.id, 1);
  assert.equal(response.result.serverInfo.version, packages[2].version);
  console.log('npx @s2life/mcp initialize 통과');
} finally { proc.stdin.end(); proc.kill(); }

try {
  if (process.argv.includes('--no-browser')) throw new Error('요청 옵션으로 실제 렌더를 확인하지 않았습니다.');
  resolveHeadlessShell();
} catch (error) {
  console.error(`브라우저 검증 미실행: ${error.message}`);
  process.exitCode = 1; // 렌더를 확인하지 못한 실행을 완료로 표시하지 않는다.
}
if (!process.exitCode) {
  const server = spawn(join(consumer, 'node_modules/.bin/vite'), ['preview', '--host', '127.0.0.1', '--port', '6107', '--strictPort'], { cwd: consumer, stdio: 'ignore' });
  let browser;
  try {
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch('http://127.0.0.1:6107')).ok) break; } catch { /* 서버 기동 대기 */ }
      await new Promise((r) => setTimeout(r, 100));
    }
    browser = await launchBrowser({ port: 9447, outDir: join(root, '.qa-shots/pack') });
    const { cdp, ev, sleep } = browser;
    await cdp('Page.navigate', { url: 'http://127.0.0.1:6107' });
    for (let i = 0; i < 80 && !await ev('!!document.querySelector("#primary")'); i++) await sleep(100);
    assert.equal(await ev('document.querySelector("#primary").getBoundingClientRect().height'), 38);
    assert.equal(await ev('getComputedStyle(document.querySelector("[data-slot=field]")).display'), 'flex');
    assert.equal(await ev('getComputedStyle(document.querySelector("[data-slot=field-error]")).minHeight'), '20px');
    assert(await ev('document.querySelector("[data-slot=data-table]")?.textContent.includes("포장 상자")'));
    await ev('document.querySelector("#tooltip-trigger").focus()');
    await sleep(250);
    assert(await ev('document.querySelector("[role=tooltip]").matches(":popover-open")'));
    assert.equal(await ev('getComputedStyle(document.querySelector("[data-slot=guide-tooltip]")).paddingTop'), '8px');
    await ev('document.querySelector("#peek-trigger").click()');
    await sleep(250);
    assert(await ev('document.querySelector("[data-peek]").matches(":popover-open")'));
    assert.equal(await ev('getComputedStyle(document.querySelector("[data-slot=peek]")).paddingTop'), '16px');
    await ev('document.querySelector("[aria-label=닫기]").click()');
    await ev('document.querySelector("[role=combobox]").dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowDown",bubbles:true}))');
    await sleep(250);
    assert(await ev('!!document.querySelector("[role=listbox]")'), 'Radix Select가 소비 앱에서 열려야 한다');
    assert.deepEqual(browser.errors(), []);
    await browser.shot('consumer');
    await ev(`new Promise((resolve, reject) => {
      const old = document.querySelector('link[rel=stylesheet]');
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/combined.css';
      link.onload = () => { old.remove(); resolve(true); }; link.onerror = reject; document.head.append(link);
    })`);
    assert.equal(await ev('document.querySelector("#primary").getBoundingClientRect().height'), 38);
    assert.equal(await ev('getComputedStyle(document.querySelector("[data-slot=field]")).display'), 'flex');
    assert.equal(await ev('getComputedStyle(document.querySelector("[data-slot=peek]")).paddingTop'), '16px');
    assert.equal(await ev('getComputedStyle(document.querySelector("[data-slot=guide-tooltip]")).paddingTop'), '8px');
    await browser.shot('consumer-tailwind');

    console.log('배포 리허설 검사 전부 통과: 타입·ESM·CSS·MCP·Tailwind 없는 앱 실제 렌더');
  } finally { browser?.close(); server.kill(); }
}
