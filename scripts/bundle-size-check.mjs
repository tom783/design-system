// 앱 번들 크기 회귀 검사(목표 57). 게시 경로 그대로 잰다:
//   npm pack(prepack 이 빌드) → 빈 소비 앱에 tarball 만 격리 설치 → 앱이 가져올 법한 묶음 3개를
//   vite 라이브러리 빌드(react·react-dom 외부, minify)로 묶어 min·gzip 바이트를 잰다.
// 저장소 dist·소스·alias 를 직접 묶으면 exports·sideEffects·"use client" 를 거친 실제 크기를 못 본다.
//
//   node scripts/bundle-size-check.mjs              # 검사 (pnpm size)
//   node scripts/bundle-size-check.mjs --json out.json   # 수치를 파일로도 남긴다
//   node scripts/bundle-size-check.mjs --no-assert  # 재기만 한다(기준선 측정용 — 실패해도 exit 0)
//
// 왜 이 상한인가: 0.4.0(6052d8e) 에서 Button 하나만 가져와도 1,356kB 였다. 원인은 둘이었다 —
// carousel 이 공개 icons 진입점(`export * from 'lucide-react'`)을 가져와 lucide 전체가 이름공간 객체로
// 복사됐고, 단일 파일 번들이라 앱 번들러가 쓰지 않는 부품을 덜어내지 못했다. 둘을 고친 뒤 Button 은
// 수십 kB 다. 상한은 docs/qa/bundle-size.md 의 실측에 여유를 둔 값이다 — 바꾸면 그 문서도 고친다.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
const known = new Set(['--json', '--no-assert', '--keep']);
for (const [i, arg] of args.entries()) {
  if (args[i - 1] === '--json') continue;
  if (!known.has(arg)) { console.error(`모르는 인자: ${arg}\n  사용: node scripts/bundle-size-check.mjs [--json 파일] [--no-assert] [--keep]`); process.exit(2); }
}

// kB = 1000바이트(vite 출력과 같은 단위). gzip 은 vite 보고와 같은 level 9.
const BUDGET = {
  // 합격 기준(목표 57): Button 하나 ≤ 60kB(min). 0.4.0 은 1,097kB, 고친 뒤 34.5kB — 대부분 Button 이 쓰는
  // tailwind-merge 다(docs/qa/bundle-size.md). 60kB 를 넘으면 무언가 통째로 따라온 것이다.
  button: { min: 60_000 },
  // 목록 화면 10개·전체는 기록이 목적이라 실측(385.9kB · 636.0kB)에 약 30% 여유를 둔다. 부품이 늘면 오른다 —
  // 넘으면 무엇이 늘었는지 보고(--keep 으로 남긴 번들) 정당하면 이 값과 문서를 함께 올린다.
  list: { min: 500_000 },
  all: { min: 820_000 },
};
// 전체 lucide(1.72 기준 2,102개)가 새면 수천 개가 보인다. 부품이 실제로 쓰는 아이콘은 전체 묶음에서도 33개다.
const ICON_LIMIT = 80;
// 쓰지 않는 아이콘 — 이 이름이 보이면 lucide 가 통째로 들어온 것이다.
const UNUSED_ICONS = ['air-vent', 'alarm-clock-check', 'baby', 'wine-off', 'zap-off'];
// tokens.json 원본에만 있는 키 — 번들에 보이면 생성 JSON 전체(약 62kB)가 들어온 것이다.
const TOKENS_JSON_MARKERS = ['dangerSeparation', 'contrastFloor', 'chromaCurve', 'lineHeightPct'];

const BUNDLES = [
  { name: 'button', label: 'Button 하나', source: "export { Button } from '@s2life/ui';\n" },
  {
    name: 'list', label: '목록 화면 10개',
    // 목록 화면(Screens/OrderList) 한 장을 만드는 부품 10개.
    source: "export { AppShell, SideNav, PageHeader, FilterBar, BulkActionBar, DataTable, Pagination, Button, StatusChip, DatePicker } from '@s2life/ui';\n",
  },
  { name: 'all', label: '전체 export *', source: "export * from '@s2life/ui';\n" },
];

