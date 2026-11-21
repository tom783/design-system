import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const gettingStarted = ['README.md', 'packages/ui/README.md', 'packages/ui/docs/01-getting-started.mdx'];
const docs = ['README.md', 'packages/ui/README.md',
  ...(await readdir(new URL('packages/ui/docs/', root))).filter((name) => name.endsWith('.mdx')).sort().map((name) => `packages/ui/docs/${name}`),
];

for (const path of gettingStarted) {
  test(`${path}: Pretendard 설치와 공통 진입점의 CSS 두 줄을 안내한다`, async () => {
    const source = await readFile(new URL(path, root), 'utf8');
    assert.match(source, /\bnpm install @s2life\/ui pretendard(?:\s|$)/);
    assert(source.includes("import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';\nimport '@s2life/ui/styles.css';"), '글꼴 CSS와 ui CSS를 함께 안내해야 한다');
    assert(source.includes('app/layout.tsx'), 'Next.js App Router의 공통 진입점');
    assert(source.includes('src/main.tsx'), 'Vite의 공통 진입점');
  });
}

for (const path of docs) {
  test(`${path}: 앱 설치 안내는 tokens 직접 설치를 요구하지 않는다`, async () => {
    const source = await readFile(new URL(path, root), 'utf8');
    // 여러 줄 셸 예제도 같은 설치 명령으로 검사해 우회하지 못하게 한다.
    // npm i·pnpm add·yarn add·bun add 로 적어도 같은 안내다.
    assert.doesNotMatch(source.replace(/\\\r?\n/g, ' '), /\b(?:npm\s+(?:install|i|add)|pnpm\s+(?:add|install|i)|yarn\s+add|bun\s+add)\b[^\r\n]*@s2life\/tokens\b/);
  });
  test(`${path}: 토큰 import는 ui 공개 경로를 사용한다`, async () => {
    const source = await readFile(new URL(path, root), 'utf8');
    assert.doesNotMatch(source, /['"]@s2life\/tokens\//);
  });
}
