import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { publishedStylesInput } from '../../scripts/ui-styles-source.mjs';
import { numberedSections, parseMarkdown } from './vite-plugins/markdown';
import { siteDocs } from './vite-plugins/site-docs';
import { siteScreens } from './vite-plugins/screens';

// 소개 사이트 — 로컬 구동 전용(배포하지 않는다, 2026-11-24 오너 결정).
// 포트는 고정한다. 6006 은 Storybook, 6099 는 하네스가 쓴다. 차 있으면 다른 포트로 옮기지 않고 멈춘다 —
// 다른 작업 폴더의 사이트를 내 것으로 착각하지 않게(AGENTS.md "하네스가 남의 서버를 검사하고 통과할 수 있다").
export const SITE_PORT = 6200;
export const SITE_PREVIEW_PORT = 6201;

const repo = fileURLToPath(new URL('../../', import.meta.url));
const uiSrc = `${repo}packages/ui/src/`;

/**
 * `@s2life/ui` 는 workspace 의 소스로 해석한다. package.json exports 는 dist 를 가리키는데,
 * - 사이트는 Storybook 스토리(CSF)를 그대로 가져와 렌더한다. 스토리는 src 를 상대 경로로 가져오므로
 *   사이트가 dist 를 쓰면 같은 부품이 두 벌 실리고 React 컨텍스트가 갈라진다.
 * - dist 는 `pnpm build` 뒤에만 생긴다. 소스로 두면 `pnpm site` 한 줄로 뜨고 부품 수정이 바로 보인다.
 * CSS 만은 소비 앱이 받는 것과 같아야 하므로 아래 uiStylesAsPublished 가 배포 빌드와 같은 입력으로 컴파일한다.
 */
const uiAliases = [
  { find: /^@s2life\/ui$/, replacement: `${uiSrc}index.ts` },
  { find: /^@s2life\/ui\/icons$/, replacement: `${uiSrc}icons.ts` },
];

/**
 * `@s2life/ui/styles.css` → packages/ui/src/styles.css 를 배포 빌드(scripts/build-ui.mjs)와 같은 변환으로 컴파일한다.
 * Tailwind 자동 탐지를 끄고 packages/ui/src 만 훑으므로, 사이트가 쓸 수 있는 유틸리티는 소비 앱과 같다
 * (사이트 소스의 클래스 문자열이 유틸리티를 만들어 내지 않는다). 가상 파일을 src 옆에 두는 것은
 * 상대 @import 와 `@source "./"` 가 원본과 같은 폴더 기준으로 풀리게 하기 위해서다.
 */
function uiStylesAsPublished(): Plugin {
  const source = `${uiSrc}styles.css`;
  const id = `${uiSrc}__site-published-styles.css`;
  return {
    name: 'site:ui-styles-as-published',
    enforce: 'pre',
    resolveId(spec) {
      if (spec === '@s2life/ui/styles.css') return id;
    },
    load(file) {
      if (file !== id) return;
      this.addWatchFile(source);
      return publishedStylesInput(readFileSync(source, 'utf8'));
    },
  };
}

/**
 * 스토리 내보내기 순서. ES 모듈 이름공간은 키를 코드 단위 순으로 정렬하므로 원본 순서를 잃는다.
 * Storybook 은 자기 CSF 플러그인이 `__namedExportsOrder` 를 붙여 원본 순서(첫 스토리 = 대표)를 지킨다.
 * 사이트도 같은 이름으로 붙인다. 스토리 파일은 모두 `export const 이름` 꼴이다(이미 붙어 있으면 건드리지 않는다).
 */
function storyExportOrder(): Plugin {
  const storyFile = /\/packages\/ui\/src\/stories\/[^/]+\.stories\.tsx$/;
  return {
    name: 'site:story-export-order',
    enforce: 'pre',
    transform(code, file) {
      if (!storyFile.test(file) || code.includes('__namedExportsOrder')) return;
      const names = [...code.matchAll(/^export const ([\p{L}\p{N}_$]+)\s*[:=]/gmu)].map((m) => m[1]);
      return { code: `${code}\nexport const __namedExportsOrder = ${JSON.stringify(names)};\n`, map: null };
    },
  };
}

