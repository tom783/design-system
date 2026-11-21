// R26: 실행은 사용자 pnpm qa에 맡긴다. docs는 story 캔버스와 진입 경로가 다르다.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launchBrowser } from './browser.mjs';
import { restoreComponent } from '../../packages/mcp/catalog.mjs';
import { resolveIntent } from '../../packages/ui/docs/_intent-data.ts';

const OUT = process.argv[2] || '.qa-shots/docs';
const BASE = 'http://localhost:6099';
const expectedPages = ['시작하기', '컴포넌트 고르기', '표 만들기', '폼 만들기', '토큰', '차트'];
const manifest = JSON.parse(readFileSync(new URL('../../packages/mcp/manifest.json', import.meta.url), 'utf8'));
const catalog = new Map(manifest.components.map(component => {
  const restored = restoreComponent(component, manifest.derived, manifest.components);
  return [restored.name, restored];
}));
const names = new Set(catalog.keys());
const covered = new Set();
// 예외 없음: 상수·훅은 kind=component가 아니므로 대상 밖이고, 모든 공개 컴포넌트·부품은 문서화한다.
const expectedComponents = [...catalog.values()].filter(component => component.kind === 'component').map(component => component.name);
const primaryTags = new Map([
  ['Components/FileUpload', 'FileUpload'],
  ['Components/AppShell', 'AppShell'], ['Components/SideNav', 'SideNav'], ['Components/PageHeader', 'PageHeader'],
  ['Components/Carousel', 'Carousel'], ['Components/MediaViewer', 'MediaViewer'],
  ['Components/ClampText', 'ClampText'], ['Components/MultiSelect', 'MultiSelect'],
  ['Components/Combobox', 'Combobox'], ['Components/Charts', 'TrendBand'],
]);
const index = await (await fetch(`${BASE}/index.json`)).json();
// ID를 조합하지 않는다. MDX 인덱서가 만든 docs 엔트리만 대상으로 한다.
const pages = Object.values(index.entries).filter(entry => entry.type === 'docs' && entry.title.startsWith('문서/'))
  .sort((a, b) => a.title.localeCompare(b.title, 'ko'));
const componentPages = Object.values(index.entries).filter(entry => entry.type === 'docs' && entry.title.startsWith('Components/'))
  .sort((a, b) => a.title.localeCompare(b.title));
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


async function checkProps() {
  const tables = await ev(`Array.from(document.querySelectorAll('[data-doc-page] [data-manifest-props]'), table => ({
    name: table.dataset.manifestProps,
    props: Array.from(table.querySelectorAll('[data-prop]'), row => row.dataset.prop),
    text: table.textContent,
    purpose: table.querySelector('h3')?.nextElementSibling?.textContent,
  }))`);
  for (const table of tables) {
    const component = catalog.get(table.name);
    assert.ok(component, `매니페스트에 없는 props 표: ${table.name}`);
    assert.equal(new Set(table.props).size, table.props.length, `${table.name}: 중복 행 0`);
    assert.deepEqual([...table.props].sort(), component.props.map(prop => prop.name).sort(), `${table.name}: props 빠짐·덧붙임 0`);
    for (const base of component.extends ?? []) assert.ok(table.text.includes(base), `${table.name}: 상속 타입 누락 ${base}`);
    if (component.partOf) assert.equal(table.purpose, component.purpose, `${table.name}: 속성 제목 바로 아래 부품 목적`);
    covered.add(table.name);
  }
  return tables.map(table => table.name);
}
// 인라인 미리보기 높이는 내용이 정한다. 창 높이를 따라 변하면 min-h-dvh·vh 같은 화면 채우기가
// 새어 든 것이다(R26 실측: 데코레이터 min-h-dvh 로 Combobox 문서 15,471px, 테스트용 180vh 로 1,620px).
// 판별력: .bg-canvas 에 min-height:100dvh 를 주입하면 Carousel·Combobox·Dialog 의 모든 미리보기가 걸린다.
async function previewsFollowContent() {
  const heights = () => ev(`Array.from(document.querySelectorAll('[data-doc-page] .docs-story'))
    .filter(node => !node.querySelector('iframe'))
    .map(node => ({ id: node.querySelector('[id^="story--"]')?.id ?? '', height: Math.round(node.getBoundingClientRect().height) }))`);
  const settle = () => ev('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))');
  try {
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await settle();
    const tall = await heights();
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 600, deviceScaleFactor: 1, mobile: false });
    await settle();
    const short = await heights();
    const changed = tall.filter((entry, index) => Math.abs(entry.height - (short[index]?.height ?? -1)) > 1)
      .map((entry, index) => `${entry.id.replace('story--', '')} ${entry.height}→${short[tall.indexOf(entry)]?.height}`);
    assert.deepEqual(changed, [], '문서 미리보기 높이가 창 높이(900→600)에 따라 변하지 않는다');
  } finally {
    await cdp('Emulation.clearDeviceMetricsOverride');
    await settle();
  }
}
async function noOverlays() {
  const opened = await ev(`Array.from(document.querySelectorAll('[role="dialog"], :popover-open'))
    .filter(node => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden')
    .map(node => ({ role: node.getAttribute('role'), slot: node.getAttribute('data-slot'), text: node.textContent.slice(0, 100) }))`);
  assert.deepEqual(opened, [], '문서 본문을 덮는 열린 dialog·popover 0건 (iframe 내부는 별도 문서)');
}

