// R41 작성 전용. 실행은 pnpm qa. GUI Chrome 대신 저장소 공통 하네스를 사용한다.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/stat-tile';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ outDir: OUT });
const { cdp, ev, sleep } = browser;
const { open } = storybook(browser);
const results = [], measurements = [], errors = [];
const tile = '[data-slot="stat-tile"]';
const q = s => `document.querySelector(${JSON.stringify(s)})`;
const all = s => `[...document.querySelectorAll(${JSON.stringify(s)})]`;
async function wait(expression) {
  const deadline = Date.now() + 6000;
  while (Date.now() < deadline) { if (await ev(expression)) return; await sleep(30); }
  throw new Error(`조건 대기 실패: ${expression}`);
}
async function story(name) {
  errors.push(...browser.errors());
  const result = await open(`components-stattile--${name}`, { waitPlay: false });
  assert.equal(result.sbError, null); assert.deepEqual(result.errors, []);
  await wait(`!!${q(tile)}`); await ev('document.fonts.ready');
}
async function check(label, run) {
  try { await run(); results.push({ label, pass: true }); console.log(`✓ ${label}`); }
  catch (error) { results.push({ label, pass: false, error: error.message }); console.error(`✗ ${label}: ${error.message}`); await browser.shot(`failure-${results.length}`); }
}
function contrast(fg, bg) {
  const luminance = color => {
    assert.match(color, /^rgb\(/);
    const c = color.match(/[\d.]+/g).map(Number).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
    return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
  };
  const a = luminance(fg), b = luminance(bg);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
async function keyTab() {
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
}

try {
  await check('라이트·다크 × up/down/none × 양수/음수/0의 방향·부호·의미 색·대비 4.5 이상', async () => {
    await story('증감');
    for (const theme of ['light', 'dark']) {
      await ev(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
      const rows = await ev(`${all(tile)}.map(n => {
        const d=n.querySelector('[data-slot="stat-tile-delta"]');
        const token = name => { const p=document.createElement('span'); p.style.color='var('+name+')'; n.append(p); const c=getComputedStyle(p).color; p.remove(); return c; };
        return {direction:d.dataset.direction,tone:d.dataset.tone,text:d.querySelector('[data-slot="stat-tile-change"]').textContent,icon:d.querySelector('svg').getAttribute('class'),color:getComputedStyle(d).color,bg:getComputedStyle(n).backgroundColor,success:token('--status-success-fg'),danger:token('--status-danger-fg'),neutral:token('--status-neutral-fg')};
      })`);
      assert.equal(rows.length, 9);
      for (const [i, row] of rows.entries()) {
        const good = ['up', 'down', 'none'][Math.floor(i / 3)], direction = ['up', 'down', 'none'][i % 3];
        const tone = direction === 'none' || good === 'none' ? 'neutral' : direction === good ? 'success' : 'danger';
        assert.equal(row.direction, direction); assert.equal(row.tone, tone); assert.equal(row.color, row[tone]);
        assert.equal(row.text, ['+12%', '−12%', '0%'][i % 3]);
        assert.match(row.icon, new RegExp(direction === 'none' ? 'lucide-minus' : `lucide-arrow-${direction}`));
        const ratio = contrast(row.color, row.bg); assert.ok(ratio >= 4.5, `${theme} ${tone} ${ratio}`);
        measurements.push({ theme, good, ...row, contrast: ratio });
      }
    }
  });
  await check('그룹과 실제 접근성 트리에 라벨·원문·비교 기준·증감 문장이 남는다', async () => {
    await story('기본');
    assert.equal(await ev(`${q(tile)}.getAttribute('aria-label')`), '오늘 주문 1,284건, 전일 대비 12% 증가');
    const tree = await cdp('Accessibility.getFullAXTree');
    assert.ok(tree.nodes.some(n => n.role?.value === 'group' && n.name?.value === '오늘 주문 1,284건, 전일 대비 12% 증가'));
    assert.equal(await ev(`${all(tile)}[3].getAttribute('aria-label')`), '반품률 1.8%, 전일 대비 0.4%p 감소');
    await story('긴값');
    assert.match(await ev(`${q(tile)}.getAttribute('aria-label')`), /1,284,000,000,000원/);
  });
  await check('200px 폭에서 모든 값이 한 줄로 잘림 없이 들어가며 숫자는 고정폭이다', async () => {
    await story('좁은폭');
    const values = await ev(`${all('[data-slot="stat-tile-value"]')}.map(n => ({ text:n.textContent,title:n.title,width:n.clientWidth,scroll:n.scrollWidth,whiteSpace:getComputedStyle(n).whiteSpace,numeric:getComputedStyle(n).fontVariantNumeric,size:getComputedStyle(n).fontSize,tile:n.closest('[data-slot="stat-tile"]').getBoundingClientRect().width }))`);
    assert.equal(values.length, 5);
    for (const value of values) {
      assert.ok(Math.abs(value.tile - 200) < 1); assert.ok(value.scroll <= value.width + 1, JSON.stringify(value));
      assert.equal(value.whiteSpace, 'nowrap'); assert.match(value.numeric, /tabular-nums/); assert.equal(value.size, '24px');
    }
    assert.equal(values[1].text, '1.3조원'); assert.equal(values[1].title, '1,284,000,000,000원');
    assert.equal(values[2].text, '128.4만건'); assert.equal(values[4].title, '1,284,000,000원');
    measurements.push({ narrow: values });
    // 숫자의 실제 글리프 폭도 재서 속성 이름만 맞는 거짓 통과를 막는다.
    // 리눅스는 글꼴 힌팅이 글리프마다 진행 폭을 정수 px 로 반올림해 같은 tnum 폭도 1px 까지 갈린다
    // (CI run 45005304379 실측 14.77·15.77, macOS 는 15.16 균일). 허용 오차는 그 1px 이다. 대신 비례
    // 숫자보다 확실히 고른지를 함께 봐서 tnum 이 실제로 적용됐다는 증거로 삼는다.
    const widths = await ev(`(() => { const n=${q('[data-slot="stat-tile-value"]')}, p=document.createElement('span'); p.style.font=getComputedStyle(n).font; p.style.display='inline-block'; n.append(p); const measure = numeric => { p.style.fontVariantNumeric=numeric; return [...'0123456789'].map(x=>{p.textContent=x;return p.getBoundingClientRect().width;}); }; const w={ tabular: measure('tabular-nums'), proportional: measure('proportional-nums') }; p.remove(); return w; })()`);
    const spread = list => Math.max(...list) - Math.min(...list);
    assert.ok(spread(widths.tabular) <= 1.01, `tabular ${widths.tabular.join(',')}`);
    assert.ok(spread(widths.proportional) > spread(widths.tabular) + 1, `tabular ${widths.tabular.join(',')} / proportional ${widths.proportional.join(',')}`);
    measurements.push({ digitWidths: widths });
    await browser.shot('narrow');
  });
  await check('그리드 4개가 900px에서 한 줄, 500px에서 두 줄, 190px에서 한 열로 바뀐다', async () => {
    await story('기본');
    for (const [width, rows] of [[900, 1], [500, 2], [190, 4]]) {
      const result = await ev(`(() => { const grid=${q(tile)}.parentElement; grid.style.width='${width}px'; const nodes=[...grid.children]; return {gap:getComputedStyle(grid).gap,rows:new Set(nodes.map(n=>Math.round(n.getBoundingClientRect().top))).size,width:grid.clientWidth,scroll:grid.scrollWidth}; })()`);
      assert.equal(result.gap, '16px'); assert.equal(result.rows, rows); assert.ok(result.scroll <= result.width + 1);
      measurements.push({ width, ...result });
    }
  });
  await check('로딩은 status·busy·스켈레톤, 오류는 alert·재시도이며 이전 값·증감·링크가 없다', async () => {
    await story('로딩오류');
    const state = await ev(`${all(tile)}.map(n=>({state:n.dataset.state,busy:n.getAttribute('aria-busy'),status:!!n.querySelector('[role="status"]'),skeleton:n.querySelectorAll('[data-slot="skeleton"]').length,error:!!n.querySelector('[role="alert"]'),values:n.querySelectorAll('[data-slot="stat-tile-value"], [data-slot="stat-tile-delta"]').length,link:n.hasAttribute('href')||!!n.querySelector('a')}))`);
    assert.deepEqual(state[0], {state:'loading',busy:'true',status:true,skeleton:2,error:false,values:0,link:false});
    for (const entry of state.slice(1)) { assert.equal(entry.state, 'error'); assert.equal(entry.error, true); assert.equal(entry.values, 0); assert.equal(entry.link, false); }
    await ev(`${all(tile)}[1].querySelector('button').click()`);
    await wait(`${all(tile)}[1].dataset.state === 'idle'`);
    assert.equal(await ev(`${all(tile)}[1].getAttribute('href')`), '#payment');
  });
  await check('href·asChild 링크가 Tab으로 도달하며 라이트·다크 포커스 링과 이름을 보존한다', async () => {
    for (const theme of ['light', 'dark']) {
      await story('링크'); await ev(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
      for (let i = 0; i < 2; i++) {
        await keyTab();
        const focus = await ev(`(() => {const n=${all(tile)}[${i}],s=getComputedStyle(n); return {focused:document.activeElement===n,tag:n.tagName,href:n.getAttribute('href'),ring:s.outlineStyle,width:s.outlineWidth,color:s.outlineColor,name:n.getAttribute('aria-label'),visible:n.matches(':focus-visible')};})()`);
        assert.equal(focus.focused, true); assert.equal(focus.visible, true); assert.equal(focus.tag, 'A');
        assert.equal(focus.href, ['#orders', '#sales'][i]); assert.equal(focus.ring, 'solid'); assert.equal(focus.width, '2px');
        assert.ok(focus.name.startsWith(i === 0 ? '오늘 주문 1,284건' : '오늘 매출 1,284,000원'));
        measurements.push({ theme, link: focus });
      }
    }
  });
  await check('다크 스토리와 Primary가 실제 렌더되고 전 경로 콘솔 오류가 0건이다', async () => {
    await story('다크'); await wait("document.documentElement.dataset.theme === 'dark'");
    await browser.shot('dark'); await story('사용법');
    assert.equal(await ev(`${all(tile)}.length`), 4);
    errors.push(...browser.errors()); assert.deepEqual(errors, []);
  });
} finally {
  writeFileSync(`${OUT}/results.json`, JSON.stringify({ results, measurements, errors }, null, 2));
  browser.close();
}
const failed = results.filter(r => !r.pass).length;
console.log(`\n${results.length}건 검사 · ${results.length - failed}건 통과 · ${failed}건 실패`);
if (failed) process.exitCode = 1;
