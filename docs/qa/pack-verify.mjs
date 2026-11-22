// 실제 tarball만 설치한다. 저장소 alias·Tailwind·소스 링크가 소비 앱에 섞이면 안 된다.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, copyFile, readdir, access, constants, rm } from 'node:fs/promises';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { launchBrowser, resolveHeadlessShell } from './browser.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
// 기본은 실행마다 새 임시 폴더다. 고정 /tmp/s2·/tmp/s2-consumer 는 병렬 실행(--jobs·여러 작업 폴더)에서
// 서로의 tarball·node_modules 를 덮어썼다. 경로를 지정하면(S2_PACK_DIR·S2_CONSUMER_DIR) 그대로 두고,
// 임시 폴더는 통과하면 지운다(실패하면 들여다볼 수 있게 남기고 경로를 알린다).
const owned = [];
const tempDir = (prefix) => { const dir = mkdtempSync(join(tmpdir(), prefix)); owned.push(dir); return dir; };
const packDir = process.env.S2_PACK_DIR || tempDir('s2-pack-');
const consumer = process.env.S2_CONSUMER_DIR || tempDir('s2-consumer-');
process.on('exit', (code) => {
  if (code === 0 && !process.exitCode) for (const dir of owned) rmSync(dir, { recursive: true, force: true });
  else if (owned.length) console.error(`리허설 폴더를 남겼습니다: ${owned.join(' · ')}`);
});
// vite preview 포트도 고정(6107)이면 병렬 실행에서 부딪친다. 빈 포트를 받아 --strictPort 로 쓴다.
const freePort = () => new Promise((resolve, reject) => {
  const srv = createServer().once('error', reject);
  srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
});
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
  assert(!/\.(?:woff2?|ttf|otf)\b/i.test(listing), `${name}: 글꼴 파일은 앱이 제공한다`);
  if (name === 'mcp') assert(['match.mjs', 'catalog.mjs', 'manifest.json'].every(file => listing.includes(`package/${file}`)));
  tarballs.push(tarball);
}
const rootPkg = await json(join(root, 'package.json'));
// peer 하한 확인용. 기본은 저장소 루트의 React 다. S2_PACK_REACT=19.0.0 이면 소비 앱이 그 React·React DOM 과
// 같은 minor 의 @types 로 설치한다 — peer 범위를 넓히기 전에 가장 낮은 React 로 실제 렌더까지 돌려 보기 위해서다.
const reactPin = process.env.S2_PACK_REACT;
if (reactPin !== undefined) assert.match(reactPin, /^\d+\.\d+\.\d+$/, 'S2_PACK_REACT 는 정확한 버전(예: 19.0.0)이어야 한다');
const reactTypes = (name) => reactPin ? `~${reactPin.split('.').slice(0, 2).join('.')}.0` : rootPkg.devDependencies[name];
await save(join(consumer, 'package.json'), {
  name: 's2life-pack-consumer', private: true, type: 'module',
  // 앱은 안내대로 ui와 pretendard를 설치한다. MCP는 npx 검사, tokens는 ui의 전이 의존성이다.
  dependencies: Object.fromEntries(packages.map((p, i) => [p.name, `file:${tarballs[i]}`]).filter(([name]) => name !== '@s2life/tokens').concat([
    ['react', reactPin ?? rootPkg.dependencies.react], ['react-dom', reactPin ?? rootPkg.dependencies['react-dom']],
    ['pretendard', rootPkg.devDependencies.pretendard],
  ])),
  devDependencies: Object.fromEntries(['vite', 'typescript', '@types/react', '@types/react-dom'].map((name) => [name, name.startsWith('@types/') ? reactTypes(name) : rootPkg.devDependencies[name]])),
  // ui 가 의존하는 @s2life/tokens 는 격리 설치에서 레지스트리를 보므로
  // 아직 게시되지 않은 버전(배포 준비 중)에서
  // 리허설이 깨진다 — 정작 가장 필요한 순간이다. 트리 전체를 로컬 tarball 로 묶는다.
  pnpm: { overrides: Object.fromEntries(packages.map((pkg, i) => [pkg.name, `file:${tarballs[i]}`])) },
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
  for (const name of ['@s2life/tokens/tokens.css', '@tanstack/react-table', 'tailwindcss']) {
    assert.throws(() => import.meta.resolve(name), {code:'ERR_MODULE_NOT_FOUND'}, name + ' 직접 의존성 없음');
  }`], consumer);
// 저장소 파일이 아니라 실제 tokens tarball과 비교해야 배포 누락·변환도 잡는다.
run('node', ['--input-type=module', '-e', `import assert from 'node:assert/strict';
  import { readFileSync } from 'node:fs';
  import { execFileSync } from 'node:child_process';
  import tokens from '@s2life/ui/tokens.json' with { type: 'json' };
  for (const file of ['tokens.css', 'theme.css', 'tokens.json']) {
    const actual = readFileSync(new URL(import.meta.resolve('@s2life/ui/' + file)));
    const expected = execFileSync('tar', ['-xOf', process.argv[1], 'package/' + file]);
    assert.deepEqual(actual, expected, file + '는 tokens tarball과 바이트가 같아야 한다');
    if (file === 'tokens.json') assert.deepEqual(tokens, JSON.parse(expected.toString('utf8')));
  }
  console.log('ui 토큰 하위 경로 3개: tarball 바이트 동일 · JSON import 통과');
`, tarballs[0]], consumer);
run('npx', ['--no-install', 'tsc', '--noEmit', '--strict', '-p', 'tsconfig.json'], consumer);
run('node', ['--input-type=module', '-e', `import assert from 'node:assert/strict'; import {Button,DataTable,Select} from '@s2life/ui'; assert(Button&&DataTable&&Select); assert.throws(()=>import.meta.resolve('@s2life/ui/internal'),{code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});`], consumer);
run('npx', ['--no-install', 'vite', 'build'], consumer);
// 설치 버전만 보면 ui 쪽에 다른 React 가 따로 깔려도 모른다. 번들에 실제로 들어간 React 버전이 하나인지 본다.
const reactVersion = (await json(join(consumer, 'node_modules/react/package.json'))).version;
assert.equal((await json(join(consumer, 'node_modules/react-dom/package.json'))).version, reactVersion, 'react·react-dom 버전이 같아야 한다');
if (reactPin) assert.equal(reactVersion, reactPin, 'S2_PACK_REACT 로 지정한 React 가 설치되어야 한다');
const bundled = new Set();
for (const file of await readdir(join(consumer, 'dist/assets'))) {
  if (!file.endsWith('.js')) continue;
  // 축소기가 문자열을 따옴표 대신 백틱으로 쓴다(실측: e.version=`19.0.0`).
  for (const match of (await readFile(join(consumer, 'dist/assets', file), 'utf8')).matchAll(/\.version\s*=\s*["'`](\d+\.\d+\.\d+)["'`]/g)) bundled.add(match[1]);
}
assert.deepEqual([...bundled], [reactVersion], `번들 안 React 버전이 ${reactVersion} 하나여야 한다`);
console.log(`소비 앱 React ${reactVersion}${reactPin ? ' (S2_PACK_REACT)' : ''} · 번들 안 React 버전 ${[...bundled].join(', ')}`);
const installed = join(consumer, 'node_modules/@s2life');
await access(join(installed, 'mcp/server.mjs'), constants.X_OK);
assert((await readFile(join(installed, 'mcp/server.mjs'), 'utf8')).startsWith('#!/usr/bin/env node\n'));
const css = await readFile(join(installed, 'ui/dist/styles.css'), 'utf8');
// 모든 컴포넌트 CSS 목록이 진입점에 있으며, 각각의 고유 선택자가 최종 CSS에도 남아야 한다.
const markers = { avatar: '.ds-avatar', 'data-table': '[data-slot=data-table', form: '.ds-field', guide: '[data-slot=guide-tooltip]', loading: '.ds-loading-skeleton', peek: '[data-slot=peek]', state: '.ds-state', thumbnail: '.ds-thumbnail', toast: '.ds-toaster' };
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
assert(!/@font-face/i.test(css), 'ui CSS는 글꼴 면을 포함하지 않는다');
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
run('pnpm', ['exec', 'tailwindcss', '-i', join(consumer, 'src/tailwind.css'), '-o', join(consumer, 'src/combined.css'), '--minify']);
const combined = await readFile(join(consumer, 'src/combined.css'), 'utf8');
assert.equal([...combined.matchAll(/\.inline-flex\{/g)].length, 1, 'Tailwind 유틸리티는 한 번만 생성되어야 한다');
for (const marker of Object.values(markers)) assert(combined.replaceAll('"', '').includes(marker));
console.log('기존 Tailwind v4 통합 CSS 빌드 통과');

// CSS만 갈아 끼우면 첫 페이지의 로드된 글꼴이 다음 경로의 누락을 가린다.
// 별도 문서로 이동해 Tailwind 앱도 자신의 CSS import로 웹폰트를 로드하게 한다.
const main = await readFile(join(consumer, 'main.tsx'), 'utf8');
assert(main.includes("import '@s2life/ui/styles.css';"));
await writeFile(join(consumer, 'main-tailwind.tsx'), main.replace("import '@s2life/ui/styles.css';", "import './src/combined.css';"));
const index = await readFile(join(consumer, 'index.html'), 'utf8');
try {
  await writeFile(join(consumer, 'index.html'), index.replace('/main.tsx', '/main-tailwind.tsx'));
  run('npx', ['--no-install', 'vite', 'build', '--outDir', 'dist/tailwind', '--base', '/tailwind/'], consumer);
} finally { await writeFile(join(consumer, 'index.html'), index); }

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
  const previewPort = await freePort();
  const app = `http://127.0.0.1:${previewPort}`;
  const server = spawn(join(consumer, 'node_modules/.bin/vite'), ['preview', '--host', '127.0.0.1', '--port', String(previewPort), '--strictPort'], { cwd: consumer, stdio: 'ignore' });
  let browser;
  try {
    for (let i = 0; i < 60; i++) {
      if (server.exitCode !== null) throw new Error(`vite preview 가 ${previewPort} 에 뜨지 못했습니다 (code ${server.exitCode})`);
      try { if ((await fetch(app)).ok) break; } catch { /* 서버 기동 대기 */ }
      await new Promise((r) => setTimeout(r, 100));
    }
    browser = await launchBrowser({ outDir: join(root, '.qa-shots/pack') });
    const { cdp, ev, sleep } = browser;
    const verifyFont = async (path) => {
      // DOM 생성 직후는 첫 레이아웃 전일 수 있어, 먼저 본문 레이아웃을 확정한다.
      await ev('document.body.offsetWidth; document.fonts.ready.then(() => true)');
      const font = await ev(`(() => {
        const text = document.querySelector('main');
        const unquote = (family) => family.trim().replace(/^['"]|['"]$/g, '');
        return {
          korean: /[가-힣]/.test(text.innerText),
          firstFamily: unquote(getComputedStyle(text).fontFamily.split(',')[0]),
          loaded: [...document.fonts].filter(face => unquote(face.family) === 'Pretendard Variable' && face.status === 'loaded').length,
        };
      })()`);
      assert(font.korean, `${path}: 한글을 표시해 동적 서브셋 다운로드를 유도해야 한다`);
      assert(font.loaded > 0, `${path}: Pretendard Variable 면이 하나 이상 실제 로드되어야 한다`);
      assert.equal(font.firstFamily, 'Pretendard Variable', `${path}: 본문의 첫 계산 글꼴`);
      console.log(`${path}: Pretendard Variable ${font.loaded}면 로드 · 본문 첫 글꼴 확인`);
    };
    // 계산 스타일 몇 개로는 "모양"이 깨진 것을 못 본다(0.3.0 게시본: 버튼 높이 38 은 맞는데 아이콘이 라벨 위에 쌓였다).
    // 아이콘·라벨이 한 줄인지, 탭 선택 밑줄이 기준선에 앉는지를 위치로 잰다.
    const verifyShape = async (path) => {
      const shape = await ev(`(() => {
        const button = document.querySelector('#primary'), icon = button.querySelector('svg');
        const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
        let node; while ((node = walker.nextNode()) && !node.textContent.trim());
        const range = document.createRange(); range.selectNodeContents(node);
        const b = button.getBoundingClientRect(), i = icon.getBoundingClientRect(), t = range.getBoundingClientRect();
        const list = document.querySelector('[role=tablist]'), tab = list.querySelector('[role=tab][data-state=active]');
        const l = list.getBoundingClientRect();
        return {
          iconDy: Math.abs((i.top + i.height / 2) - (t.top + t.height / 2)), iconBeforeLabel: i.right <= t.left,
          iconInside: i.top >= b.top && i.bottom <= b.bottom,
          baseline: getComputedStyle(list).backgroundImage, underline: getComputedStyle(tab).borderBottomWidth,
          underlineGap: Math.abs(tab.getBoundingClientRect().bottom - (l.top + list.clientTop + list.clientHeight)),
        };
      })()`);
      assert(shape.iconDy <= 1 && shape.iconBeforeLabel && shape.iconInside, `${path}: 버튼 아이콘과 라벨이 한 줄로 버튼 안에 있어야 한다 ${JSON.stringify(shape)}`);
      assert.match(shape.baseline, /linear-gradient/, `${path}: 탭 목록 기준선(1px 배경)이 그려져야 한다`);
      assert.equal(shape.underline, '2px', `${path}: 선택 탭 밑줄 2px`);
      assert(shape.underlineGap <= 0.5, `${path}: 선택 밑줄 아래 끝이 기준선(스크롤 영역 바닥)과 같아야 한다 — 차 ${shape.underlineGap}px`);
      console.log(`${path}: 버튼 아이콘·라벨 한 줄(세로 중심 차 ${shape.iconDy.toFixed(2)}px) · 탭 기준선·선택 밑줄 일치`);
    };
    await cdp('Page.navigate', { url: app });
    for (let i = 0; i < 80 && !await ev('!!document.querySelector("#primary")'); i++) await sleep(100);
    await verifyFont('기본 CSS 앱');
    await verifyShape('기본 CSS 앱');
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
    await cdp('Page.navigate', { url: `${app}/tailwind/` });
    for (let i = 0; i < 80 && !await ev('location.pathname === "/tailwind/" && !!document.querySelector("#primary")'); i++) await sleep(100);
    await verifyFont('Tailwind 앱');
    await verifyShape('Tailwind 앱');
    await ev('document.querySelector("#tooltip-trigger").focus()');
    await sleep(250);
    await ev('document.querySelector("#peek-trigger").click()');
    await sleep(250);
    assert.equal(await ev('document.querySelector("#primary").getBoundingClientRect().height'), 38);
    assert.equal(await ev('getComputedStyle(document.querySelector("[data-slot=field]")).display'), 'flex');
    assert.equal(await ev('getComputedStyle(document.querySelector("[data-slot=peek]")).paddingTop'), '16px');
    assert.equal(await ev('getComputedStyle(document.querySelector("[data-slot=guide-tooltip]")).paddingTop'), '8px');
    assert.deepEqual(browser.errors(), []);
    await browser.shot('consumer-tailwind');

    console.log(`배포 리허설 검사 전부 통과(React ${reactVersion}): 타입·ESM·CSS·MCP·기본/Tailwind 앱 실제 렌더·Pretendard 로드`);
  } finally { browser?.close(); server.kill(); }
}
