// R25: 작성만 수행한다. 브라우저 실행과 기존 457건 회귀 확인은 사용자 pnpm qa에서 한다.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, CANVAS } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/carousel';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ port: 9475, outDir: OUT });
const { cdp, ev, sleep } = browser;
const { open } = storybook(browser);
const results = [];
const q = selector => `${CANVAS}.querySelector(${JSON.stringify(selector)})`;
const all = selector => `${CANVAS}.querySelectorAll(${JSON.stringify(selector)})`;
const root = '[data-slot="carousel"]';
const track = '[data-slot="carousel-track"]';
const slide = '[data-slot="carousel-slide"]';
const previous = '[data-slot="carousel-previous"]';
const next = '[data-slot="carousel-next"]';
const dot = '[data-slot="carousel-dot"]';
const pause = '[data-slot="carousel-pause"]';
const playing = `${q(root)}.dataset.playing === 'true'`;
const current = `${q(root)}.dataset.index`;
const manual = `${q(root)}.dataset.userStopped === 'true'`;
const interval = 1200; // 자동재생 스토리와 같은 간격. 진행은 고정 sleep 대신 조건 대기한다.

async function wait(expression, timeout = 6000) {
  const deadline = Date.now() + timeout;
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
async function outsidePointer() {
  const point = await ev('({x: document.documentElement.clientWidth - 1, y: innerHeight - 1})');
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
}
async function story(name = '기본') {
  assert.deepEqual(browser.errors(), [], '직전 스토리 콘솔 오류');
  const result = await open(`components-carousel--${name}`);
  assert.equal(result.sbError, null);
  assert.equal(await ev(`${CANVAS}.dataset.playComplete`), 'true');
  await outsidePointer();
  await wait(`!!${q(track)}`);
  await ev('document.fonts.ready.then(() => true)');
  assert.deepEqual(browser.errors(), [], '스토리 콘솔 오류');
}
async function click(selector) { await ev(`${q(selector)}.click()`); }
async function focus(selector) { await ev(`${q(selector)}.focus()`); await wait(`document.activeElement === ${q(selector)}`); }
async function key(key, code) {
  // 화살표의 네이티브 스크롤은 keydown 동안 진행된다. Enter만 text를 포함한다.
  await cdp('Input.dispatchKeyEvent', key === 'Enter'
    ? { type: 'keyDown', key, code: key, windowsVirtualKeyCode: code, text: '\r' }
    : { type: 'rawKeyDown', key, code: key, windowsVirtualKeyCode: code });
  await ev('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))');
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: code });
}
async function snapped(index) {
  await wait(`${current} === '${index}' && Math.abs(${q(track)}.scrollLeft - ${q(track)}.clientWidth * ${index}) < 1`);
}
async function auto() { await story('자동재생'); await wait(playing); }
async function stableFor(duration = interval * 1.4) {
  // 정지를 확인하려면 간격보다 긴 시간 내내 인덱스와 실제 스크롤이 모두 같아야 한다.
  // 고정 sleep 뒤 한 번만 읽으면 중간 진행·되돌림을 놓치므로 매 폴링에서 단언한다.
  const before = await ev(`({index: ${current}, left: ${q(track)}.scrollLeft})`);
  const deadline = Date.now() + duration;
  while (Date.now() < deadline) {
    const value = await ev(`({index: ${current}, left: ${q(track)}.scrollLeft})`);
    assert.equal(value.index, before.index);
    assert.ok(Math.abs(value.left - before.left) < 1, `정지 중 스크롤: ${before.left} → ${value.left}`);
    await sleep(25);
  }
}
async function permanent() {
  await wait(manual);
  await outsidePointer(); await focus('[data-probe="after"]');
  assert.equal(await ev(playing), false);
  assert.equal(await ev(`${q(pause)}.disabled`), true);
  assert.equal(await ev(`${q(track)}.getAttribute('aria-live')`), 'polite');
  assert.equal(await ev(`${q(pause)}.getAttribute('aria-pressed')`), 'true');
  await stableFor();
}

