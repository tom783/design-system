// `virtual:site-screens` — 패턴(조립 화면 스토리)마다 가져다 쓰는 디자인 시스템 이름. 패턴 카드의 '쓰인 부품' 칩이 이것을 쓴다.
// 손으로 적지 않는다: screens-*.stories.tsx 와 그 파일이 가져오는 같은 폴더의 도우미(screens-shell.tsx 등)의
// `import { … } from '../index'` 를 읽는다. 부품 여부(kind = component)·부모 이름 정리는 사이트가 매니페스트로 한다.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import type { Plugin } from 'vite';

/** `import { A, B as C, type D } from '../index'` 의 이름(A·B). 타입만 가져오는 이름은 뺀다. */
function namesFrom(source: string, from: string) {
  const names: string[] = [];
  for (const match of source.matchAll(/import\s+(type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    if (match[1] || match[3] !== from) continue;
    for (const raw of match[2]!.split(',')) {
      const item = raw.trim();
      if (!item || item.startsWith('type ')) continue;
      names.push(item.split(/\s+as\s+/)[0]!.trim());
    }
  }
  return names;
}

/** 같은 폴더의 도우미 import(`./screens-shell`) — 스토리 파일은 빼고 한 번씩만 따라간다. */
function localHelpers(source: string) {
  return [...source.matchAll(/from\s*['"]\.\/([\w.-]+)['"]/g)].map((m) => m[1]!).filter((name) => !name.endsWith('.stories'));
}

export function siteScreens(storiesDir: string): Plugin {
  const virtualId = 'virtual:site-screens';
  const resolved = `\0${virtualId}`;
  return {
    name: 'site:screens',
    resolveId(spec) {
      if (spec === virtualId) return resolved;
    },
    load(id) {
      if (id !== resolved) return;
      const screens: Record<string, string[]> = {};
      for (const file of readdirSync(storiesDir).filter((name) => /^screens-.+\.stories\.tsx$/.test(name)).sort()) {
        const seen = new Set<string>();
        const names: string[] = [];
        const visit = (path: string) => {
          if (seen.has(path)) return;
          seen.add(path);
          this.addWatchFile(path);
          const source = readFileSync(path, 'utf8');
          names.push(...namesFrom(source, '../index'));
          for (const helper of localHelpers(source)) {
            const helperPath = [`${storiesDir}${helper}.tsx`, `${storiesDir}${helper}.ts`].find((candidate) => existsSync(candidate));
            if (helperPath) visit(helperPath);
          }
        };
        visit(`${storiesDir}${file}`);
        screens[file] = [...new Set(names)];
      }
      return `export default ${JSON.stringify(screens)};`;
    },
  };
}
