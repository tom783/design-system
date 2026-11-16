// R20: 실행은 사용자 pnpm qa에 맡긴다. docs는 story 캔버스와 진입 경로가 다르다.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launchBrowser } from './browser.mjs';
import { resolveIntent } from '../../packages/ui/docs/_intent-data.ts';

const OUT = process.argv[2] || '.qa-shots/docs';
const BASE = 'http://localhost:6099';
const expectedPages = ['시작하기', '컴포넌트 고르기', '표 만들기', '폼 만들기', '토큰'];
const manifest = JSON.parse(readFileSync(new URL('../../packages/mcp/manifest.json', import.meta.url), 'utf8'));
const names = new Set(manifest.components.map(component => component.name));
const index = await (await fetch(`${BASE}/index.json`)).json();
// ID를 조합하지 않는다. MDX 인덱서가 만든 docs 엔트리만 대상으로 한다.
const pages = Object.values(index.entries).filter(entry => entry.type === 'docs' && entry.title.startsWith('문서/'))
  .sort((a, b) => a.title.localeCompare(b.title, 'ko'));
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ port: 9469, outDir: OUT });
const { cdp, ev, sleep } = browser;
const results = [], rendered = [];
const selector = '[data-doc-page]';

async function wait(expression) {
  for (let attempt = 0; attempt < 160; attempt++) {
    if (await ev(expression).catch(() => false)) return;
    await sleep(100);
  }
  throw new Error(`문서 렌더 대기 실패: ${expression}`);
}
async function check(label, run) {
  try { await run(); results.push({ label, pass: true }); console.log(`✓ ${label}`); }
  catch (error) {
    results.push({ label, pass: false, error: error.message });
    console.error(`✗ ${label}: ${error.message}`);
    await browser.shot(`failure-${results.length}`);
  }
}

try {
  await check('docs 인덱스에 다섯 페이지가 지정 순서로 존재', async () => {
    assert.deepEqual(pages.map(page => page.title.replace(/^문서\/\d+ /, '')), expectedPages);
  });
  for (const [pageIndex, page] of pages.entries()) {
    const title = page.title.replace(/^문서\/\d+ /, '');
    const source = readFileSync(new URL(`../../${page.importPath}`, import.meta.url), 'utf8');
    const expectedBlocks = [...source.matchAll(/<Intent name="([^"]+)"\s*\/>/g)].map(match => match[1]);
    const expectedCanvases = [...source.matchAll(/<Canvas\s/g)].length;
    const colors = [];
    for (const theme of ['light', 'dark']) {
      await check(`${title} · ${theme}: 본문·Intent·링크·테마·콘솔`, async () => {
        browser.resetErrors();
        await cdp('Page.navigate', { url: `${BASE}/iframe.html?id=${encodeURIComponent(page.id)}&viewMode=docs&globals=theme:${theme}` });
        await wait(`document.readyState === 'complete' && document.querySelector('${selector}')?.dataset.docPage === ${JSON.stringify(title)} && document.documentElement.dataset.theme === '${theme}'`);
        // Canvas의 지연 렌더도 끝난 후 검사한다. 기존 스토리의 play는 docs에서 실행하지 않는다.
        await wait(`(() => { const previews = [...document.querySelectorAll('${selector} .sbdocs-preview')];
          return previews.length === ${expectedCanvases} && previews.every(preview => preview.querySelector('[data-slot]')); })()`);
        await sleep(250);
        const snapshot = await ev(`(() => {
          const root = document.querySelector('${selector}');
          const probe = document.createElement('span');
          probe.style.cssText = 'color:var(--text-primary);background:var(--bg-canvas)';
          root.append(probe);
          const expectedColor = getComputedStyle(probe).color;
          const expectedBackground = getComputedStyle(probe).backgroundColor;
          probe.remove();
          return {
            heading: root.querySelector('h1')?.textContent.trim(),
            text: root.innerText.trim(), paragraphs: root.querySelectorAll('p').length,
            names: [...root.querySelectorAll('[data-intent-name]')].map(node => node.dataset.intentName),
            related: [...root.querySelectorAll('[data-intent-related]')].map(node => node.dataset.intentRelated),
            blocks: [...root.querySelectorAll('[data-intent-block]')].map(node => ({ name: node.dataset.intentBlock, text: node.textContent })),
            links: [...root.querySelectorAll('a[href]')].map(node => node.getAttribute('href')),
            color: getComputedStyle(root).color, expectedColor,
            background: getComputedStyle(root.closest('.sbdocs-wrapper')).backgroundColor, expectedBackground,
            error: document.body.classList.contains('sb-show-errordisplay') || (document.querySelector('#error-message')?.textContent.trim() ?? ''),
          };
        })()`);
        assert.equal(snapshot.heading, title);
        assert.ok(snapshot.text.length > 400 && snapshot.paragraphs >= 2, '제목뿐이거나 비어 있는 MDX는 실패');
        assert.ok(!snapshot.error, String(snapshot.error));
        for (const name of [...snapshot.names, ...snapshot.related]) assert.ok(names.has(name), `매니페스트에 없는 이름: ${name}`);
        assert.deepEqual(snapshot.blocks.map(block => block.name), expectedBlocks, 'MDX의 모든 Intent가 렌더되어야 한다');
        for (const block of snapshot.blocks) {
          const resolved = resolveIntent(manifest.components, block.name);
          for (const entry of [resolved.component, ...resolved.parents]) {
            assert.ok(snapshot.names.includes(entry.name), `부모 누락: ${entry.name}`);
            for (const text of [entry.purpose, ...(entry.useWhen ?? []), ...(entry.dont ?? []), ...(entry.rules ?? []).map(rule => rule.text)]) {
              assert.ok(block.text.includes(text), `매니페스트 본문 누락: ${entry.name} / ${text}`);
            }
          }
          for (const related of resolved.related) assert.ok(snapshot.related.includes(related.name), `관련 링크 누락: ${related.name}`);
        }
        for (const href of snapshot.links) {
          const route = new URL(href, BASE).searchParams.get('path');
          if (route?.startsWith('/story/') || route?.startsWith('/docs/')) {
            const target = route.replace(/^\/(?:story|docs)\//, '');
            assert.ok(index.entries[target], `존재하지 않는 Storybook 링크: ${href}`);
          }
        }
        assert.equal(snapshot.color, snapshot.expectedColor, '본문 글자 테마');
        assert.equal(snapshot.background, snapshot.expectedBackground, '문서 바탕 테마');
        assert.deepEqual(browser.errors(), [], '콘솔 오류·미처리 예외 0건');
        colors.push(snapshot.color);
        rendered.push({ id: page.id, title, theme, names: snapshot.names, related: snapshot.related });
        await browser.shot(`page-${pageIndex + 1}-${theme}`);
      });
    }
    await check(`${title}: 라이트와 다크의 실제 글자색이 다름`, async () => {
      assert.equal(colors.length, 2, '두 테마 모두 렌더되어야 한다');
      assert.notEqual(colors[0], colors[1]);
    });
  }
} finally {
  writeFileSync(`${OUT}/results.json`, JSON.stringify({ results, rendered, errors: browser.errors() }, null, 2));
  browser.close();
}
const failed = results.filter(result => !result.pass).length;
console.log(`\n${results.length}건 검사 · ${results.length - failed}건 통과 · ${failed}건 실패`);
if (failed) process.exitCode = 1;
