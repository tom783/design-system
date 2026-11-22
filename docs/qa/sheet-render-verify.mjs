// R36: 작성 전용. 실제 실행은 pnpm qa에서 browser.mjs의 headless shell로 수행한다.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, CANVAS } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/sheet';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ outDir: OUT });
const { cdp, ev, sleep } = browser;
const { open } = storybook(browser);
const results = [], measurements = [];
// 패널은 포털이므로 CANVAS가 아닌 문서에서 찾는다.
const q = selector => `document.querySelector(${JSON.stringify(selector)})`;
const sheet = '[data-slot="sheet-content"]', body = '[data-slot="sheet-body"]';
const header = `${sheet} [data-slot="dialog-header"]`, footer = `${sheet} [data-slot="dialog-footer"]`;
const close = `${sheet} [data-slot="dialog-close-icon"]`, overlay = '.ds-sheet-overlay';
const trigger = '[data-slot="dialog-trigger"]';
async function wait(expression) {
  const deadline = Date.now() + 6000;
  while (Date.now() < deadline) { if (await ev(expression)) return; await sleep(20); }
  throw new Error(`조건 대기 실패: ${expression}`);
}
async function check(label, run) {
  try { await run(); results.push({ label, pass: true }); console.log(`✓ ${label}`); }
  catch (error) { results.push({ label, pass: false, error: error.message }); console.error(`✗ ${label}: ${error.message}`); await browser.shot(`failure-${results.length}`); }
}
async function viewport(width, height = 760) {
  await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
}
async function story(name, theme = 'light', family = 'sheet') {
  assert.deepEqual(browser.errors(), [], '직전 스토리 콘솔 오류');
  const rendered = await open(`components-${family}--${name}`, { waitPlay: false, extra: `&globals=theme:${theme}` });
  assert.equal(rendered.sbError, null);
  await wait(`!!${CANVAS}.querySelector('button, [data-slot="data-table-row"]')`);
  await wait(`document.documentElement.dataset.theme === '${theme}'`);
  await ev('document.fonts.ready.then(() => true)');
}
async function pointer(x, y) {
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}
async function pointerOpen(selector = trigger) {
  // R24: 레이어 열기는 실제 포인터. 내부 버튼은 .click()으로 불필요한 스크롤을 피한다.
  const point = await ev(`(() => { const r=${q(selector)}.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  await pointer(point.x, point.y); await wait(`!!${q(sheet)}`);
  await wait(`${q(sheet)}.getAnimations().every(a => a.playState === 'finished')`);
  await wait(`${q(sheet)}.contains(document.activeElement)`);
}
async function key(key, code, shift = false) {
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: code, modifiers: shift ? 8 : 0 });
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: code, modifiers: shift ? 8 : 0 });
}
async function click(selector) { await ev(`${q(selector)}.click()`); }
async function closed() { await wait(`!${q(sheet)}`); }
async function restored(selector = trigger) { await wait(`document.activeElement === ${q(selector)}`); }
async function geometry() {
  return ev(`(() => { const n=${q(sheet)}, r=n.getBoundingClientRect(); return {width:r.width,left:r.left,right:innerWidth-r.right,top:r.top,bottom:innerHeight-r.bottom,overflow:n.scrollWidth>n.clientWidth}; })()`);
}
async function borders(expected) {
  assert.deepEqual(await ev(`(() => { const s=getComputedStyle(${q(sheet)}); return [s.borderTopWidth,s.borderRightWidth,s.borderBottomWidth,s.borderLeftWidth]; })()`), expected,
    '패널 안쪽 가장자리만 1px 테두리를 갖는다');
}
// R32와 같은 sRGB 합성 휘도·막 실측. 단순 CSS 문자열이 아니라 검정 alpha와 실제 어두워짐을 확인한다.
const colorHelpers = `
  const ctx=document.createElement('canvas').getContext('2d',{willReadFrequently:true});
  const rgb=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data];};
  const lum=a=>a.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
