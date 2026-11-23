// Next.js App Router 소비 앱 확인(목표 57) — 일회성 계측. 게이트·CI 는 돌리지 않는다(next 를 받아 깔아야 한다).
//
//   node docs/qa/measure/next-consumer.mjs              # Turbopack(Next 16 기본) 빌드
//   node docs/qa/measure/next-consumer.mjs --webpack    # webpack 빌드(next build --webpack)
//   node docs/qa/measure/next-consumer.mjs --optimize   # next.config 에 optimizePackageImports: ['@s2life/ui']
//   node docs/qa/measure/next-consumer.mjs --keep       # 임시 앱을 지우지 않는다
//
// npm pack(tokens·ui) → 빈 Next 앱(서버 컴포넌트 페이지가 Button·StatusChip·Card·Check 를 import, "use client" 섬이
// Select·useState) → next build → next start(빈 포트) → 헤드리스에서 SSR HTML·하이드레이션 뒤 클릭·Select 열림·
// 서버 버튼 38px·콘솔 오류 0 을 보고, 페이지가 받은 클라이언트 JS 바이트와 클라이언트 청크 안 lucide 아이콘 수를 잰다.
// 결과와 해석은 docs/qa/bundle-size.md.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from '../browser.mjs';

const NEXT = '16.4.6'; // 2026-11-23 npm latest. 바이브코딩 도그푸딩(docs/dogfood)과 같은 판
const root = fileURLToPath(new URL('../../../', import.meta.url));
const args = new Set(process.argv.slice(2));
for (const arg of args) if (!['--webpack', '--optimize', '--keep'].includes(arg)) { console.error(`모르는 인자: ${arg}`); process.exit(2); }
const dir = mkdtempSync(join(tmpdir(), 's2-next-'));
process.on('exit', (code) => {
  if (code === 0 && !process.exitCode && !args.has('--keep')) rmSync(dir, { recursive: true, force: true });
  else console.error(`Next 앱 폴더를 남겼습니다: ${dir}`);
});
const env = { ...process.env, npm_config_cache: join(dir, 'npm-cache'), NEXT_TELEMETRY_DISABLED: '1' };
const run = (command, argv, cwd) => execFileSync(command, argv, { cwd, env, stdio: ['ignore', 'pipe', 'inherit'], timeout: 600000 }).toString();

const packs = join(dir, 'packs');
await mkdir(packs);
const version = JSON.parse(await readFile(join(root, 'packages/ui/package.json'), 'utf8')).version;
for (const name of ['tokens', 'ui']) run('npm', ['pack', '--workspace', `packages/${name}`, '--pack-destination', packs], root);
const tgz = (name) => `file:${join(packs, `s2life-${name}-${version}.tgz`)}`;
const rootPkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));

