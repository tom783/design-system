// R31: 화면 조립의 D1–D6를 실제 치수·계산 스타일·접근성 트리로 검사한다.
// 기존 하네스의 위치 기대값은 바꾸지 않는다. 결과·실측값·캡처는 OUT에 남긴다.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, CANVAS, decodePng, actions as browserActions } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/design-detail';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ windowSize: '1440,1000', outDir: OUT });
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
const act = browserActions(browser);
const key = (name, keyCode) => act.key(name, { keyCode, code: name, raw: true, text: null, hold: 50 });
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
// 탭 목록의 밑줄·기준선·링. 스크롤바 두께는 환경마다 다르다 — 오버레이(트랙패드 macOS) 0,
// 클래식(Windows·리눅스·마우스 연결 macOS) 10~11px. 상자 바닥이 아니라 **스크롤 영역 바닥**을
// 기준으로 재고, 기준선은 계산 스타일이 아니라 실제로 그려진 픽셀로 확인한다(스크롤바가 선을
// 덮어도 계산 스타일은 그대로라서다 — 2026-11-22 실측, DESIGN.md §16.1).
async function tabs() {
  const m = await ev(`(() => {
    const list = document.querySelector('[role="tablist"]'), tab = list.querySelector('[aria-selected="true"]');
    const a = list.getBoundingClientRect(), b = tab.getBoundingClientRect(), s = getComputedStyle(tab), l = getComputedStyle(list);
    const outer = parseFloat(s.outlineOffset) + parseFloat(s.outlineWidth);
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = l.getPropertyValue('--border-default'); ctx.fillRect(0, 0, 1, 1);
    return { underlineBottom: b.bottom, boxBottom: a.bottom, portBottom: a.top + list.clientTop + list.clientHeight,
      scrollbar: list.offsetHeight - list.clientHeight - list.clientTop - parseFloat(l.borderBottomWidth),
      paddingBottom: l.paddingBottom, borderBottom: l.borderBottomWidth, underlineWidth: s.borderBottomWidth,
      baselineColor: [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3), probeX: Math.floor(a.left + list.clientLeft) + 1, scrollX, scrollY,
      focused: document.activeElement === tab && tab.matches(':focus-visible'),
      outlineWidth: s.outlineWidth, outlineOffset: s.outlineOffset,
      ring: { left: b.left - outer, right: b.right + outer, top: b.top - outer, bottom: b.bottom + outer },
      clip: { left: a.left + list.clientLeft, right: a.left + list.clientLeft + list.clientWidth,
        top: a.top + list.clientTop, bottom: a.top + list.clientTop + list.clientHeight },
      scrollLeft: list.scrollLeft, overflow: list.scrollWidth > list.clientWidth };
  })()`);
  // 목록 왼쪽 안쪽 여백(탭이 없는 자리)의 세로 한 줄을 캡처해 기준선이 실제로 보이는 행을 찾는다.
  const top = Math.floor(m.portBottom) - 3;
  // 캡처 영역은 문서 좌표다 — 뷰포트 좌표에 페이지 스크롤을 더한다.
  const shot = await cdp('Page.captureScreenshot', { format: 'png', clip: { x: m.probeX + m.scrollX, y: top + m.scrollY, width: 1, height: Math.ceil(m.boxBottom) - top + 1, scale: 1 } });
  const image = decodePng(Buffer.from(shot.data, 'base64'));
  const near = (c) => c.every((v, i) => Math.abs(v - m.baselineColor[i]) <= 2);
  m.baselineRows = [...Array(image.height).keys()].filter(y => near(image.pixel(0, y))).map(y => top + y);
  assert.equal(m.paddingBottom, '0px'); assert.equal(m.borderBottom, '0px'); assert.equal(m.underlineWidth, '2px');
  // 선택 밑줄은 스크롤 영역 바닥에 닿는다(오버레이에서는 상자 바닥과 같다).
  assert.ok(Math.abs(m.underlineBottom - m.portBottom) <= .5, JSON.stringify(m));
  // 기준선은 스크롤 영역 바로 위 한 줄에 실제로 보인다 — 스크롤바에 가려지지 않는다.
  assert.deepEqual(m.baselineRows, [Math.round(m.portBottom) - 1], JSON.stringify(m));
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
    for (const [screen, id] of [['목록', 'qa-listscreen--목록화면'], ['상세', 'qa-detailscreen--상세화면'], ['등록', 'qa-createscreen--등록화면']]) {
      await check(`D6 ${screen} 루트 여백 ${context}`, async () => {
        await load(id, theme);
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
    // 스크롤바 두 상태: 이 환경의 기본(리눅스·마우스 연결 macOS 는 클래식, 트랙패드 macOS 는 오버레이)과
    // CDP 로 두께 0 을 강제한 상태(오버레이와 같은 배치). 어느 쪽에서도 밑줄·기준선이 맞아야 한다.
    for (const [state, hidden] of [['기본', false], ['두께 0(CDP)', true]]) await check(`D2 가로 스크롤 탭 Home·End 밑줄·기준선·링 ${context} 스크롤바 ${state}`, async () => {
      await cdp('Emulation.setScrollbarsHidden', { hidden });
      try {
        await load('qa-detailscreen--탭넘침', theme);
        await key('Home', 36); await wait(`document.activeElement?.textContent === '상세 탭 1'`);
        await wait(`document.querySelector('[role="tablist"]').scrollLeft === 0`);
        const first = await tabs(); assert.ok(first.overflow);
        if (hidden) assert.equal(first.scrollbar, 0);
        await key('End', 35); await wait(`document.activeElement?.textContent === '상세 탭 8'`);
        await wait(`(() => { const l = document.querySelector('[role="tablist"]'), t = document.activeElement; return t.getBoundingClientRect().right <= l.getBoundingClientRect().right; })()`);
        const last = await tabs(); assert.ok(last.scrollLeft > 0);
        return { scrollbar: first.scrollbar, portBottom: first.portBottom, boxBottom: first.boxBottom, baselineRows: [first.baselineRows, last.baselineRows] };
      } finally { await cdp('Emulation.setScrollbarsHidden', { hidden: false }); }
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
