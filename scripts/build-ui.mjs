import { build } from 'vite';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
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
    // Next.js에서 훅을 쓰는 공개 번들을 클라이언트 경계로 인식하게 한다.
    rollupOptions: { output: { banner: '"use client";' }, external: (id) => external.some((name) => id === name || id.startsWith(`${name}/`)) },
  },
});
execFileSync('pnpm', ['exec', 'tsc', '-p', `${ui}tsconfig.build.json`], { cwd: root, stdio: 'inherit' });
// Tailwind 소비 앱에는 유틸리티·preflight를 제외한 토큰과 컴포넌트 규칙만 제공한다.
// source 목록을 복제하지 않도록 공통 진입 CSS에서 빌드 입력을 유도한다.
const styles = await readFile(`${ui}src/styles.css`, 'utf8');
await mkdir(`${ui}dist`, { recursive: true });
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
