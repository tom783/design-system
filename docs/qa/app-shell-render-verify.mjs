// R34·R34b: 작성만 수행한다. 실행과 브라우저 실측은 사용자의 pnpm qa에서 진행한다.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, CANVAS } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/app-shell';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ port: 9476, outDir: OUT });
const { cdp, ev, sleep } = browser;
const { open } = storybook(browser);
const results = [];
const q = selector => `${CANVAS}.querySelector(${JSON.stringify(selector)})`;
const all = selector => `${CANVAS}.querySelectorAll(${JSON.stringify(selector)})`;
const nav = '[data-slot="side-nav"]', item = '[data-slot="side-nav-item"]';
const toggle = '[data-slot="side-nav-toggle"]', main = '[data-slot="app-shell-main"]';
const menu = '[data-slot="side-nav-menu"]', skip = '[data-slot="app-shell-skip"]';
const rect = selector => `(() => { const r=${q(selector)}.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}; })()`;

async function wait(expression) {
  const deadline = Date.now() + 6000;
  while (Date.now() < deadline) {
    if (await ev(expression)) return;
    await sleep(25);
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
async function viewport(width) {
  await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
  await ev('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))');
}
async function story(id = 'screens-appshell--라이트') {
  assert.deepEqual(browser.errors(), [], '직전 스토리 콘솔 오류');
  const rendered = await open(id, { waitPlay: false });
  assert.equal(rendered.sbError, null);
  await wait(`!!${q(nav)} || !!${q('[data-slot="page-header"]')}`);
  await ev('document.fonts.ready.then(() => true)');
  assert.deepEqual(browser.errors(), []);
}
async function focus(selector) {
  await ev(`${q(selector)}.focus()`);
  await wait(`document.activeElement === ${q(selector)}`);
}
async function click(selector) { await ev(`${q(selector)}.click()`); }
async function key(key, code) {
  await cdp('Input.dispatchKeyEvent', key === 'Enter'
    ? { type: 'keyDown', key, code: key, windowsVirtualKeyCode: code, text: '\r' }
    : { type: 'rawKeyDown', key, code: key, windowsVirtualKeyCode: code });
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: code });
}
async function widthIs(width) { await wait(`Math.abs(${q(nav)}.getBoundingClientRect().width - ${width}) < .1`); }
// 소비자가 슬롯에 넣은 부품(StatusChip 의 전체값 title 등)은 그 부품의 계약이다. 셸이 그린 요소만 센다.
const consumerSlots = '[data-slot="page-header-breadcrumb"],[data-slot="page-header-status"],[data-slot="page-header-actions"],[data-slot="page-header-description"]';
async function noTitles(selector) {
  assert.deepEqual(await ev(`(() => { const root=${q(selector)};
    return [root, ...root.querySelectorAll('[title]')].filter(el => el.hasAttribute('title') && !el.closest(${JSON.stringify(consumerSlots)}))
      .map(el => (el.getAttribute('data-slot') || el.tagName) + '=' + el.getAttribute('title')); })()`), [],
    '셸이 만드는 요소에 브라우저 기본 툴팁을 남기지 않는다');
}
async function tooltip() {
  await wait(`!!${q('[role="tooltip"]:popover-open')}`);
  assert.equal(await ev(`${q('[role="tooltip"]:popover-open')}.textContent`), '주문 목록');
}

