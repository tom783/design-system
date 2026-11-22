// R16: 작성만 수행. 사용자가 pnpm qa로 실행한다. 모든 실제 브라우저 조작은 browser.mjs를 거친다.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, CANVAS } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/input';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ outDir: OUT });
const { cdp, ev, sleep } = browser;
const { open } = storybook(browser);
const results = [];
const q = selector => `${CANVAS}.querySelector(${JSON.stringify(selector)})`;
const all = selector => `${CANVAS}.querySelectorAll(${JSON.stringify(selector)})`;
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
    console.error(`✗ ${label}: ${error.message}`);
    await browser.shot(`failure-${results.length}`);
  }
}
async function focus(selector) {
  await ev(`${q(selector)}.focus()`);
  await wait(`document.activeElement === ${q(selector)}`);
}
async function click(selector) {
  await ev(`${q(selector)}.click()`);
}
async function story(id, extra = '') {
  assert.deepEqual(browser.errors(), [], '직전 스토리 콘솔 오류');
  const result = await open(id, { extra });
  assert.equal(result.sbError, null);
  assert.equal(await ev(`${CANVAS}.dataset.playComplete`), 'true', 'play 완료 표식');
  assert.deepEqual(browser.errors(), [], '스토리 콘솔 오류');
}
async function keyDown(key, code, modifiers = 0) {
  await cdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code: key === ' ' ? 'Space' : key,
    windowsVirtualKeyCode: code, modifiers });
}
async function keyUp(key, code, modifiers = 0) {
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key === ' ' ? 'Space' : key,
    windowsVirtualKeyCode: code, modifiers });
}
async function setValue(selector, value, composing = false) {
  await ev(`(() => { const node = ${q(selector)};
    const proto = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, ${JSON.stringify(value)});
    node.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', isComposing: ${composing} }));
  })()`);
}
async function arrow(index, key, code) {
  // Radix가 document keydown으로 세운 플래그는 비동기 포커스 처리까지 살아 있어야 한다.
  // keydown/keyup을 붙여 보내면 실제로 멀쩡한 선택 동작이 거짓 실패한다.
  await keyDown(key, code);
  try {
    await wait(`document.activeElement === ${all('[role="radio"]')}[${index}]
      && ${all('[role="radio"]')}[${index}].getAttribute('aria-checked') === 'true'`);
  } finally { await keyUp(key, code); }
}

