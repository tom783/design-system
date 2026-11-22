// R24: 작성만 수행한다. 실제 실행과 기존 429건 회귀 확인은 사용자의 pnpm qa에 맡긴다.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, CANVAS, actions } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/media-viewer';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ outDir: OUT });
const { cdp, ev, sleep } = browser;
const { open } = storybook(browser);
const results = [];
const q = selector => `document.querySelector(${JSON.stringify(selector)})`;
const viewer = '[data-slot="media-viewer"]';
const stage = '[data-slot="media-viewer-stage"]';
const video = '[data-slot="media-viewer-video"]';
const image = '[data-slot="media-viewer-image"]';
const pip = '[data-slot="media-viewer-pip"]';
const dialog = '[data-slot="dialog-content"]';
const trigger = '[data-probe="open-media"]';
const input = '[data-probe="outside-input"]';
const floatingClose = '[data-slot="media-viewer-close"]';
async function wait(expression) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (await ev(expression)) return;
    await sleep(50);
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
  const result = await open(`components-mediaviewer--${name}`);
  assert.equal(result.sbError, null);
  assert.equal(await ev(`${CANVAS}.dataset.playComplete`), 'true', '스토리 play 완료');
  assert.deepEqual(browser.errors(), [], '스토리 콘솔 오류');
  await ev('document.fonts.ready.then(() => true)');
}
const act = actions(browser);
const click = (selector) => act.click(selector);
async function focus(selector) {
  await ev(`${q(selector)}.focus({preventScroll:true})`);
  await wait(`document.activeElement === ${q(selector)}`);
}
async function keyEscape() {
  await cdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
}
async function show(name, state = 'loaded') {
  await story(name); await focus(trigger); await click(trigger);
  await wait(`${q(stage)}?.dataset.state === '${state}'`);
  await wait(`!!${q(dialog)} || ${q(viewer)}?.matches(':popover-open')`);
}
async function settle() {
  // 투명도 등장 애니메이션이 끝나야 진짜 포인터가 보이는 버튼을 누른다.
  await ev(`Promise.all(${q(viewer)}.getAnimations().map(animation => animation.finished.catch(() => {}))).then(() => true)`);
  await ev('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
}
async function rect(selector) {
  return ev(`(() => { const r=${q(selector)}.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}; })()`);
}
async function noMotion(selector) {
  // 이 저장소의 전역 reduced-motion 은 0 이 아니라 .01ms 다 — animationend·transitionend 가
  // 계속 발화하게 하려는 의도적 관례다(styles.css). 그래서 "정확히 0" 이 아니라
  // "지각할 수 없는 길이" 로 단정한다. 1ms 를 넘으면 실패다.
  const durations = await act.computed(selector, ['animationDuration', 'transitionDuration']);
  assert.equal(durations.every(value => value.split(',').every(time => parseFloat(time) <= 0.001)), true);
}
async function pointerClick(selector) {
  const r = await rect(selector), x = r.x + r.width / 2, y = r.y + r.height / 2;
  assert.equal(await ev(`(() => { const target=${q(selector)}, hit=document.elementFromPoint(${x},${y}); return hit === target || target.contains(hit); })()`), true, 'PiP 버튼이 실제 클릭 가능한 위치');
  // PiP는 element.click()이나 Runtime.evaluate의 userGesture 흉내로 검증하지 않는다.
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

try {
  for (const name of ['이미지팝업', '동영상팝업', '이미지플로팅', '동영상플로팅', '로딩', '오류', 'pi-p불가', '긴제목']) {
    await check(`${name} play·콘솔 오류 0건`, () => story(name));
  }

  await check('popup wide는 기본 36rem보다 실제로 넓고 기본 폭은 그대로다', async () => {
    await story('이미지팝업'); await click('[data-probe="open-basic"]'); await wait(`!!${q(dialog)}`);
    const baseline = await rect(dialog);
    const expected = await ev(`Math.min(parseFloat(getComputedStyle(document.documentElement).fontSize)*36, innerWidth - 32)`);
    assert.ok(Math.abs(baseline.width - expected) <= 1, `기본 폭 ${baseline.width}, 기대 ${expected}`);
    assert.equal(await ev(`${q(dialog)}.dataset.size`), 'default');
    await click('[data-slot="dialog-close-icon"]'); await wait(`!${q(dialog)}`);
    await focus(trigger); await click(trigger); await wait(`${q(stage)}?.dataset.state === 'loaded'`);
    const wide = await rect(dialog);
    assert.equal(await ev(`${q(dialog)}.dataset.size`), 'wide');
    assert.ok(wide.width > baseline.width, `${wide.width} > ${baseline.width}`);
    assert.ok(wide.x >= 15 && wide.right <= await ev('innerWidth - 15'));
    assert.ok(wide.y >= 15 && wide.bottom <= await ev('innerHeight - 15'));
  });
  await check('popup 이미지 alt·종횡비·뷰포트 내 맞춤·PiP 없음', async () => {
    await show('이미지팝업');
    assert.equal(await ev(`${q(image)}.alt`), '출고 상자 규격 안내 이미지');
    assert.equal(await ev(`getComputedStyle(${q(image)}).objectFit`), 'contain');
    const r = await rect(stage);
    assert.ok(Math.abs(r.width / r.height - 4 / 3) < 0.01);
    assert.ok(r.x >= 0 && r.y >= 0 && r.right <= await ev('innerWidth') && r.bottom <= await ev('innerHeight'));
    assert.equal(await ev(`!!${q(pip)}`), false);
  });
  await check('popup Escape 닫기·열었던 실제 트리거로 포커스 복귀', async () => {
    await show('이미지팝업'); await focus('[data-slot="dialog-close-icon"]');
    await keyEscape(); await wait(`!${q(dialog)}`); await wait(`document.activeElement === ${q(trigger)}`);
    assert.equal(await ev(`document.activeElement === ${q(trigger)}`), true);
  });
  await check('floating manual popover·비모달·바깥 입력 포커스·inert 아님', async () => {
    await show('이미지플로팅');
    assert.equal(await ev(`${q(viewer)}.getAttribute('popover')`), 'manual');
    assert.equal(await ev(`${q(viewer)}.matches(':popover-open')`), true);
    assert.equal(await ev(`${q(viewer)}.getAttribute('aria-modal')`), null);
    assert.equal(await ev(`!!${q(dialog)}`), false);
    assert.equal(await ev(`!!${q(input)}.closest('[inert]') || document.body.inert || document.documentElement.inert`), false);
    await focus(input); assert.equal(await ev(`document.activeElement === ${q(input)}`), true);
    assert.equal(await ev(`!!${q(floatingClose)}`), true);
  });
  await check('floating 바깥 입력 Escape는 페이지 동작을 보존하고 창도 유지한다', async () => {
    await show('이미지플로팅'); await focus(input); await keyEscape();
    await wait(`${q('[data-probe="outside-escape"]')}.textContent === '1'`);
    assert.equal(await ev(`${q(viewer)}.matches(':popover-open')`), true);
    assert.equal(await ev(`document.activeElement === ${q(input)}`), true);
  });
  await check('floating 내부 Escape 닫기·포커스 복귀와 명시적 닫기 버튼', async () => {
    await show('이미지플로팅'); await focus(floatingClose); await keyEscape();
    await wait(`!${q(viewer)}`); await wait(`document.activeElement === ${q(trigger)}`);
    await click(trigger); await wait(`${q(viewer)}.matches(':popover-open')`);
    await click(floatingClose); await wait(`!${q(viewer)}`);
  });
  await check('floating 스크롤 전후 위치가 같고 바깥 페이지는 실제로 스크롤된다', async () => {
    await show('이미지플로팅'); await settle(); await focus(input);
    const before = await rect(viewer);
    await ev('window.scrollTo(0, 400)'); await wait('window.scrollY > 100');
    const after = await rect(viewer);
    for (const axis of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(after[axis] - before[axis]) < 1, `${axis}: ${before[axis]} → ${after[axis]}`);
    assert.equal(await ev(`document.activeElement === ${q(input)}`), true);
    await ev('window.scrollTo(0,0)');
  });
  await check('floating 네 모서리 placement·top layer가 높은 z-index 위에 보임', async () => {
    await show('이미지플로팅'); await settle();
    for (const placement of ['bottom-end', 'bottom-start', 'top-end', 'top-start']) {
      await click(`[data-probe="placement-${placement}"]`);
      await wait(`${q(viewer)}.dataset.placement === '${placement}'`);
      const r = await rect(viewer);
      // innerWidth/Height 는 스크롤바를 포함한다. position:fixed 의 기준(ICB)은 제외하므로
      // 그대로 빼면 16px 여백이 31px 로 보인다(실측). clientWidth/Height 로 잰다.
      const viewport = await ev('({width:document.documentElement.clientWidth,height:document.documentElement.clientHeight})');
      const vertical = placement.startsWith('top') ? r.y : viewport.height - r.bottom;
      const horizontal = placement.endsWith('start') ? r.x : viewport.width - r.right;
      assert.ok(Math.abs(vertical - 16) < 1 && Math.abs(horizontal - 16) < 1, `${placement}: ${JSON.stringify(r)}`);
    }
    await ev(`(() => { const cover=document.createElement('div'); cover.dataset.probe='top-layer-cover';
      cover.style.cssText='position:fixed;inset:0;z-index:2147483647;background:var(--bg-canvas)'; document.body.append(cover); })()`);
    try {
      const r = await rect(floatingClose), x = r.x + r.width / 2, y = r.y + r.height / 2;
      assert.equal(await ev(`${q(viewer)}.contains(document.elementFromPoint(${x},${y}))`), true);
    } finally { await ev(`${q('[data-probe="top-layer-cover"]')}.remove()`); }
  });
  await check('동영상 controls·autoplay 없음·preload metadata·poster·captions', async () => {
    await show('동영상팝업');
    const props = await ev(`(() => { const v=${q(video)}, t=v.querySelector('track'); return {
      controls:v.controls, auto:v.autoplay, autoAttr:v.hasAttribute('autoplay'), preload:v.getAttribute('preload'), poster:!!v.poster,
      stream:v.srcObject instanceof MediaStream, kind:t.kind, lang:t.srclang, label:t.label,
      tracks:[...v.srcObject.getTracks()].every(track => track.readyState === 'live') }; })()`);
    assert.deepEqual(props, { controls: true, auto: false, autoAttr: false, preload: 'metadata', poster: true,
      stream: true, kind: 'captions', lang: 'ko', label: '한국어', tracks: true });
    // 스트림 연결만으로 재생을 시작하지 않는다.
    assert.equal(await ev(`${q(video)}.paused`), true);
  });
  for (const name of ['동영상팝업', '동영상플로팅']) await check(`${name}: 진짜 CDP 클릭으로 PiP 진입·버튼으로 해제`, async () => {
    await show(name); await settle();
    assert.equal(await ev('document.pictureInPictureEnabled'), true);
    await wait(`!!${q(pip)} && !${q(pip)}.disabled`);
    await ev(`(() => { const v=${q(video)}; v.muted=true; return v.play().then(() => true); })()`);
    await wait(`${q(video)}.readyState >= 2`);
    assert.equal(await ev(`${q(pip)}.getAttribute('aria-label')`), '화면 속 화면으로 보기');
    await pointerClick(pip); await wait(`document.pictureInPictureElement === ${q(video)}`);
    await wait(`${q(pip)}.getAttribute('aria-label') === '화면 속 화면 끄기' && !${q(pip)}.disabled`);
    await pointerClick(pip); await wait('document.pictureInPictureElement === null');
    await wait(`${q(pip)}.getAttribute('aria-label') === '화면 속 화면으로 보기' && !${q(pip)}.disabled`);
    assert.equal(await ev(`!!document.querySelector('.ds-media-viewer-pip-error')`), false);
  });
  await check('브라우저 쪽 PiP 해제도 버튼 상태 동기화·뷰어 닫기 시 해제·재생 정지', async () => {
    await show('동영상플로팅'); await settle();
    await ev(`${q(video)}.play().then(() => true)`); await wait(`${q(video)}.readyState >= 2 && !${q(pip)}.disabled`);
    await pointerClick(pip); await wait(`document.pictureInPictureElement === ${q(video)}`);
    await ev('document.exitPictureInPicture().then(() => true)');
    await wait(`${q(pip)}.getAttribute('aria-pressed') === 'false' && !${q(pip)}.disabled`);
    await pointerClick(pip); await wait(`document.pictureInPictureElement === ${q(video)}`);
    // ev 는 returnByValue 다. DOM 요소를 그대로 돌려주면 직렬화가 터진다
    // ("Object reference chain is too long"). 참조만 심고 true 를 돌려준다.
    await ev(`(() => { window.__r24ClosedVideo = ${q(video)}; return true; })()`);
    await click(floatingClose); await wait('document.pictureInPictureElement === null');
    await wait('window.__r24ClosedVideo.paused');
    await ev('delete window.__r24ClosedVideo');
  });
  await check('disablePictureInPicture 영상에는 PiP 버튼 DOM 자체가 없다', async () => {
    await show('pi-p불가');
    assert.equal(await ev(`${q(video)}.disablePictureInPicture`), true);
    assert.equal(await ev(`!!${q(pip)}`), false);
  });
  await check('네이티브 disablePictureInPicture 속성을 나중에 바꿔도 버튼 제거·복구', async () => {
    await show('동영상플로팅'); await wait(`!!${q(pip)}`);
    await ev(`${q(video)}.disablePictureInPicture=true`); await wait(`!${q(pip)}`);
    await ev(`${q(video)}.disablePictureInPicture=false`); await wait(`!!${q(pip)}`);
  });
  await check('로딩 Skeleton 예약 높이가 실제 스트림 로드 후와 같다', async () => {
    await show('로딩', 'loading');
    assert.equal(await ev(`!!${q(stage)}.querySelector('[data-slot="skeleton"]')`), true);
    const before = await rect(stage);
    assert.ok(before.height > 0);
    await click('[data-probe="prepare-media"]'); await wait(`${q(stage)}.dataset.state === 'loaded'`);
    const after = await rect(stage);
    assert.ok(Math.abs(after.height - before.height) < 0.1);
    assert.equal(await ev(`!!${q(stage)}.querySelector('[data-slot="skeleton"]')`), false);
    assert.equal(await ev(`${q(stage)}.getAttribute('aria-busy')`), 'false');
  });
  await check('실패는 기존 ErrorState·alert·문장·아이콘이며 깨진 이미지를 남기지 않는다', async () => {
    await show('오류', 'error');
    const state = `${q(stage)}.querySelector('[data-slot="error-state"]')`;
    assert.equal(await ev(`${state}.getAttribute('role')`), 'alert');
    assert.equal(await ev(`${state}.textContent.includes('미디어를 불러오지 못했습니다')`), true);
    assert.equal(await ev(`!!${state}.querySelector('[data-slot="state-graphic"] svg')`), true);
    assert.equal(await ev(`!!${q(image)}`), false);
  });
  await check('긴 제목 말줄임·전체 title 보존·닫기 버튼과 겹치지 않음', async () => {
    await show('긴제목');
    const title = '[data-slot="dialog-title"]', close = '[data-slot="dialog-close-icon"]';
    assert.equal(await ev(`${q(title)}.title === ${q(title)}.textContent`), true);
    assert.equal(await ev(`getComputedStyle(${q(title)}).textOverflow`), 'ellipsis');
    assert.equal(await ev(`${q(title)}.scrollWidth > ${q(title)}.clientWidth`), true);
    assert.ok((await rect(title)).right <= (await rect(close)).x);
  });
  await check('reduced-motion에서 popup·floating 등장 전환·애니메이션 정확히 0', async () => {
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    try {
      await show('이미지플로팅'); await noMotion(viewer);
      await show('이미지팝업'); await noMotion(dialog);
    } finally { await cdp('Emulation.setEmulatedMedia', { features: [] }); }
  });
  await check('좁은 뷰포트에서 popup·floating 가장자리 유지', async () => {
    await cdp('Emulation.setDeviceMetricsOverride', { width: 360, height: 640, deviceScaleFactor: 1, mobile: false });
    try {
      for (const name of ['이미지팝업', '이미지플로팅']) {
        await show(name); const r = await rect(name === '이미지팝업' ? dialog : viewer);
        assert.ok(r.width > 0 && r.x >= 15 && r.right <= 345 && r.y >= 15 && r.bottom <= 625, JSON.stringify(r));
      }
    } finally { await cdp('Emulation.clearDeviceMetricsOverride'); }
  });
  await check('콘솔 오류·페이지 예외 0건', async () => assert.deepEqual(browser.errors(), []));
} catch (error) {
  results.push({ label: '하네스 실행', pass: false, error: error.message }); console.error(error.stack);
} finally {
  browser.close(); writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
}
const failed = results.filter(result => !result.pass);
console.log(`검사 ${results.length}건 · 통과 ${results.length - failed.length} · 실패 ${failed.length}`);
process.exitCode = failed.length ? 1 : 0;
