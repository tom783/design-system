// R37: 작성 전용. 실행은 pnpm qa에 맡긴다. 파일 선택 UI를 띄우지 않고 실제 input에 CDP로 주입한다.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { launchBrowser, storybook, CANVAS } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/file-upload';
mkdirSync(OUT, { recursive: true });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==', 'base64');
const imagePath = resolve(OUT, '상품-이미지.png');
const longName = '이름이-아주-길어서-좁은-목록에서-반드시-말줄임되어야-하는-상품-대표-이미지-2026.png';
const longPath = resolve(OUT, longName);
writeFileSync(imagePath, png); writeFileSync(longPath, png);
const browser = await launchBrowser({ port: 9480, outDir: OUT });
const { cdp, ev, sleep } = browser;
const { open } = storybook(browser);
const results = [], measurements = [];
const q = selector => `${CANVAS}.querySelector(${JSON.stringify(selector)})`;
const all = selector => `${CANVAS}.querySelectorAll(${JSON.stringify(selector)})`;
const slot = name => `[data-slot="file-upload-${name}"]`;
async function wait(expression) {
  const deadline = Date.now() + 6000;
  while (Date.now() < deadline) { if (await ev(expression)) return; await sleep(25); }
  throw new Error(`조건 대기 실패: ${expression}`);
}
async function check(label, run) {
  try { await run(); results.push({ label, pass: true }); console.log(`✓ ${label}`); }
  catch (error) { results.push({ label, pass: false, error: error.message }); console.error(`✗ ${label}: ${error.message}`); await browser.shot(`failure-${results.length}`); }
}
async function story(name, theme = 'light') {
  assert.deepEqual(browser.errors(), [], '이전 경로 콘솔 오류');
  const result = await open(`components-fileupload--${name.toLowerCase()}`, { waitPlay: false, extra: `&globals=theme:${theme}` });
  assert.equal(result.sbError, null); await wait(`!!${q(slot('input'))}`);
  await ev('document.fonts.ready.then(() => true)');
}
async function inject(paths) {
  const { root } = await cdp('DOM.getDocument');
  const { nodeId } = await cdp('DOM.querySelector', { nodeId: root.nodeId, selector: slot('input') });
  await cdp('DOM.setFileInputFiles', { nodeId, files: paths });
}
async function drop(files) {
  await ev(`(() => { const dt = new DataTransfer();
    for (const f of ${JSON.stringify(files)}) dt.items.add(new File([new Uint8Array(f.size ?? 20)], f.name, {type:f.type ?? ''}));
    ${q(slot('dropzone'))}.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt})); return true; })()`);
}
async function click(selector) { await ev(`${q(selector)}.click()`); }
async function key(key, code, number) {
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: number, ...(key === 'Enter' ? { text: '\r' } : {}) });
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: number });
}
async function expectText(selector, text) { await wait(`${q(selector)}?.textContent.includes(${JSON.stringify(text)})`); }
async function focusTrigger() { await ev(`${q(slot('trigger'))}.focus()`); }
const count = n => wait(`${all(slot('item'))}.length === ${n}`);