/**
 * 버전·출처 표시와 DESIGN.md 절 이름. 모두 이 커밋의 파일에서 읽는다(손으로 옮겨 적지 않는다).
 * - version: packages/ui/package.json(세 패키지 lockstep)
 * - published: CHANGELOG.md 에서 날짜가 붙은 첫 판(= npm 에 게시된 최신판). `미게시` 판은 건너뛴다.
 * - sha·dirty: 사이트를 띄운(빌드한) 시점의 작업 폴더
 * - designSections: DESIGN.md 의 번호 붙은 제목 — 매니페스트 규칙 출처(`DESIGN.md 11.8`)에 이름을 붙인다.
 * - designAnchors: 같은 절의 GitHub 앵커 — 출처를 그 절로 바로 가는 링크로 만든다.
 * - published.components: 게시판 태그(v{게시판})의 매니페스트에 있는 이름 — 부품마다 "npm 게시판에 있음/없음".
 *   태그를 못 읽으면(얕은 클론 등) null 이고 사이트는 "확인 불가"로 보인다.
 */
function siteMeta(): Plugin {
  const virtualId = 'virtual:site-meta';
  const resolved = `\0${virtualId}`;
  const files = { ui: `${repo}packages/ui/package.json`, changelog: `${repo}CHANGELOG.md`, design: `${repo}DESIGN.md` };
  const git = (...args: string[]) => {
    try { return execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 16 * 1024 * 1024 }).trim(); } catch { return null; }
  };
  return {
    name: 'site:meta',
    resolveId(spec) {
      if (spec === virtualId) return resolved;
    },
    load(file) {
      if (file !== resolved) return;
      for (const path of Object.values(files)) this.addWatchFile(path);
      const ui = JSON.parse(readFileSync(files.ui, 'utf8'));
      const version: string = ui.version;
      // git+https://github.com/o/r.git → https://github.com/o/r
      const repository = typeof ui.repository?.url === 'string' ? ui.repository.url.replace(/^git\+/, '').replace(/\.git$/, '') : null;
      const published = /^## (\d+\.\d+\.\d+) — (\d{4}-\d{2}-\d{2})\s*$/m.exec(readFileSync(files.changelog, 'utf8'));
      const sections = numberedSections(parseMarkdown(readFileSync(files.design, 'utf8')).headings);
      const designSections = Object.fromEntries(Object.entries(sections).map(([number, section]) => [number, section.title]));
      const designAnchors = Object.fromEntries(Object.entries(sections).map(([number, section]) => [number, section.slug]));
      const sha = git('rev-parse', '--short', 'HEAD');
      const dirty = git('status', '--porcelain') ? true : false;
      let publishedComponents: string[] | null = null;
      if (published) {
        const stored = git('show', `v${published[1]}:packages/mcp/manifest.json`);
        try { publishedComponents = stored ? (JSON.parse(stored).components as { name: string }[]).map((c) => c.name) : null; } catch { publishedComponents = null; }
      }
      const meta = {
        version,
        published: published ? { version: published[1], date: published[2], components: publishedComponents } : null,
        repository,
        sha,
        dirty,
        designSections,
        designAnchors,
      };
      return `export default ${JSON.stringify(meta)};`;
    },
  };
}

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [uiStylesAsPublished(), storyExportOrder(), siteMeta(), siteDocs(repo), siteScreens(`${uiSrc}stories/`), react(), tailwindcss()],
  resolve: {
    alias: uiAliases,
    // 사이트와 packages/ui 가 같은 React 한 벌을 쓰게 한다(링크 경로가 달라도).
    dedupe: ['react', 'react-dom'],
  },
  server: { port: SITE_PORT, strictPort: true },
  preview: { port: SITE_PREVIEW_PORT, strictPort: true },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // 로컬 전용 사이트라 첫 덩어리 크기 경고는 끈다. 실측(11/24): 진입 덩어리 760kB(매니페스트 JSON 276kB 포함),
    // 스토리가 가져오는 storybook/test 575kB(부품 페이지 예시를 열 때만 받는다). 공개 배포를 정하면 경로별로 나눈다.
    chunkSizeWarningLimit: 1024,
  },
});