`;
try {
  await viewport(1200);
  for (const [name, width] of [['작은크기', 400], ['중간크기', 560], ['큰크기', 720]]) {
    await check(`${name}: 폭 ${width}px·오른쪽 가장자리·높이`, async () => {
      await story(name); await pointerOpen();
      const m = await geometry(); measurements.push({ name, ...m });
      await borders(['0px', '0px', '0px', '1px']);
      assert.equal(m.width, width); assert.equal(m.right, 0); assert.equal(m.top, 0); assert.equal(m.bottom, 0); assert.equal(m.overflow, false);
      await key('Escape', 27); await closed(); await restored();
    });
    await check(`${name}: 좁은 화면 320px에서 반대편 16px`, async () => {
      await viewport(320); await story(name); await pointerOpen();
      const m = await geometry(); assert.equal(m.width, 304); assert.equal(m.left, 16); assert.equal(m.right, 0);
      assert.equal(await ev('document.documentElement.scrollWidth > innerWidth'), false);
      await key('Escape', 27); await closed(); await viewport(1200);
    });
  }
  await check('왼쪽 가장자리·좁은 화면 반대편 16px', async () => {
    for (const width of [1200, 320]) {
      await viewport(width); await story('왼쪽'); await pointerOpen();
      const m = await geometry(); assert.equal(m.left, 0); assert.equal(m.width, Math.min(560, width - 16));
      await borders(['0px', '1px', '0px', '0px']);
      if (width === 320) assert.equal(m.right, 16);
      await key('Escape', 27); await closed();
    }
    await viewport(1200);
  });
  await check('본문만 스크롤·헤더와 푸터 위치 불변·외부 문서 고정', async () => {
    await story('긴본문'); await pointerOpen();
    const position = () => ev(`({header:${q(header)}.getBoundingClientRect().top,footer:${q(footer)}.getBoundingClientRect().top,window:scrollY,panel:${q(sheet)}.scrollTop})`);
    const before = await position();
    assert.equal(await ev(`${q(body)}.scrollHeight > ${q(body)}.clientHeight`), true);
    await ev(`${q(body)}.scrollTop = ${q(body)}.scrollHeight`);
    await wait(`${q(body)}.scrollTop > 0`); assert.deepEqual(await position(), before);
    assert.equal(await ev(`getComputedStyle(${q(sheet)}).overflowY`), 'hidden');
    await key('Escape', 27); await closed();
  });
  await check('첫 입력 포커스·Tab 양방향 가둠·닫기 후 트리거 복귀', async () => {
    await story('오른쪽기본'); await pointerOpen();
    const input = `${body} input`;
    await wait(`document.activeElement === ${q(input)}`);
    await key('Tab', 9, true); await wait(`document.activeElement === ${q(close)}`);
    await key('Tab', 9); await wait(`document.activeElement === ${q(input)}`);
    for (let i = 0; i < 8; i++) { await key('Tab', 9); assert.equal(await ev(`${q(sheet)}.contains(document.activeElement)`), true); }
    await click(close); await closed(); await restored();
  });
  for (const route of ['Escape', '바깥 클릭', '닫기 버튼']) {
    await check(`기본 ${route}로 닫기·포커스 복귀`, async () => {
      await story('오른쪽기본'); await pointerOpen();
      if (route === 'Escape') await key('Escape', 27);
      else if (route === '바깥 클릭') await pointer(8, 380);
      else await click(close);
      await closed(); await restored();
    });
    await check(`dismissible=false: ${route}는 한 번만 알리고 확인·취소`, async () => {
      await story('변경보호'); await pointerOpen();
      await ev(`(() => { const n=${q(`${body} input`)}; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'변경한 배송지'); n.dispatchEvent(new Event('input',{bubbles:true})); })()`);
      await wait(`${q(`${body} input`)}.value === '변경한 배송지'`);
      // DOM click은 포커스를 옮기지 않는다. 실제 닫기 버튼 조작과 같은 시작 위치를 만든다.
      const origin = route === '닫기 버튼' ? close : `${body} input`;
      await ev(`${q(origin)}.focus()`); await restored(origin);
      if (route === 'Escape') await key('Escape', 27);
      else if (route === '바깥 클릭') await pointer(8, 380);
      else await click(close);
      await wait(`!!${q('[role="alertdialog"]')}`);
      assert.equal(await ev(`${q(sheet)}.dataset.state`), 'open');
      assert.equal(await ev(`${q('output[aria-label="닫기 시도 횟수"]')}.textContent`), '1');
      await click('[data-slot="alert-dialog-cancel"]'); await wait(`!${q('[role="alertdialog"]')}`);
      await restored(origin);
      assert.equal(await ev(`${q('output[aria-label="닫기 시도 횟수"]')}.textContent`), '1', '포커스 복귀도 새 시도가 아니다');
      assert.equal(await ev(`${q(`${body} input`)}.value`), '변경한 배송지');
      await click(close); await wait(`!!${q('[role="alertdialog"]')}`);
      await click('[data-slot="alert-dialog-action"]'); await closed(); await restored();
    });
  }
  for (const route of ['Escape', '바깥 클릭', '닫기 버튼']) {
    await check(`Dialog 형제 확인창: ${route} 시도 1회·취소 후 원래 요소로 복귀`, async () => {
      await story('형제확인창', 'light', 'dialog');
      const content = '[data-slot="dialog-content"]', dialogClose = `${content} [data-slot="dialog-close-icon"]`;
      await click(trigger); await wait(`!!${q(content)}`);
      const origin = route === '닫기 버튼' ? dialogClose : `${content} input`;
      await ev(`${q(origin)}.focus()`); await restored(origin);
      if (route === 'Escape') await key('Escape', 27);
      else if (route === '바깥 클릭') await pointer(8, 380);
      else await click(dialogClose);
      await wait(`!!${q('[role="alertdialog"]')}`);
      assert.equal(await ev(`${q('output[aria-label="닫기 시도 횟수"]')}.textContent`), '1');
      await click('[data-slot="alert-dialog-cancel"]'); await wait(`!${q('[role="alertdialog"]')}`);
      await restored(origin);
      assert.equal(await ev(`${q(content)}.dataset.state`), 'open');
      assert.equal(await ev(`${q('output[aria-label="닫기 시도 횟수"]')}.textContent`), '1');
      await click(dialogClose); await wait(`!!${q('[role="alertdialog"]')}`);
      await click('[data-slot="alert-dialog-action"]'); await wait(`!${q(content)}`); await restored();
    });
  }
  await check('AlertDialog 트리거가 있으면 열기 직전 요소보다 트리거 복귀를 우선', async () => {
    await story('편집과확인', 'light', 'dialog');
    await ev(`${q(trigger)}.focus()`); await restored();
    // .click()은 포커스를 이동하지 않으므로 트리거와 직전 포커스를 서로 다르게 유지한다.
    const alertTrigger = '[data-slot="alert-dialog-trigger"]';
    await click(alertTrigger); await wait(`!!${q('[role="alertdialog"]')}`);
    await click('[data-slot="alert-dialog-cancel"]'); await wait(`!${q('[role="alertdialog"]')}`);
    await restored(alertTrigger);
  });
  await check('깨끗한 폼은 확인 없이 닫힘·저장 후에도 보호 해제', async () => {
    await story('변경보호'); await pointerOpen(); await key('Escape', 27); await closed();
    assert.equal(await ev(`${q('[role="alertdialog"]')}`), null);
    await pointerOpen();
    await ev(`(() => { const n=${q(`${body} input`)}; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'저장할 배송지'); n.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await click(`${footer} button:last-child`); await closed(); await pointerOpen();
    assert.equal(await ev(`${q(`${body} input`)}.value`), '저장할 배송지');
    await key('Escape', 27); await closed();
  });
  for (const [theme, alpha] of [['light', 89], ['dark', 166]]) {
    await check(`${theme}: R32 검정 막·합성 휘도 감소·기존 레이어와 그림자`, async () => {
      await story('오른쪽기본', theme); await pointerOpen();
      const m = await ev(`(() => { ${colorHelpers}
        const n=${q(overlay)}, s=getComputedStyle(n), rgba=rgb(s.backgroundColor), base=rgb(getComputedStyle(document.body).backgroundColor);
        const alpha=rgba[3]/255*Number(s.opacity), composite=base.map((v,i)=>i<3?rgba[i]*alpha+v*(1-alpha):255);
        const panel=getComputedStyle(${q(sheet)});
        return {rgba,before:lum(base),after:lum(composite),covers:document.elementsFromPoint(8,380).includes(n),z:panel.zIndex,shadow:panel.boxShadow}; })()`);
      measurements.push({ theme, ...m }); assert.deepEqual(m.rgba, [0, 0, 0, alpha]); assert.ok(m.after < m.before); assert.ok(m.covers);
      assert.equal(m.z, '50'); assert.notEqual(m.shadow, 'none');
      await key('Escape', 27); await closed();
    });
  }
  await check('래퍼 안 헤더도 닫기 자리 확보·닫기 없으면 제목 전체 폭', async () => {
    for (const [name, hasClose] of [['래퍼헤더', true], ['닫기버튼없음', false]]) {
      await story(name); await pointerOpen();
      const m = await ev(`(() => { const h=${q(header)}, s=getComputedStyle(h), t=h.querySelector('[data-slot="dialog-title"]'); return {header:h.clientWidth,title:t.getBoundingClientRect().width,left:parseFloat(s.paddingLeft),right:parseFloat(s.paddingRight),close:!!${q(close)}}; })()`);
      assert.equal(m.close, hasClose); assert.equal(m.left, 24); assert.equal(m.right, hasClose ? 64 : 24);
      assert.ok(Math.abs(m.title - (m.header - m.left - m.right)) < 1);
      await key('Escape', 27); await closed();
    }
  });
  await check('reduced-motion: 열림·닫힘의 막·패널 전환 정확히 0', async () => {
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await story('오른쪽기본'); await pointerOpen();
    for (const state of ['open', 'closed']) {
      assert.equal(await ev(`(() => { const nodes=[${q(sheet)},${q(overlay)}]; return nodes.every(n=>{n.dataset.state='${state}'; const s=getComputedStyle(n);return s.animationDuration.split(',').every(v=>parseFloat(v)===0)&&s.transitionDuration.split(',').every(v=>parseFloat(v)===0);}); })()`), true);
    }
    await ev(`[${q(sheet)},${q(overlay)}].forEach(n=>n.dataset.state='open')`);
    await key('Escape', 27); await closed();
    await cdp('Emulation.setEmulatedMedia', { features: [] });
  });
  await check('목록 행 실제 클릭 → 편집 저장·목록 갱신·행 포커스 복귀', async () => {
    await story('목록편집'); const row = '[data-row-id="ORD-001"]'; await pointerOpen(row);
    await ev(`(() => { const n=${q(`${body} input`)}; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'홍길동'); n.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await click(`${footer} button:last-child`); await closed(); await restored(row);
    assert.match(await ev(`${q(row)}.textContent`), /홍길동/);
  });
  await check('AppShell 선택형 서랍: 메뉴·펼친 라벨·항목 선택 닫힘·1024 복귀', async () => {
    await viewport(800);
    const rendered = await open('components-appshell--좁은화면서랍', { waitPlay: false }); assert.equal(rendered.sbError, null);
    await wait(`!!${q('.ds-app-shell-menu button')}`);
    assert.equal(await ev(`getComputedStyle(${q('[data-slot="app-shell-sidebar"]')}).display`), 'none');
    await pointerOpen('.ds-app-shell-menu button');
    assert.equal((await geometry()).left, 0);
    assert.equal(await ev(`${q('[data-slot="side-nav"]')}.dataset.collapsed`), 'false');
    assert.notEqual(await ev(`getComputedStyle(${q('[data-slot="side-nav-item-label"]')}).display`), 'none');
    await click(`${body} a[data-slot="side-nav-item"]`); await closed(); await restored('.ds-app-shell-menu button');
    await pointerOpen('.ds-app-shell-menu button'); await viewport(1024); await closed();
    assert.equal(await ev(`getComputedStyle(${q('.ds-app-shell-menu')}).display`), 'none');
    assert.equal(await ev(`${q('[data-slot="side-nav"]')}.getBoundingClientRect().width`), 240);
    await viewport(1200);
  });
  await check('모든 경로 콘솔 오류 0건', async () => assert.deepEqual(browser.errors(), []));
} finally {
  writeFileSync(`${OUT}/results.json`, JSON.stringify({ results, measurements, errors: browser.errors() }, null, 2));
  browser.close();
}
const failed = results.filter(result => !result.pass).length;
console.log(`\n${results.length}건 검사 · ${results.length - failed}건 통과 · ${failed}건 실패`);
if (failed) process.exitCode = 1;