try {
  // File로 만든 미리보기만 센다. Storybook 자체 Blob은 이 컴포넌트의 수명 검사 대상이 아니다.
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    window.__fileURLs = {created:[],revoked:[]};
    URL.createObjectURL = file => { const url=create(file); if(file instanceof File) window.__fileURLs.created.push(url); return url; };
    URL.revokeObjectURL = url => { if(window.__fileURLs.created.includes(url)) window.__fileURLs.revoked.push(url); revoke(url); };
  })();` });
  await check('CDP 파일 주입·목록·미리보기 비율·같은 파일 재선택', async () => {
    await story('거절'); await inject([imagePath]); await count(1);
    await wait(`${q('[data-slot="thumbnail-image"]')}?.getAttribute('src')?.startsWith('blob:')`);
    await wait(`${q('[data-slot="thumbnail"]')}?.dataset.state === 'loaded'`);
    assert.equal(await ev(`getComputedStyle(${q('[data-slot="thumbnail"]')}).aspectRatio`), '1 / 1');
    assert.equal(await ev(`${q(slot('input'))}.value`), '', '같은 파일의 change를 다시 받을 수 있게 초기화');
    await inject([imagePath]); await count(2);
    assert.equal(await ev(`${all(slot('name'))}.length`), 2, '동명이 파일은 각각 유지');
  });
  await check('긴 이름 말줄임·title 전체 이름·크기·고정폭 숫자', async () => {
    await story('거절');
    await ev(`${q('[data-slot="file-upload"]')}.style.width='260px'`);
    await inject([longPath]); await count(1);
    const name = await ev(`(() => { const n=${q(slot('name'))}; const s=getComputedStyle(n); return {name:n.textContent,title:n.title,ellipsis:s.textOverflow,overflow:s.overflow,nowrap:s.whiteSpace,truncated:n.scrollWidth>n.clientWidth}; })()`);
    assert.deepEqual(name, { name: longName, title: longName, ellipsis: 'ellipsis', overflow: 'hidden', nowrap: 'nowrap', truncated: true });
    assert.equal(await ev(`${q(slot('size'))}.textContent`), `${png.length}B`);
    assert.match(await ev(`getComputedStyle(${q(slot('size'))}).fontVariantNumeric`), /tabular-nums/);
    await drop([{ name: '큰-이미지.png', type: 'image/png', size: 1_200_000 }]); await count(2);
    assert.equal(await ev(`[...${all(slot('size'))}].at(-1).textContent`), '1.2MB');
  });
  await check('Enter·Space·클릭 모두 실제 숨긴 input의 click으로 연결', async () => {
    await story('거절'); await cdp('Page.setInterceptFileChooserDialog', { enabled: true });
    try {
      await ev(`(() => { window.__fileClicks=0; const input=${q(slot('input'))}; const click=input.click.bind(input); input.click=()=>{window.__fileClicks++;click();}; })()`);
      await focusTrigger(); await key('Enter', 'Enter', 13); await wait('window.__fileClicks === 1');
      await focusTrigger(); await key(' ', 'Space', 32); await wait('window.__fileClicks === 2');
      await click(slot('trigger')); await wait('window.__fileClicks === 3');
      // 좌표 이벤트 대신 실제 hit-test가 가리키는 요소를 눌러 빈 드롭 영역의 선택 경로를 확인한다.
      await ev(`(() => { const r=${q(slot('dropzone'))}.getBoundingClientRect(); document.elementFromPoint(r.left+4,r.bottom-4).click(); })()`);
      await wait('window.__fileClicks === 4');
    } finally { await cdp('Page.setInterceptFileChooserDialog', { enabled: false }); }
  });
  await check('대표 이미지 안쪽 바꾸기는 한 번만 열고 삭제는 선택 창을 열지 않는다', async () => {
    await story('대표이미지');
    await ev(`window.__fileClicks=0; ${q(slot('input'))}.click=()=>{window.__fileClicks++;}`);
    await click(slot('trigger'));
    assert.equal(await ev('window.__fileClicks'), 1);
    await click('button[aria-label="상품-대표이미지.png 삭제"]');
    assert.equal(await ev('window.__fileClicks'), 1);
    assert.equal(await ev(`document.activeElement === ${q(slot('trigger'))}`), true);
    assert.equal(await ev(`${q(slot('dropzone'))}.hasAttribute('tabindex')`), false);
  });
  await check('드래그 활성 경계·바탕·중첩 leave·드롭으로 추가', async () => {
    await story('거절');
    const colors = await ev(`(() => { const n=${q(slot('dropzone'))}; const before={border:getComputedStyle(n).borderColor,background:getComputedStyle(n).backgroundColor}; const dt=new DataTransfer(); dt.items.add(new File(['x'],'상품.png',{type:'image/png'})); window.__fileDrag=dt; n.dispatchEvent(new DragEvent('dragenter',{bubbles:true,cancelable:true,dataTransfer:dt})); return before; })()`);
    await wait(`${q(slot('dropzone'))}.dataset.dragging === 'true'`);
    const active = await ev(`({border:getComputedStyle(${q(slot('dropzone'))}).borderColor,background:getComputedStyle(${q(slot('dropzone'))}).backgroundColor})`);
    assert.notEqual(active.border, colors.border); assert.notEqual(active.background, colors.background);
    await ev(`(() => { const n=${q(slot('dropzone'))}; for(const type of ['dragenter','dragleave']) n.dispatchEvent(new DragEvent(type,{bubbles:true,cancelable:true,dataTransfer:window.__fileDrag})); })()`);
    assert.equal(await ev(`${q(slot('dropzone'))}.dataset.dragging`), 'true');
    await ev(`${q(slot('dropzone'))}.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:window.__fileDrag}))`);
    await count(1); assert.equal(await ev(`${q(slot('dropzone'))}.hasAttribute('data-dragging')`), false);
  });
  await check('형식·크기·개수 한국어 거절과 유효한 파일만 유지', async () => {
    await story('거절');
    await drop([{name:'잘못된.xlsx'}, {name:'너무큼.png',type:'image/png',size:5_000_001}, ...Array.from({length:4},(_,i)=>({name:`상품${i}.png`,type:'image/png'}))]);
    await count(3);
    for(const reason of ['JPG·PNG만 올릴 수 있습니다','5MB 이하만 올릴 수 있습니다','최대 3개까지 올릴 수 있습니다']) await expectText(slot('error'), reason);
    assert.equal(await ev(`${q(slot('input'))}.getAttribute('aria-invalid')`), 'true');
    assert.equal(await ev(`${q(slot('error'))}.querySelectorAll('li').length`), 3);
  });
  await check('삭제 접근명·선택 버튼 포커스 복귀·polite 추가/삭제 알림', async () => {
    await story('거절'); await inject([imagePath]); await count(1);
    await expectText(slot('announcement'), '1개 파일 추가');
    const remove = 'button[aria-label="상품-이미지.png 삭제"]';
    await ev(`${q(remove)}.focus()`); await key('Enter', 'Enter', 13); await count(0);
    assert.equal(await ev(`document.activeElement === ${q(slot('trigger'))}`), true);
    await expectText(slot('announcement'), '상품-이미지.png 삭제');
    assert.deepEqual(await ev(`({live:${q(slot('announcement'))}.getAttribute('aria-live'),atomic:${q(slot('announcement'))}.getAttribute('aria-atomic')})`), {live:'polite',atomic:'true'});
  });
  await check('대표 이미지 선택·바꾸기·삭제·URL 교체/제거 해제', async () => {
    await story('대표이미지'); await wait('window.__fileURLs.created.length === 1');
    await inject([imagePath]);
    await expectText(slot('trigger'), '바꾸기');
    await wait('window.__fileURLs.created.length === 2 && window.__fileURLs.revoked.length === 1');
    assert.equal(await ev(`${all(slot('list'))}.length`), 0);
    assert.equal(await ev(`getComputedStyle(${q('[data-slot="thumbnail"]')}).aspectRatio`), '16 / 9');
    await inject([longPath]); await expectText(slot('name'), longName);
    await wait('window.__fileURLs.created.length === 3 && window.__fileURLs.revoked.length === 2');
    await click(`button[aria-label="${longName} 삭제"]`);
    await wait('window.__fileURLs.revoked.length === 3');
    assert.deepEqual(await ev('window.__fileURLs.created.slice().sort()'), await ev('window.__fileURLs.revoked.slice().sort()'));
    await expectText(slot('trigger'), '파일 선택');
  });
  await check('동일 id 외부 File 교체·언마운트에서도 URL 수 일치', async () => {
    await story('외부변경'); await inject([imagePath]); await wait('window.__fileURLs.created.length === 1');
    await ev(`[...${all('button')}].find(n=>n.textContent==='외부 파일 교체').click()`);
    await wait('window.__fileURLs.created.length === 2 && window.__fileURLs.revoked.length === 1');
    await ev(`[...${all('button')}].find(n=>n.textContent==='입력 닫기').click()`);
    await wait(`!${q('[data-slot="file-upload"]')}`);
    await wait('window.__fileURLs.created.length === window.__fileURLs.revoked.length');
    assert.deepEqual(await ev('window.__fileURLs.created.slice().sort()'), await ev('window.__fileURLs.revoked.slice().sort()'));
  });
  await check('앱 진행률 흉내·완료 상태와 실패 항목의 아이콘/문장', async () => {
    await story('사용법'); await inject([imagePath]); await count(1);
    await wait(`!!${q('[role="progressbar"]')}`);
    const progress = await ev(`${q('[role="progressbar"]')}.getAttribute('aria-valuenow')`);
    assert.ok(Number(progress) >= 0 && Number(progress) <= 100);
    await expectText(slot('status'), '업로드 완료');
    await story('업로드실패'); await expectText(slot('status'), '업로드 실패');
    await expectText(slot('item-error'), '서버에 연결하지 못했습니다');
    assert.equal(await ev(`${q(slot('item-error'))}.querySelectorAll('svg').length`), 1);
  });
  await check('채운 스토리는 실제 PNG를 표시하고 Primary는 빈 상태를 유지한다', async () => {
    for (const [name, expected] of [['여러파일', 3], ['대표이미지', 1], ['업로드실패', 1]]) {
      await story(name);
      await wait(`${all('[data-slot="thumbnail-image"]')}.length === ${expected} && [...${all('[data-slot="thumbnail-image"]')}].every(img=>img.naturalWidth>0)`);
      if (name === '여러파일') {
        for (const text of ['업로드 완료', '업로드 중', '업로드 실패']) await expectText(slot('list'), text);
      }
    }
    await story('사용법'); await count(0);
    assert.equal(await ev(`${all('[data-slot="thumbnail-image"]')}.length`), 0);
  });
  await check('업로드 진행률은 파일명을 한 번만 보여주고 접근성 이름과 퍼센트를 보존한다', async () => {
    await story('여러파일'); await count(3);
    const item = `${q('[role="progressbar"]')}.closest('[data-slot="file-upload-item"]')`;
    assert.equal(await ev(`(() => { const item=${item}, name=item.querySelector('[data-slot="file-upload-name"]').textContent; return item.innerText.split(name).length-1; })()`), 1);
    await expectText('[data-slot="progress-percent"]', '42%');
    const { nodes } = await cdp('Accessibility.getFullAXTree');
    const progress = nodes.find(node => node.role?.value === 'progressbar');
    assert.ok(progress?.name?.value.includes('상품-상세컷.png'), '실제 접근성 트리의 진행 막대 이름에 파일명이 있어야 한다');
  });
  await check('Field 오류 경계는 드롭존만 위험색이며 버튼은 기본 경계색을 유지한다', async () => {
    for (const theme of ['light', 'dark']) {
      await story('Field오류', theme);
      await wait(`document.documentElement.dataset.theme === '${theme}'`);
      for (const [part, token] of [['dropzone', '--status-danger-fg'], ['trigger', '--border-default']]) {
        await wait(`(() => { const n=${q(slot(part))}, probe=document.createElement('span'); probe.style.borderColor='var(${token})'; n.append(probe); const same=getComputedStyle(n).borderColor===getComputedStyle(probe).borderColor; probe.remove(); return same; })()`);
      }
      assert.equal(await ev(`${q(slot('trigger'))}.getAttribute('aria-invalid')`), 'true');
    }
  });
  await check('대표 미리보기 최대 320px·16:9·버튼 화면 안·420px 세로 배치와 넘침 없음', async () => {
    try {
      for (const theme of ['light', 'dark']) for (const width of [900, 420]) {
        await cdp('Emulation.setDeviceMetricsOverride', { width, height: 640, deviceScaleFactor: 1, mobile: false });
        await story('대표이미지', theme);
        await inject([longPath]);
        await wait(`${q('[data-slot="thumbnail-image"]')}?.naturalWidth > 0`);
        const layout = await ev(`(() => {
          const preview=${q('[data-slot="thumbnail"]')}.getBoundingClientRect(), summary=${q('.ds-file-upload-summary')}.getBoundingClientRect();
          return {width:preview.width,ratio:preview.width/preview.height,overflow:document.documentElement.scrollWidth>innerWidth,
            beside:summary.left>=preview.right,below:summary.top>=preview.bottom,
            buttons:[...${all(`${slot('dropzone')} button`)}].map(button=>{const r=button.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;})};
        })()`);
        assert.ok(layout.width > 0 && layout.width <= 320);
        assert.ok(Math.abs(layout.ratio - 16 / 9) < 0.01);
        assert.equal(layout.overflow, false);
        assert.deepEqual(layout.buttons, [true, true]);
        assert.equal(width === 900 ? layout.beside : layout.below, true);
        await browser.shot(`cover-${theme}-${width}`);
      }
    } finally { await cdp('Emulation.clearDeviceMetricsOverride'); }
  });
  await check('비활성은 선택·드롭·삭제 차단', async () => {
    await story('비활성'); await count(1);
    assert.equal(await ev(`${q(slot('input'))}.disabled && [...${all('button')}].every(n=>n.disabled)`), true);
    await drop([{name:'추가.png',type:'image/png'}]); await count(1);
    await click('button[aria-label="일괄등록.xlsx 삭제"]'); await count(1);
    await ev(`window.__fileClicks=0; ${q(slot('input'))}.click=()=>{window.__fileClicks++;}`);
    await click(slot('dropzone')); await click(slot('trigger'));
    assert.equal(await ev('window.__fileClicks'), 0);
  });
  await check('Field label·설명·오류 ARIA 연결과 오류 자리 공유', async () => {
    await story('Field안');
    assert.equal(await ev(`${q(slot('input'))}.getAttribute('aria-required')`), 'true');
    const before = await ev(`${q('[data-slot="field-error"]')}.getBoundingClientRect().height`);
    assert.equal(before, 20);
    await drop([{name:'잘못된.png',type:'image/png'}]); await expectText('[data-slot="field-error"]', 'XLSX만 올릴 수 있습니다');
    const connections = await ev(`(() => { const input=${q(slot('input'))}, button=${q(slot('trigger'))}, label=${q('[data-slot="field-label"]')}, error=${q('[data-slot="field-error"]')}; return {for:label.htmlFor,input:input.id,labelled:button.getAttribute('aria-labelledby').split(' ').includes(label.id),invalid:input.getAttribute('aria-invalid'),inputError:input.getAttribute('aria-describedby').split(' ')[0]===error.id,buttonError:button.getAttribute('aria-describedby').split(' ')[0]===error.id,description:input.getAttribute('aria-describedby').split(' ').some(id=>document.getElementById(id)?.dataset.slot==='field-description'),ownErrors:${all(slot('errors'))}.length}; })()`);
    assert.equal(connections.for, connections.input);
    assert.deepEqual({...connections, for:null,input:null}, {for:null,input:null,labelled:true,invalid:'true',inputError:true,buttonError:true,description:true,ownErrors:0});
    // 거절 자리 판단 재현: 폭별 실제 높이·항목별 배치와 비교할 문구 조판 폭을 기록한다.
    for(const width of [280,480]) {
      await ev(`${q('[data-slot="field"]')}.style.width='${width}px'`);
      measurements.push(await ev(`(() => { const e=${q('[data-slot="field-error"]')}; return {width:${width},reserved:${before},errorHeight:e.getBoundingClientRect().height,text:e.textContent}; })()`));
    }
    await story('Field오류'); await drop([{name:'잘못된.xlsx'}]);
    await expectText('[data-slot="field-error"]', '첨부 권한이 없습니다');
    await expectText(slot('announcement'), 'PNG만 올릴 수 있습니다');
    assert.equal(await ev(`${all('[data-slot="field-error"] [data-slot="file-upload-error"]')}.length`), 0);
  });
  await check('다크에서 실제 의미 토큰·오류·좁은 폭 가로 넘침 없음', async () => {
    await story('거절','dark'); await drop([{name:'거절.xlsx'}]);
    await wait(`document.documentElement.dataset.theme === 'dark'`);
    assert.equal(await ev(`(() => { const n=${q(slot('dropzone'))}, p=document.createElement('span'); p.style.background='var(--bg-surface)'; n.append(p); const same=getComputedStyle(n).backgroundColor===getComputedStyle(p).backgroundColor; p.remove(); return same; })()`), true);
    await cdp('Emulation.setDeviceMetricsOverride',{width:320,height:900,deviceScaleFactor:1,mobile:false});
    assert.equal(await ev('document.documentElement.scrollWidth > innerWidth'), false);
    await browser.shot('dark-narrow'); await cdp('Emulation.clearDeviceMetricsOverride');
  });
  await check('전 경로 콘솔 오류 0건', async () => assert.deepEqual(browser.errors(), []));
} finally {
  writeFileSync(`${OUT}/results.json`, JSON.stringify({results,measurements,errors:browser.errors()},null,2));
  browser.close();
}
const failed = results.filter(result=>!result.pass).length;
console.log(`\n${results.length}건 검사 · ${results.length-failed}건 통과 · ${failed}건 실패`);
if(failed) process.exitCode=1;
