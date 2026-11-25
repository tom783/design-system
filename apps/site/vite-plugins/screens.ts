// `virtual:site-screens` — 패턴(조립 화면 스토리)마다 가져다 쓰는 디자인 시스템 이름. 패턴 카드의 '쓰인 부품' 칩이 이것을 쓴다.
// 손으로 적지 않는다: screens-*.stories.tsx 에서 시작해 그 파일이 가져오는 도우미 — 같은 폴더(screens-shell.tsx 등)와 문서 예시
// (docs/examples/app-header.tsx → context-switcher·notification-center·user-menu 등) — 를 따라가며 패키지 진입점에서 가져오는 이름을
// 모은다. 진입점은 스토리에서는 `'../index'`, 문서 예시에서는 `'../../src'` 로 쓰지만 같은 packages/ui/src/index.ts 다(경로를 풀어 비교한다).
// 부품 소스(src/components)·아이콘(src/icons)은 따라가지 않는다 — 화면이 조립한 이름만 모은다. 부품 여부(kind = component)·
// 부모 이름 정리는 사이트가 매니페스트로 한다.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import type { Plugin } from 'vite';

interface Imported {
  /** import 경로 그대로('../index' · './screens-shell' · '../../docs/examples/app-header') */
  spec: string;
  /** `import { A, B as C, type D }` 의 값 이름(A·B). `import type { … }` 와 `type D` 는 빼고, 그런 import 는 따라가지도 않는다. */
  names: string[];
}

/** 이름을 꺼내 쓰는 import(`import { … } from '…'`). 기본·이름공간 import 는 진입점에서 쓰지 않으므로 보지 않는다. */
function importsOf(source: string): Imported[] {
  const found: Imported[] = [];
  for (const match of source.matchAll(/import\s+(type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    if (match[1]) continue;
    const names = match[2]!.split(',').map((raw) => raw.trim()).filter((item) => item && !item.startsWith('type '))
      .map((item) => item.split(/\s+as\s+/)[0]!.trim());
    found.push({ spec: match[3]!, names });
  }
  return found;
}

const withExtension = (base: string) => [`${base}.tsx`, `${base}.ts`, `${base}${sep}index.tsx`, `${base}${sep}index.ts`].find((path) => existsSync(path));

/** `storiesDir` = packages/ui/src/stories/ — 진입점(src/index)과 문서 예시 폴더(docs/examples)는 거기서 정한다. */
export function siteScreens(storiesDir: string): Plugin {
  const virtualId = 'virtual:site-screens';
  const resolved = `\0${virtualId}`;
  const stories = resolve(storiesDir);
  const src = dirname(stories);
  const examples = resolve(src, '../docs/examples');
  const entries = new Set([src, resolve(src, 'index')]);
  /** 따라갈 도우미 — 같은 폴더의 스토리 아닌 파일, 문서 예시. 다른 스토리 파일·부품 소스는 따라가지 않는다. */
  const followed = (path: string) =>
    (dirname(path) === stories && !/\.stories\.tsx?$/.test(path)) || path.startsWith(`${examples}${sep}`);
  return {
    name: 'site:screens',
    resolveId(spec) {
      if (spec === virtualId) return resolved;
    },
    load(id) {
      if (id !== resolved) return;
      const screens: Record<string, string[]> = {};
      for (const file of readdirSync(stories).filter((name) => /^screens-.+\.stories\.tsx$/.test(name)).sort()) {
        const seen = new Set<string>();
        const names: string[] = [];
        const visit = (path: string) => {
          if (seen.has(path)) return;
          seen.add(path);
          this.addWatchFile(path);
          for (const { spec, names: imported } of importsOf(readFileSync(path, 'utf8'))) {
            if (!spec.startsWith('.')) continue;
            const target = resolve(dirname(path), spec);
            if (entries.has(target)) { names.push(...imported); continue; }
            const helper = withExtension(target);
            if (helper && followed(helper)) visit(helper);
          }
        };
        visit(resolve(stories, file));
        screens[file] = [...new Set(names)];
      }
      return `export default ${JSON.stringify(screens)};`;
    },
  };
}