try {
  await check('docs 인덱스에 여섯 안내 페이지가 지정 순서로 존재', async () => {
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
        await ev('document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)))))');
        await checkProps();
        await noOverlays();
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
          const resolved = resolveIntent([...catalog.values()], block.name);
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

  await check('Components의 모든 스토리 가족이 autodocs 페이지를 제공한다', async () => {
    const families = [...new Set(Object.values(index.entries).filter(entry => entry.type === 'story' && entry.title.startsWith('Components/')).map(entry => entry.title))].sort();
    assert.ok(families.length > 0);
    assert.deepEqual(componentPages.map(page => page.title).sort(), families);
  });
  for (const page of componentPages) {
    await check(`${page.title}: Intent·props 완전성·오버레이 격리·콘솔`, async () => {
      browser.resetErrors();
      await cdp('Page.navigate', { url: `${BASE}/iframe.html?id=${encodeURIComponent(page.id)}&viewMode=docs&globals=theme:light` });
      const count = Object.values(index.entries).filter(entry => entry.type === 'story' && entry.title === page.title).length;
      await wait(`document.readyState === 'complete' && document.querySelector('[data-doc-page]')?.dataset.docPage === ${JSON.stringify(page.title)}`);
      await wait(`(() => {
        const blocks = [...document.querySelectorAll('[data-doc-page] [data-story-block]')];
        return blocks.length === ${count} && blocks.every(block => !!block.querySelector('iframe, [data-slot]'));
      })()`);
      await ev('document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)))))');
      const propsNames = await checkProps();
      assert.ok(propsNames.length >= 1, 'ManifestProps가 적어도 하나 필요하다');
      const topLevel = propsNames.filter(name => {
        const { partOf } = catalog.get(name);
        return !partOf || !propsNames.includes(partOf);
      });
      const structure = await ev(`(() => {
        const root = document.querySelector('[data-doc-page]');
        const primary = root.querySelector('[data-doc-primary]');
        const props = root.querySelector('[data-manifest-props]');
        return {
          parents: root.querySelectorAll('[aria-label^="부모 "]').length,
          intents: [...root.querySelectorAll('[data-intent-block]')].map(node => node.dataset.intentBlock),
          primaryBeforeProps: !!primary && !!props
            && !!(primary.compareDocumentPosition(props) & Node.DOCUMENT_POSITION_FOLLOWING)
            && primary.getBoundingClientRect().top < props.getBoundingClientRect().top,
        };
      })()`);
      assert.equal(structure.parents, 0, '같은 페이지의 부모 규칙 반복 0건');
      assert.deepEqual(structure.intents, topLevel, 'Intent는 페이지의 최상위 이름마다 한 번만 렌더한다');
      assert.equal(structure.primaryBeforeProps, true, '사용 예시는 첫 props 표보다 위에 있다');
      await noOverlays();
      await previewsFollowContent();
      if (page.title === 'Components/Guide') {
        assert.equal(await ev(`Array.from(document.querySelectorAll('[data-story-block]')).every(block => !!block.querySelector('iframe'))`), true, 'Guide 스토리는 모두 iframe으로 격리한다');
      }
      const tag = primaryTags.get(page.title);
      if (tag) {
        const primary = 'document.querySelector("[data-doc-primary]")';
        await wait(`!!${primary}?.querySelector('.sbdocs-preview')`);
        // 내부 버튼은 좌표 클릭 없이 누른다. DOM 요소를 ev 반환값으로 보내지 않는다.
        const clicked = await ev(`(() => {
          const button = [...${primary}.querySelectorAll('button')].find(node => /show code/i.test(node.textContent));
          if (!button) return false;
          button.click(); return true;
        })()`);
        assert.equal(clicked, true, 'Primary 코드 보기 버튼');
        await wait(`!!${primary}.querySelector('pre')?.textContent.trim()`);
        const code = await ev(`${primary}.querySelector('pre').textContent`);
        assert.ok(code.includes('<' + tag), `Primary 코드가 <${tag}를 직접 사용한다`);
        assert.ok(!code.includes('Demo'), '지역 Demo 래퍼가 코드 보기로 새면 실패');
        for (const forbidden of ['data-probe', 'data-slot=', '<output', '검증']) {
          assert.ok(!code.includes(forbidden), `Primary 코드에 테스트 장치가 없어야 한다: ${forbidden}`);
        }
        assert.ok(code.includes("from '@s2life/ui'"), '복사 가능한 공개 import');
        if (tag === 'Combobox') assert.match(code, /<Combobox\s+multiple/, 'Primary는 다중 선택 코드');
      }
      assert.deepEqual(browser.errors(), [], '콘솔 오류·미처리 예외 0건');
      rendered.push({ id: page.id, title: page.title, propsNames });
    });
  }
  await check('모든 Primary 코드 검사 대상이 docs 인덱스에 존재', async () => {
    for (const title of primaryTags.keys()) assert.ok(componentPages.some(page => page.title === title), title);
  });
  await check('모든 docs의 ManifestProps 합집합이 공개 컴포넌트 전체를 덮는다', async () => {
    const missing = expectedComponents.filter(name => !covered.has(name));
    assert.deepEqual(missing, [], `누락된 공개 컴포넌트: ${missing.join(', ')}`);
  });

} finally {
  writeFileSync(`${OUT}/results.json`, JSON.stringify({ results, rendered, covered: [...covered].sort(), errors: browser.errors() }, null, 2));
  browser.close();
}
const failed = results.filter(result => !result.pass).length;
console.log(`\n${results.length}건 검사 · ${results.length - failed}건 통과 · ${failed}건 실패`);
if (failed) process.exitCode = 1;
