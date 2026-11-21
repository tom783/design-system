// R31: 화면 조립의 D1–D6를 실제 치수·계산 스타일·접근성 트리로 검사한다.
// 기존 하네스의 위치 기대값은 바꾸지 않는다. 결과·실측값·캡처는 OUT에 남긴다.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, CANVAS } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/design-detail';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ port: 9481, windowSize: '1440,1000', outDir: OUT });
const { ev, cdp, sleep } = browser;
const { open } = storybook(browser);
const results = [];
const q = selector => `document.querySelector(${JSON.stringify(selector)})`;
async function wait(expression) {
  for (let i = 0; i < 80; i++) { if (await ev(expression)) return; await sleep(50); }
  throw new Error(`조건 대기 실패: ${expression}`);
}
async function check(label, run) {
  try {
    const measurements = await run(); results.push({ label, pass: true, measurements });
    console.log(`✓ ${label}${measurements ? ` — ${JSON.stringify(measurements)}` : ''}`);
  } catch (error) {
    results.push({ label, pass: false, error: error.message });
    console.error(`✗ ${label}: ${error.message}`); await browser.shot(`failure-${results.length}`);
  }
}
async function key(name, code) {
  await cdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: name, code: name, windowsVirtualKeyCode: code });
  await sleep(50);
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, windowsVirtualKeyCode: code });
}
async function load(id, theme) {
  const result = await open(id, { extra: `&globals=theme:${theme}` });
  assert.equal(result.sbError, null); assert.deepEqual(result.errors, []);
  assert.equal(await ev(`${CANVAS}.dataset.playComplete`), 'true', 'play 완료');
  await ev('document.fonts.ready');
  await wait(`document.documentElement.dataset.theme === ${JSON.stringify(theme)}`);
}
// 캔버스에서 색을 sRGB 픽셀로 변환한다. OKLCH 문자열을 RGB로 오인하거나 반올림해 판정하지 않는다.
const actionMeasurements = selector => `(() => {
  const buttons = [...document.querySelectorAll(${JSON.stringify(selector)})];
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgb = color => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data]; };
  const lum = color => rgb(color).slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
  return buttons.map(button => {
    const style = getComputedStyle(button), svg = button.querySelector('svg');
    let node = button, bg;
    while (node) { bg = getComputedStyle(node).backgroundColor; if (rgb(bg)[3] === 255) break; node = node.parentElement; }
    const a = lum(getComputedStyle(svg).color), b = lum(bg);
    return { name: button.getAttribute('aria-label'), borderAlpha: rgb(style.borderTopColor)[3],
      icon: svg.classList.contains('lucide-ellipsis'), hidden: svg.getAttribute('aria-hidden'),
      text: button.textContent.trim(), width: button.offsetWidth, height: button.offsetHeight,
      contrast: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
  });
})()`;
async function actions(selector, expectedCount) {
  const measurements = await ev(actionMeasurements(selector));
  assert.ok(measurements.length > 0);
  if (expectedCount) assert.equal(measurements.length, expectedCount);
  for (const m of measurements) {
    assert.equal(m.borderAlpha, 0); assert.ok(m.icon); assert.equal(m.hidden, 'true');
    assert.equal(m.text, ''); assert.match(m.name, /.+ 작업$/); assert.equal(m.width, m.height);
    assert.ok(m.contrast >= 3, JSON.stringify(m));
  }
  // 실제 포인터는 호버 검증에만 쓴다. 내부 클릭·scrollIntoView는 하지 않는다.
  const point = await ev(`(() => { const r = ${q(selector)}.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 0, y: 0 });
  await sleep(180); // 기존 버튼 전환 140ms가 끝난 기본 상태와 비교한다.
  const before = await ev(`getComputedStyle(${q(selector)}).backgroundColor`);
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  await wait(`getComputedStyle(${q(selector)}).backgroundColor !== ${JSON.stringify(before)}`);
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 0, y: 0 });
  await key('Tab', 9); await ev(`${q(selector)}.focus()`);
  assert.ok(await ev(`(() => { const el = ${q(selector)}, s = getComputedStyle(el); return el.matches(':focus-visible') && s.outlineStyle === 'solid' && parseFloat(s.outlineWidth) === 2; })()`));
  return { count: measurements.length, minContrast: Math.min(...measurements.map(m => m.contrast)), borderAlpha: 0 };
}
async function tabs() {
  const m = await ev(`(() => {
    const list = document.querySelector('[role="tablist"]'), tab = list.querySelector('[aria-selected="true"]');
    const a = list.getBoundingClientRect(), b = tab.getBoundingClientRect(), s = getComputedStyle(tab), l = getComputedStyle(list);
    const outer = parseFloat(s.outlineOffset) + parseFloat(s.outlineWidth);
    return { underlineBottom: b.bottom, baselineBottom: a.bottom, paddingBottom: l.paddingBottom,
      borderBottom: l.borderBottomWidth, shadow: l.boxShadow, underlineWidth: s.borderBottomWidth,
      focused: document.activeElement === tab && tab.matches(':focus-visible'),
      outlineWidth: s.outlineWidth, outlineOffset: s.outlineOffset,
      ring: { left: b.left - outer, right: b.right + outer, top: b.top - outer, bottom: b.bottom + outer },
      clip: { left: a.left + list.clientLeft, right: a.left + list.clientLeft + list.clientWidth,
        top: a.top + list.clientTop, bottom: a.top + list.clientTop + list.clientHeight },
      scrollLeft: list.scrollLeft, overflow: list.scrollWidth > list.clientWidth };
  })()`);
  assert.equal(m.paddingBottom, '0px'); assert.equal(m.borderBottom, '0px'); assert.match(m.shadow, /inset/);
  assert.equal(m.underlineWidth, '2px'); assert.ok(Math.abs(m.underlineBottom - m.baselineBottom) <= .5, JSON.stringify(m));
  assert.ok(m.focused); assert.equal(m.outlineWidth, '2px'); assert.equal(m.outlineOffset, '-2px');
  assert.ok(m.ring.left >= m.clip.left - .5 && m.ring.right <= m.clip.right + .5 && m.ring.top >= m.clip.top - .5 && m.ring.bottom <= m.clip.bottom + .5, JSON.stringify(m));
  return m;
}
async function axNames() {
  const { nodes } = await cdp('Accessibility.getFullAXTree');
  return nodes.filter(n => !n.ignored && n.role?.value === 'radiogroup').map(n => n.name?.value);
}

try {
  for (const width of [1440, 1024]) for (const theme of ['light', 'dark']) {
    const context = `${theme} ${width}px`;
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    for (const [screen, id] of [['목록', 'listscreen--목록화면'], ['상세', 'detailscreen--상세화면'], ['등록', 'createscreen--등록화면']]) {
      await check(`D6 ${screen} 루트 여백 ${context}`, async () => {
        await load(`screens-${id}`, theme);
        const m = await ev(`(() => { const root = ${CANVAS}.firstElementChild, s = getComputedStyle(root); return {
          padding: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft], left: root.querySelector('main').getBoundingClientRect().left }; })()`);
        assert.deepEqual(m.padding, ['24px', '24px', '24px', '24px']);
        if (width === 1024) assert.equal(m.left, 24);
        return m;
      });
      if (screen === '목록') {
        await check(`D1 목록 아이콘·투명 테두리·대비·호버·포커스 ${context}`, () => actions('tbody button[aria-label$=" 작업"]', 12));
        await check(`D1 작업 열 제목은 접근 이름만 보존 ${context}`, async () => {
          assert.equal(await ev(`(() => { const el = document.querySelector('thead .sr-only'); const s = getComputedStyle(el); return el.textContent === '작업' && s.position === 'absolute' && s.width === '1px' && s.height === '1px'; })()`), true);
        });
      } else if (screen === '상세') {
        await check(`D2 상세 탭 밑줄·키보드 링 ${context}`, async () => {
          await key('Tab', 9); await ev(`document.querySelector('[role="tab"][aria-selected="true"]').focus()`);
          return tabs();
        });
        await check(`D3 탭 아래 24px 안에 중복 선 없음 ${context}`, async () => {
          const lines = await ev(`(() => { const list = document.querySelector('[role="tablist"]'), bottom = list.getBoundingClientRect().bottom;
            return [...document.querySelectorAll('[role="tabpanel"], [role="tabpanel"] *')].filter(el => {
              const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.top >= bottom && r.top < bottom + 24 && parseFloat(s.borderTopWidth) > 0;
            }).map(el => el.tagName); })()`);
          assert.deepEqual(lines, []); assert.equal(await ev(`getComputedStyle(document.querySelector('[role="tabpanel"] dl')).borderTopWidth`), '0px');
        });
      } else {
        await check(`D4 배송 접근 이름·Field 레이블 스타일 ${context}`, async () => {
          // 접근성 트리의 radiogroup 순서는 실행마다 바뀔 수 있다(R31 실측: 다크 1024px 에서만 역순). 이름의 집합을 비교한다.
          assert.deepEqual([...await axNames()].sort(), ['배송', '폼 밖 배송'].sort());
          const m = await ev(`(() => { const group = document.querySelector('[role="radiogroup"]'), label = document.getElementById(group.getAttribute('aria-labelledby'));
            const sample = document.querySelector('[data-slot="field-label"]'); const style = el => { const s = getComputedStyle(el); return [el.tagName, s.fontSize, s.fontWeight, s.color]; };
            return { label: style(label), sample: style(sample), text: label.textContent }; })()`);
          assert.deepEqual(m.label, m.sample); assert.equal(m.text, '배송'); return m;
        });
        await check(`D5 수량 폭 120px·기본 입력 폭 보존 ${context}`, async () => {
          const m = await ev(`(() => { const qty = document.querySelector('[data-probe="qty"]'), form = qty.form, sample = document.querySelector('[data-probe="name"]');
            const s = getComputedStyle(qty), c = document.createElement('canvas').getContext('2d'); c.font = s.font; const digits = c.measureText('888888').width;
            return { qty: qty.getBoundingClientRect().width, field: qty.closest('[data-slot="field"]').getBoundingClientRect().width,
              sample: sample.getBoundingClientRect().width, form: form.getBoundingClientRect().width, digits,
              available: qty.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight), numeric: s.fontVariantNumeric, align: s.textAlign }; })()`);
          assert.equal(m.qty, 120); assert.equal(m.field, 120); assert.equal(m.sample, m.form);
          assert.ok(m.digits < m.available); assert.equal(m.numeric, 'tabular-nums'); assert.equal(m.align, 'right'); return m;
        });
      }
      await browser.shot(`${screen}-${theme}-${width}`);
    }
    await check(`D2 가로 스크롤 탭 Home·End 밑줄·링 ${context}`, async () => {
      await load('screens-detailscreen--탭넘침', theme);
      await key('Home', 36); await wait(`document.activeElement?.textContent === '상세 탭 1'`);
      await wait(`document.querySelector('[role="tablist"]').scrollLeft === 0`);
      const first = await tabs(); assert.ok(first.overflow);
      await key('End', 35); await wait(`document.activeElement?.textContent === '상세 탭 8'`);
      await wait(`(() => { const l = document.querySelector('[role="tablist"]'), t = document.activeElement; return t.getBoundingClientRect().right <= l.getBoundingClientRect().right; })()`);
      const last = await tabs(); assert.ok(last.scrollLeft > 0); return { first, last };
    });
  }
  for (const theme of ['light', 'dark']) {
    for (const [id, selector] of [
      ['components-dropdownmenu--행액션', 'button[aria-label$=" 작업"]'],
      ['components-peek--기본', 'button[aria-label$=" 작업"]'],
      ['components-peek--표에서-요약', 'tbody button[aria-label$=" 작업"]'],
    ]) await check(`D1 ${id} 아이콘·대비·호버·포커스 ${theme}`, async () => {
      await load(id, theme); await key('Escape', 27); return actions(selector);
    });
  }
  await check('D4 Field 설명·오류·필수·소비자 aria 우선순위', async () => {
    await load('components-radiogroup--field연결', 'light');
    const names = await axNames();
    assert.match(names[0], /^배송/);
    assert.deepEqual(names.slice(1), ['소비자 이름', '소비자 제목', '소비자 제목']);
    const m = await ev(`(() => { const group = document.querySelector('[data-probe="field-group"]');
      return { invalid: group.getAttribute('aria-invalid'), required: group.getAttribute('aria-required'),
        descriptions: group.getAttribute('aria-describedby').split(/\\s+/).map(id => document.getElementById(id).textContent),
        override: document.querySelector('[data-probe="label-override"]').getAttribute('aria-labelledby'),
        labelIds: [...document.querySelectorAll('[data-slot="field-label"]')].map(el => el.id) }; })()`);
    assert.equal(m.invalid, 'true'); assert.equal(m.required, 'true');
    assert.deepEqual(m.descriptions, ['배송 방식을 확인하세요', '배송 방식을 선택하세요', '소비자 설명']);
    assert.equal(m.override, null); assert.equal(new Set(m.labelIds).size, 4); return m;
  });
} finally {
  writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2)); browser.close();
}
const passed = results.filter(r => r.pass).length;
console.log(`${results.length}개 검사, ${passed}개 통과`);
process.exitCode = passed === results.length ? 0 : 1;
