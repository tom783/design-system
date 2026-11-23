// R15 상세 화면 검증. 실행은 pnpm qa --only detail-render-verify (서버·출처 확인은 run-all 이 한다).
// play는 모든 창을 닫고 끝난다. 아래 상호작용은 완료 후 창을 다시 열어 만든 상태만 검사한다.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, CANVAS, actions } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/detail';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ outDir: OUT });
const { ev, cdp, sleep } = browser;
const { open } = storybook(browser);
const results = [];
const detail = '[data-slot="dialog-content"]';
const alert = '[data-slot="alert-dialog-content"]';
const selected = '[data-slot="tabs-trigger"][aria-selected="true"]';
// Radix Tabs 는 onMouseDown 에서 onValueChange 를 부른다 (소스 확인).
// element.click() 은 click 만 보내므로 **선택이 바뀌지 않는다** — 이걸로 5건이 거짓 실패했다.
// 좌표 기반 CDP 클릭은 가로 스크롤 때문에 엉뚱한 곳을 누르므로 요소에 직접 보낸다.
const pickTab = (ev, tabs, index) => ev(`(() => { const t = ${tabs}[${index}];
  t.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
  return t.textContent.trim(); })()`);
// value는 Radix가 DOM에 내보내지 않으므로 탭은 표시 이름 또는 순서로 찾는다.
const tabs = `${CANVAS}.querySelectorAll('[data-slot="tabs-trigger"]')`;
async function wait(expression, label = expression) {
  for (let i = 0; i < 80; i++) { if (await ev(expression)) return; await sleep(50); }
  throw new Error(`조건 대기 실패: ${label}`);
}
async function check(label, run) {
  try { await run(); results.push({ label, pass: true }); console.log(`✓ ${label}`); }
  catch (error) {
    results.push({ label, pass: false, error: error.message }); console.error(`✗ ${label}: ${error.message}`);
    await browser.shot(`failure-${results.length}`);
  }
}
const act = actions(browser);
// Enter 도 text 없이 keydown 만: Radix Tabs 수동 활성화가 keydown 에서 일어나는지를 본다.
const key = (name, keyCode) => act.key(name, { keyCode, code: name, text: null });
async function press(selector) {
  await wait(`!!document.querySelector(${JSON.stringify(selector)})`);
  await ev(`document.querySelector(${JSON.stringify(selector)}).click()`);
}
// 좌표 클릭은 바깥 클릭처럼 **진짜 포인터가 필요할 때만** 쓴다.
// 내부 버튼에 쓰면 scrollIntoView 가 문서를 움직이고 좌표가 흔들린다.
// 스크롤과 좌표 읽기를 한 번의 평가로 한다(공용 pointerClick 은 두 번) — 원래 동작 그대로 둔다.
async function click(selector) {
  await wait(`!!document.querySelector(${JSON.stringify(selector)})`);
  const point = await ev(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.scrollIntoView({ block:'nearest' });
    const r = el.getBoundingClientRect(); return { x:r.left+r.width/2, y:r.top+r.height/2 }; })()`);
  await pointer(point.x, point.y);
}
const pointer = (x, y) => act.pointerAt(x, y);
async function clickButton(text, scope = CANVAS) {
  // click()은 버튼의 onClick 경로이며 바깥 클릭 검사는 별도로 실제 CDP 포인터를 쓴다.
  const expression = `${scope}.querySelectorAll('button')`;
  assert.equal(await ev(`(() => { const button = [...${expression}].find(el => el.textContent.trim() === ${JSON.stringify(text)}); button?.click(); return !!button; })()`), true);
}
async function consoleClean() {
  assert.deepEqual(browser.errors(), [], 'console.error 또는 페이지 예외');
  const warnings = await ev('window.__detailWarnings ?? []');
  assert.deepEqual(warnings.filter(message => /Dialog|Description|Title|Radix/i.test(message)), [], 'Radix 접근성 경고');
}
async function openStory(id, extra = '') {
  const result = await open(id, { extra });
  assert.equal(result.sbError, null);
  assert.equal(await ev(`${CANVAS}?.dataset.playComplete === 'true'`), true, 'play 완료 표식');
  await consoleClean();
}

try {
  // browser.mjs는 console.error를 수집한다. Description은 console.warn이므로 별도로 보존한다.
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `window.__detailWarnings = [];
    const originalWarn = console.warn;
    console.warn = (...args) => { window.__detailWarnings.push(args.map(String).join(' ')); originalWarn.apply(console, args); };` });
  for (const name of ['상세화면', '탭넘침', '긴경로']) {
    await check(`${name} play 완료·콘솔 오류 없음`, () => openStory(`qa-detailscreen--${name}`));
  }
  await openStory('qa-detailscreen--상세화면');
  await check('Breadcrumb nav·ol·현재 페이지·링크 밑줄', async () => {
    assert.deepEqual(await ev(`(() => { const nav = ${CANVAS}.querySelector('nav[aria-label="경로"]');
      const page = nav.querySelector('[aria-current="page"]'), link = nav.querySelector('a');
      return [!!nav.querySelector('ol'), page.tagName, page.textContent, getComputedStyle(link).textDecorationLine]; })()`),
    [true, 'SPAN', 'ORD-20481', 'underline']);
  });
  await check('Breadcrumb 구분자는 presentation·aria-hidden', async () => {
    assert.deepEqual(await ev(`[...${CANVAS}.querySelectorAll('[data-slot="breadcrumb-separator"]')].map(el => [el.tagName, el.getAttribute('role'), el.getAttribute('aria-hidden')])`),
      [['LI', 'presentation', 'true'], ['LI', 'presentation', 'true']]);
  });
  await check('Tab 은 선택 탭에 닿고 그다음이 패널이다', async () => {
    // Radix 는 로빙 그룹이 관여하기 전까지 모든 트리거를 -1 로 둔다. 차가운 DOM
    // 스냅샷을 단언하면 거짓 실패한다 — Tab 이 도착하는 시점에 선택 탭이 0 이 된다.
    // 실측 순서: 경로 링크 2개 → 수정 → 삭제 → 선택 탭 → 패널.
    await ev(`${CANVAS}.querySelector('[data-slot="alert-dialog-trigger"]').focus()`);
    await key('Tab', 9);
    await wait(`document.activeElement?.dataset?.slot === 'tabs-trigger'`);
    assert.equal(await ev(`document.activeElement.getAttribute('aria-selected')`), 'true', 'Tab 이 선택되지 않은 탭에 닿았다');
    await key('Tab', 9);
    await wait(`document.activeElement?.dataset?.slot === 'tabs-content'`);
  });
  await check('선택 탭만 Tab 정지점이다 (roving tabindex)', async () => {
    await ev(`${CANVAS}.querySelector('[data-slot="tabs-trigger"][aria-selected="true"]').focus()`);
    await wait(`[...${tabs}].filter(el => el.tabIndex === 0).length === 1`);
    assert.deepEqual(await ev(`[...${tabs}].map(el => [el.getAttribute('aria-selected'), el.tabIndex])`),
      [['true', 0], ['false', -1], ['false', -1], ['false', -1]]);
  });
  await check('manual ArrowRight는 포커스만 이동', async () => {
    await ev(`${tabs}[0].focus()`);
    // Radix 포커스는 비동기다. 부하 걸린 CI에서도 조건을 기다린 뒤 단언한다.
    await wait(`document.activeElement === ${tabs}[0]`);
    await key('ArrowRight', 39); await wait(`document.activeElement === ${tabs}[1]`);
    assert.equal(await ev(`${tabs}[0].getAttribute('aria-selected')`), 'true');
    assert.equal(await ev(`${tabs}[1].getAttribute('aria-selected')`), 'false');
  });
  await check('manual Enter가 선택을 확정', async () => {
    await key('Enter', 13); await wait(`${tabs}[1].getAttribute('aria-selected') === 'true'`);
    assert.equal(await ev(`${tabs}[0].getAttribute('aria-selected')`), 'false');
  });
  await check('패널 tabindex 0·aria-labelledby 연결', async () => {
    assert.equal(await ev(`(() => { const panel = ${CANVAS}.querySelector('[role="tabpanel"]:not([hidden])');
      return panel.tabIndex === 0 && document.getElementById(panel.getAttribute('aria-labelledby')) === ${CANVAS}.querySelector('${selected}'); })()`), true);
  });
  await check('선택 표시 2px 브랜드 밑줄·굵기, 포커스 링 분리', async () => {
    // 선택+포커스 탭의 링은 버튼 outline 이 아니라 ::after 다. 아래 변만 올려(bottom > 0) 밑줄을 덮지 않는다
    // (2026-11-23 디자인 총괄 결정). 픽셀 단정은 design-detail-render-verify 가 한다.
    assert.equal(await ev(`(() => { const tab = ${tabs}[1], active = getComputedStyle(tab), inactive = getComputedStyle(${tabs}[0]);
      const ring = getComputedStyle(tab, '::after');
      return active.borderBottomWidth === '2px' && Number(active.fontWeight) > Number(inactive.fontWeight)
        && tab.matches(':focus-visible') && active.outlineStyle === 'none'
        && ring.outlineStyle !== 'none' && ring.outlineOffset !== '0px' && parseFloat(ring.bottom) > 0; })()`), true);
  });
  await check('이력 패널은 Skeleton·로딩 안내 제공', async () => {
    await pickTab(ev, tabs, 3);
    await wait(`!!${CANVAS}.querySelector('[aria-busy="true"] [data-slot="skeleton"]')`);
    assert.equal(await ev(`${CANVAS}.querySelector('[aria-busy="true"]').textContent.includes('불러오는 중')`), true);
    await pickTab(ev, tabs, 0);
  });

  await clickButton('수정'); await wait(`!!document.querySelector('${detail}')`);
  await check('Dialog 초기 포커스는 첫 Input', async () => {
    await wait(`document.activeElement === document.querySelector('${detail} input')`);
    assert.equal(await ev(`document.activeElement.tagName`), 'INPUT');
  });
  await check('Dialog 제목·설명 연결', async () => {
    assert.equal(await ev(`(() => { const d = document.querySelector('${detail}'); return ['aria-labelledby','aria-describedby']
      .every(attr => !!document.getElementById(d.getAttribute(attr))?.textContent); })()`), true);
  });
  await check('Dialog가 바깥 콘텐츠를 aria-hidden으로 가림', async () => {
    assert.equal(await ev(`!!${CANVAS}.querySelector('[data-slot="breadcrumb"]').closest('[aria-hidden="true"]')`), true);
  });
  await check('내장 닫기 버튼이 있고 초기 포커스를 빼앗지 않는다', async () => {
    // dismissible=false 가 바깥 클릭·Escape 를 막으므로 출구가 내장이어야 한다.
    // children 뒤에 와야 Radix 의 첫 포커스가 입력으로 간다 — 위 검사가 그걸 본다.
    assert.equal(await ev(`!!document.querySelector('${detail} [data-slot="dialog-close-icon"]')`), true);
    assert.equal(await ev(`document.querySelector('${detail} [data-slot="dialog-close-icon"]').getAttribute('aria-label')`), '닫기');
    // 푸터에 같은 접근명을 또 두면 보조기기가 둘을 구분하지 못한다.
    assert.deepEqual(await ev(`[...document.querySelectorAll('${detail} button')]
      .filter(b => (b.getAttribute('aria-label') ?? b.textContent).trim() === '닫기').length`), 1);
  });
  // dismissible 은 더티에 묶여 있다. 저장하지 않은 변경이 없으면 그냥 닫혀야 한다 —
  // 이미 저장한 창을 닫을 때 "사라집니다"를 묻는 것은 거짓말이다.
  await check('깨끗한 폼은 Escape로 바로 닫힌다', async () => {
    await key('Escape', 27); await wait(`!document.querySelector('${detail}')`);
    assert.equal(await ev(`!!document.querySelector('${alert}')`), false, '확인창이 떴다');
  });
  const soil = async () => {
    await clickButton('수정'); await wait(`!!document.querySelector('${detail} input')`);
    await ev(`document.querySelector('${detail} input').focus()`);
    await cdp('Input.insertText', { text: '변경' });
    await wait(`document.querySelector('${detail} input').value.includes('변경')`);
  };
  await soil();
  await check('더티 폼의 Escape는 원래 창을 유지하고 확인창 표시', async () => {
    await key('Escape', 27); await wait(`!!document.querySelector('${alert}')`);
    assert.equal(await ev(`!!document.querySelector('${detail}')`), true);
    assert.equal(await ev(`document.querySelector('${alert}').textContent.includes('작성 중인 내용이 사라집니다')`), true);
  });
  await check('중첩 확인창이 부모보다 좁고 양쪽에 부모가 남는다', async () => {
    const boxes = await ev(`(() => {
      const parent = document.querySelector('${detail}').getBoundingClientRect();
      const confirm = document.querySelector('${alert}').getBoundingClientRect();
      return { parent: { width: parent.width, left: parent.left, right: parent.right },
        confirm: { width: confirm.width, left: confirm.left, right: confirm.right } };
    })()`);
    assert(boxes.confirm.width > 0 && boxes.confirm.width < boxes.parent.width, JSON.stringify(boxes));
    assert(boxes.confirm.left > boxes.parent.left && boxes.confirm.right < boxes.parent.right, JSON.stringify(boxes));
    console.log('중첩 창 폭 실측:', JSON.stringify(boxes));
  });
  await check('중첩 AlertDialog 초기 포커스는 Cancel', async () => {
    await wait(`document.activeElement === document.querySelector('[data-slot="alert-dialog-cancel"]')`);
    assert.equal(await ev(`document.activeElement.textContent`), '계속 작성');
  });
  await press('[data-slot="alert-dialog-cancel"]'); await wait(`!document.querySelector('${alert}')`);
  await wait(`document.querySelector('${detail}').contains(document.activeElement)`);
  await check('더티 폼은 실제 바깥 클릭에도 원래 창 유지·확인창 표시', async () => {
    await pointer(2, 2); await wait(`!!document.querySelector('${alert}')`);
    assert.equal(await ev(`!!document.querySelector('${detail}')`), true);
  });
  await press('[data-slot="alert-dialog-cancel"]'); await wait(`!document.querySelector('${alert}')`);
  await check('Dialog 안 Select 포털 열기·선택', async () => {
    await click(`${detail} [role="combobox"]`); await wait(`!!document.querySelector('[role="listbox"]')`);
    assert.equal(await ev(`!!document.querySelector('${detail}')`), true);
    await click('[role="option"][data-state="checked"]');
    await wait(`!document.querySelector('[role="listbox"]')`);
  });
  await check('Dialog 안 성공 토스트는 보이고 aria-hidden 밖에서 읽힘', async () => {
    await clickButton('저장', `document.querySelector('${detail}')`);
    await wait(`!!document.querySelector('[data-slot="toast-message"]')`);
    assert.equal(await ev(`(() => { const message = document.querySelector('[data-slot="toast-message"]');
      const r = message.getBoundingClientRect(); return message.textContent === '주문을 저장했습니다'
        && message.getAttribute('role') === 'status' && !message.closest('[aria-hidden="true"]')
        && r.width > 0 && r.height > 0 && getComputedStyle(message).visibility === 'visible'
        && !!document.querySelector('${detail}'); })()`), true);
  });
  // 저장했으므로 더티가 풀렸다 → 내장 X 가 확인 없이 바로 닫는다.
  // 푸터의 '취소'가 아니라 이걸 눌러야 내장 출구가 실제로 동작하는지 본다.
  await press(`${detail} [data-slot="dialog-close-icon"]`);
  await check('저장 후 내장 닫기는 확인 없이 닫고 포커스를 트리거로 돌려준다', async () => {
    assert.equal(await ev(`!!document.querySelector('${alert}')`), false, '확인창이 떴다');
    await wait(`!document.querySelector('${detail}')`);
    await wait(`${CANVAS}.querySelector('[data-slot="dialog-trigger"]') === document.activeElement`);
  });
  await clickButton('삭제'); await wait(`!!document.querySelector('${alert}')`);
  await check('삭제 AlertDialog의 초기 포커스는 Cancel', async () => {
    await wait(`document.activeElement === document.querySelector('[data-slot="alert-dialog-cancel"]')`);
    assert.equal(await ev(`document.activeElement.textContent`), '취소');
  });
  await check('AlertDialog 바깥 클릭은 닫지 않음', async () => {
    await pointer(2, 2); await sleep(100);
    assert.equal(await ev(`!!document.querySelector('${alert}')`), true);
  });
  await check('AlertDialog Escape는 닫힘', async () => {
    await key('Escape', 27); await wait(`!document.querySelector('${alert}')`);
  });
  await check('상세 화면 상호작용 콘솔 오류·Radix 경고 0건', consoleClean);

  await openStory('qa-detailscreen--긴경로');
  await check('긴 경로 첫 항목·생략 3개·마지막 두 항목', async () => {
    assert.equal(await ev(`${CANVAS}.querySelectorAll('[data-slot="breadcrumb-item"]').length`), 4);
    assert.equal(await ev(`(() => { const e = ${CANVAS}.querySelector('[data-slot="breadcrumb-ellipsis"]');
      return e.textContent.includes('생략된 경로 3개') && !e.closest('[aria-hidden="true"]'); })()`), true);
  });
  for (const reduced of ['no-preference', 'reduce']) {
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced }] });
    await openStory('qa-detailscreen--탭넘침');
    await check(`탭 끌어오기 모션 정책 (${reduced})`, async () => {
      // **포커스가 움직이는 경로로는 이 코드를 밟을 수 없다.** 브라우저가 포커스된
      // 요소를 알아서 가로로 긁어와서 delta 가 0 이 되고 reveal 이 조기 반환한다(실측).
      // 우리 코드가 일하는 곳은 포커스 없는 제어 값 변경뿐이다 — 버튼으로 값만 바꾼다.
      // scrollIntoView 가 아니라 목록의 scrollTo 를 계측한다. 전자는 문서를 세로로 민다.
      await pickTab(ev, tabs, 0);
      await wait(`${tabs}[0].getAttribute('aria-selected') === 'true'`);
      await ev(`(() => {
        const list = ${CANVAS}.querySelector('[role="tablist"]');
        list.scrollTo({ left: 0, behavior: 'instant' });
        window.__detailScrollOptions = [];
        const original = list.scrollTo.bind(list);
        list.scrollTo = function(options) { window.__detailScrollOptions.push(options); return original(options); };
        return true; })()`);
      await press('[data-testid="jump"]');
      await wait(`${tabs}[7].getAttribute('aria-selected') === 'true'`);
      await wait('window.__detailScrollOptions.length > 0');
      assert.equal(await ev('window.__detailScrollOptions.at(-1).behavior'), reduced === 'reduce' ? 'auto' : 'smooth');
    });
    await check(`끌어오기가 문서를 세로로 밀지 않는다 (${reduced})`, async () => {
      // scrollIntoView 로 구현하면 block:'nearest' 라도 문서가 밀린다 — 실측 244 → 266.
      // 탭 목록을 뷰포트 아래 경계에 걸쳐 두고, 끌어오기 뒤 scrollY 가 그대로인지 본다.
      // 끌어오기는 data-state 변화로만 일어난다. 7번이 이미 선택돼 있으면 다시 눌러도
      // 아무 일이 없다 — 먼저 1번으로 되돌려 목록 스크롤을 0 으로 만든다.
      await pickTab(ev, tabs, 0);
      await wait(`${tabs}[0].getAttribute('aria-selected') === 'true'`);
      await wait(`${CANVAS}.querySelector('[role="tablist"]').scrollLeft === 0`);
      // 탭 목록을 뷰포트 아래 경계에 걸쳐 둔다. 문서가 밀릴 여지를 만드는 설정이다.
      await ev(`(() => {
        if (!document.getElementById('qa-pad')) {
          const pad = document.createElement('div');
          pad.id = 'qa-pad'; pad.style.height = '1400px';
          ${CANVAS}.appendChild(pad);
        }
        const box = ${CANVAS}.querySelector('[role="tablist"]').getBoundingClientRect();
        window.scrollTo(0, window.scrollY + box.top - (window.innerHeight - 24));
        return true; })()`);
      const before = await ev('Math.round(window.scrollY)');
      // 포커스를 옮기지 않는 제어 변경이어야 우리 reveal 이 실제로 돈다.
      await press('[data-testid="jump"]');
      await wait(`${CANVAS}.querySelector('[role="tablist"]').scrollLeft > 0`);
      assert.equal(await ev('Math.round(window.scrollY)'), before, '끌어오기가 문서를 스크롤했다');
      await ev(`document.getElementById('qa-pad')?.remove(); window.scrollTo(0, 0);`);
    });
    await check(`탭 넘침·automatic 기본·선택 탭 가시성 (${reduced})`, async () => {
      // 새로 열면 선택은 1번 탭이고 스크롤은 0 이다. 마지막 탭은 당연히 안 보인다 —
      // 끌어오기를 **일으킨 뒤에** 봐야 한다. 앞선 검사가 7번을 눌러 둔 상태를 잇는다.
      await wait(`(() => { const list = ${CANVAS}.querySelector('[role="tablist"]'), last = ${tabs}[7];
        const a = list.getBoundingClientRect(), b = last.getBoundingClientRect();
        return list.scrollWidth > list.clientWidth && b.left >= a.left - 1 && b.right <= a.right + 1; })()`);
      assert.equal(await ev(`getComputedStyle(${CANVAS}.querySelector('[role="tablist"]')).flexWrap`), 'nowrap');
      assert.equal(await ev(`${tabs}[7].getAttribute('aria-selected')`), 'true');
      assert.equal(await ev(`getComputedStyle(${CANVAS}.querySelector('[role="tablist"]')).overflowX`), 'auto');
    });
  }
  await check('다크 상세 화면 play 완료·콘솔 오류 없음', () => openStory('qa-detailscreen--상세화면', '&globals=theme:dark'));
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
