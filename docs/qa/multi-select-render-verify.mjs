// R21: 브라우저 실행은 사용자의 pnpm qa가 담당한다. 기존 하네스는 수정하지 않는다.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, CANVAS, actions } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/multi-select';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ outDir: OUT });
const { cdp, ev, sleep } = browser;
const { open } = storybook(browser);
const results = [], measurements = [];
const q = selector => `document.querySelector(${JSON.stringify(selector)})`;
const all = selector => `[...document.querySelectorAll(${JSON.stringify(selector)})]`;
const trigger = q('[data-slot="multi-select-trigger"]');
const multiList = q('[data-slot="multi-select-list"]');
const input = q('[data-slot="combobox-input"]');
const control = q('[data-slot="combobox-multiple-control"]');
const area = q('[data-slot="combobox-chip-area"]');
const chips = all('[data-slot="combobox-chip-remove"]');
const chipCount = `${chips}.length`;
const comboList = q('[data-slot="combobox-list"]');
const options = all('[data-slot="combobox-option"]');
async function wait(condition) {
  for (let attempt = 0; attempt < 80; attempt++) {
    if (await ev(condition)) return;
    await sleep(50);
  }
  throw new Error(`조건 대기 실패: ${condition}`);
}
async function check(label, run) {
  try { await run(); results.push({ label, pass: true }); console.log(`✓ ${label}`); }
  catch (error) {
    results.push({ label, pass: false, error: error.message });
    console.error(`✗ ${label}: ${error.message}`); await browser.shot(`failure-${results.length}`);
  }
}
async function story(id) {
  assert.deepEqual(browser.errors(), [], '직전 스토리 콘솔 오류');
  const state = await open(id);
  assert.equal(state.sbError, null);
  assert.equal(await ev(`${CANVAS}.dataset.playComplete`), 'true');
  assert.deepEqual(browser.errors(), [], '스토리 콘솔 오류');
}
async function focus(expression) { await ev(`${expression}.focus()`); await wait(`document.activeElement === ${expression}`); }
const act = actions(browser);
// 키마다 규칙이 다르다. 화살표는 rawKeyDown 이어야 Radix 의 keydown/keyup 추적이
// 살아 있고(R16), Enter 로 **버튼을 누르려면** keyDown + text:'\r' 이어야 한다 —
// rawKeyDown 은 text 를 줘도 문자 입력을 만들지 않아 클릭이 일어나지 않는다(실측).
const press = (name, keyCode, until) => act.press(name, { keyCode, code: name, raw: true, unmodifiedText: true, until, wait });
async function count(n) {
  await ev(`${q(`[data-count="${n}"]`)}.click()`);
  await wait(`${chipCount} === ${n}`);
  await sleep(80);
}
async function openCombo() {
  await ev(`${input}.click()`); await focus(input);
  await wait(`${comboList} && ${input}.getAttribute('aria-expanded') === 'true'`);
}
async function query(text) {
  await ev(`(() => { const node = ${input};
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, ${JSON.stringify(text)});
    node.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' })); })()`);
  await wait(`${input}.value === ${JSON.stringify(text)}`); await sleep(80);
}
async function compose(text) {
  await cdp('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length });
  await wait(`${input}.value === ${JSON.stringify(text)}`); await sleep(80);
}
try {
  for (const name of ['기본', '많은옵션', '비활성', '오류', '필드', '툴바필터']) {
    await check(`MultiSelect ${name}: 스토리 완료·콘솔 오류 없음`, () => story(`components-multiselect--${name}`));
  }
  await story('components-multiselect--기본');
  await check('MultiSelect 0·1·5개 트리거 높이가 control-h-md로 일정', async () => {
    const heights = [await ev(`${trigger}.getBoundingClientRect().height`)];
    await ev(`${trigger}.click()`); await wait(`document.activeElement === ${multiList}`);
    const opts = all('[data-slot="multi-select-option"]');
    await ev(`${opts}[0].click()`); await wait(`${opts}[0].getAttribute('aria-selected') === 'true'`);
    heights.push(await ev(`${trigger}.getBoundingClientRect().height`));
    for (let i = 1; i < 5; i++) await ev(`${opts}[${i}].click()`);
    await wait(`${opts}.filter(node => node.getAttribute('aria-selected') === 'true').length === 5`);
    heights.push(await ev(`${trigger}.getBoundingClientRect().height`));
    measurements.push({ component: 'MultiSelect', counts: [0, 1, 5], heights });
    assert.equal(heights[0], await ev(`parseFloat(getComputedStyle(${trigger}).getPropertyValue('--control-h-md'))`));
    assert.deepEqual(heights, [heights[0], heights[0], heights[0]]);
    assert.equal(await ev(`${trigger}.title`), '서울본사 외 4개');
    assert.equal(await ev(`${trigger}.getAttribute('aria-expanded')`), 'true');
  });
  await check('MultiSelect listbox·multiselectable·option·체크·푸터·비활성', async () => {
    assert.equal(await ev(`${multiList}.getAttribute('role')`), 'listbox');
    assert.equal(await ev(`${multiList}.getAttribute('aria-multiselectable')`), 'true');
    assert.equal(await ev(`${all('[data-slot="multi-select-option"]')}.every(node => node.getAttribute('role') === 'option' && node.hasAttribute('aria-selected'))`), true);
    assert.equal(await ev(`${all('[data-slot="multi-select-option"][aria-selected="true"]')}.every(node => !!node.querySelector('svg'))`), true);
    assert.equal(await ev(`${q('[data-slot="multi-select-footer"]')}.textContent`), '전체 해제5개 선택');
    await ev(`${q('[data-slot="multi-select-option"][aria-disabled="true"]')}.click()`);
    await ev(`${q('[data-slot="multi-select-footer"] button')}.click()`);
    await wait(`${q('[data-slot="multi-select-footer"] button')}.disabled`);
    assert.equal(await ev(`${all('[data-slot="multi-select-option"][aria-selected="true"]')}.length`), 0);
  });
  await check('MultiSelect Enter·Space 토글, Home/End·화살표·비활성 건너뜀, Escape 복귀', async () => {
    await focus(multiList);
    await press('Home', 36);
    const first = await ev(`${multiList}.getAttribute('aria-activedescendant')`);
    await press('Enter', 13, `${q('[data-slot="multi-select-option"]')}.getAttribute('aria-selected') === 'true'`);
    await press(' ', 32, `${q('[data-slot="multi-select-option"]')}.getAttribute('aria-selected') === 'false'`);
    await press('End', 35);
    assert.equal(await ev(`${all('[data-slot="multi-select-option"]')}[4].id === ${multiList}.getAttribute('aria-activedescendant')`), true);
    await press('ArrowUp', 38);
    assert.equal(await ev(`${all('[data-slot="multi-select-option"]')}[3].id === ${multiList}.getAttribute('aria-activedescendant')`), true);
    await press('Home', 36);
    assert.equal(await ev(`${multiList}.getAttribute('aria-activedescendant')`), first);
    await press('ArrowDown', 40);
    assert.equal(await ev(`${all('[data-slot="multi-select-option"]')}[1].id === ${multiList}.getAttribute('aria-activedescendant')`), true);
    await wait(`document.activeElement === ${multiList}`);
    await press('Escape', 27, `${trigger}.getAttribute('aria-expanded') === 'false'`);
    await wait(`document.activeElement === ${trigger}`);
  });
  await story('components-multiselect--오류');
  await check('MultiSelect Field 오류·필수·설명 배선', async () => {
    assert.equal(await ev(`${trigger}.id === ${q('[data-slot="field-label"]')}.htmlFor`), true);
    assert.equal(await ev(`${trigger}.getAttribute('aria-invalid')`), 'true');
    // 트리거 button 은 aria-required 를 받지 않는다(axe aria-allowed-attr) — 필수는 목록(listbox)과 라벨 '필수 입력'이 싣는다.
    assert.equal(await ev(`${trigger}.hasAttribute('aria-required')`), false);
    assert.equal(await ev(`${trigger}.getAttribute('aria-describedby') === ${q('[data-slot="field-error"]')}.id`), true);
  });
  await story('components-multiselect--필드');
  await check('FormFlow MultiSelect 닫힌 Enter 열기·선택 후 머무름·Escape·Tab 이탈', async () => {
    await focus(trigger); await press('Enter', 13, `${multiList} && document.activeElement === ${multiList}`);
    assert.equal(await ev(`${trigger}.hasAttribute('data-form-control')`), false);
    assert.equal(await ev(`${multiList}.getAttribute('aria-required')`), 'true', '필수는 목록(role=listbox)이 갖는다');
    await press('Enter', 13); await wait(`document.activeElement === ${multiList}`);
    assert.equal(await ev(`${trigger}.getAttribute('aria-expanded')`), 'true');
    await press('Escape', 27, `${trigger}.getAttribute('aria-expanded') === 'false'`);
    await wait(`document.activeElement === ${trigger}`);
    await press('Tab', 9, `document.activeElement === ${q('input[aria-label="다음 입력"]')}`);
  });

  for (const name of ['다중선택', '다중선택-많음', '다중선택-한글조합'])
    await check(`Combobox ${name}: 스토리 완료`, () => story(`components-combobox--${name}`));
  await story('components-combobox--다중선택');
  for (const [n, expected] of [[1, 38], [2, 38], [3, 38], [4, 68], [8, 68], [12, 68]]) {
    await check(`320px: 칩 ${n}개 컨트롤 높이 ${expected}px·제거 타깃 ≥24px`, async () => {
      await count(n);
      const state = await ev(`(() => { const node = ${control}, area = ${area}; return {
        width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height,
        client: area.clientHeight, scroll: area.scrollHeight, overflow: getComputedStyle(area).overflowY,
        targets: ${chips}.map(node => { const r = node.getBoundingClientRect(); return { w: r.width, h: r.height }; }) }; })()`);
      measurements.push({ count: n, ...state });
      assert.equal(state.width, 320); assert.equal(state.height, expected);
      assert.ok(state.targets.every(target => target.w >= 24 && target.h >= 24));
      if (n >= 8) { assert.equal(state.overflow, 'auto'); assert.ok(state.scroll > state.client); }
    });
  }
  await check('칩 5개가 실제 Tab 탐색에서 정지점 하나·입력 다음 칸으로 이동', async () => {
    await count(5); await focus(q('[data-probe="before-chips"]'));
    await press('Tab', 9, `${chips}.includes(document.activeElement)`);
    assert.equal(await ev(`${chips}.filter(node => node.tabIndex === 0).length`), 1);
    await press('Tab', 9, `document.activeElement === ${input}`);
    await press('Tab', 9, `document.activeElement === ${q('[data-probe="after-chips"]')}`);
  });
  await check('칩 좌우 화살표·Delete·Backspace 제거 뒤 이웃 포커스·마지막은 입력', async () => {
    await count(5); await focus(`${chips}[0]`);
    await press('ArrowRight', 39, `document.activeElement === ${chips}[1]`);
    await press('ArrowLeft', 37, `document.activeElement === ${chips}[0]`);
    const nextName = await ev(`${chips}[1].getAttribute('aria-label')`);
    await press('Delete', 46, `${chipCount} === 4`);
    await wait(`document.activeElement?.getAttribute('aria-label') === ${JSON.stringify(nextName)}`);
    await focus(`${chips}[3]`);
    const prevName = await ev(`${chips}[2].getAttribute('aria-label')`);
    await press('Backspace', 8, `${chipCount} === 3`);
    await wait(`document.activeElement?.getAttribute('aria-label') === ${JSON.stringify(prevName)}`);
    await count(1); await focus(`${chips}[0]`);
    await press('Delete', 46, `${chipCount} === 0`); await wait(`document.activeElement === ${input}`);
  });
  await check('빈 입력 Backspace 첫 회 강조·둘째 제거·다른 키는 강조 해제', async () => {
    await count(5); await focus(input);
    await press('Backspace', 8, `!!${q('[data-slot="combobox-chip"][data-armed]')}`);
    assert.equal(await ev(chipCount), 5); await wait(`document.activeElement === ${input}`);
    await press('ArrowLeft', 37); assert.equal(await ev(`!!${q('[data-slot="combobox-chip"][data-armed]')}`), false);
    await press('Backspace', 8); assert.equal(await ev(chipCount), 5);
    await press('Backspace', 8, `${chipCount} === 4`); await wait(`document.activeElement === ${input}`);
  });
  await check('다중 Combobox Field 배선·단 하나의 combobox·선택 뒤 열림과 포커스 유지', async () => {
    await count(0); await focus(input);
    assert.equal(await ev(`${input}.id === ${q('[data-slot="field-label"]')}.htmlFor`), true);
    assert.equal(await ev(`${input}.getAttribute('aria-required')`), 'true');
    assert.equal(await ev(`${input}.getAttribute('aria-describedby') === ${q('[data-slot="field-description"]')}.id`), true);
    assert.equal(await ev(`${input}.hasAttribute('data-form-control')`), false);
    await press('Enter', 13, `!!${comboList}`);
    assert.equal(await ev(`${all('[role="combobox"]')}.length`), 1);
    assert.equal(await ev(`${comboList}.getAttribute('role')`), 'listbox');
    assert.equal(await ev(`${comboList}.getAttribute('aria-multiselectable')`), 'true');
    await press('Enter', 13, `${chipCount} === 1`);
    assert.equal(await ev(`${input}.getAttribute('aria-expanded')`), 'true');
    assert.equal(await ev(`${options}.length`), 13);
    assert.equal(await ev(`${options}[0].getAttribute('aria-selected')`), 'true');
    assert.equal(await ev(`!!${options}[0].querySelector('svg')`), true);
    await wait(`document.activeElement === ${input}`);
    await ev(`${options}[1].click()`); await wait(`${chipCount} === 2`);
    assert.equal(await ev(`${input}.getAttribute('aria-expanded')`), 'true');
    await press('Escape', 27, `${input}.getAttribute('aria-expanded') === 'false'`);
    await wait(`document.activeElement === ${input}`);
  });
  await check('긴 칩 라벨 말줄임·title·구체적 해제 접근명', async () => {
    await openCombo(); await ev(`${options}.at(-1).click()`);
    await wait(`${chipCount} === 3`);
    // 접근명은 칩 껍데기가 아니라 **제거 버튼**이 갖는다. 그래야 "무엇을 지우는지" 가 읽힌다.
    assert.equal(await ev(`[...document.querySelectorAll('[data-slot="combobox-chip-remove"]')].at(-1).getAttribute('aria-label')`),
      '아주 긴 이름을 가진 사업장 전체 라벨 보존 확인용 서울특별시 강남구 제2물류센터 선택 해제');
    const label = q('[data-slot="combobox-chip"]:last-of-type .ds-combobox-chip-label');
    assert.equal(await ev(`${label}.title`), '아주 긴 이름을 가진 사업장 전체 라벨 보존 확인용 서울특별시 강남구 제2물류센터');
    assert.equal(await ev(`getComputedStyle(${label}).textOverflow`), 'ellipsis');
    assert.equal(await ev(`${label}.scrollWidth > ${label}.clientWidth`), true);
    await press('Escape', 27);
  });
  await story('components-combobox--다중선택-한글조합'); await openCombo();
  await ev(`window.__multiComposing = false; ${input}.addEventListener('compositionstart', () => window.__multiComposing = true);
    ${input}.addEventListener('compositionend', () => window.__multiComposing = false);`);
  for (const text of ['ㅅ', '서', '설', '서울']) {
    await check(`다중 IME ${text}: 결과 유지·빈 문구 억제`, async () => {
      await compose(text); assert.equal(await ev('window.__multiComposing'), true);
      assert.ok(await ev(`${options}.length > 0`));
      assert.equal(await ev(`!!${q('[data-slot="combobox-empty"]')}`), false);
    });
  }
  await check('조합 중 Enter·화살표·Escape·Backspace가 선택·활성·강조를 바꾸지 않음', async () => {
    const active = await ev(`${input}.getAttribute('aria-activedescendant')`);
    const before = await ev(chipCount);
    for (const [key, code] of [['Enter', 13], ['ArrowDown', 40], ['ArrowUp', 38], ['Escape', 27], ['Backspace', 8]]) {
      await press(key, code); assert.equal(await ev(chipCount), before);
      assert.equal(await ev(`${input}.getAttribute('aria-activedescendant')`), active);
      assert.equal(await ev(`!!${q('[data-slot="combobox-chip"][data-armed]')}`), false);
      assert.equal(await ev(`${input}.getAttribute('aria-expanded')`), 'true');
    }
    await cdp('Input.insertText', { text: '서울' }); await wait('!window.__multiComposing');
  });
  await check('빈 입력도 조합 중 Backspace 강조·삭제 금지', async () => {
    await query('');
    await ev(`${input}.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))`);
    await press('Backspace', 8); assert.equal(await ev(chipCount), 1);
    assert.equal(await ev(`!!${q('[data-slot="combobox-chip"][data-armed]')}`), false);
    await ev(`${input}.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))`);
  });
  await check('다중 검색 초성·확정된 결과 없음·Escape와 Tab 이탈', async () => {
    await query('ㅅㅇ'); assert.ok(await ev(`${options}.length > 0`));
    await query('없는창고xyz'); await wait(`!!${q('[data-slot="combobox-empty"]')}`);
    assert.equal(await ev(`${options}.length`), 0);
    await press('Enter', 13); await wait(`document.activeElement === ${input}`);
    await press('Tab', 9, `document.activeElement === ${q('[data-probe="after-chips"]')}`);
    await wait(`${input}.getAttribute('aria-expanded') === 'false'`);
  });
  await story('components-combobox--기본');
  await check('multiple 미지정 단일 Combobox 선택·닫힘·트리거 복귀 유지', async () => {
    const singleTrigger = q('[data-slot="combobox-trigger"]');
    await ev(`${singleTrigger}.click()`); await wait(`${input} && document.activeElement === ${input}`);
    await ev(`${options}[0].click()`);
    await wait(`${singleTrigger}.getAttribute('aria-expanded') === 'false' && document.activeElement === ${singleTrigger}`);
    assert.equal(await ev(`${q('[data-slot="combobox-demo-value"]')}.textContent`), 'location-0');
    assert.equal(await ev(`!!${control}`), false);
  });
  await check('모든 상호작용 후 콘솔 오류 0건', async () => assert.deepEqual(browser.errors(), []));
} finally {
  writeFileSync(`${OUT}/results.json`, JSON.stringify({ results, measurements, errors: browser.errors() }, null, 2));
  browser.close();
}
const failed = results.filter(result => !result.pass).length;
console.log(`\n${results.length}건 검사 · ${results.length - failed}건 통과 · ${failed}건 실패`);
if (failed) process.exitCode = 1;