try {
  // 모든 새 스토리의 play 완료를 본다. 이후 상호작용은 원복된 상태에서 다시 시작한다.
  for (const [group, names] of [
    ['input', ['숫자휠가드', '비밀번호', '검색', '이메일', '전화번호', '날짜비권장', '주소']],
    ['textarea', ['고정행', '자동높이', '높이상한', '폼흐름']],
    ['radiogroup', ['기본', '레이블클릭', '비활성항목']],
    ['switch', ['켜짐꺼짐', '비활성', '레이블나란히']],
  ]) for (const name of names) {
    await check(`${group}/${name} play·콘솔 오류 0건`, () => story(`components-${group}--${name}`));
  }

  await story('components-input--숫자휠가드');
  await check('number 실제 휠에도 값 유지·페이지는 스크롤', async () => {
    await focus('input[type="number"]');
    const before = await ev(`({ value: ${q('input')}.value, y: window.scrollY })`);
    const point = await ev(`(() => { const r = ${q('input')}.getBoundingClientRect(); return { x:r.left+r.width/2, y:r.top+r.height/2 }; })()`);
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', ...point, deltaX: 0, deltaY: 240 });
    await wait(`window.scrollY > ${before.y}`);
    assert.equal(await ev(`${q('input')}.value`), before.value);
  });

  await story('components-input--비밀번호');
  await check('password 보조 버튼 공간을 입력 안쪽에 예약', async () => {
    assert.equal(await ev(`(() => { const input = ${q('input')}, action = ${q('[data-slot="input-action"]')};
      return parseFloat(getComputedStyle(input).paddingInlineEnd) > action.getBoundingClientRect().width; })()`), true);
  });
  await check('password 보기·숨기기 type·접근명·pressed 함께 전환', async () => {
    await click('[aria-label="비밀번호 표시"]');
    await wait(`${q('input')}.type === 'text'`);
    assert.equal(await ev(`${q('[aria-label="비밀번호 숨기기"]')}.getAttribute('aria-pressed')`), 'true');
    assert.equal(await ev(`${q('input')}.value`), 'safe-password');
    await click('[aria-label="비밀번호 숨기기"]');
    await wait(`${q('input')}.type === 'password'`);
    assert.equal(await ev(`${q('[aria-label="비밀번호 표시"]')}.getAttribute('aria-pressed')`), 'false');
  });

  await story('components-input--검색');
  for (const [index, mode] of [[0, '제어'], [1, '비제어']]) {
    await check(`search ${mode} 비움·버튼 제거·입력 포커스·재입력`, async () => {
      const input = `${all('input[type="search"]')}[${index}]`;
      await ev(`${input}.parentElement.querySelector('button').click()`);
      await wait(`${input}.value === '' && document.activeElement === ${input}`);
      assert.equal(await ev(`!!${input}.parentElement.querySelector('[aria-label="검색어 지우기"]')`), false);
      if (index === 0) assert.equal(await ev(`${q('output')}.textContent`), '검색어 없음', '부모 상태에도 onChange 전달');
      await cdp('Input.insertText', { text: '새 검색어' });
      await wait(`!!${input}.parentElement.querySelector('[aria-label="검색어 지우기"]')`);
    });
  }
  await check('search form reset도 지우기 버튼과 값 동기화', async () => {
    await ev(`${all('input[type="search"]')}[1].parentElement.querySelector('button').click()`);
    await click('button[type="reset"]');
    await wait(`${all('input[type="search"]')}[1].value === '주문'`);
    await wait(`!!${all('input[type="search"]')}[1].parentElement.querySelector('[aria-label="검색어 지우기"]')`);
  });

  await story('components-textarea--고정행');
  await check('Textarea rows 기본 3·수동 resize 보존', async () => {
    assert.equal(await ev(`${q('textarea')}.rows`), 3);
    assert.equal(await ev(`getComputedStyle(${q('textarea')}).resize`), 'vertical');
  });
  await story('components-textarea--자동높이');
  await check('autoGrow 여러 줄 확장·삭제 시 수축', async () => {
    const before = await ev(`${q('textarea')}.getBoundingClientRect().height`);
    await focus('textarea');
    await cdp('Input.insertText', { text: '첫 줄\n둘째 줄\n셋째 줄\n넷째 줄' });
    await wait(`${q('textarea')}.getBoundingClientRect().height > ${before}`);
    assert.equal(await ev(`getComputedStyle(${q('textarea')}).resize`), 'none');
    await setValue('textarea', '');
    await wait(`${q('textarea')}.getBoundingClientRect().height === ${before}`);
  });
  await check('IME 조합 중에도 높이 증가·확정 시 안정', async () => {
    const before = await ev(`${q('textarea')}.getBoundingClientRect().height`);
    await ev(`${q('textarea')}.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))`);
    await setValue('textarea', '한글 조합 중 '.repeat(30), true);
    await wait(`${q('textarea')}.getBoundingClientRect().height > ${before}`);
    const composing = await ev(`${q('textarea')}.getBoundingClientRect().height`);
    await ev(`${q('textarea')}.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '중' }))`);
    await setValue('textarea', '한글 조합 중 '.repeat(30));
    assert.equal(await ev(`${q('textarea')}.getBoundingClientRect().height`), composing);
    await setValue('textarea', '');
  });
  await story('components-textarea--높이상한');
  await check('autoGrow maxHeight 120px에서 멈추고 내부 스크롤', async () => {
    await focus('textarea');
    await cdp('Input.insertText', { text: Array(30).fill('한 줄 메모').join('\n') });
    await wait(`${q('textarea')}.scrollHeight > ${q('textarea')}.clientHeight`);
    assert.equal(await ev(`${q('textarea')}.getBoundingClientRect().height`), 120);
    assert.equal(await ev(`getComputedStyle(${q('textarea')}).overflowY`), 'auto');
    assert.equal(await ev(`(() => { const n = ${q('textarea')}; n.scrollTop = 100; return n.scrollTop > 0; })()`), true);
  });

  await story('components-textarea--폼흐름');
  // CDP 로 textarea 에 줄바꿈을 넣으려면 **text 가 '\r' 이어야 한다.** '\n' 은 아무 일도
  // 하지 않는다(실측). char + '\n' 으로 쓴 첫 판이 그래서 거짓 실패했다.
  const pressEnter = async (modifiers = 0) => {
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter',
      windowsVirtualKeyCode: 13, text: '\r', modifiers });
    await sleep(80);
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter',
      windowsVirtualKeyCode: 13, modifiers });
    await sleep(120);
  };
  await check('FormFlow Textarea Enter는 실제 줄바꿈·포커스 유지·제출 없음', async () => {
    await focus('textarea');
    await ev(`(() => { const node = ${q('textarea')};
      const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      set.call(node, ''); node.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    await cdp('Input.insertText', { text: '첫 줄' });
    await pressEnter();
    await cdp('Input.insertText', { text: '둘째 줄' });
    await wait(`${q('textarea')}.value === '첫 줄\\n둘째 줄' && document.activeElement === ${q('textarea')}`);
    assert.equal(await ev(`${q('output')}.textContent`), '0');
  });
  // §11.5 — textarea 에서 Shift+Enter 는 **줄바꿈**이다. 칸을 넘기지 않는다.
  // 여러 줄 입력에서 널리 쓰는 줄바꿈 습관을 빼앗으면 문장 중간에 포커스가 뒤로 튄다.
  await check('FormFlow Textarea Shift+Enter도 줄바꿈이고 칸을 넘기지 않는다', async () => {
    await pressEnter(8);
    await wait(`document.activeElement === ${q('textarea')}`);
    assert.equal(await ev(`${q('textarea')}.value`), '첫 줄\n둘째 줄\n');
    assert.equal(await ev(`${q('output')}.textContent`), '0');
  });

  await story('components-radiogroup--기본');
  await check('RadioGroup role·화살표 포커스와 선택 이동·끝에서 순환', async () => {
    assert.equal(await ev(`!!${q('[role="radiogroup"]')}`), true);
    await focus('[role="radio"]');
    await arrow(1, 'ArrowRight', 39);
    await arrow(2, 'ArrowRight', 39);
    await arrow(0, 'ArrowRight', 39);
    await arrow(2, 'ArrowLeft', 37);
    assert.equal(await ev(`${all('[role="radio"][aria-checked="true"]')}.length`), 1);
    assert.equal(await ev(`${all('[role="radio"][tabindex="0"]')}.length`), 1);
  });
  await check('RadioGroup Label 클릭으로 연결 항목 선택', async () => {
    await click('label[for="delivery-1"]');
    await wait(`${q('#delivery-1')}.getAttribute('aria-checked') === 'true'`);
    assert.equal(await ev(`!!${q('#delivery-1 [data-slot="radio-group-indicator"]')}`), true);
  });
  await story('components-radiogroup--비활성항목');
  await check('RadioGroup 화살표는 비활성 항목 건너뜀', async () => {
    await focus('[role="radio"]');
    await arrow(2, 'ArrowRight', 39);
    await click('label[for="delivery-1"]');
    assert.equal(await ev(`${q('#delivery-1')}.getAttribute('aria-checked')`), 'false');
  });

  await story('components-switch--켜짐꺼짐');
  await check('Switch button type·role·Space checked 전환·손잡이 이동', async () => {
    assert.equal(await ev(`${q('[role="switch"]')}.tagName`), 'BUTTON');
    assert.equal(await ev(`${q('[role="switch"]')}.type`), 'button');
    assert.equal(await ev(`!!${q('[role="switch"]')}.closest('form')`), false);
    const before = await ev(`${q('[data-slot="switch-thumb"]')}.getBoundingClientRect().x`);
    await focus('[role="switch"]');
    await keyDown(' ', 32); await sleep(80); await keyUp(' ', 32);
    await wait(`${q('[role="switch"]')}.getAttribute('aria-checked') === 'true'`);
    assert.ok(await ev(`${q('[data-slot="switch-thumb"]')}.getBoundingClientRect().x`) > before);
    await keyDown(' ', 32); await sleep(80); await keyUp(' ', 32);
    await wait(`${q('[role="switch"]')}.getAttribute('aria-checked') === 'false'`);
  });
  await check('Switch Label 클릭으로 토글·접근명 연결', async () => {
    assert.equal(await ev(`${q('[role="switch"]')}.labels[0].textContent`), '자동 재고 차감');
    await click('label');
    await wait(`${q('[role="switch"]')}.getAttribute('aria-checked') === 'true'`);
    await click('label');
    await wait(`${q('[role="switch"]')}.getAttribute('aria-checked') === 'false'`);
  });
  await story('components-switch--비활성');
  await check('비활성 Switch Label 클릭은 값을 바꾸지 않음', async () => {
    const before = await ev(`${q('[role="switch"]')}.getAttribute('aria-checked')`);
    await click('label');
    assert.equal(await ev(`${q('[role="switch"]')}.getAttribute('aria-checked')`), before);
    assert.equal(await ev(`${q('[role="switch"]')}.disabled`), true);
  });
  for (const id of ['components-input--비밀번호', 'components-textarea--자동높이', 'components-radiogroup--레이블클릭', 'components-switch--켜짐꺼짐']) {
    await check(`${id} 다크 play·콘솔 오류 0건`, () => story(id, '&globals=theme:dark'));
  }
  await check('콘솔 오류·페이지 예외 0건', async () => assert.deepEqual(browser.errors(), []));
} catch (error) {
  results.push({ label: '하네스 실행', pass: false, error: error.message });
  console.error(error.stack);
} finally {
  browser.close();
  writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
}
const failed = results.filter(result => !result.pass);
console.log(`검사 ${results.length}건 · 통과 ${results.length - failed.length} · 실패 ${failed.length}`);
process.exitCode = failed.length ? 1 : 0;
