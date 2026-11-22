// R18: 브라우저 실행은 사용자 pnpm qa에 맡긴다. 기존 19·29건 하네스는 변경하지 않는다.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, CANVAS, actions } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/create';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ outDir: OUT });
const { cdp, ev, sleep } = browser;
const { open } = storybook(browser);
const results = [], measurements = [];
const probe = name => `${CANVAS}.querySelector('[data-probe="${name}"]')`;
const form = probe('order-form');
const trigger = `${form}?.querySelector('[data-slot="combobox-trigger"]')`;
const comboInput = `document.querySelector('[data-slot="combobox-input"]')`;
const radio = `${form}?.querySelector('[data-slot="radio-group"]')`;
const outsideTrigger = `${probe('outside-form')}?.querySelector('[data-slot="combobox-trigger"]')`;
async function wait(expression) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await ev(expression)) return;
    await sleep(50);
  }
  throw new Error(`조건 대기 실패: ${expression}`);
}
async function focus(expression) {
  await ev(`${expression}.focus()`);
  await wait(`document.activeElement === ${expression}`);
}
const act = actions(browser);
// '\n'은 네이티브 Enter 클릭을 만들지 않는다. 실제 키 입력의 CR을 보낸다 (§17).
const enter = (until) => act.press('Enter', { until, wait });
const press = (name, keyCode, until) => act.press(name, { keyCode, raw: true, text: null, until, wait });
async function setValue(name, value) {
  await ev(`(() => { const node = ${probe(name)};
    const prototype = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, ${JSON.stringify(value)});
    node.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await wait(`${probe(name)}.value === ${JSON.stringify(value)}`);
}
async function story(id = 'qa-createscreen--등록화면') {
  // 다음 스토리에서 resetErrors 되기 전에 직전 오류도 검사한다.
  assert.deepEqual(browser.errors(), [], '직전 스토리 콘솔 오류');
  const result = await open(id);
  assert.equal(result.sbError, null);
  assert.equal(await ev(`${CANVAS}.dataset.playComplete`), 'true');
  assert.deepEqual(browser.errors(), [], '스토리 콘솔 오류');
}
async function check(label, run) {
  try { await run(); results.push({ label, pass: true }); console.log(`✓ ${label}`); }
  catch (error) {
    results.push({ label, pass: false, error: error.message });
    console.error(`✗ ${label}: ${error.message}`); await browser.shot(`failure-${results.length}`);
  }
}
async function chooseSite() {
  await focus(trigger);
  await enter(`${comboInput} && document.activeElement === ${comboInput}`);
  await wait(`!!document.querySelector('[data-slot="combobox-option"][aria-selected="true"]')`);
  await enter(`!${comboInput} && document.activeElement === ${probe('qty')}`);
}
async function fillValid() {
  await setValue('name', '신규 상품'); await chooseSite(); await setValue('owner', '김민수');
}
const currentStop = `(() => {
  const node = document.activeElement;
  if (node?.matches('[data-slot="combobox-trigger"]')) return '사업장(트리거)';
  if (node?.matches('[data-slot="combobox-input"]')) return '사업장(검색 입력)';
  if (node?.closest('[data-slot="radio-group"]')) return '배송';
  return ({ name: '상품명', qty: '수량', notifications: '알림', memo: '비고', owner: '담당자', save: '저장' })[node?.dataset.probe] ?? node?.tagName;
})()`;

try {
  await check('상품명→사업장 선택→배송→알림→비고→담당자→저장 전체 경로 (비고 이탈은 Tab)', async () => {
    await story(); await setValue('name', '경로 확인 상품'); await focus(probe('name'));
    const path = [await ev(currentStop)], keys = [];
    // 중간 포커스도 저장한다. 안정된 시점만 보면 트리거 복귀 뒤 재이동하는 회귀를 놓친다.
    await ev(`(() => {
      window.__createFocus = [];
      document.addEventListener('focusin', event => window.__createFocus.push({
        slot: event.target.dataset.slot ?? '', probe: event.target.dataset.probe ?? '',
      }));
    })()`);
    const record = async key => { keys.push(key); path.push(await ev(currentStop)); };
    try {
      await enter(`document.activeElement === ${trigger}`); await record('Enter');
      await enter(`${comboInput} && document.activeElement === ${comboInput}`); await record('Enter(열기)');
      await wait(`!!document.querySelector('[data-slot="combobox-option"][aria-selected="true"]')`);
      await enter(`!${comboInput} && document.activeElement === ${probe('qty')}`); await record('Enter(고르기)');
      await enter(`${radio}.contains(document.activeElement)`); await record('Enter');
      await enter(`document.activeElement === ${probe('notifications')}`); await record('Enter');
      await enter(`document.activeElement === ${probe('memo')}`); await record('Enter');
      const checked = await ev(`${probe('notifications')}.getAttribute('aria-checked')`);
      assert.equal(checked, 'false', '이동 중 알림 값이 바뀌었다');
      // Enter 이동의 유일한 중단점은 명세가 보존하는 textarea 줄바꿈이다.
      await enter(`document.activeElement === ${probe('memo')} && ${probe('memo')}.value === '\\n'`);
      keys.push('Enter(줄바꿈·포커스 유지)');
      await press('Tab', 9, `document.activeElement === ${probe('owner')}`); await record('Tab(비고 이탈)');
      // 마지막 칸의 Enter 는 §11.5 의 암묵적 제출이다. 저장 버튼으로 포커스를 옮기고
      // Enter 를 또 받으면 연속 등록이 레코드마다 Enter 한 번을 더 쓴다.
      assert.deepEqual(path, ['상품명', '사업장(트리거)', '사업장(검색 입력)', '수량', '배송', '알림', '비고', '담당자']);
      assert.ok(path.every((stop, index) => index === 0 || stop !== path[index - 1]), '같은 정지점 반복');
      const raw = await ev('window.__createFocus');
      assert.equal(raw.filter(item => item.slot === 'combobox-trigger').length, 1, '선택 후 트리거로 되돌아왔다');
      assert.deepEqual(raw.filter(item => item.slot.startsWith('combobox-')).map(item => item.slot), ['combobox-trigger', 'combobox-input'], '콤보박스 왕복 고리');
      // 담당자에서 Enter 한 번으로 제출돼 목록으로 돌아온다. 저장 버튼을 거치지 않는다.
      await enter(`!!${probe('order-list')}`);
      await wait(`!!document.querySelector('[data-sonner-toast]')`);
      assert.deepEqual(
        (await ev('window.__createFocus')).filter(item => item.probe === 'save').map(item => item.probe), [],
        '마지막 칸 Enter 가 제출 대신 저장 버튼으로 포커스를 옮겼다');
    } finally {
      measurements.push({ label: '전체 포커스 경로', path, keys, raw: await ev('window.__createFocus') });
      console.log(`  포커스: ${path.join(' → ')}`);
    }
  });

  await check('Switch Enter는 값 보존·비고 이동, Space는 토글', async () => {
    await story(); await focus(probe('notifications'));
    const before = await ev(`${probe('notifications')}.getAttribute('aria-checked')`);
    await enter(`document.activeElement === ${probe('memo')}`);
    assert.equal(await ev(`${probe('notifications')}.getAttribute('aria-checked')`), before);
    await focus(probe('notifications'));
    // Space 토글은 네이티브 keyup에서 발생하므로 keydown·대기·keyup 후 별도로 기다린다.
    await press(' ', 32);
    await wait(`${probe('notifications')}.getAttribute('aria-checked') !== ${JSON.stringify(before)}`);
  });
  await check('RadioGroup Enter는 다음 칸, ArrowRight는 선택 변경', async () => {
    await story(); await focus(probe('normal'));
    await enter(`document.activeElement === ${probe('notifications')}`);
    assert.equal(await ev(`${probe('normal')}.getAttribute('aria-checked')`), 'true');
    await focus(probe('normal'));
    await press('ArrowRight', 39, `${probe('express')}.getAttribute('aria-checked') === 'true' && document.activeElement === ${probe('express')}`);
  });
  await check('Combobox 선택 직후 수량 포커스·트리거 재방문 없음', async () => {
    await story(); await chooseSite(); await wait(`document.activeElement === ${probe('qty')}`);
  });
  await check('FormFlow 안 조합 중 Enter는 선택·이동하지 않고 확정 뒤에만 수량 이동', async () => {
    await story(); await focus(trigger);
    await enter(`${comboInput} && document.activeElement === ${comboInput}`);
    await cdp('Input.imeSetComposition', { text: '서', selectionStart: 1, selectionEnd: 1 });
    await wait(`${comboInput}.value === '서'`);
    // 조합 중에는 문자 입력을 추가하지 않고 IME 확정 키다운만 보낸다 (기존 R17과 동일).
    await press('Enter', 13);
    await wait(`${comboInput} && document.activeElement === ${comboInput}`);
    assert.equal(await ev(`${trigger}.getAttribute('aria-expanded')`), 'true');
    assert.equal(await ev(`${trigger}.hasAttribute('data-placeholder')`), true);
    await cdp('Input.insertText', { text: '서' });
    await wait(`!!document.querySelector('[data-slot="combobox-option"][aria-selected="true"]')`);
    await enter(`!${comboInput} && document.activeElement === ${probe('qty')}`);
  });
  await check('FormFlow 밖 Combobox는 선택 후 트리거 복귀', async () => {
    await story(); await focus(outsideTrigger);
    await enter(`${comboInput} && document.activeElement === ${comboInput}`);
    await wait(`!!document.querySelector('[data-slot="combobox-option"][aria-selected="true"]')`);
    await enter(`!${comboInput} && document.activeElement === ${outsideTrigger}`);
  });
  await check('FormFlow 밖 Switch Enter·Space와 라디오 화살표 동작 보존', async () => {
    await story();
    await focus(probe('outside-switch'));
    await enter(`${probe('outside-switch')}.getAttribute('aria-checked') === 'true'`);
    await press(' ', 32);
    await wait(`${probe('outside-switch')}.getAttribute('aria-checked') === 'false'`);
    await focus(probe('outside-normal'));
    await enter(); await wait(`document.activeElement === ${probe('outside-normal')}`);
    assert.equal(await ev(`${probe('outside-normal')}.getAttribute('aria-checked')`), 'true');
    await press('ArrowRight', 39, `${probe('outside-express')}.getAttribute('aria-checked') === 'true'`);
  });
  await check('실제 액션 버튼은 Enter 클릭·포커스 유지', async () => {
    await story(); await focus(probe('action'));
    await enter(`${probe('action-result')}.textContent.includes('1회')`);
    await wait(`document.activeElement === ${probe('action')}`);
    assert.ok(await ev(`!!${probe('order-form')}`), '액션이 주문을 제출했다');
  });
  await check('미입력 제출은 첫 상품명 오류로 이동', async () => {
    await story(); await focus(probe('save')); await enter(`document.activeElement === ${probe('name')}`);
    assert.equal(await ev(`${probe('name')}.getAttribute('aria-invalid')`), 'true');
  });
  await check('첫 오류가 Combobox여도 트리거로 포커스 이동', async () => {
    await story(); await setValue('name', '상품'); await focus(probe('save'));
    await enter(`document.activeElement === ${trigger} && ${trigger}.getAttribute('aria-invalid') === 'true'`);
  });
  await check('Textarea Enter·Shift+Enter는 줄바꿈, Ctrl+Enter는 저장', async () => {
    await story(); await fillValid(); await focus(probe('memo'));
    await cdp('Input.insertText', { text: '첫 줄' });
    await enter(`${probe('memo')}.value === '첫 줄\\n' && document.activeElement === ${probe('memo')}`);
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, modifiers: 8, text: '\r' });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, modifiers: 8 });
    await wait(`${probe('memo')}.value === '첫 줄\\n\\n' && document.activeElement === ${probe('memo')}`);
    await cdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, modifiers: 2 });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, modifiers: 2 });
    await wait(`!!${probe('order-list')}`);
  });
  await check('연속 등록은 저장 뒤 첫 칸 복귀·횟수 증가', async () => {
    await story('qa-createscreen--연속등록');
    for (let count = 1; count <= 2; count++) {
      await fillValid(); await focus(probe('save'));
      await enter(`${probe('saved-count')}.textContent === '등록 ${count}건' && document.activeElement === ${probe('name')}`);
      assert.equal(await ev(`${probe('name')}.value`), '');
    }
  });
  await check('목록→등록→저장→목록·토스트·새 행 재방문 마커·필터 보존', async () => {
    await story('qa-flow--목록등록왕복');
    await setValue('list-filter', '상품');
    await ev(`${probe('new-order')}.click()`); await wait(`!!${form}`);
    await fillValid(); await focus(probe('save')); await enter(`!!${probe('order-list')}`);
    await wait(`!!document.querySelector('[data-sonner-toast]') && ${CANVAS}.querySelector('[data-slot="data-table-row"][data-revisited]')?.textContent.includes('신규 상품')`);
    assert.equal(await ev(`${probe('list-filter')}.value`), '상품');
    assert.ok(await ev(`document.querySelector('[data-sonner-toast]').textContent.includes('주문을 저장했습니다')`));
  });
  await check('작성 중 Breadcrumb 이탈은 AlertDialog·취소 초기 포커스·계속 작성 보존', async () => {
    await story('qa-flow--목록등록왕복');
    await ev(`${probe('new-order')}.click()`); await wait(`!!${form}`); await setValue('name', '작성 중');
    await ev(`${probe('back-to-list')}.click()`);
    await wait(`!!document.querySelector('[role="alertdialog"]') && document.activeElement === document.querySelector('[data-probe="keep-writing"]')`);
    await ev(`document.querySelector('[data-probe="keep-writing"]').click()`);
    await wait(`!document.querySelector('[role="alertdialog"]')`);
    assert.equal(await ev(`${probe('name')}.value`), '작성 중');
    await ev(`${probe('back-to-list')}.click()`);
    await wait(`!!document.querySelector('[role="alertdialog"]')`);
    await ev(`document.querySelector('[data-probe="discard"]').click()`); await wait(`!!${probe('order-list')}`);
  });
  await check('깨끗한 이탈은 확인 없이 필터·스크롤·기존 행 마커 복원', async () => {
    await story('qa-flow--목록등록왕복'); await setValue('list-filter', '기존');
    const scroll = `${CANVAS}.querySelector('[data-slot="data-table-scroll"]')`;
    await wait(`${scroll}.scrollHeight > ${scroll}.clientHeight`);
    await ev(`${scroll}.scrollTop = 180`);
    await wait(`${scroll}.scrollTop > 0`);
    const before = await ev(`${scroll}.scrollTop`);
    assert.ok(before > 0, '스크롤 복원을 검사할 수 있어야 한다');
    await ev(`${probe('new-order')}.click()`); await wait(`!!${form}`);
    await ev(`${probe('back-to-list')}.click()`); await wait(`!!${probe('order-list')}`);
    await wait(`${scroll}.scrollTop === ${before}`);
    assert.equal(await ev(`${probe('list-filter')}.value`), '기존');
    assert.equal(await ev(`!!document.querySelector('[role="alertdialog"]')`), false);
    assert.ok(await ev(`!!${CANVAS}.querySelector('[data-slot="data-table-row"][data-revisited]')`));
  });
  await check('새 행과 불일치하는 필터도 보존하고 새 행 함께 표시', async () => {
    await story('qa-flow--목록등록왕복'); await setValue('list-filter', '기존');
    await ev(`${probe('new-order')}.click()`); await wait(`!!${form}`);
    await fillValid(); await focus(probe('save')); await enter(`!!${probe('order-list')}`);
    await wait(`${probe('list-filter')}.value === '기존' && ${CANVAS}.querySelector('[data-slot="data-table-row"][data-revisited]')?.textContent.includes('신규 상품')`);
  });
  await check('전체 콘솔 오류 0건', async () => assert.deepEqual(browser.errors(), []));
} finally {
  browser.close();
  writeFileSync(`${OUT}/results.json`, JSON.stringify({ results, measurements }, null, 2));
}
const failed = results.filter(result => !result.pass);
console.log(`검사 ${results.length}건 · 통과 ${results.length - failed.length} · 실패 ${failed.length}`);
process.exitCode = failed.length ? 1 : 0;