const owned = [];
const tempDir = (prefix) => { const dir = mkdtempSync(join(tmpdir(), prefix)); owned.push(dir); return dir; };
process.on('exit', (code) => {
  if (code === 0 && !process.exitCode && !flag('--keep')) for (const dir of owned) rmSync(dir, { recursive: true, force: true });
  else if (owned.length) console.error(`측정 폴더를 남겼습니다: ${owned.join(' · ')}`);
});

const json = async (path) => JSON.parse(await readFile(path, 'utf8'));
const started = Date.now();
const packDir = tempDir('s2-size-pack-');
const consumer = tempDir('s2-size-app-');
const env = { ...process.env, npm_config_cache: join(packDir, 'npm-cache') };
const run = (command, argv, cwd = root) => execFileSync(command, argv, { cwd, env, stdio: ['ignore', 'pipe', 'inherit'], timeout: 300000 });

const pkgs = Object.fromEntries(await Promise.all(['tokens', 'ui'].map(async (name) => [name, await json(join(root, `packages/${name}/package.json`))])));
const tarballs = {};
for (const name of ['tokens', 'ui']) {
  // prepack 이 빌드한다 — 게시와 같은 길이다. 저장소에 남은 오래된 dist 를 재지 않는다.
  run('npm', ['pack', '--workspace', `packages/${name}`, '--pack-destination', packDir]);
  tarballs[name] = join(packDir, `s2life-${name}-${pkgs[name].version}.tgz`);
}
const rootPkg = await json(join(root, 'package.json'));
await writeFile(join(consumer, 'package.json'), JSON.stringify({
  name: 's2life-size-consumer', private: true, type: 'module',
  dependencies: { '@s2life/ui': `file:${tarballs.ui}`, react: rootPkg.dependencies.react, 'react-dom': rootPkg.dependencies['react-dom'] },
  // 아직 게시하지 않은 tokens 버전도 로컬 tarball 로 묶는다(pack-verify 와 같은 이유).
  pnpm: { overrides: { '@s2life/tokens': `file:${tarballs.tokens}`, '@s2life/ui': `file:${tarballs.ui}` } },
}, null, 2));
run('pnpm', ['install', '--ignore-workspace', '--no-frozen-lockfile', '--ignore-scripts', '--prefer-offline',
  '--config.node-linker=isolated', '--config.hoist=false', '--config.shamefully-hoist=false'], consumer);

// 소비 앱이 실제로 받은 lucide 의 아이콘 이름 목록. 저장소 쪽 lucide 와 버전이 달라도 맞는 목록을 쓴다.
// pnpm 격리 설치에서 ui 는 .pnpm 안을 가리키는 링크다 — 실제 경로에서 찾아야 ui 의 의존성이 보인다.
const uiRequire = createRequire(realpathSync(join(consumer, 'node_modules/@s2life/ui/package.json')));
// lucide-react 의 exports 는 package.json 을 열어 두지 않는다 — 진입점에서 패키지 뿌리를 찾는다.
const lucideMain = uiRequire.resolve('lucide-react');
const lucideDir = join(lucideMain.slice(0, lucideMain.lastIndexOf(`${sep}dist${sep}`)), 'dist/esm/icons');
const iconNames = new Set((await readdir(lucideDir)).filter((f) => f.endsWith('.mjs')).map((f) => f.slice(0, -4)));
assert(iconNames.size > 1000, `lucide 아이콘 목록을 못 읽었습니다: ${lucideDir}`);
for (const name of UNUSED_ICONS) assert(iconNames.has(name), `검사용 미사용 아이콘 ${name} 이 lucide 에 없습니다 — 목록을 고쳐라`);