try {
  await viewport(1440);
  await check('펼침 240px·접힘 64px·비제어 토글', async () => {
    await story('components-sidenav--펼침'); await widthIs(240);
    await noTitles(nav);
    await click(toggle); await widthIs(64);
    await noTitles(nav);
    await click(toggle); await widthIs(240);
    await story('components-sidenav--접힘'); await widthIs(64);
  });
  await check('제어형 collapsed·onCollapsedChange가 양방향 전환', async () => {
    await story('components-sidenav--제어형'); await widthIs(240);
    await click(toggle); await widthIs(64); await click(toggle); await widthIs(240);
  });
  await check('경계 1024px 토글 표시·동작·1023px 숨김·Tab 제외·선택 복원', async () => {
    await story();
    await viewport(1024); await widthIs(240);
    assert.equal(await ev(`getComputedStyle(${q(toggle)}).display`), 'flex');
    await focus('a[href="#products"]'); await key('Tab', 9);
    await wait(`document.activeElement === ${q(toggle)}`);
    await click(toggle); await widthIs(64);
    await click(toggle); await widthIs(240);
    await viewport(1023); await widthIs(64);
    await wait(`${q(nav)}.dataset.collapsed === 'true'`);
    assert.equal(await ev(`getComputedStyle(${q(toggle)}).display`), 'none');
    await focus('a[href="#products"]'); await key('Tab', 9);
    assert.equal(await ev(`${q(nav)}.contains(document.activeElement)`), false, '마지막 메뉴 다음 Tab은 숨긴 접기 버튼을 건너뛴다');
    await viewport(1440); await widthIs(240);
    await click(toggle); await widthIs(64);
    await viewport(800); await widthIs(64);
    await viewport(1440); await widthIs(64);
    await click(toggle); await widthIs(240);
  });
  for (const id of ['screens-appshell--라이트', 'screens-appshell--다크', 'screens-appshell--긴메뉴와본문', 'components-appshell--사용법']) {
    await check(`${id}: 셸 사각형이 뷰포트와 일치`, async () => {
      for (const width of [1440, 1023]) {
        await viewport(width); await story(id);
        assert.deepEqual(await ev(rect('[data-slot="app-shell"]')), { x: 0, y: 0, width, height: 900, bottom: 900 });
      }
      await viewport(1440);
    });
  }
  await check('접힌 링크 포커스는 Tooltip 라벨·링크 포커스 보존', async () => {
    await story('components-sidenav--접힘');
    await focus(`${item}[aria-current="page"]`); await tooltip();
    assert.equal(await ev('document.activeElement.getAttribute("data-slot")'), 'side-nav-item');
  });
  await check('접힌 링크 실제 호버도 Tooltip 라벨', async () => {
    await story('components-sidenav--접힘');
    const r = await ev(rect(`${item}[aria-current="page"]`));
    // 클릭이 아닌 실제 호버를 검증하는 포인터다. 내부 동작은 DOM click으로 한다.
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x + r.width / 2, y: r.y + r.height / 2 });
    await tooltip();
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1400, y: 880 });
  });
  for (const theme of ['라이트', '다크']) {
    await check(`${theme}: 현재 위치·굵기 600·선택 배경·표면·본문·경계`, async () => {
      await story(`screens-appshell--${theme}`);
      await wait(`document.documentElement.dataset.theme === '${theme === '다크' ? 'dark' : 'light'}'`);
      const values = await ev(`(() => {
        const n=${q(nav)}, a=${q(`${item}[aria-current="page"]`)}, m=${q(main)};
        const resolve=(token) => { const p=document.createElement('span'); p.style.background='var('+token+')'; a.append(p); const value=getComputedStyle(p).backgroundColor; p.remove(); return value; };
        return { current:a.getAttribute('aria-current'), weight:getComputedStyle(a).fontWeight,
          background:getComputedStyle(a).backgroundColor, selected:resolve('--bg-selected'),
          navBackground:getComputedStyle(n).backgroundColor, surface:resolve('--bg-surface'),
          canvas:getComputedStyle(${q('[data-slot="app-shell"]')}).backgroundColor, canvasToken:resolve('--bg-canvas'),
          border:getComputedStyle(n).borderInlineEndWidth, padding:getComputedStyle(m).paddingLeft,
          navLabel:n.getAttribute('aria-label'), mains:${all('main')}.length, h1:${all('h1')}.length };
      })()`);
      assert.equal(values.current, 'page'); assert.equal(values.weight, '600');
      assert.equal(values.background, values.selected); assert.equal(values.navBackground, values.surface);
      assert.equal(values.canvas, values.canvasToken); assert.equal(values.border, '1px');
      assert.equal(values.padding, '24px'); assert.equal(values.navLabel, '주 메뉴');
      assert.equal(values.mains, 1); assert.equal(values.h1, 1);
      // 표 셀의 title은 전체값 보존 계약이다. 셸이 소유하는 메뉴·페이지 머리만 검사한다.
      await noTitles(nav); await noTitles('[data-slot="page-header"]');
      const disabledColors = await ev(`(() => {
        const n=${q(`${item}[aria-disabled="true"]`)};
        const probe=document.createElement('span'); probe.style.color='var(--text-disabled)'; n.append(probe);
        const expected=getComputedStyle(probe).color; probe.remove();
        return { expected, colors:['.ds-side-nav-icon', '.ds-side-nav-icon svg', '[data-slot="side-nav-item-label"]', '.ds-side-nav-meta']
          .map(selector => getComputedStyle(n.querySelector(selector)).color) };
      })()`);
      assert.deepEqual(disabledColors.colors, Array(4).fill(disabledColors.expected), '아이콘·라벨·준비 중은 text-disabled');
      await browser.shot(`shell-${theme}`);
    });
  }
  await check('좁은 화면의 본문 여백 16px·최대 폭 기본 제한 없음', async () => {
    await viewport(800); await story(); await widthIs(64);
    assert.equal(await ev(`getComputedStyle(${q(main)}).paddingLeft`), '16px');
    assert.equal(await ev(`getComputedStyle(${q('[data-slot="app-shell-content"]')}).maxWidth`), 'none');
    await viewport(1440);
  });
  await check('첫 Tab에서 건너뛰기 표시·Enter로 해당 main 포커스', async () => {
    await story();
    assert.ok(await ev(`${q(skip)}.getBoundingClientRect().bottom < ${q('[data-slot="app-shell"]')}.getBoundingClientRect().top`));
    await ev(`document.body.tabIndex=-1; document.body.focus(); document.body.removeAttribute('tabindex')`);
    await key('Tab', 9); await wait(`document.activeElement === ${q(skip)}`);
    const r = await ev(rect(skip)); assert.ok(r.y >= 0 && r.bottom > r.y);
    assert.equal(await ev(`${q(skip)}.textContent`), '본문으로 건너뛰기');
    await key('Enter', 13); await wait(`document.activeElement === ${q(main)}`);
    assert.equal(await ev(`${q(skip)}.hash.slice(1) === ${q(main)}.id`), true);
  });
  await check('asChild가 실제 링크·아이콘·라벨을 보존', async () => {
    await story('components-sidenav--펼침');
    assert.deepEqual(await ev(`(() => { const n=${q('a[href="#products"]')}; return {tag:n.tagName,label:n.textContent,icon:!!n.querySelector('svg'),slot:n.dataset.slot}; })()`),
      { tag: 'A', label: '상품 관리', icon: true, slot: 'side-nav-item' });
  });
  await check('준비 중은 자식 링크 제거·클릭 이동 없음·실제 Tab 순서에서 제외', async () => {
    await story('components-sidenav--비활성');
    await noTitles(nav);
    const disabled = `${item}[aria-disabled="true"]`;
    assert.deepEqual(await ev(`(() => { const n=${q(disabled)}; return {tag:n.tagName,tab:n.tabIndex,href:n.getAttribute('href'),child:n.querySelector('a'),text:n.textContent}; })()`),
      { tag: 'SPAN', tab: -1, href: null, child: null, text: '프로모션준비 중' });
    const before = await ev('location.href'); await click(disabled); assert.equal(await ev('location.href'), before);
    await focus('a[href="#products"]');
    await ev(`${q(disabled)}.focus()`);
    assert.equal(await ev('document.activeElement.getAttribute("href")'), '#products', '비활성 항목은 프로그램 포커스도 받지 않는다');
    await key('Tab', 9);
    await wait(`document.activeElement === ${q(toggle)}`);
  });
  await check('배지는 개수 표시·고정폭 숫자', async () => {
    await story('components-sidenav--배지');
    assert.equal(await ev(`${q('[data-slot="side-nav-badge"]')}.textContent`), '36');
    assert.match(await ev(`getComputedStyle(${q('[data-slot="side-nav-badge"]')}).fontVariantNumeric`), /tabular-nums/);
  });
  for (const name of ['기본', '경로', '상태', '여러액션', '좁은폭']) {
    await check(`페이지 머리 ${name}: h1 하나·콘솔 오류 없음`, async () => {
      await story(`components-pageheader--${name}`);
      assert.equal(await ev(`${all('h1')}.length`), 1); assert.deepEqual(browser.errors(), []);
      await noTitles('[data-slot="page-header"]');
    });
  }
  await check('페이지 머리 실제 폭 280px에서 액션이 설명 아래·가로 넘침 없음', async () => {
    await story('components-pageheader--좁은폭');
    const values = await ev(`(() => { const h=${q('[data-slot="page-header"]')}, a=${q('[data-slot="page-header-actions"]')}, d=${q('[data-slot="page-header-description"]')}; return {
      below:a.getBoundingClientRect().top >= d.getBoundingClientRect().bottom,
      overflow:h.scrollWidth > h.clientWidth, width:h.getBoundingClientRect().width,
      actionOverflow:a.scrollWidth > a.clientWidth }; })()`);
    assert.deepEqual(values, { below: true, overflow: false, width: 280, actionOverflow: false });
  });
  await check('메뉴와 본문 독립 스크롤·브랜드/접기 고정·선택 최대 폭', async () => {
    await story('screens-appshell--긴메뉴와본문');
    await noTitles('[data-slot="app-shell"]');
    assert.equal(await ev(`getComputedStyle(${q('[data-slot="app-shell-content"]')}).maxWidth`), '960px');
    assert.equal(await ev(`${q(menu)}.scrollHeight > ${q(menu)}.clientHeight && ${q(main)}.scrollHeight > ${q(main)}.clientHeight`), true);
    const before = await ev(`({brand:${q('[data-slot="side-nav-brand"]')}.getBoundingClientRect().top,toggle:${q(toggle)}.getBoundingClientRect().top,body:window.scrollY})`);
    await ev(`${q(menu)}.scrollTop = 300`);
    assert.equal(await ev(`${q(menu)}.scrollTop`), 300); assert.equal(await ev(`${q(main)}.scrollTop`), 0);
    await ev(`${q(main)}.scrollTop = 400`);
    assert.equal(await ev(`${q(main)}.scrollTop`), 400); assert.equal(await ev(`${q(menu)}.scrollTop`), 300);
    assert.deepEqual(await ev(`({brand:${q('[data-slot="side-nav-brand"]')}.getBoundingClientRect().top,toggle:${q(toggle)}.getBoundingClientRect().top,body:window.scrollY})`), before);
  });
  await check('모든 경로에서 콘솔 오류 0건', async () => assert.deepEqual(browser.errors(), []));
} finally {
  writeFileSync(`${OUT}/results.json`, JSON.stringify({ results, errors: browser.errors() }, null, 2));
  browser.close();
}
const failed = results.filter(result => !result.pass).length;
console.log(`\n${results.length}건 검사 · ${results.length - failed}건 통과 · ${failed}건 실패`);
if (failed) process.exitCode = 1;
