import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative, sep } from 'node:path';

const root = fileURLToPath(new URL('../packages/ui/src/', import.meta.url));
export async function checkBoundaries(sourceRoot = root) {
  const errors = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) { await walk(path); continue; }
      if (!/\.[cm]?[jt]sx?$/.test(entry.name)) continue;
      const source = await readFile(path, 'utf8');
      const local = relative(sourceRoot, path);
      // 정적 import·재export뿐 아니라 동적 import와 require도 같은 경계를 따른다.
      if (!local.startsWith(`internal${sep}`) && /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)['"]@radix-ui\//.test(source))
        errors.push(`${local}: Radix는 src/internal/을 통해서만 사용하세요.`);
      if (/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['"][^'"]*\.css['"]/.test(source))
        errors.push(`${local}: JS의 CSS import 대신 공통 CSS 진입점을 사용하세요.`);
    }
  }
  await walk(sourceRoot);
  if (errors.length) throw new Error(`의존 경계 검사 실패:\n${errors.join('\n')}`);
}