const app = join(dir, 'app');
await mkdir(join(app, 'app/client-island'), { recursive: true });
await writeFile(join(app, 'package.json'), JSON.stringify({
  name: 's2life-next-consumer', private: true, type: 'module',
  dependencies: { next: NEXT, react: rootPkg.dependencies.react.replace(/^\^/, ''), 'react-dom': rootPkg.dependencies['react-dom'].replace(/^\^/, ''), pretendard: rootPkg.devDependencies.pretendard, '@s2life/ui': tgz('ui') },
  devDependencies: { typescript: rootPkg.devDependencies.typescript.replace(/^\^/, ''), '@types/react': rootPkg.devDependencies['@types/react'].replace(/^\^/, ''), '@types/react-dom': rootPkg.devDependencies['@types/react-dom'].replace(/^\^/, ''), '@types/node': '24.10.1' },
  pnpm: { overrides: { '@s2life/tokens': tgz('tokens'), '@s2life/ui': tgz('ui') } },
}, null, 2));
await writeFile(join(app, 'tsconfig.json'), JSON.stringify({
  compilerOptions: { target: 'ES2022', lib: ['dom', 'dom.iterable', 'esnext'], skipLibCheck: true, strict: true, noEmit: true, esModuleInterop: true, module: 'esnext', moduleResolution: 'bundler', resolveJsonModule: true, isolatedModules: true, jsx: 'react-jsx', incremental: false, plugins: [{ name: 'next' }] },
  include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'], exclude: ['node_modules'],
}, null, 2));
if (args.has('--optimize')) await writeFile(join(app, 'next.config.mjs'), "export default { experimental: { optimizePackageImports: ['@s2life/ui'] } };\n");
await writeFile(join(app, 'app/layout.tsx'), `import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@s2life/ui/styles.css';
import type { ReactNode } from 'react';
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
`);
// 서버 컴포넌트 페이지 — "use client" 없음. 부품과 아이콘을 서버 트리에서 import·렌더한다.
await writeFile(join(app, 'app/page.tsx'), `import { Button, StatusChip, Card, CardBody } from '@s2life/ui';
import { Check } from '@s2life/ui/icons';
import { ClientIsland } from './client-island/island';
export default function Page() {
  return <main style={{ padding: 32 }}>
    <h1>서버 컴포넌트에서 가져온 부품</h1>
    <Card><CardBody>
      <Button id="server-button" variant="primary"><Check />서버에서 렌더한 버튼</Button>
      <StatusChip tone="success">배송 완료</StatusChip>
    </CardBody></Card>
    <ClientIsland />
  </main>;
}
`);
await writeFile(join(app, 'app/client-island/island.tsx'), `'use client';
import { useState } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Button } from '@s2life/ui';
export function ClientIsland() {
  const [count, setCount] = useState(0);
  return <section>
    <Button id="client-button" onClick={() => setCount((c) => c + 1)}>클라이언트 눌림 {count}</Button>
    <Select defaultValue="ready"><SelectTrigger id="client-select" aria-label="상태"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="ready">준비</SelectItem><SelectItem value="done">완료</SelectItem></SelectContent>
    </Select>
  </section>;
}
`);
run('pnpm', ['install', '--ignore-workspace', '--no-frozen-lockfile', '--prefer-offline', '--config.node-linker=isolated'], app);
const bundler = args.has('--webpack') ? 'webpack' : 'turbopack';
console.log(run('npx', ['--no-install', 'next', 'build', ...(args.has('--webpack') ? ['--webpack'] : [])], app).split('\n').filter((l) => /Next\.js|Compiled|TypeScript|Route|○ \//.test(l)).join('\n'));

// 클라이언트 청크에 실린 lucide 아이콘 데이터 수 — 전체가 실리면 2,000개를 넘는다.
let chunkBytes = 0, icons = 0;
for (const file of (await readdir(join(app, '.next/static/chunks'), { recursive: true })).filter((f) => f.endsWith('.js'))) {
  const code = await readFile(join(app, '.next/static/chunks', file), 'utf8');
  chunkBytes += Buffer.byteLength(code);
  icons += [...code.matchAll(/\bname:\s*["'`][a-z0-9-]+["'`],\s*size:\s*24,\s*node:/g)].length;
}

const port = await new Promise((resolve, reject) => {
  const srv = createServer().once('error', reject);
  srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
});
const server = spawn(join(app, 'node_modules/.bin/next'), ['start', '-H', '127.0.0.1', '-p', String(port)], { cwd: app, env, stdio: 'ignore' });
const url = `http://127.0.0.1:${port}/`;
let browser;
try {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(`next start 가 ${port} 에 뜨지 못했습니다 (code ${server.exitCode})`);
    try { if ((await fetch(url)).ok) break; } catch { /* 기동 대기 */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  const html = await (await fetch(url)).text();
  assert(html.includes('서버에서 렌더한 버튼'), 'SSR HTML 에 서버 컴포넌트가 렌더한 Button 이 있어야 한다');
  browser = await launchBrowser({ outDir: join(root, '.qa-shots/next-consumer') });
  const { cdp, ev, sleep } = browser;
  await cdp('Page.navigate', { url });
  for (let i = 0; i < 100 && !await ev('!!document.querySelector("#client-button")'); i++) await sleep(100);
  // 하이드레이션 전 클릭은 사라진다 — 숫자가 바뀔 때까지 누른다(최대 5초).
  for (let i = 0; i < 50 && !/[1-9]/.test(await ev('document.querySelector("#client-button").textContent')); i++) {
    await ev('document.querySelector("#client-button").click()');
    await sleep(100);
  }
  assert.match(await ev('document.querySelector("#client-button").textContent'), /클라이언트 눌림 [1-9]/, '클라이언트 섬이 하이드레이션 뒤 눌려야 한다');
  await ev('document.querySelector("#client-select").dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowDown",bubbles:true}))');
  await sleep(300);
  assert(await ev('!!document.querySelector("[role=listbox]")'), 'Radix Select 가 열려야 한다');
  const serverButton = await ev('(() => { const b = document.querySelector("#server-button"); return { height: b.getBoundingClientRect().height, icon: !!b.querySelector("svg") }; })()');
  assert.deepEqual(serverButton, { height: 38, icon: true }, '서버 버튼 38px(styles.css) · icons 진입점의 Check 렌더');
  const js = await ev(`performance.getEntriesByType('resource').filter((r) => r.name.endsWith('.js'))
    .reduce((a, r) => ({ files: a.files + 1, decoded: a.decoded + r.decodedBodySize, transfer: a.transfer + r.encodedBodySize }), { files: 0, decoded: 0, transfer: 0 })`);
  assert.deepEqual(browser.errors().filter((m) => !/favicon/i.test(m)), [], '콘솔 오류 0');
  await browser.shot(`next-${bundler}${args.has('--optimize') ? '-optimize' : ''}`);
  const kb = (n) => `${(n / 1000).toFixed(1)}kB`;
  console.log(`Next ${NEXT} ${bundler}${args.has('--optimize') ? ' + optimizePackageImports' : ''} · @s2life/ui ${version} tarball`);
  console.log(`  SSR·하이드레이션·Select·서버 버튼 38px·콘솔 오류 0 통과`);
  console.log(`  페이지 클라이언트 JS ${js.files}개 ${kb(js.decoded)} (전송 ${kb(js.transfer)}) · 청크 전체 ${kb(chunkBytes)} · lucide 아이콘 데이터 ${icons}개`);
} finally { browser?.close(); server.kill(); }
