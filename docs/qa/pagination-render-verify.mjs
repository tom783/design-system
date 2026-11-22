// R35: 하네스는 작성만 한다. 실행은 pnpm qa에서 수행한다.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, CANVAS, actions } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/pagination';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ outDir: OUT });
const { cdp, ev, sleep } = browser;
const { open } = storybook(browser);
const results = [], measurements = [];
const q = selector => `${CANVAS}.querySelector(${JSON.stringify(selector)})`;
const all = selector => `${CANVAS}.querySelectorAll(${JSON.stringify(selector)})`;
const slot = name => `[data-slot="pagination-${name}"]`;
const number = page => `${slot('page')}[data-pagination-page="${page}"]`;
const range = slot('range'), previous = slot('previous'), next = slot('next');
const current = `${slot('page')}[aria-current="page"]`;

async function wait(expression) {
  const deadline = Date.now() + 6000;
  while (Date.now() < deadline) {
    if (await ev(expression)) return;
    await sleep(20);
  }
  throw new Error(`조건 대기 실패: ${expression}`);
}
async function check(label, run) {
  try { await run(); results.push({ label, pass: true }); console.log(`✓ ${label}`); }
  catch (error) {
    results.push({ label, pass: false, error: error.message }); console.error(`✗ ${label}: ${error.message}`);
    await browser.shot(`failure-${results.length}`);
  }
}
async function story(name) {
  assert.deepEqual(browser.errors(), [], '직전 스토리 콘솔 오류');
  const rendered = await open(`components-pagination--${name}`, { waitPlay: false });
  assert.equal(rendered.sbError, null);
  // 0건 스토리는 빈 nav 대신 데코레이터만 남는다.
  if (name !== '빈결과') await wait(`!!${q('[data-slot="pagination"]')}`);
  await ev('document.fonts.ready.then(() => true)');
  assert.deepEqual(browser.errors(), []);
}
const act = actions(browser);
const click = (selector) => act.click(selector, { root: 'canvas' });
async function focus(selector) { await ev(`${q(selector)}.focus()`); await wait(`document.activeElement === ${q(selector)}`); }
const key = (name, keyCode) => act.key(name, { keyCode, code: name });
async function viewport(width) {
  await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
  await ev('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))');
}
async function currentIs(page) { await wait(`${q(current)}?.dataset.paginationPage === '${page}'`); }
async function focusIs(selector) {
  await wait(`document.activeElement === ${q(selector)}`);
  measurements.push(await ev(`({slot:document.activeElement.dataset.slot, page:document.activeElement.dataset.paginationPage ?? null, scrollY:window.scrollY})`));
}
async function listIs(expected) {
  assert.deepEqual(await ev(`[...${q(slot('pages'))}.children].map(n => n.dataset.paginationPage ? Number(n.dataset.paginationPage) : n.textContent)`), expected);
}
async function disabledIs(selector, value) { assert.equal(await ev(`${q(selector)}.getAttribute('aria-disabled')`), String(value)); }

