// R17: 작성만 수행한다. 사용자가 pnpm qa로 실제 IME·포커스·ARIA를 검증한다.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, CANVAS } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/combobox';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ port: 9466, outDir: OUT });
const { cdp, ev, sleep } = browser;
const { open } = storybook(browser);
const results = [], measurements = [];
const trigger = `${CANVAS}.querySelector('[data-slot="combobox-trigger"]')`;
// 팝오버는 포털이다. cmdk 입력 id는 외부에서 소유할 수 없으므로 data-slot으로만 찾는다.
const input = `document.querySelector('[data-slot="combobox-input"]')`;
const list = `document.querySelector('[data-slot="combobox-list"]')`;
const output = `${CANVAS}.querySelector('[data-slot="combobox-demo-value"]')`;
const snapshot = `(() => {
  const input = ${input};
  const options = [...document.querySelectorAll('[data-slot="combobox-option"]')].filter(node => node.getClientRects().length);
  const empty = document.querySelector('[data-slot="combobox-empty"]');
  return { count: options.length, labels: options.map(node => node.textContent),
    empty: !!empty && !!empty.getClientRects().length,
    active: input?.getAttribute('aria-activedescendant') ?? null,
    focus: document.activeElement === input, value: input?.value };
})()`;
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
    results.push({ label, pass: false, error: error.message });
    console.error(`✗ ${label}: ${error.message}`); await browser.shot(`failure-${results.length}`);
  }
}
async function story(name) {
  assert.deepEqual(browser.errors(), [], '직전 스토리 콘솔 오류');
  const result = await open(`components-combobox--${name}`);
  assert.equal(result.sbError, null);
  assert.equal(await ev(`${CANVAS}.dataset.playComplete`), 'true', 'play 완료');
  assert.equal(await ev(`${trigger}.getAttribute('aria-expanded')`), 'false', 'play가 닫고 끝남');
  assert.equal(await ev(`!!${input}`), false);
  assert.deepEqual(browser.errors(), [], '스토리 콘솔 오류');
}
async function openList() {
  await ev(`${trigger}.click()`);
  await wait(`${input} && document.activeElement === ${input}`);
  await wait(`${trigger}.getAttribute('aria-expanded') === 'true'`);
}
async function down(key, code) {
  await cdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code: key, windowsVirtualKeyCode: code });
}
async function up(key, code) {
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: code });
}
async function press(key, code, condition) {
  // 라이브러리가 keydown 중 세운 상태를 읽기 전에 keyup으로 지우지 않는다.
  await down(key, code);
  try { if (condition) await wait(condition); else await sleep(120); }
  finally { await up(key, code); }
}
async function compose(text) {
  await cdp('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length });
  await wait(`${input}.value === ${JSON.stringify(text)}`);
  await sleep(80);
}
async function setQuery(text) {
  await ev(`(() => { const node = ${input};
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, ${JSON.stringify(text)});
    node.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' })); })()`);
  await wait(`${input}.value === ${JSON.stringify(text)}`);
  await sleep(80);
}
async function closeList() {
  await press('Escape', 27, `${trigger}.getAttribute('aria-expanded') === 'false'`);
  await wait(`document.activeElement === ${trigger}`);
  await wait(`!${input}`);
}
async function observeComposition() {
  await ev(`(() => {
    window.__comboboxComposing = false; window.__comboboxCompositionStarts = 0; window.__comboboxTransientFailures = [];
    ${input}.addEventListener('compositionstart', () => { window.__comboboxComposing = true; window.__comboboxCompositionStarts++; });
    ${input}.addEventListener('compositionend', () => { window.__comboboxComposing = false; });
    window.__comboboxObserver?.disconnect();
    window.__comboboxObserver = new MutationObserver(() => {
      if (!window.__comboboxComposing) return;
      const state = ${snapshot};
      if (!state.count || state.empty) window.__comboboxTransientFailures.push(state);
    });
    window.__comboboxObserver.observe(${list}, { subtree: true, childList: true, attributes: true });
  })()`);
}

try {
  for (const name of ['기본', '비활성', '오류', '필드', '한글조합', '초성검색', '맞춤검색']) {
    await check(`${name}: play 완료·목록 닫힘·콘솔 오류 없음`, () => story(name));
  }

  await story('한글조합'); await openList();
  await check('입력 combobox·autocomplete·expanded·실재 listbox 연결', async () => {
    assert.equal(await ev(`${input}.getAttribute('role')`), 'combobox');
    assert.equal(await ev(`${input}.getAttribute('aria-autocomplete')`), 'list');
    assert.equal(await ev(`${input}.getAttribute('aria-expanded')`), 'true');
    assert.equal(await ev(`document.getElementById(${input}.getAttribute('aria-controls')) === ${list} && ${list}.getAttribute('role') === 'listbox'`), true);
    // 콤보박스는 **하나**여야 한다. 트리거까지 role=combobox 면 열린 동안 둘이 된다.
    assert.equal(await ev(`document.querySelectorAll('[role="combobox"]').length`), 1, 'combobox 역할이 둘 이상이다');
    assert.equal(await ev(`${trigger}.getAttribute('role')`), null, '트리거는 combobox 가 아니다');
    assert.equal(await ev(`${trigger}.getAttribute('aria-haspopup')`), 'dialog');
    assert.equal(await ev(`${trigger}.getAttribute('aria-expanded')`), 'true');
  });
  await observeComposition();
  for (const text of ['ㅅ', '서', '설', '서울']) {
    await check(`실제 IME ${text}: 표시 항목 >0·빈 문구 없음·입력 포커스 유지`, async () => {
      await compose(text);
      assert.equal(await ev('window.__comboboxComposing'), true, '실제 compositionstart 경로');
      await wait(`document.activeElement === ${input}`);
      const state = await ev(snapshot); measurements.push({ text, ...state });
      assert.ok(state.count > 0, JSON.stringify(state)); assert.equal(state.empty, false); assert.equal(state.focus, true);
    });
  }
  await check('네 조합 단계 사이의 DOM 변경에도 빈 목록·빈 문구가 한 번도 없음', async () => {
    assert.ok(await ev('window.__comboboxCompositionStarts > 0'));
    assert.deepEqual(await ev('window.__comboboxTransientFailures'), []);
    assert.equal(measurements.length, 4);
  });
  await check('조합 종료 후 실제 서울 후보 하나로 확정', async () => {
    await cdp('Input.insertText', { text: '서울' });
    await wait('!window.__comboboxComposing');
    await wait(`(${snapshot}).count === 1`);
    assert.deepEqual((await ev(snapshot)).labels, ['서울 본사']);
  });
  await check('확정 후 ArrowDown은 실재 option id 활성화·입력 포커스 유지', async () => {
    // 후보가 하나면 ArrowDown으로 이동할 다음 항목이 없다. 확정 뒤 세 후보로 검색해 이동 자체를 검증한다.
    await setQuery('서'); await wait(`(${snapshot}).count === 3`);
    const before = (await ev(snapshot)).active;
    await press('ArrowDown', 40, `(() => { const id = ${input}.getAttribute('aria-activedescendant');
      return !!id && id !== ${JSON.stringify(before)} && document.getElementById(id)?.getAttribute('role') === 'option'; })()`);
    await wait(`document.activeElement === ${input}`);
  });
  await closeList();

  await story('한글조합'); await openList(); await observeComposition();
  await compose('서');
  await check('조합 중 ArrowDown·ArrowUp은 활성 항목을 옮기지 않음', async () => {
    const before = (await ev(snapshot)).active;
    for (const [key, code] of [['ArrowDown', 40], ['ArrowUp', 38]]) {
      assert.equal(await ev('window.__comboboxComposing'), true);
      await press(key, code);
      assert.equal((await ev(snapshot)).active, before);
      await wait(`document.activeElement === ${input}`);
    }
  });
  await check('조합 중 Enter는 고른 값·열림·포커스를 보존', async () => {
    const before = await ev(`${output}.textContent`);
    assert.equal(await ev('window.__comboboxComposing'), true);
    await press('Enter', 13);
    assert.equal(await ev(`${output}.textContent`), before);
    assert.equal(await ev(`${trigger}.getAttribute('aria-expanded')`), 'true');
    await wait(`document.activeElement === ${input}`);
  });
  await check('조합 종료 뒤 Enter는 서울 본사를 선택하고 트리거로 복귀', async () => {
    await cdp('Input.insertText', { text: '서' });
    await wait('!window.__comboboxComposing');
    await setQuery('서울');
    await wait(`(${snapshot}).count === 1 && !!document.querySelector('[data-slot="combobox-option"][aria-selected="true"]')`);
    await press('Enter', 13, `${output}.textContent === 'location-0'`);
    await wait(`${trigger}.getAttribute('aria-expanded') === 'false' && document.activeElement === ${trigger}`);
    assert.equal(await ev(`${trigger}.textContent.trim()`), '서울 본사');
  });
  await check('고른 값은 체크 표시, aria-selected는 cmdk 활성 의미를 유지', async () => {
    await openList();
    assert.equal(await ev(`document.querySelector('[data-slot="combobox-option"][data-value-selected="true"]').textContent`), '서울 본사선택한 값');
    assert.equal(await ev(`!!document.querySelector('[data-slot="combobox-option"][data-value-selected="true"] svg')`), true);
    await closeList();
  });

  await story('한글조합'); await openList(); await observeComposition(); await compose('서');
  await check('조합 중 Escape는 팝오버를 닫지 않음', async () => {
    assert.equal(await ev('window.__comboboxComposing'), true);
    await press('Escape', 27);
    assert.equal(await ev(`${trigger}.getAttribute('aria-expanded')`), 'true');
    await wait(`document.activeElement === ${input}`);
    await cdp('Input.insertText', { text: '서' });
    await wait('!window.__comboboxComposing');
  });
  await check('확정 후 Escape로 닫힘·aria-expanded=false·트리거 포커스 복귀', closeList);

  await story('초성검색'); await openList();
  await check('초성 ㅅㅇ는 서울·수원 둘을 남긴다 (둘 다 ㅅ·ㅇ 다)', async () => {
    await setQuery('ㅅㅇ'); await wait(`(${snapshot}).count === 2`);
    assert.deepEqual((await ev(snapshot)).labels, ['서울 본사', '수원 창고']);
  });
  await check('초성 ㅅㅅ는 서산 물류센터 하나로 좁혀진다', async () => {
    await setQuery('ㅅㅅ'); await wait(`(${snapshot}).count === 1`);
    assert.deepEqual((await ev(snapshot)).labels, ['서산 물류센터']);
  });
  await check('완성된 없는 질의는 실제 결과 없음 표시', async () => {
    await setQuery('없는창고xyz'); await wait(`(${snapshot}).empty`);
    assert.equal((await ev(snapshot)).count, 0);
    assert.equal(await ev(`document.querySelector('[data-slot="combobox-empty"]').textContent`), '결과가 없습니다');
  });
  await closeList();

  await story('한글조합'); await openList(); await observeComposition();
  await check('0개인 중간 음절 설도 조합 종료 후에는 결과 없음을 표시', async () => {
    await compose('설');
    assert.ok((await ev(snapshot)).count > 0);
    assert.equal((await ev(snapshot)).empty, false);
    await cdp('Input.insertText', { text: '설' });
    await wait('!window.__comboboxComposing');
    await wait(`(${snapshot}).empty && (${snapshot}).count === 0`);
    assert.equal(await ev(`${input}.value`), '설');
  });
  await closeList();

  await story('기본');
  await check('닫힌 트리거 ArrowDown으로 목록 열기·입력 포커스', async () => {
    await ev(`${trigger}.focus()`);
    await wait(`document.activeElement === ${trigger}`);
    await press('ArrowDown', 40, `${input} && document.activeElement === ${input}`);
    assert.equal(await ev(`${trigger}.getAttribute('aria-expanded')`), 'true');
  });
  await check('26개 후보·240px 상한·목록 내부 스크롤', async () => {
    assert.equal((await ev(snapshot)).count, 26);
    assert.equal(await ev(`getComputedStyle(${list}).maxHeight`), '240px');
    assert.equal(await ev(`${list}.scrollHeight > ${list}.clientHeight`), true);
    assert.equal(await ev(`getComputedStyle(${list}).overflowY`), 'auto');
  });
  await check('비활성 후보 클릭은 선택하지 않음', async () => {
    await ev(`document.querySelector('[data-slot="combobox-option"][aria-disabled="true"]').click()`);
    await sleep(120);
    assert.equal(await ev(`${output}.textContent`), '선택 없음');
    assert.equal(await ev(`${trigger}.getAttribute('aria-expanded')`), 'true');
  });
  await closeList();
  await check('모든 상호작용 후 콘솔 오류 0건', async () => assert.deepEqual(browser.errors(), []));
} finally {
  writeFileSync(`${OUT}/results.json`, JSON.stringify({ results, measurements, errors: browser.errors() }, null, 2));
  browser.close();
}
const failed = results.filter(result => !result.pass).length;
console.log(`\n${results.length}건 검사 · ${results.length - failed}건 통과 · ${failed}건 실패`);
if (failed) process.exitCode = 1;
