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

// 사이트 효과 층 — 첫 화면의 번짐·격자·상단 바 블러·순차 조립(디자인 총괄 기준 effects-boundary r1). 블러·그라데이션·움직임은
// 소개 사이트 입구 전용이라 디자인 시스템 토큰에 없다. 이 파일 하나만 아래 두 가지를 받는다:
//   ① 원시 색 중 크림슨(brand)·중립(neutral) 단계 — 기준이 "크림슨·따뜻한 중립만, 새 색상각 금지"라 의미 토큰으로는 그 경계를 말할 수 없다
//   ② 이 파일이 정의한 --site-* 효과 변수
const EFFECTS = join(site, 'src/pages/home/effects.css');
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '');

test('사이트: 자체 CSS 는 site- 클래스와 의미 토큰만 쓴다', () => {
  // README: 앱 CSS 클래스는 ds- 로 시작하지 않고 Tailwind 유틸리티 이름을 다시 정의하지 않는다.
  // AGENTS.md 상시 규칙 2: 원시 색(--color-*)을 직접 쓰지 않는다. 없는 토큰 이름은 조용히 무시돼 화면만 틀어진다.
  const tokens = new Set(manifest.tokens.map((t) => t.cssVariable));
  const hits = [];
  for (const file of css) {
    const src = stripComments(read(file));
    const effects = file === EFFECTS;
    const effectVars = new Set([...src.matchAll(/(?:@property\s+|[\s;{(])(--site-[\w-]+)\s*[:{]/g)].map((m) => m[1]));
    for (const [, name] of src.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) if (!name.startsWith('site-')) hits.push(`${rel(file)}: .${name} — site- 로 시작해야 한다`);
    for (const [, name] of src.matchAll(/var\((--[\w-]+)/g)) {
      if (effects && name.startsWith('--site-')) {
        if (!effectVars.has(name)) hits.push(`${rel(file)}: ${name} — 효과 층에서 정의하지 않은 변수`);
      } else if (effects && /^--color-(?:brand|neutral)-\d+$/.test(name)) {
        if (!tokens.has(name)) hits.push(`${rel(file)}: ${name} — 매니페스트에 없는 원시 색`);
      } else if (name.startsWith('--color-')) hits.push(`${rel(file)}: ${name} — 원시 색 대신 의미 토큰${effects ? '(효과 층도 크림슨·중립 단계만)' : ''}`);
      else if (!tokens.has(name)) hits.push(`${rel(file)}: ${name} — 매니페스트에 없는 토큰`);
    }
    if (/@import\s+["']tailwindcss|@tailwind\b|@apply\b/.test(src)) hits.push(`${rel(file)}: Tailwind 지시문 — 사이트는 사전 컴파일 styles.css 의 소비자다`);
  }
  assert.deepEqual(hits, [], hits.join('\n  '));
});

test('사이트 효과 층: 색 값을 직접 쓰지 않고, 움직임은 움직임 줄이기가 꺼졌을 때만, 끝없는 움직임은 하나', () => {
  // 기준(effects-boundary r1): 새 색 금지 · prefers-reduced-motion 이면 애니메이션 0개 · 무한 반복은 배경 흐름 1개.
  // 블러·그라데이션·마스크·키프레임은 효과 층에만 둔다 — 다른 사이트 CSS 와 실물 부품 쪽으로 새지 않게.
  const src = stripComments(read(EFFECTS));
  const hits = [];
  for (const [m] of src.matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/g)) hits.push(`${rel(EFFECTS)}: ${m} — 색은 토큰 변수로만`);
  // 움직임 선언(animation)은 모두 @media (prefers-reduced-motion: no-preference) { … } 안에 있어야 한다.
  const open = src.indexOf('@media (prefers-reduced-motion: no-preference)');
  assert.ok(open >= 0, '움직임 블록 @media (prefers-reduced-motion: no-preference) 가 없다');
  let depth = 0, close = -1;
  for (let i = src.indexOf('{', open); i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}' && --depth === 0) { close = i; break; }
  }
  for (const m of src.matchAll(/\banimation(?:-name)?\s*:/g)) if (m.index < open || m.index > close) hits.push(`${rel(EFFECTS)}: ${m[0]} — 움직임 줄이기 블록 밖`);
  const infinite = (src.match(/\binfinite\b/g) ?? []).length;
  if (infinite !== 1) hits.push(`${rel(EFFECTS)}: infinite ${infinite}개 — 끝없는 움직임은 번짐 흐름 하나만`);
  for (const file of css.filter((f) => f !== EFFECTS)) {
    const other = stripComments(read(file));
    for (const [m] of other.matchAll(/backdrop-filter|\bblur\(|gradient\(|mask-image|@keyframes|\banimation\s*:/g)) hits.push(`${rel(file)}: ${m} — 효과는 ${rel(EFFECTS)} 에만`);
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

test('사이트: 디자인 컨셉·첫 화면 문안의 수치는 손으로 쓰지 않고 tokens.json 에서 넣는다', () => {
  // 문안(디자인 총괄·웹디자이너 시안)의 색·선 두께·대비·시간은 토큰이 바뀌면 같이 바뀌어야 한다. 주석은 빼고 본다.
  const tokens = JSON.parse(read(join(root, 'packages/tokens/tokens.json')));
  for (const file of [join(site, 'src/content/concept.ts'), join(site, 'src/content/home.ts')]) {
    const src = read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const hits = [
      ...[...src.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => `${m[0]} — 색은 tokens.semantic 에서`),
      ...[...src.matchAll(/\b\d+\s*ms\b/g)].map((m) => `${m[0]} — 시간은 tokens.motion 에서`),
      ...[...src.matchAll(/\b\d+(?:\.\d+)?:1\b/g)].map((m) => `${m[0]} — 대비는 tokens.decisions.contrastFloor 에서`),
      ...[...src.matchAll(new RegExp(`\\b${tokens.shape['border-width']}\\b`, 'g'))].map((m) => `${m[0]} — 선 두께는 tokens.shape 에서`),
    ];
    assert.deepEqual(hits, [], `${rel(file)}: 손으로 쓴 수치\n  ${hits.join('\n  ')}`);
  }
  // 문안이 쓰는 값이 tokens.json 에 실제로 있어야 페이지가 그려진다(없으면 모듈이 던진다).
  const brand = tokens.semantic.light['action-primary-bg'];
  const danger = tokens.semantic.light['action-danger-bg'];
  assert.ok(brand && danger, 'semantic.light action-primary-bg · action-danger-bg');
  assert.ok(tokens.verification.separation.some((check) => check.a === brand.hex && check.b === danger.hex), '브랜드 액션 vs 에러 액션 색 차이 검사');
  assert.equal(typeof tokens.decisions.contrastFloor?.text, 'number');
  assert.ok(Object.keys(tokens.motion).some((name) => name.startsWith('dur-')));
});

test('사이트: 문안 출처의 DESIGN.md 절이 DESIGN.md 에 있다', () => {
  // 출처는 그 절로 가는 링크로 그린다(blocks/Text.tsx DesignLink) — 절 번호가 바뀌면 여기서 먼저 걸린다.
  const numbers = new Set([...read(join(root, 'DESIGN.md')).matchAll(/^#{2,4} (\d+(?:\.\d+)*)\.? +/gm)].map((m) => m[1]));
  const cited = [...read(join(site, 'src/content/concept.ts')).matchAll(/design: '([^']+)'/g)].map((m) => m[1]);
  assert.ok(cited.length > 0);
  assert.deepEqual(cited.filter((n) => !numbers.has(n)), [], 'DESIGN.md 에 없는 절');
});
