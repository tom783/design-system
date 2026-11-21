import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const docs = ['README.md', 'packages/ui/README.md',
  ...(await readdir(new URL('packages/ui/docs/', root))).filter((name) => name.endsWith('.mdx')).sort().map((name) => `packages/ui/docs/${name}`),
];

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
