// 소개 사이트(apps/site) 정적 검사 — 이 저장소는 ESLint 대신 소유한 경계 검사를 lint 로 쓴다(verify.yml "정적 의존 경계 검사").
// 사이트는 "소비 앱처럼" 디자인 시스템을 쓴다. 여기서 막는 것은 그 약속이 깨지는 모양이다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishedStylesInput } from '../../scripts/ui-styles-source.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const site = join(root, 'apps/site');
const read = (path) => readFileSync(path, 'utf8');
const rel = (path) => relative(root, path);
const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
};
const sources = walk(join(site, 'src')).filter((f) => /\.(tsx?|mts|mjs)$/.test(f));
const css = walk(join(site, 'src')).filter((f) => f.endsWith('.css'));
const manifest = JSON.parse(read(join(root, 'packages/mcp/manifest.json')));
const specifiers = (src) => [...src.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*|import\.meta\.glob(?:<[^>]*>)?\(\s*)['"]([^'"]+)['"]/g)].map((m) => m[1]);

test('사이트: 디자인 시스템은 공개 진입점으로만 가져온다', () => {
  // @s2life/ui · @s2life/ui/icons · @s2life/ui/styles.css 만 공개 계약이다. Radix·cmdk·internal 을 직접 쓰면
  // 앱이 못 쓰는 길로 사이트만 그려진다. 예외는 스토리 재사용(stories/load.ts 의 glob) 하나다.
  const PUBLIC = new Set(['@s2life/ui', '@s2life/ui/icons', '@s2life/ui/styles.css']);
  const hits = [];
  for (const file of sources) {
    for (const spec of specifiers(read(file))) {
      if (spec.startsWith('@s2life/ui') && !PUBLIC.has(spec)) hits.push(`${rel(file)}: ${spec}`);
      if (/^(?:@radix-ui\/|cmdk(?:\/|$))/.test(spec)) hits.push(`${rel(file)}: ${spec}`);
      if (spec.includes('packages/') && !(rel(file) === 'apps/site/src/stories/load.ts' && spec.endsWith('packages/ui/src/stories/*.stories.tsx'))) {
        hits.push(`${rel(file)}: ${spec}`);
      }
    }
  }
  assert.deepEqual(hits, [], `공개 진입점이 아닌 import:\n  ${hits.join('\n  ')}`);
});

test('사이트: 자체 CSS 는 site- 클래스와 의미 토큰만 쓴다', () => {
  // README: 앱 CSS 클래스는 ds- 로 시작하지 않고 Tailwind 유틸리티 이름을 다시 정의하지 않는다.
  // AGENTS.md 상시 규칙 2: 원시 색(--color-*)을 직접 쓰지 않는다. 없는 토큰 이름은 조용히 무시돼 화면만 틀어진다.
  const tokens = new Set(manifest.tokens.map((t) => t.cssVariable));
  const hits = [];
  for (const file of css) {
    const src = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [, name] of src.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) if (!name.startsWith('site-')) hits.push(`${rel(file)}: .${name} — site- 로 시작해야 한다`);
    for (const [, name] of src.matchAll(/var\((--[\w-]+)/g)) {
      if (name.startsWith('--color-')) hits.push(`${rel(file)}: ${name} — 원시 색 대신 의미 토큰`);
      else if (!tokens.has(name)) hits.push(`${rel(file)}: ${name} — 매니페스트에 없는 토큰`);
    }
    if (/@import\s+["']tailwindcss|@tailwind\b|@apply\b/.test(src)) hits.push(`${rel(file)}: Tailwind 지시문 — 사이트는 사전 컴파일 styles.css 의 소비자다`);
  }
  assert.deepEqual(hits, [], hits.join('\n  '));
});

test('사이트: 매니페스트 토큰 분류가 모두 파운데이션 절에 실린다', () => {
  // 생성기가 새 분류를 내면 사이트 검색이 갈 곳이 없어진다(색 절로 떨어진다). 절 정의에 넣어라.
  const sections = read(join(site, 'src/pages/foundations/sections.ts'));
  const listed = new Set([...sections.matchAll(/tokenCategories:\s*\[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])));
  const missing = [...new Set(manifest.tokens.map((t) => t.category))].filter((c) => !listed.has(c));
  assert.deepEqual(missing, [], `apps/site/src/pages/foundations/sections.ts 에 없는 토큰 분류: ${missing.join(', ')}`);
});

test('사이트: 고정 포트는 하네스·Storybook 과 겹치지 않고, 차 있으면 멈춘다', () => {
  const config = read(join(site, 'vite.config.ts'));
  const port = Number(/SITE_PORT = (\d+)/.exec(config)?.[1]);
  const preview = Number(/SITE_PREVIEW_PORT = (\d+)/.exec(config)?.[1]);
  for (const p of [port, preview]) assert.ok(p > 0 && ![6006, 6099].includes(p), `사이트 포트 ${p} — 6006(Storybook)·6099(하네스) 금지`);
  assert.equal((config.match(/strictPort: true/g) ?? []).length, 2, 'server·preview 모두 strictPort: true — 다른 포트로 옮겨 남의 서버와 헷갈리지 않게');
});

test('배포 CSS 입력: 사이트와 build-ui 가 같은 변환을 쓴다', () => {
  const styles = read(join(root, 'packages/ui/src/styles.css'));
  const input = publishedStylesInput(styles);
  assert.match(input, /@import "tailwindcss" source\(none\);\n@source "\.\/";/);
  assert.ok(!input.includes('@import "tailwindcss";'));
  assert.throws(() => publishedStylesInput('/* 진입 줄 없음 */'), /배포 CSS 입력/);
  assert.match(read(join(root, 'scripts/build-ui.mjs')), /publishedStylesInput\(styles\)/);
  assert.match(read(join(site, 'vite.config.ts')), /publishedStylesInput\(/);
});