try {
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  for (const name of ['기본', '자동재생', '점없음', '화살표없음', '슬라이드하나', '슬라이드안에링크', 'media-viewer조합']) {
    await check(`${name}: 렌더·play·콘솔 오류 0건`, () => story(name));
  }
  await check('트랙·슬라이드 ARIA와 네이티브 flex·scroll-snap 구조', async () => {
    await story();
    assert.deepEqual(await ev(`(() => { const n=${q(track)}, s=getComputedStyle(n); return {
      role:n.getAttribute('role'), description:n.getAttribute('aria-roledescription'), label:n.getAttribute('aria-label'),
      tabIndex:n.tabIndex, display:s.display, overflow:s.overflowX, snap:s.scrollSnapType, behavior:s.scrollBehavior }; })()`),
    { role: 'group', description: '캐러셀', label: '운영 안내 배너', tabIndex: 0, display: 'flex', overflow: 'auto', snap: 'x mandatory', behavior: 'smooth' });
    const slides = await ev(`Array.from(${all(slide)}, n => ({ role:n.getAttribute('role'), description:n.getAttribute('aria-roledescription'),
      label:n.getAttribute('aria-label'), tabIndex:n.hasAttribute('tabindex'), basis:getComputedStyle(n).flexBasis, align:getComputedStyle(n).scrollSnapAlign }))`);
    assert.equal(slides.length, 3);
    slides.forEach((value, index) => assert.deepEqual(value, { role: 'group', description: '슬라이드', label: `${index + 1}번째, 총 3개`, tabIndex: false, basis: '100%', align: 'start' }));
  });
  await check('트랙 포커스 ArrowRight 두 번은 각각 0→1→2 한 칸씩 스냅', async () => {
    await story(); await focus(track);
    await key('ArrowRight', 39); await snapped(1);
    await key('ArrowRight', 39); await snapped(2);
    await key('ArrowLeft', 37); await snapped(1);
  });
  await check('이전/다음은 ±clientWidth 한 칸·처음/끝 비활성·순환 없음', async () => {
    await story(); await snapped(0);
    assert.equal(await ev(`${q(previous)}.disabled`), true);
    assert.equal(await ev(`${q(next)}.disabled`), false);
    const width = await ev(`${q(track)}.clientWidth`);
    await click(next); await snapped(1);
    assert.ok(Math.abs(await ev(`${q(track)}.scrollLeft`) - width) < 1);
    assert.equal(await ev(`${q(previous)}.disabled`), false);
    await click(next); await snapped(2);
    assert.equal(await ev(`${q(next)}.disabled`), true);
    await click(next); await snapped(2);
    await click(previous); await snapped(1);
    await click(previous); await snapped(0);
    assert.equal(await ev(`${q(previous)}.disabled`), true);
  });
  await check('점 scrollTo·aria-current·크기 차이로 현재값 구별', async () => {
    await story();
    await ev(`${all(dot)}[2].click()`); await snapped(2);
    assert.deepEqual(await ev(`Array.from(${all(dot)}, n=>n.getAttribute('aria-current'))`), [null, null, 'true']);
    const widths = await ev(`Array.from(${all(dot)}, n=>n.firstElementChild.getBoundingClientRect().width)`);
    assert.ok(widths[2] > widths[0]);
    assert.equal(await ev(`${q('[data-slot="carousel-announcement"]')}.textContent`), '3개 중 3번째');
  });
  await check('기본 Tab 경로는 트랙 하나·슬라이드 정지점 없음', async () => {
    await story(); await focus('[data-probe="before"]');
    await key('Tab', 9); await wait(`document.activeElement === ${q(track)}`);
    await key('Tab', 9); await wait(`document.activeElement === ${q(dot)}`);
    const stops = [];
    for (let step = 0; step < 5; step++) {
      stops.push(await ev(`document.activeElement?.getAttribute('data-slot') ?? document.activeElement?.getAttribute('data-probe')`));
      if (stops.at(-1) === 'after') break;
      await key('Tab', 9);
    }
    assert.deepEqual(stops, ['carousel-dot', 'carousel-dot', 'carousel-dot', 'carousel-next', 'after']);
  });
  await check('슬라이드 내부 링크는 모두 실제 Tab 정지점·포커스가 네이티브로 스크롤', async () => {
    await story('슬라이드안에링크'); await focus('[data-probe="before"]');
    await key('Tab', 9); await wait(`document.activeElement === ${q(track)}`);
    for (let index = 0; index < 3; index++) {
      await key('Tab', 9);
      await wait(`document.activeElement === ${all('[data-probe="banner-link"]')}[${index}]`);
      await snapped(index);
    }
    await key('Tab', 9); await wait(`document.activeElement === ${q(previous)}`);
  });
  await check('점·화살표 숨김 변형과 슬라이드 하나의 양쪽 비활성', async () => {
    await story('점없음'); assert.equal(await ev(`${q(dot)} === null`), true);
    await story('화살표없음'); assert.equal(await ev(`${q(previous)} === null && ${q(next)} === null`), true);
    await story('슬라이드하나');
    assert.equal(await ev(`${q(previous)}.disabled && ${q(next)}.disabled`), true);
    assert.equal(await ev(`${all(slide)}.length`), 1);
  });
  await check('자동 간격 뒤 현재값 증가·자동 스크롤은 영구 정지를 유발하지 않음·live off', async () => {
    await auto(); await snapped(1);
    assert.equal(await ev(manual), false);
    assert.equal(await ev(`${q(track)}.getAttribute('aria-live')`), 'off');
    await snapped(2);
    assert.equal(await ev(manual), false);
    assert.equal(await ev(`${q('[data-slot="carousel-announcement"]')}.textContent`), '');
  });
  await check('자동재생도 마지막에서 정지하고 순환하지 않음', async () => {
    await auto(); await wait(`${current} === '5'`, interval * 8); await snapped(5);
    assert.equal(await ev(`${q(next)}.disabled`), true);
    assert.equal(await ev(playing), false);
    assert.equal(await ev(manual), false);
    await stableFor();
  });
  await check('호버 정지·포인터가 떠나면 새 간격으로 재개', async () => {
    await auto();
    const point = await ev(`(() => {const r=${q(track)}.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
    await wait(`!(${playing})`); await stableFor();
    assert.equal(await ev(manual), false);
    const before = await ev(current);
    await outsidePointer(); await wait(playing);
    await snapped(Number(before) + 1);
  });
  await check('안에 포커스가 있으면 정지·그룹 밖으로 나가면 재개', async () => {
    await auto(); await focus(track); await wait(`!(${playing})`); await stableFor();
    await focus(pause); await stableFor(); // 그룹 내부 이동 중에도 계속 정지
    assert.equal(await ev(manual), false);
    await focus('[data-probe="after"]'); await wait(playing); await snapped(1);
  });
  await check('정지 버튼 항상 존재·Enter 정지·aria-pressed·접근명·명시적 시작', async () => {
    await auto();
    assert.equal(await ev(`${q(pause)}.getAttribute('aria-pressed')`), 'false');
    assert.equal(await ev(`${q(pause)}.getAttribute('aria-label')`), '자동 넘김 멈춤');
    await focus(pause); await key('Enter', 13);
    await wait(`${q(pause)}.getAttribute('aria-pressed') === 'true'`);
    await focus('[data-probe="after"]'); await stableFor();
    assert.equal(await ev(`${q(pause)}.getAttribute('aria-label')`), '자동 넘김 시작');
    await click(pause); await wait(playing); await snapped(1);
  });
  await check('reduce에서 computed scrollBehavior=auto·자동재생 미시작·정지 버튼 유지', async () => {
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    try {
      await story('자동재생'); await snapped(0);
      assert.equal(await ev(`getComputedStyle(${q(track)}).scrollBehavior`), 'auto');
      assert.equal(await ev(`${q(pause)} !== null && ${q(pause)}.disabled`), true);
      assert.equal(await ev(playing), false); await stableFor();
      await click(next); await snapped(1);
    } finally { await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] }); }
  });
  await check('재생 도중 matchMedia reduce 변경을 구독해 정지·해제 후 재개', async () => {
    await auto();
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    try {
      await wait(`!(${playing}) && getComputedStyle(${q(track)}).scrollBehavior === 'auto'`);
      await stableFor(); assert.equal(await ev(manual), false);
    } finally { await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] }); }
    await wait(playing); await snapped(1);
  });
  await check('document.hidden·visibilitychange 정지·가시성 복귀 재개', async () => {
    await auto();
    // 헤드리스는 운영체제 탭 전환을 갖지 않는다. hidden 입력과 실제 이벤트 경로를 재현한다.
    await ev(`Object.defineProperty(document, 'hidden', { configurable:true, get:()=>true }); document.dispatchEvent(new Event('visibilitychange'))`);
    try { await wait(`!(${playing})`); await stableFor(); assert.equal(await ev(manual), false); }
    finally { await ev(`delete document.hidden; document.dispatchEvent(new Event('visibilitychange'))`); }
    await wait(playing); await snapped(1);
  });
  await check('직접 다음 버튼 뒤 영구 종료·hover/focus/reduce/visibility 해제도 재개 불가', async () => {
    await auto(); await click(next); await snapped(1); await permanent();
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await wait(`${q(pause)}.disabled`);
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await ev(`Object.defineProperty(document, 'hidden', {configurable:true,get:()=>true}); document.dispatchEvent(new Event('visibilitychange'))`);
    await ev(`delete document.hidden; document.dispatchEvent(new Event('visibilitychange'))`);
    await click(pause); await permanent();
    assert.equal(await ev(`${q('[data-slot="carousel-announcement"]')}.textContent`), '6개 중 2번째');
  });
  await check('직접 점 선택 뒤 영구 종료', async () => {
    await auto(); await ev(`${all(dot)}[2].click()`); await snapped(2); await permanent();
  });
  await check('직접 키보드 넘김 뒤 영구 종료', async () => {
    await auto(); await focus(track); await key('ArrowRight', 39); await snapped(1); await permanent();
  });
  await check('직접 가로 휠 스크롤 뒤 영구 종료', async () => {
    await auto();
    const point = await ev(`(() => {const r=${q(track)}.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', ...point, deltaX: await ev(`${q(track)}.clientWidth`), deltaY: 0 });
    await snapped(1); await permanent();
  });
  await check('자동 이동 표시가 없는 scroll 자체도 영구 종료·인덱스는 IO로 판정', async () => {
    await auto();
    await ev(`${q(track)}.scrollBy({left:${q(track)}.clientWidth})`);
    await snapped(1); await permanent();
  });
  await check('MediaViewer 조합은 배너 클릭 확대·Escape 뒤 실제 배너 버튼 복귀', async () => {
    await story('media-viewer조합'); await focus('[data-probe="open-banner"]'); await click('[data-probe="open-banner"]');
    await wait(`document.querySelector('[data-slot="media-viewer-stage"]')?.dataset.state === 'loaded'`);
    assert.equal(await ev(`document.querySelector('[data-slot="media-viewer-image"]').alt`), '출고 마감 시간 안내');
    await key('Escape', 27);
    await wait(`!document.querySelector('[data-slot="media-viewer-stage"]')`);
    await wait(`document.activeElement === ${q('[data-probe="open-banner"]')}`);
  });
  await check('전체 콘솔 오류·페이지 예외 0건', async () => assert.deepEqual(browser.errors(), []));
} catch (error) {
  results.push({ label: '하네스 실행', pass: false, error: error.message }); console.error(error.stack);
} finally {
  browser.close(); writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
}
const failed = results.filter(result => !result.pass);
console.log(`검사 ${results.length}건 · 통과 ${results.length - failed.length} · 실패 ${failed.length}`);
process.exitCode = failed.length ? 1 : 0;
