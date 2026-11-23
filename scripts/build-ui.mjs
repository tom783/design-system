import { build } from 'vite';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkBoundaries } from './check-boundaries.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const ui = `${root}packages/ui/`;
const pkg = JSON.parse(await readFile(`${ui}package.json`, 'utf8'));
await checkBoundaries();
// 모든 런타임 의존성을 외부화한다. React JSX 런타임 같은 하위 경로도 포함한다.
const external = Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies });
await build({
  configFile: false,
  root: ui,
  build: {
    outDir: 'dist', emptyOutDir: true, minify: false,
    lib: { entry: { index: `${ui}src/index.ts`, icons: `${ui}src/icons.ts` }, formats: ['es'], fileName: (_, name) => `${name}.js` },
    rollupOptions: {
      output: {
        // 소스 파일마다 dist 파일 하나(목표 57). 단일 index.js 였을 때는 앱 번들러가 쓰지 않는 부품을 덜어내지 못해
        // Button 하나만 가져와도 부품 전부가 따라왔다. 파일이 나뉘고 package.json sideEffects 가 CSS 만 남겨 두므로
        // 앱은 가져온 부품과 그 의존만 받는다. 경로는 src 기준이라 tsc 의 d.ts(rootDir src)와 나란하다.
        preserveModules: true, preserveModulesRoot: `${ui}src`, entryFileNames: '[name].js',
        // Next.js App Router 의 클라이언트 경계. 소스 모듈마다 붙이고 공개 진입점 두 개(index·icons)에는 붙이지 않는다.
        // - 모듈마다: 서버 컴포넌트가 가져온 부품만 클라이언트 참조가 되고 그 부품 파일만 클라이언트 번들에 들어간다.
        //   순수 모듈(cn·toCsv 등)에도 붙는다 — 0.4.0 단일 파일과 같은 계약(서버에서는 렌더만, 함수 호출은 클라이언트).
        // - 진입점에는 안 붙인다: "use client" 진입점은 진입점 전체가 하나의 클라이언트 참조가 된다. Next 16 빈 앱
        //   (서버 페이지가 Button·StatusChip·Card·Check 를 import)의 클라이언트 JS 가 1,509kB → 590kB 였다. 특히 icons 는
        //   `export * from 'lucide-react'` 라 lucide 2,102개가 통째로 실렸다 — lucide 는 Icon·context 모듈에만
        //   "use client" 를 두어 서버에서 아이콘을 그리게 설계돼 있다. 진입점은 재export 뿐이라 서버에서 평가해도
        //   부품 코드가 실행되지 않는다(아래 검사가 지킨다). 근거·수치: docs/qa/bundle-size.md
        banner: (chunk) => (chunk.isEntry ? '' : '"use client";'),
      },
      external: (id) => external.some((name) => id === name || id.startsWith(`${name}/`)),
    },
  },
});
// preserveModules 는 src 밖 모듈도 dist 에 따로 낸다(실측: 부품이 import 한 docs/research/tokens.json → dist/docs/research/tokens.js,
// 원본 62kB · 축소 후 약 40kB 가 앱 번들까지 갔다). 부품이 저장소의 다른 파일을 끌어오거나 배너가 빠지면 배포 전에 멈춘다.
{
  const PUBLIC_ENTRIES = ['index.js', 'icons.js'];
  const problems = [];
  for (const file of (await readdir(`${ui}dist`, { recursive: true })).filter((f) => f.endsWith('.js')).sort()) {
    const code = await readFile(`${ui}dist/${file}`, 'utf8');
    if (PUBLIC_ENTRIES.includes(file)) {
      // 진입점은 서버에서도 평가된다 — 재export 외의 코드가 끼면 서버 컴포넌트에서 부품 코드가 돈다.
      const statements = code.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '').split(';').map((x) => x.trim()).filter(Boolean);
      const other = statements.filter((x) => !/^(?:import\s*\{[^}]*\}\s*from\s*"[^"]+"|export\s*(?:\*|\{[^}]*\})(?:\s*from\s*"[^"]+")?)$/.test(x));
      if (code.startsWith('"use client"')) problems.push(`${file}: 공개 진입점에 "use client" 가 붙었다 — 진입점 전체가 클라이언트 참조가 된다`);
      if (other.length) problems.push(`${file}: 공개 진입점에 재export 아닌 코드가 있다 — ${other[0].slice(0, 80)}`);
      continue;
    }
    if (!code.startsWith('"use client";')) problems.push(`${file}: "use client" 배너가 없다`);
    if (file.startsWith(`_virtual${sep}`)) continue; // 번들러 런타임 도우미(rolldown 의 __reExport 등)
    const source = `${ui}src/${file.slice(0, -'.js'.length)}`;
    if (!['.ts', '.tsx'].some((ext) => existsSync(source + ext))) problems.push(`${file}: src 에 대응하는 소스가 없다 — src 밖 파일을 import 했다`);
  }
  if (problems.length) throw new Error(`ui dist 검사 실패:\n  ${problems.join('\n  ')}`);
}
execFileSync('pnpm', ['exec', 'tsc', '-p', `${ui}tsconfig.build.json`], { cwd: root, stdio: 'inherit' });
// Tailwind 소비 앱에는 유틸리티·preflight를 제외한 토큰과 컴포넌트 규칙만 제공한다.
// source 목록을 복제하지 않도록 공통 진입 CSS에서 빌드 입력을 유도한다.
const styles = await readFile(`${ui}src/styles.css`, 'utf8');
await mkdir(`${ui}dist`, { recursive: true });
// pnpm 격리 설치와 직접 <link> 사용도 지원하도록 tokens 원본을 변환 없이 제공한다.
for (const file of ['tokens.css', 'theme.css', 'tokens.json']) {
  await copyFile(`${root}packages/tokens/${file}`, `${ui}dist/${file}`);
}
const source = styles.replace('@import "tailwindcss";', '@import "tailwindcss" source(none);\n@source "./";');
await writeFile(`${ui}src/.build.css`, source);
try {
  execFileSync('pnpm', ['exec', 'tailwindcss', '-i', `${ui}src/.build.css`, '-o', `${ui}dist/styles.css`, '--minify'], { cwd: root, stdio: 'inherit' });
} finally {
  const { unlink } = await import('node:fs/promises');
  await unlink(`${ui}src/.build.css`);
}
// 원본 CSS의 import를 풀어 동봉하고 소비 앱의 Tailwind가 유틸리티를 한 번만 생성하게 한다.
const componentImports = await readFile(`${ui}src/components.css`, 'utf8');
let componentCss = '';
for (const [, path] of componentImports.matchAll(/@import "(.+?)";/g)) componentCss += await readFile(`${ui}src/${path}`, 'utf8');
await writeFile(`${ui}dist/tailwind.css`, styles
  .replace('@import "tailwindcss";', '')
  .replace('@import "../../tokens/tokens.css";', '@import "@s2life/tokens/tokens.css";')
  .replace('@import "../../tokens/theme.css";', '@import "@s2life/tokens/theme.css";')
  .replace('@import "./components.css";', componentCss));
// Vite가 클래스 문자열을 보존하므로 소비 앱은 dist JS만 @source로 훑을 수 있다.
console.log(`배포 CSS: ${Buffer.byteLength(await readFile(`${ui}dist/styles.css`))}바이트 · 컴포넌트 CSS ${[...componentImports.matchAll(/@import /g)].length}개`);
