// R22: 작성만 수행한다. 실제 브라우저 검증은 사용자의 pnpm qa에서 실행한다.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, CANVAS } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/collapse';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ port: 9472, outDir: OUT });
const { cdp, ev, sleep } = browser;
const { open } = storybook(browser);
const results = [];
const q = selector => `${CANVAS}.querySelector(${JSON.stringify(selector)})`;
const all = selector => `${CANVAS}.querySelectorAll(${JSON.stringify(selector)})`;
const content = '[data-slot="clamp-text-content"]';
const trigger = '[data-slot="clamp-text-trigger"]';
const panel = '[data-slot="collapsible-content"]';
const toggle = '[data-slot="collapsible-trigger"]';
async function wait(expression) {
  for (let attempt = 0; attempt < 80; attempt++) {
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
async function story(id) {
  assert.deepEqual(browser.errors(), [], '직전 스토리 콘솔 오류');
  const result = await open(id);
  assert.equal(result.sbError, null);
  assert.equal(await ev(`${CANVAS}.dataset.playComplete`), 'true', 'play 완료 표식');
  await ev('document.fonts.ready.then(() => true)');
  assert.deepEqual(browser.errors(), [], '스토리 콘솔 오류');
}
async function click(selector) { await ev(`${q(selector)}.click()`); }
async function settled() { await ev('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))'); }
async function noMotion(selector) {
  assert.equal(await ev(`(() => { const css = getComputedStyle(${q(selector)});
    return [css.animationDuration, css.transitionDuration].every(value => value.split(',').every(time => parseFloat(time) === 0)); })()`), true);
}
// id 선택자를 사용하지 않고 슬롯으로 찾은 실재 요소와 ARIA 참조 값을 비교한다.
async function wired(buttonSelector, textSelector, description = false) {
  assert.equal(await ev(`(() => { const button = ${q(buttonSelector)}, text = ${q(textSelector)};
    return !!button && !!text && !!text.id && button.getAttribute('aria-controls') === text.id
      ${description ? "&& button.getAttribute('aria-describedby') === text.id" : ''}; })()`), true);
}

try {
  for (const [group, names] of [
    ['collapsible', ['기본', '기본열림', '폼유지', '모션줄이기']],
    ['clamptext', ['짧은글', '긴글', '세줄', '좁은폭', '폭변화', '나중에긴글', '제어', '여러글']],
  ]) for (const name of names) {
    await check(`${group}/${name} play·콘솔 오류 0건`, () => story(`components-${group}--${name}`));
  }

  await check('짧은 글에는 더보기 버튼이 DOM에 없다', async () => {
    await story('components-clamptext--짧은글'); await settled();
    assert.equal(await ev(`${q(trigger)} === null`), true);
  });
  await check('긴 글은 더보기·펼침 전체 높이·접힘 N줄·전체 DOM 복사', async () => {
    await story('components-clamptext--긴글'); await wait(`!!${q(trigger)}`);
    const before = await ev(`({ text: ${q(content)}.textContent, height: ${q(content)}.clientHeight,
      line: parseFloat(getComputedStyle(${q(content)}).lineHeight) })`);
    assert.ok(before.height <= before.line * 2 + 1);
    assert.equal(await ev(`${q(content)}.scrollHeight > ${q(content)}.clientHeight`), true);
    await wired(trigger, content, true);
    await click(trigger); await wait(`${q(trigger)}.getAttribute('aria-expanded') === 'true'`);
    assert.equal(await ev(`${q(content)}.scrollHeight <= ${q(content)}.clientHeight`), true);
    assert.ok(await ev(`${q(content)}.clientHeight`) > before.height);
    await click(trigger); await wait(`${q(trigger)}.getAttribute('aria-expanded') === 'false'`);
    assert.equal(await ev(`${q(content)}.clientHeight`), before.height);
    assert.equal(await ev(`${q(content)}.textContent`), before.text);
    const copied = await ev(`(() => { const range = document.createRange(); range.selectNodeContents(${q(content)});
      const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
      const text = selection.toString(); selection.removeAllRanges(); return text; })()`);
    // 선택 영역은 끝 공백을 버린다. 보장은 "접혀 있어도 전체가 복사된다" 이지
    // 공백까지 같다는 것이 아니다.
    assert.equal(copied.trim(), before.text.trim());
  });
  await check('3줄 설정은 실제 세 줄 높이로 접힌다', async () => {
    await story('components-clamptext--세줄');
    assert.equal(await ev(`(() => { const n=${q(content)}; return n.clientHeight === parseFloat(getComputedStyle(n).lineHeight)*3; })()`), true);
  });
  await check('중간 글은 240px에서 버튼 생성·640px에서 제거', async () => {
    await story('components-clamptext--폭변화'); await settled();
    assert.equal(await ev(`${q(trigger)} === null`), true);
    await ev(`${q('[data-probe="width"]')}.style.width = '240px'`);
    await wait(`!!${q(trigger)}`);
    assert.equal(await ev(`${q(content)}.scrollHeight > ${q(content)}.clientHeight`), true);
    await ev(`${q('[data-probe="width"]')}.style.width = '640px'`);
    await wait(`${q(trigger)} === null`);
  });
  await check('같은 폭·같은 클램프 높이에서 자식 글만 길어져도 버튼 생성', async () => {
    await story('components-clamptext--나중에긴글'); await settled();
    const before = await ev(`({ width: ${q(content)}.clientWidth, height: ${q(content)}.clientHeight })`);
    assert.equal(await ev(`${q(trigger)} === null`), true);
    await click('[data-probe="replace"]'); await wait(`!!${q(trigger)}`);
    assert.equal(await ev(`${q(content)}.clientWidth`), before.width);
    assert.equal(await ev(`${q(content)}.clientHeight`), before.height);
    assert.equal(await ev(`${q(content)}.scrollHeight > ${q(content)}.clientHeight`), true);
    await click('[data-probe="replace"]'); await wait(`${q(trigger)} === null`);
  });
  await check('React 렌더 없는 characterData와 childList 변경도 각각 재측정', async () => {
    await story('components-clamptext--나중에긴글'); await settled();
    await ev(`${q(content)}.querySelector('span').firstChild.data = '긴 배송 설명입니다. '.repeat(40)`);
    await wait(`!!${q(trigger)}`);
    await ev(`${q(content)}.querySelector('span').replaceChildren(document.createTextNode('짧은 설명'))`);
    await wait(`${q(trigger)} === null`);
    await ev(`${q(content)}.querySelector('span').append(document.createTextNode('추가 설명입니다. '.repeat(40)))`);
    await wait(`!!${q(trigger)}`);
  });
  await check('펼친 상태에서도 폭·내용 변경 시 접힌 기준의 버튼 여부를 갱신', async () => {
    await story('components-clamptext--폭변화');
    await ev(`${q('[data-probe="width"]')}.style.width = '240px'`); await wait(`!!${q(trigger)}`);
    await click(trigger); await wait(`${q(trigger)}.getAttribute('aria-expanded') === 'true'`);
    await settled(); assert.equal(await ev(`!!${q(trigger)}`), true);
    await ev(`${q('[data-probe="width"]')}.style.width = '640px'`); await wait(`${q(trigger)} === null`);
    await ev(`${q('[data-probe="width"]')}.style.width = '240px'`); await wait(`!!${q(trigger)}`);
    assert.equal(await ev(`${q(trigger)}.getAttribute('aria-expanded')`), 'true');
    await ev(`${q(content)}.textContent = '짧아진 글'`); await wait(`${q(trigger)} === null`);
  });
  await check('제어 모드·사용자 라벨·키보드 Enter로 왕복', async () => {
    await story('components-clamptext--제어');
    await ev(`${q(trigger)}.focus()`); await wait(`document.activeElement === ${q(trigger)}`);
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await wait(`${q(trigger)}.getAttribute('aria-expanded') === 'true'`);
    assert.equal(await ev(`${q(trigger)}.textContent`), '설명 접기');
    await click(trigger); await wait(`${q(trigger)}.getAttribute('aria-expanded') === 'false'`);
    assert.equal(await ev(`${q(trigger)}.textContent`), '설명 펼치기');
  });
  await check('여러 더보기는 각각 다른 실재 글과 설명을 가리킨다', async () => {
    await story('components-clamptext--여러글');
    const refs = await ev(`Array.from(${all(trigger)}, button => ({ controls: button.getAttribute('aria-controls'),
      description: button.getAttribute('aria-describedby'), text: button.previousElementSibling.id }))`);
    assert.equal(refs.length, 2); assert.notEqual(refs[0].controls, refs[1].controls);
    for (const ref of refs) { assert.ok(ref.controls); assert.equal(ref.controls, ref.text); assert.equal(ref.description, ref.text); }
    await click(trigger);
    assert.equal(await ev(`${all(trigger)}[1].getAttribute('aria-expanded')`), 'false');
  });
  await check('Collapsible ARIA는 열린 실재 패널 연결·기본 닫힘은 자식 제거', async () => {
    await story('components-collapsible--기본');
    assert.equal(await ev(`${q(toggle)}.getAttribute('aria-expanded')`), 'false');
    await click(toggle); await wait(`${q(toggle)}.getAttribute('aria-expanded') === 'true'`);
    await wired(toggle, panel); await settled();
    await click(toggle); await wait(`${q(toggle)}.getAttribute('aria-expanded') === 'false'`);
    await wait(`!${q(panel)} || !${q(panel)}.textContent`);
    assert.equal(await ev(`!!${q(toggle)}`), true);
  });
  await check('forceMount 입력값·DOM 보존과 닫힌 입력 숨김', async () => {
    await story('components-collapsible--폼유지');
    await ev(`${q('input')}.value = '대구 창고'`); await click(toggle);
    await wait(`getComputedStyle(${q(panel)}).visibility === 'hidden'`);
    assert.equal(await ev(`${q('input')}.value`), '대구 창고');
    assert.equal(await ev(`${q(panel)}.getBoundingClientRect().height`), 0);
    await click(toggle); await wait(`${q(toggle)}.getAttribute('aria-expanded') === 'true'`);
    assert.equal(await ev(`${q('input')}.value`), '대구 창고');
  });
  await check('reduce에서 두 컴포넌트 펼침·접힘 전환 시간 0', async () => {
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    try {
      await story('components-collapsible--모션줄이기'); await noMotion(panel);
      await click(toggle); await wait(`${q(toggle)}.getAttribute('aria-expanded') === 'false'`);
      await click(toggle); await wait(`${q(toggle)}.getAttribute('aria-expanded') === 'true'`); await noMotion(panel);
      await story('components-collapsible--폼유지'); await click(toggle); await noMotion(panel);
      await story('components-clamptext--긴글'); await noMotion(content); await noMotion(trigger);
      await click(trigger); await noMotion(content); await noMotion(trigger);
      await click(trigger); await noMotion(content);
    } finally { await cdp('Emulation.setEmulatedMedia', { features: [] }); }
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