try {
  await viewport(1440);
  await check('경계 번호 1·2·3…25, 1…11·12·13…25, 1…23·24·25', async () => {
    await story('많은페이지'); await listIs([1, 2, 3, '…', 25]);
    await story('중간페이지'); await listIs([1, '…', 11, 12, 13, '…', 25]);
    await click(number(25)); await currentIs(25); await listIs([1, '…', 23, 24, 25]);
  });
  await check('현재 aria-current는 하나·이전/다음 경계와 클릭 차단', async () => {
    await story('많은페이지');
    assert.equal(await ev(`${all(current)}.length`), 1); await currentIs(1);
    assert.equal(await ev(`${q('[data-slot="pagination"]')}.getAttribute('aria-label')`), '페이지 이동');
    await disabledIs(previous, true); await disabledIs(next, false);
    await click(previous); await currentIs(1);
    await click(number(25)); await currentIs(25);
    await disabledIs(previous, false); await disabledIs(next, true);
    await click(next); await currentIs(25);
    assert.equal(await ev(`${q(next)}.tabIndex`), -1);
  });
  await check('범위 시작·중간·마지막과 고정폭 숫자', async () => {
    await story('많은페이지'); assert.equal(await ev(`${q(range)}.textContent`), '1–50 / 1,234건');
    await click(next); await currentIs(2); assert.equal(await ev(`${q(range)}.textContent`), '51–100 / 1,234건');
    await click(number(25)); await currentIs(25); assert.equal(await ev(`${q(range)}.textContent`), '1,201–1,234 / 1,234건');
    assert.match(await ev(`getComputedStyle(${q(range)}).fontVariantNumeric`), /tabular-nums/);
  });
  await check('범위 polite·atomic 영역은 DOM을 유지하고 문구 갱신', async () => {
    await story('많은페이지');
    await ev(`window.__paginationRange = ${q(range)}; window.__paginationMutations = 0;
      window.__paginationObserver = new MutationObserver(() => window.__paginationMutations++);
      window.__paginationObserver.observe(window.__paginationRange, {childList:true,characterData:true,subtree:true})`);
    await click(next); await currentIs(2); await wait('window.__paginationMutations > 0');
    assert.deepEqual(await ev(`({same:window.__paginationRange === ${q(range)},role:${q(range)}.getAttribute('role'),live:${q(range)}.getAttribute('aria-live'),atomic:${q(range)}.getAttribute('aria-atomic')})`),
      { same: true, role: 'status', live: 'polite', atomic: 'true' });
    await ev('window.__paginationObserver.disconnect()');
  });
  await check('크기 Select 높이 = 번호 버튼 높이 = 32px', async () => {
    await story('페이지크기');
    const heights = await ev(`({select:${q(slot('size'))}.getBoundingClientRect().height, page:${q(number(1))}.getBoundingClientRect().height})`);
    assert.equal(heights.select, heights.page); assert.equal(heights.select, 32);
  });
  await check('페이지 크기 100개씩 선택은 1페이지로 이동·Select 포커스 복귀', async () => {
    await story('페이지크기'); await click(number(3)); await currentIs(3);
    await focus(slot('size')); await key('Enter', 13);
    // Select 목록은 포털로 body 에 붙는다 — 스토리 루트가 아니라 문서에서 찾는다.
    await wait(`!!document.querySelector('[role="listbox"]')`);
    // Radix Select 는 열린 뒤 옵션에 포커스·강조를 옮긴다. 강조가 자리 잡기 전의 키는 무시된다 — 상태를 기다린다.
    const highlighted = text => wait(`document.querySelector('[role="option"][data-highlighted]')?.textContent === ${JSON.stringify(text)}`);
    await highlighted('50개씩');
    await key('End', 35); await highlighted('100개씩'); await key('Enter', 13);
    await currentIs(1); await focusIs(slot('size'));
    assert.equal(await ev(`${q(slot('size'))}.textContent`), '100개씩');
    assert.equal(await ev(`${q(range)}.textContent`), '1–100 / 1,234건');
  });
  await check('0건이면 nav 없음·한 페이지는 범위만', async () => {
    await story('빈결과'); assert.equal(await ev(`${all('[data-slot="pagination"]')}.length`), 0);
    await story('한페이지'); assert.equal(await ev(`${q(range)}.textContent`), '1–34 / 34건');
    assert.equal(await ev(`${all('[data-slot="pagination"] button')}.length`), 0);
  });
  await check('로딩 중 진행은 표 스켈레톤·모든 페이지 버튼·크기 변경 비활성·클릭 차단', async () => {
    await story('로딩중');
    // A안(디자인 검수 2026-11-22): Pagination 은 조작만 막고 진행 표시는 함께 놓인 표가 맡는다(DESIGN §4.1).
    assert.equal(await ev(`${q('[data-slot="data-table-table"]')}.getAttribute('aria-busy')`), 'true');
    assert.ok(await ev(`${all('[data-slot="data-table-skeleton-row"]')}.length`) > 0);
    assert.equal(await ev(`[...${all('[data-slot="pagination"] button:not([role="combobox"])')}].every(n => n.getAttribute('aria-disabled') === 'true' && n.tabIndex === -1)`), true);
    assert.equal(await ev(`${q(slot('size'))}.disabled`), true);
    await click(next); await click(previous); await click(number(25)); await currentIs(4);
    assert.deepEqual(browser.errors(), []);
  });
  await check('번호를 누르면 같은 DOM에 포커스·문서 스크롤 유지', async () => {
    await story('중간페이지'); await focus(number(13));
    await ev(`window.__paginationButton = document.activeElement; window.__paginationScroll = window.scrollY`);
    await key('Enter', 13); await currentIs(13); await focusIs(number(13));
    assert.equal(await ev('window.__paginationButton === document.activeElement'), true);
    assert.equal(await ev('window.scrollY === window.__paginationScroll'), true);
  });
  await check('이전/다음 경계에 도달해 비활성이 되어도 포커스 유지', async () => {
    await story('많은페이지'); await click(next); await currentIs(2); await focus(previous);
    await key('Enter', 13); await currentIs(1); await disabledIs(previous, true); await focusIs(previous);
    await click(number(25)); await currentIs(25); await click(previous); await currentIs(24);
    await focus(next); await key('Enter', 13); await currentIs(25); await disabledIs(next, true); await focusIs(next);
  });
  await check('사라진 번호는 수치상 가까운 5페이지로 복구', async () => {
    await story('페이지감소'); await focus(number(12));
    await ev(`${CANVAS}.querySelector('button').click()`);
    await currentIs(5); await focusIs(number(5));
  });
  await check('한 페이지로 줄면 범위 문구로 복구', async () => {
    await story('페이지감소'); await focus(number(12));
    await ev(`[...${all('button')}].find(n => n.textContent === '한 페이지로 줄이기').click()`);
    await wait(`${all(slot('page'))}.length === 0`); await focusIs(range);
  });
  await check('외부 입력으로 옮긴 포커스를 서버 변경이 빼앗지 않음', async () => {
    await story('페이지감소'); await focus(number(12)); await focus('button');
    await click('button'); await currentIs(5); await focusIs('button');
  });
  await check('실제 폭 280px 간략 표시·전체 문서와 nav 가로 넘침 없음', async () => {
    await story('좁은폭');
    assert.deepEqual(await ev(`(() => { const n=${q('[data-slot="pagination"]')}; return {
      width:n.getBoundingClientRect().width, pages:getComputedStyle(${q(slot('pages'))}).display,
      positionShown:getComputedStyle(${q(slot('position'))}).display !== 'none', text:${q(slot('position'))}.textContent,
      overflow:n.scrollWidth > n.clientWidth, documentOverflow:document.documentElement.scrollWidth > innerWidth }; })()`),
      { width: 280, pages: 'none', positionShown: true, text: '4 / 25', overflow: false, documentOverflow: false });
    await focus(next); await key('Enter', 13); await currentIs(5); await focusIs(next);
    assert.equal(await ev(`${q(slot('position'))}.textContent`), '5 / 25');
  });
  await check('640px 경계·좁은 폭 전환 시 숨은 번호에서 다음 버튼으로', async () => {
    await viewport(688); await story('중간페이지'); // 데코레이터 좌우 24px → 실제 폭 640px
    assert.equal(await ev(`getComputedStyle(${q(slot('pages'))}).display`), 'flex');
    await focus(number(12)); await viewport(687);
    await wait(`getComputedStyle(${q(slot('pages'))}).display === 'none'`); await focusIs(next);
    assert.equal(await ev(`${q('[data-slot="pagination"]')}.scrollWidth > ${q('[data-slot="pagination"]')}.clientWidth`), false);
    await viewport(1440);
  });
  await check('320px 화면에서 크기 선택 포함 가로 넘침 없음', async () => {
    await viewport(320); await story('페이지크기');
    assert.equal(await ev(`document.documentElement.scrollWidth > innerWidth || ${q('[data-slot="pagination"]')}.scrollWidth > ${q('[data-slot="pagination"]')}.clientWidth`), false);
    await viewport(1440);
  });
  await check('표 전체 건수·로딩 중 선택 유지·새 페이지 응답 후 해제·포커스', async () => {
    await story('표조립');
    const table = '[data-slot="data-table-table"]', selection = 'output[aria-label="선택한 주문"]';
    assert.equal(await ev(`${q(table)}.getAttribute('aria-rowcount')`), '1234');
    await click('input[aria-label="ORDER-0001 선택"]');
    await wait(`${q(selection)}.textContent === '1건 선택'`);
    await focus(next); await key('Enter', 13);
    await wait(`${q(table)}.getAttribute('aria-busy') === 'true'`);
    assert.equal(await ev(`${q(selection)}.textContent`), '1건 선택');
    await disabledIs(next, true); await focusIs(next);
    await wait(`${q(table)}.getAttribute('aria-busy') === 'false' && !!${q('input[aria-label="ORDER-0021 선택"]')}`);
    await wait(`${q(selection)}.textContent === '0건 선택'`); await focusIs(next);
    assert.equal(await ev(`${q('input[aria-label="ORDER-0001 선택"]')}`), null);
    assert.equal(await ev(`${q(range)}.textContent`), '21–40 / 1,234건');
  });
  await check('전체 선택 안내는 로드 20건과 전체 1,234건 구분', async () => {
    await story('표조립'); await click('input[aria-label="로드된 20건 선택"]'); // totalCount 를 받은 표의 전체 선택 이름
    await wait(`${q('output[aria-label="선택한 주문"]')}.textContent === '20건 선택'`);
    assert.match(await ev(`${q('[data-slot="data-table-toolbar"]')}.textContent`), /로드된 20건이 선택됨.*전체 1,234건/);
  });
  await check('모든 경로 콘솔 오류 0건', async () => assert.deepEqual(browser.errors(), []));
} finally {
  writeFileSync(`${OUT}/results.json`, JSON.stringify({ results, measurements, errors: browser.errors() }, null, 2));
  browser.close();
}
const failed = results.filter(result => !result.pass).length;
console.log(`\n${results.length}건 검사 · ${results.length - failed}건 통과 · ${failed}건 실패`);
if (failed) process.exitCode = 1;