// vite 는 저장소 것을 쓴다(소비 앱에 vite 를 따로 깔면 측정마다 설치가 는다). 해석은 엔트리 파일 위치,
// 곧 소비 앱의 node_modules 에서 시작하므로 저장소 패키지가 섞이지 않는다.
const { build } = await import('vite');
const react = ['react', 'react-dom'];
const results = [];
for (const bundle of BUNDLES) {
  const entry = join(consumer, `entry-${bundle.name}.js`);
  await writeFile(entry, bundle.source);
  const outDir = join(consumer, 'dist', bundle.name);
  await build({
    configFile: false, root: consumer, logLevel: 'silent', publicDir: false,
    build: {
      outDir, emptyOutDir: true, minify: 'oxc', reportCompressedSize: false, copyPublicDir: false,
      lib: { entry, formats: ['es'], fileName: () => 'bundle.js' },
      rollupOptions: {
        // Vite 라이브러리 es 포맷은 PURE 주석을 지키려고 공백·주석을 남긴다(실측: 같은 입력이 약 1.5배).
        // 앱 번들은 공백까지 줄이므로 앱 빌드와 같은 축소를 켠다.
        output: { minify: true, comments: false },
        external: (id) => react.some((name) => id === name || id.startsWith(`${name}/`)),
        // 라이브러리 모듈의 "use client" 는 번들 안에서 의미가 없다는 경고 — 앱 번들러도 똑같이 무시한다.
        onwarn: (warning, warn) => { if (warning.code !== 'MODULE_LEVEL_DIRECTIVE') warn(warning); },
      },
    },
  });
  let code = '';
  for (const file of (await readdir(outDir, { recursive: true })).filter((f) => f.endsWith('.js')).sort()) code += await readFile(join(outDir, file), 'utf8');
  // lucide 아이콘 하나는 번들에 `{name:"chevron-down",size:24,node:[…]}` 데이터로 남는다(lucide-react 1.x).
  // 일반 문자열("check"·"x" 등)과 헷갈리지 않게 이 모양만 센다.
  const drawn = new Set([...code.matchAll(/\bname:\s*["'`]([a-z0-9-]+)["'`],\s*size:\s*24,\s*node:/g)].map((m) => m[1]));
  const icons = [...drawn].filter((name) => iconNames.has(name));
  results.push({
    name: bundle.name, label: bundle.label,
    min: Buffer.byteLength(code), gzip: gzipSync(code, { level: 9 }).length,
    icons: icons.length, unusedIcons: UNUSED_ICONS.filter((name) => drawn.has(name)),
    tokensJson: TOKENS_JSON_MARKERS.filter((marker) => code.includes(marker)),
  });
}

const kb = (n) => `${(n / 1000).toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}kB`;
console.log(`\n앱 번들 크기 — @s2life/ui ${pkgs.ui.version} tarball · vite 라이브러리 빌드(react 외부, minify) · gzip level 9`);
console.log('묶음             min         gzip       상한(min)    lucide 아이콘   tokens.json');
for (const r of results) {
  console.log(`${r.label.padEnd(14)} ${kb(r.min).padStart(10)}  ${kb(r.gzip).padStart(10)}  ${kb(BUDGET[r.name].min).padStart(11)}    ${String(r.icons).padStart(5)}개      ${r.tokensJson.length ? `포함(${r.tokensJson.join(',')})` : '없음'}`);
}
console.log(`(${((Date.now() - started) / 1000).toFixed(1)}초)`);
const out = option('--json');
if (out) {
  await mkdir(dirname(join(process.cwd(), out)), { recursive: true });
  await writeFile(out, `${JSON.stringify({ version: pkgs.ui.version, budget: BUDGET, iconLimit: ICON_LIMIT, results }, null, 2)}\n`);
}

if (!flag('--no-assert')) {
  const failures = [];
  for (const r of results) {
    if (r.min > BUDGET[r.name].min) failures.push(`${r.label}: ${kb(r.min)} > 상한 ${kb(BUDGET[r.name].min)}`);
    if (r.icons > ICON_LIMIT || r.unusedIcons.length) failures.push(`${r.label}: lucide 아이콘 ${r.icons}개(상한 ${ICON_LIMIT}) · 쓰지 않는 아이콘 ${r.unusedIcons.join(', ') || '없음'} — lucide 전체가 들어왔다. 부품은 'lucide-react' 를 직접 import 한다(공개 icons 진입점 금지)`);
    if (r.tokensJson.length) failures.push(`${r.label}: tokens.json 원본이 들어왔다(${r.tokensJson.join(', ')}) — 런타임 값은 lib/runtime-tokens.ts(생성) 를 쓴다`);
  }
  if (failures.length) {
    console.error(`\n✗ 번들 크기 검사 실패 ${failures.length}건\n  ${failures.join('\n  ')}`);
    process.exitCode = 1;
  } else console.log('✓ 번들 크기 검사 통과 — Button 상한 · lucide 전체 미포함 · tokens.json 원본 미포함');
}
