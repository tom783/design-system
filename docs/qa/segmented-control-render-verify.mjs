// R42 작성 전용. 전체 실행은 pnpm qa. 브라우저는 공통 headless-shell 경로만 쓴다.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, actions } from './browser.mjs';
const OUT = process.argv[2] || '.qa-shots/segmented-control';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ outDir: OUT });
const { cdp, ev, sleep } = browser;
const { open } = storybook(browser);
const results = [], measurements = [], errors = [];
const group = '[data-slot="segmented-control"]', item = '[data-slot="segmented-control-item"]';
const q = selector => `document.querySelector(${JSON.stringify(selector)})`;
const all = selector => `[...document.querySelectorAll(${JSON.stringify(selector)})]`;
async function wait(expression) {
  const deadline = Date.now() + 6000;
  while (Date.now() < deadline) { if (await ev(expression)) return; await sleep(30); }
  throw new Error(`조건 대기 실패: ${expression}`);
}
async function story(name) {
  errors.push(...browser.errors());
  const state = await open(`components-segmentedcontrol--${name}`, { waitPlay: false });
  assert.equal(state.sbError, null); assert.deepEqual(state.errors, []);
  await wait(`!!${q(group)}`); await ev('document.fonts.ready');
}
async function check(label, run) {
  try { await run(); results.push({ label, pass: true }); console.log(`✓ ${label}`); }
  catch (error) { results.push({ label, pass: false, error: error.message }); console.error(`✗ ${label}: ${error.message}`); await browser.shot(`failure-${results.length}`); }
}
const act = actions(browser);
// 버튼의 Enter 활성화는 keypress(=text '\r')에서 일어난다 — act.key 가 Enter 에 text 를 붙인다.
const key = (name, shift = false) => act.key(name, { shift });
async function selected(label) {
  await wait(`${q(`${item}[aria-checked="true"]`)}?.getAttribute('aria-label') === ${JSON.stringify(label)}`);
  assert.equal(await ev(`${all(`${item}[aria-checked="true"]`)}.length`), 1);
}
function contrast(fg, bg) {
  const luminance = value => {
    assert.match(value, /^rgb\(/);
    const c = value.match(/[\d.]+/g).map(Number).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
    return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
  };
  const a = luminance(fg), b = luminance(bg);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
try {
  await check('그룹·radio 역할, 이름·단일 aria-checked와 기본 선택', async () => {
    await story('기본'); await selected('일');
    const tree = (await cdp('Accessibility.getFullAXTree')).nodes;
    assert.ok(tree.some(n => n.role?.value === 'radiogroup' && n.name?.value === '집계 기간 단위'));
    for (const name of ['일', '주', '월']) assert.ok(tree.some(n => n.role?.value === 'radio' && n.name?.value === name));
    assert.equal(await ev(`${q(group)}.getAttribute('role')`), 'radiogroup');
    assert.equal(await ev(`${all(item)}.every(n=>n.getAttribute('role')==='radio' && n.type==='button')`), true);
    await ev(`${all(item)}[1].click()`); await selected('주');
    await ev(`${all(item)}[1].click()`); await selected('주');
  });
  await check('보이는 그룹 이름·Tab 한 번·좌우상하·Home·End·순환·비활성 건너뜀', async () => {
    await story('키보드');
    const tree = (await cdp('Accessibility.getFullAXTree')).nodes;
    assert.ok(tree.some(n => n.role?.value === 'radiogroup' && n.name?.value === '집계 단위'));
    await ev(`${q('[data-probe="before"]')}.focus()`); await key('Tab');
    assert.equal(await ev(`document.activeElement===${all(item)}[0]`), true);
    const style = await ev(`(() => { const s=getComputedStyle(document.activeElement);return [s.outlineWidth,s.outlineStyle,s.outlineOffset];})()`);
    assert.deepEqual(style, ['2px', 'solid', '-2px']);
    for (const [name, expected] of [['ArrowRight','월'],['ArrowRight','일'],['ArrowLeft','월'],['Home','일'],['End','월'],['ArrowDown','일'],['ArrowUp','월']]) {
      await key(name); await selected(expected);
      assert.equal(await ev(`document.activeElement.getAttribute('aria-label')`), expected);
    }
    await key('Tab'); assert.equal(await ev(`document.activeElement===${q('[data-probe="after"]')}`), true);
    await key('Tab', true); assert.equal(await ev(`document.activeElement===${all(item)}[2]`), true);
    await ev(`${all(item)}[1].click()`); await selected('월');
  });
  await check('제어형 외부 값 변경·Space·Enter 선택과 포커스 유지', async () => {
    await story('키보드');
    await ev(`${q('[data-probe="after"]')}.focus();${q('[data-probe="after"]')}.click()`); await selected('월');
    assert.equal(await ev(`document.activeElement===${q('[data-probe="after"]')}`), true);
    await ev(`${all(item)}[0].focus()`); await key(' '); await selected('일');
    await ev(`${all(item)}[2].focus()`); await key('Enter'); await selected('월');
    assert.equal(await ev(`document.querySelector('output').textContent`), 'month');
  });
  await check('그룹 disabled는 클릭·Tab을 막고 아이콘 전용도 이름·전체 라벨이 남는다', async () => {
    await story('비활성항목');
    assert.equal(await ev(`${all(group)}[1].getAttribute('aria-disabled')`), 'true');
    assert.equal(await ev(`${all(group)}[1].querySelectorAll('button:disabled').length`), 3);
    assert.equal(await ev(`${all(group)}[1].querySelectorAll('[tabindex="0"]').length`), 0);
    await ev(`${all(group)}[1].querySelectorAll('button')[2].click()`);
    assert.equal(await ev(`${all(group)}[1].querySelector('[aria-checked="true"]').getAttribute('aria-label')`), '일');
    await story('아이콘전용');
    const tree = (await cdp('Accessibility.getFullAXTree')).nodes;
    for (const name of ['표 보기','카드 보기']) assert.ok(tree.some(n=>n.role?.value==='radio' && n.name?.value===name));
    assert.equal(await ev(`${all(item)}.every(n=>n.title===n.getAttribute('aria-label') && n.querySelector('[data-slot="segmented-control-icon"]').getAttribute('aria-hidden')==='true')`), true);
  });
  await check('sm·md 바깥 높이가 control 토큰과 같고 fullWidth는 같은 폭이다', async () => {
    await story('크기');
    const sizes = await ev(`${all(group)}.map(n=>({size:n.dataset.size,height:n.getBoundingClientRect().height,token:parseFloat(getComputedStyle(n).getPropertyValue('--control-h-'+n.dataset.size))}))`);
    assert.equal(sizes.length, 2); for (const row of sizes) assert.equal(row.height, row.token);
    measurements.push({ sizes });
    await story('전체폭');
    const widths = await ev(`(() => {const n=${q(group)};return {group:n.getBoundingClientRect().width,parent:n.parentElement.clientWidth,items:[...n.children].map(n=>n.getBoundingClientRect().width)};})()`);
    assert.equal(widths.group, widths.parent); assert.ok(Math.max(...widths.items)-Math.min(...widths.items)<1);
    measurements.push({ fullWidth: widths });
  });
  await check('120·180·240·320px에서 문서·그룹 가로 넘침 0, 한 줄 축약·전체값 보존', async () => {
    await story('좁은폭');
    for (const width of [120,180,240,320]) {
      await ev(`${q(group)}.parentElement.style.width='${width}px'`);
      const m = await ev(`(() => {const n=${q(group)},p=n.parentElement;return {width:${width},parent:[p.clientWidth,p.scrollWidth],group:[n.clientWidth,n.scrollWidth],page:[document.documentElement.clientWidth,document.documentElement.scrollWidth],items:[...n.children].map(n=>{const l=n.querySelector('[data-slot="segmented-control-label"]'),s=getComputedStyle(l);return {name:n.getAttribute('aria-label'),title:n.title,text:l.textContent,width:l.clientWidth,scroll:l.scrollWidth,whiteSpace:s.whiteSpace,ellipsis:s.textOverflow,top:n.offsetTop};})};})()`);
      for (const dimensions of [m.parent,m.group,m.page]) assert.ok(dimensions[1]<=dimensions[0], JSON.stringify(m));
      assert.equal(new Set(m.items.map(i=>i.top)).size,1);
      for (const i of m.items) { assert.equal(i.whiteSpace,'nowrap'); assert.equal(i.ellipsis,'ellipsis'); assert.equal(i.name,i.text); assert.equal(i.title,i.text); }
      if (width<=180) assert.ok(m.items.every(i=>i.scroll>i.width));
      measurements.push(m);
    }
    await browser.shot('narrow');
  });
  await check('양 테마 선택의 바탕·경계·굵기, 본문 4.5·경계/포커스 3 이상', async () => {
    await story('기본');
    for (const theme of ['light','dark']) {
      await ev(`document.documentElement.dataset.theme='${theme}'`);
      await ev(`${all(item)}[0].focus()`); await key('ArrowRight'); await key('ArrowLeft');
      const m = await ev(`(() => {const g=${q(group)},nodes=[...g.children],a=getComputedStyle(nodes[0]),b=getComputedStyle(nodes[1]);return {group:getComputedStyle(g).backgroundColor,selected:{bg:a.backgroundColor,fg:a.color,border:a.borderTopColor,width:a.borderTopWidth,style:a.borderTopStyle,weight:a.fontWeight,shadow:a.boxShadow,ring:a.outlineColor,ringWidth:a.outlineWidth,ringStyle:a.outlineStyle},other:{fg:b.color,border:b.borderTopColor,weight:b.fontWeight}};})()`);
      assert.notEqual(m.selected.bg,m.group); assert.equal(m.selected.width,'1px'); assert.equal(m.selected.style,'solid');
      assert.notEqual(m.selected.border,m.other.border); assert.ok(Number(m.selected.weight)>Number(m.other.weight)); assert.equal(m.selected.shadow,'none');
      assert.ok(contrast(m.selected.fg,m.selected.bg)>=4.5); assert.ok(contrast(m.other.fg,m.group)>=4.5);
      assert.ok(contrast(m.selected.border,m.selected.bg)>=3); assert.ok(contrast(m.selected.border,m.group)>=3);
      assert.equal(m.selected.ringWidth,'2px'); assert.equal(m.selected.ringStyle,'solid'); assert.ok(contrast(m.selected.ring,m.selected.bg)>=3);
      measurements.push({ theme, ...m });
    }
  });
  await check('RTL 좌우 이동은 시각 방향을 따르고 보기 전환은 같은 데이터의 표·카드다', async () => {
    await story('오른쪽부터'); await ev(`${all(item)}[0].focus()`);
    await key('ArrowLeft'); await selected('주'); await key('ArrowRight'); await selected('일');
    // 미리보기 페이지에는 Storybook 의 숨은 props 표 골격(table.sb-argstableBlock)이 늘 있다 — 우리 표를 이름으로 찾는다.
    await story('보기전환');
    assert.equal(await ev(`!!document.querySelector('table[aria-label="주문 목록"]')`),true);
    await ev(`${all(item)}[1].click()`); await selected('카드 보기');
    assert.equal(await ev(`document.querySelector('table[aria-label="주문 목록"]')===null && document.querySelectorAll('ul[aria-label="주문 목록"] > li').length===2`),true);
  });
  await check('900px 기본·아이콘라벨·보기전환·다크에서 라벨 잘림 0·그룹 내용 폭 보장', async () => {
    await cdp('Emulation.setDeviceMetricsOverride', { width: 900, height: 1000, deviceScaleFactor: 1, mobile: false });
    try {
      for (const name of ['기본','아이콘라벨','보기전환','다크']) {
        await story(name);
        const groups = await ev(`${all(group)}.map(g => ({width:g.getBoundingClientRect().width,items:[...g.children].map(n => {
          const l=n.querySelector('[data-slot="segmented-control-label"]'),icon=n.querySelector('[data-slot="segmented-control-icon"]'),s=getComputedStyle(n);
          // 라벨의 자연 폭을 재야 이미 줄어든 항목 폭의 합으로 결함을 놓치지 않는다.
          const range=document.createRange();range.selectNodeContents(l);
          const contentWidth=range.getBoundingClientRect().width+(icon ? icon.getBoundingClientRect().width+parseFloat(s.columnGap) : 0)
            +parseFloat(s.paddingLeft)+parseFloat(s.paddingRight)+parseFloat(s.borderLeftWidth)+parseFloat(s.borderRightWidth);
          return {text:l.textContent,width:l.clientWidth,scroll:l.scrollWidth,contentWidth};
        })}))`);
        assert.ok(groups.length>0, name);
        for (const g of groups) {
          assert.ok(g.items.length>0, name);
          for (const i of g.items) assert.ok(i.scroll<=i.width, `${name}: ${JSON.stringify(i)}`);
          assert.ok(g.width>=g.items.reduce((sum,i)=>sum+i.contentWidth,0), `${name}: ${JSON.stringify(g)}`);
        }
        measurements.push({ story:name, viewport:900, groups });
      }
    } finally {
      await cdp('Emulation.clearDeviceMetricsOverride');
    }
  });
  await check('다크·Primary 렌더와 전 경로 콘솔 오류 0', async () => {
    await story('다크'); await wait("document.documentElement.dataset.theme==='dark'"); await browser.shot('dark');
    await story('사용법'); assert.equal(await ev(`${all(group)}.length`),1);
    errors.push(...browser.errors()); assert.deepEqual(errors,[]);
  });
} finally {
  writeFileSync(`${OUT}/results.json`,JSON.stringify({results,measurements,errors},null,2)); browser.close();
}
const failed=results.filter(r=>!r.pass).length;
console.log(`\n${results.length}건 검사 · ${results.length-failed}건 통과 · ${failed}건 실패`);
if(failed) process.exitCode=1;
