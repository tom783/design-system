// R32: 1100×760·Pretendard에서 실제 포인터로 레이어를 열고 양 테마를 측정한다.
// 기존 하네스의 기대값은 고치지 않는다. O6의 지정 토큰과 대비 개선 목표 충돌은 별도 기록한다.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, CANVAS } from './browser.mjs';
const OUT = process.argv[2] || '.qa-shots/layer-detail';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ windowSize: '1100,760', outDir: OUT }).catch(error => {
  writeFileSync(`${OUT}/results.json`, JSON.stringify([{ label: '브라우저 기동', pass: false, error: error.message }], null, 2));
  throw error;
});
const { ev, cdp, sleep } = browser;
const { open } = storybook(browser);
const results = [];
const q = selector => `document.querySelector(${JSON.stringify(selector)})`;
async function wait(expression) {
  for (let i = 0; i < 100; i++) { if (await ev(expression)) return; await sleep(40); }
  throw new Error(`조건 대기 실패: ${expression}`);
}
async function check(label, run) {
  await closeLayers().catch(() => {});
  try { const measurements = await run(); results.push({ label, pass: true, measurements }); console.log(`✓ ${label} — ${JSON.stringify(measurements)}`); }
  catch (e) { results.push({ label, pass: false, error: e.message }); console.error(`✗ ${label}: ${e.message}`); await browser.shot(`failure-${results.length}`); }
}
async function key(name, code) {
  await cdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: name, code: name, windowsVirtualKeyCode: code });
  await sleep(50);
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, windowsVirtualKeyCode: code });
}
async function click(selector) {
  // R24: Radix의 pointerdown도 보내야 열린다. 스크롤은 트리거만 명시적으로 가져온다.
  await ev(`${q(selector)}.scrollIntoView({ block: 'nearest' })`);
  const point = await ev(`(() => { const r = ${q(selector)}.getBoundingClientRect(); return { x:r.x+r.width/2, y:r.y+r.height/2 }; })()`);
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
}
async function load(theme) {
  const r = await open('qa-layerdetails--열린레이어', { extra: `&globals=theme:${theme}` });
  assert.equal(r.sbError, null); assert.deepEqual(r.errors, []);
  await wait(`${CANVAS}.dataset.playComplete === 'true'`);
  await ev(`document.fonts.load('14px "Pretendard Variable"', '서울본사 삭제할까요')`);
  await ev('document.fonts.ready');
  assert.ok(await ev(`[...document.fonts].some(f => f.family.includes('Pretendard') && f.status === 'loaded')`));
  await wait(`document.documentElement.dataset.theme === '${theme}'`);
}
async function edge(selector) {
  await wait(`${q(selector)}?.getBoundingClientRect().width > 0`);
  // Radix의 배치·등장 애니메이션이 끝난 최종 사각형을 잰다.
  await sleep(250);
  const m = await ev(`(() => { const r = ${q(selector)}.getBoundingClientRect(); return { left:r.left, right:innerWidth-r.right, top:r.top, bottom:innerHeight-r.bottom, padding:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--anchor-edge-pad')) }; })()`);
  assert.equal(m.padding, 8); assert.ok(m.right >= m.padding - .5, JSON.stringify(m));
  assert.ok(m.left >= m.padding - .5 && m.top >= m.padding - .5 && m.bottom >= m.padding - .5, JSON.stringify(m));
  return m;
}
const colorHelpers = `
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgb = color => { ctx.clearRect(0,0,1,1); ctx.fillStyle = color; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data]; };
  const lum = a => a.slice(0,3).map(v => v/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4).reduce((sum,v,i) => sum+v*[.2126,.7152,.0722][i],0);
  const contrast = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
`;
async function scrim(selector) {
  await wait(`${q(selector)} !== null`);
  const m = await ev(`(() => { ${colorHelpers}
    const overlay = ${q(selector)}, s = getComputedStyle(overlay), base = rgb(getComputedStyle(document.body).backgroundColor), rgba = rgb(s.backgroundColor);
    const alpha = rgba[3]/255 * Number(s.opacity), composite = base.map((v,i) => i < 3 ? rgba[i]*alpha+v*(1-alpha) : 255);
    return { color:s.backgroundColor, rgba, before:lum(base), after:lum(composite), point:[2,2], covers:document.elementsFromPoint(2,2).includes(overlay) };
  })()`);
  assert.ok(m.covers); assert.ok(m.after < m.before, JSON.stringify(m)); assert.deepEqual(m.rgba.slice(0,3), [0,0,0]);
  return m;
}
async function header(content, description, close) {
  const m = await ev(`(() => { const box = ${q(content)}, s = getComputedStyle(box), desc = ${q(description)}, title = desc.previousElementSibling;
    return { inner:box.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight), description:desc.getBoundingClientRect().width,
      title:title.getBoundingClientRect().width, close:!!box.querySelector('[data-slot="dialog-close-icon"]') }; })()`);
  assert.equal(m.close, close);
  if (!close) { assert.ok(Math.abs(m.inner-m.description) <= 1, JSON.stringify(m)); assert.ok(Math.abs(m.inner-m.title) <= 1); }
  else assert.ok(m.description < m.inner);
  return m;
}
async function closeLayers() {
  // 앞 검사가 단정 실패로 중간에 끝나면 레이어가 열린 채 남아 다음 클릭을 가로챈다(R32: 14건 연쇄 실패).
  for (let i = 0; i < 3; i++) {
    if (!await ev(`!!document.querySelector('[data-state="open"][data-slot$="-content"], [role="dialog"], [role="alertdialog"], [role="listbox"]')`)) return;
    await key('Escape', 27); await sleep(150);
  }
}
async function active(selector) {
  await wait(`${q(selector)} !== null`);
  return ev(`(() => { const s=getComputedStyle(${q(selector)}); // outline-width 는 style 이 none 이어도 Chrome 이 지정값(2px·3px)을 돌려준다(R32 실측). 표시 여부는 style 로 판단한다.
    return { outline:s.outlineStyle, background:s.backgroundColor }; })()`);
}
async function menuText(selector) {
  return ev(`(() => { const root = ${q(selector)};
    return [...root.querySelectorAll('[role^="menuitem"]')].map(el => { const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT); let text;
      while ((text=walker.nextNode())) { if (!text.textContent.trim()) continue; const range=document.createRange(); range.selectNodeContents(text); return { label:text.textContent, x:range.getBoundingClientRect().left }; }
    }); })()`);
}
try {
  await cdp('Emulation.setDeviceMetricsOverride', { width:1100, height:760, deviceScaleFactor:1, mobile:false });
  for (const theme of ['light','dark']) {
    await load(theme);
    for (const [trigger, slot, desc, hasClose] of [
      ['dialog','dialog','dialog-description',true], ['dialog-no-close','dialog','dialog-description',false], ['alert','alert-dialog','alert-dialog-description',false],
    ]) await check(`O1·O2 ${trigger} 막·설명 폭 ${theme}`, async () => {
      await click(`[data-probe="${trigger}"]`);
      const m = { scrim:await scrim(`[data-slot="${slot}-overlay"]`), header:await header(`[data-slot="${slot}-content"]`, `[data-slot="${desc}"]`, hasClose) };
      await browser.shot(`${trigger}-${theme}`); await key('Escape',27); await wait(`!${q(`[data-slot="${slot}-content"]`)}`); return m;
    });
    await check(`O1 MediaViewer popup 공통 막 ${theme}`, async () => {
      await click('[data-probe="media"]'); const m = await scrim('[data-slot="dialog-overlay"]');
      await key('Escape',27); await wait(`!${q('[data-slot="dialog-content"]')}`); return m;
    });
    const styles = [];
    for (const [trigger, content, option, checked] of [
      ['[data-probe="select"]','select-content','[data-slot="select-item"][data-highlighted]', '[data-slot="select-item"][data-state="checked"] svg'],
      ['[data-slot="combobox-trigger"]','combobox-content','[data-slot="combobox-option"][data-selected="true"]', '[data-slot="combobox-option"][data-value-selected="true"] svg'],
      ['[data-slot="combobox-multiple-control"]','combobox-content','[data-slot="combobox-option"][data-selected="true"]', '[data-slot="combobox-option"][data-value-selected="true"] svg'],
      ['[data-slot="multi-select-trigger"]','multi-select-content','[data-slot="multi-select-option"][data-active="true"]', '[data-slot="multi-select-option"][aria-selected="true"] svg'],
    ]) await check(`O3·O5 ${trigger} 활성·가장자리 ${theme}`, async () => {
      await click(trigger); const padding = await edge(`[data-slot="${content}"]`); await key('ArrowDown',40);
      const style = await active(option); styles.push(style);
      assert.equal(style.outline, 'none');
      assert.ok(await ev(`${q(checked)} !== null`), '고른 값의 체크 유지');
      let focus;
      if (trigger.includes('combobox-trigger')) {
        await wait(`${q('[data-slot="combobox-content"] [data-slot="combobox-input"]')}.matches(':focus-visible')`);
        focus = await ev(`(() => { ${colorHelpers} const input=${q('[data-slot="combobox-content"] [data-slot="combobox-input"]')}, panel=${q('[data-slot="combobox-content"]')}, r=input.getBoundingClientRect(), p=panel.getBoundingClientRect(), s=getComputedStyle(input), outer=parseFloat(s.outlineOffset)+parseFloat(s.outlineWidth);
          return { style:s.outlineStyle, width:s.outlineWidth, color:s.outlineColor, contrast:contrast(rgb(s.outlineColor),rgb(getComputedStyle(panel).backgroundColor)), offset:s.outlineOffset, inside:r.left-outer >= p.left+panel.clientLeft && r.right+outer <= p.left+panel.clientLeft+panel.clientWidth && r.top-outer >= p.top+panel.clientTop && r.bottom+outer <= p.top+panel.clientTop+panel.clientHeight }; })()`);
        assert.equal(focus.style,'solid'); assert.equal(focus.width,'2px'); assert.equal(focus.offset,'-2px'); assert.ok(focus.contrast >= 3); assert.ok(focus.inside);
      }
      await browser.shot(`${content}-${styles.length}-${theme}`); await key('Escape',27); await wait(`!${q(`[data-slot="${content}"]`)}`);
      return { padding, style, focus };
    });
    await check(`O3 Select·Combobox 단일·다중·MultiSelect 계산 스타일 일치 ${theme}`, () => {
      assert.equal(styles.length,4); for (const style of styles) assert.deepEqual(style,styles[0]); return styles;
    });
    await check(`O4·O5 아이콘·체크·라디오·그룹·서브메뉴 글자 정렬 ${theme}`, async () => {
      await click('[data-probe="menu"]'); const padding=await edge('[data-slot="dropdown-menu-content"]');
      const text=await menuText('[data-slot="dropdown-menu-content"]'); assert.ok(text.length >= 5);
      assert.ok(Math.max(...text.map(t=>t.x))-Math.min(...text.map(t=>t.x)) <= 1,JSON.stringify(text));
      await click('[data-slot="dropdown-menu-sub-trigger"]'); const subPadding=await edge('[data-slot="dropdown-menu-sub-content"]');
      const subText=await menuText('[data-slot="dropdown-menu-sub-content"]'); assert.ok(Math.abs(subText[0].x-subText[1].x) <= 1);
      await browser.shot(`menu-${theme}`); await key('Escape',27); await key('Escape',27);
      return { padding,text,subPadding,subText };
    });
    await check(`메뉴 파괴적 항목 글자·아이콘 대비 4.5:1 (평소·하이라이트) ${theme}`, async () => {
      // 2026-11-22: 채움색(text-destructive)을 글자로 써서 다크 팝오버에서 2.73:1 이었다. 계산 색으로 잰다.
      await click('[data-probe="menu"]'); await edge('[data-slot="dropdown-menu-content"]');
      const item = '[data-slot="dropdown-menu-content"] [data-slot="dropdown-menu-item"]:has([data-slot="dropdown-menu-destructive-icon"])';
      const measure = () => ev(`(() => { ${colorHelpers}
        const item=${q(item)}, icon=item.querySelector('[data-slot="dropdown-menu-destructive-icon"]'), panel=${q('[data-slot="dropdown-menu-content"]')};
        const own=rgb(getComputedStyle(item).backgroundColor), bg=own[3] === 0 ? rgb(getComputedStyle(panel).backgroundColor) : own;
        const text=rgb(getComputedStyle(item).color), stroke=rgb(getComputedStyle(icon).stroke);
        return { highlighted:item.hasAttribute('data-highlighted'), text, stroke, bg, text_contrast:contrast(text,bg), icon_contrast:contrast(stroke,bg) }; })()`);
      const idle = await measure();
      await ev(`${q(item)}.focus()`); await wait(`${q(item)}.hasAttribute('data-highlighted')`);
      await sleep(250); // transition-colors 가 끝난 하이라이트 바탕을 잰다.
      const highlighted = await measure();
      for (const m of [idle, highlighted]) {
        assert.ok(m.text_contrast >= 4.5 && m.icon_contrast >= 4.5, JSON.stringify(m));
        assert.deepEqual(m.stroke, m.text, '아이콘은 글자와 같은 색');
      }
      assert.equal(idle.highlighted, false); assert.equal(highlighted.highlighted, true); assert.notDeepEqual(idle.bg, highlighted.bg);
      await key('Escape',27); return { idle, highlighted };
    });
    await check(`O4 아이콘 없는 메뉴 기존 여백 ${theme}`, async () => {
      await click('[data-probe="plain-menu"]'); await edge('[data-slot="dropdown-menu-content"]');
      const padding=await ev(`getComputedStyle(${q('[data-slot="dropdown-menu-item"]')}).paddingLeft`);
      assert.equal(padding,'8px'); await key('Escape',27); return { padding };
    });
    await check(`O5 범용 Popover 가장자리 ${theme}`, async () => {
      await click('[data-probe="popover"]'); const m=await edge('[data-slot="popover-content"]'); await key('Escape',27); return m;
    });
    await check(`O5·O6 DatePicker 가장자리·범위 의미색·실제 호버 ${theme}`, async () => {
      await click('button[aria-label="달력 열기"]'); const padding=await edge('[data-slot="popover-content"]');
      const range='[data-slot="calendar-day"][data-range-middle="true"]';
      await wait(`${q(range)} !== null`);
      const hover='button[data-slot="calendar-day"][data-day="2026-11-23"]';
      const point=await ev(`(() => { const r=${q(hover)}.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
      await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',...point}); await sleep(200);
      const m=await ev(`(() => { ${colorHelpers}
        const bg=getComputedStyle(${q(range)}).backgroundColor, hovered=getComputedStyle(${q(hover)}).backgroundColor,
          surface=getComputedStyle(${q('[data-slot="popover-content"]')}).backgroundColor,
          selected=getComputedStyle(document.documentElement).getPropertyValue('--bg-selected-row');
        return { range:rgb(bg),hover:rgb(hovered),selected:rgb(selected),surface:rgb(surface),contrast:contrast(rgb(bg),rgb(surface)),hoverContrast:contrast(rgb(hovered),rgb(surface)) };
      })()`);
      assert.deepEqual(m.range,m.selected); assert.notDeepEqual(m.range,m.hover);
      // 명시된 brand-50/975를 바꾸지 않는다. 개선 목표는 별도 결과로 정직하게 보고한다.
      m.improvementTarget=theme==='light'?1.18:1.12; m.improvementMet=m.contrast > m.improvementTarget;
      await browser.shot(`calendar-${theme}`); await key('Escape',27); return { padding,...m };
    });
    await check(`레이어 실행 중 콘솔 오류 없음 ${theme}`, () => { assert.deepEqual(browser.errors().filter(m=>!/Warning:|DevTools|favicon|preload/i.test(m)),[]); });
  }
} finally {
  writeFileSync(`${OUT}/results.json`,JSON.stringify(results,null,2)); browser.close();
}
const passed=results.filter(r=>r.pass).length;
console.log(`${results.length}개 검사, ${passed}개 통과`);
process.exitCode=passed===results.length?0:1;
