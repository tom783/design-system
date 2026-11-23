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
//
// 링은 두 가지다(2026-11-23 디자인 총괄 결정). 선택+포커스 탭은 버튼 outline 을 끄고 ::after 로 같은 링을
// 그리며 **아래 변만** 밑줄 2px·간격 2px 위로 올린다 — 안쪽 링이 밑줄을 정확히 덮어 선택 표시가 사라졌었다.
// 포커스만 있는(선택 안 된) 탭은 버튼 outline 그대로다. 그래서 링 상자는 실제로 그리는 쪽에서 재고,
// 밑줄·간격·링이 겹치지 않는지는 탭 안쪽 여백(링 안·글자 앞)의 세로 한 줄 픽셀로 본다.
// target: 'selected' = 선택 탭(포커스 있음), 'focus-only' = 포커스를 가진 선택 안 된 탭(선택 탭도 함께 본다).
async function tabs(target = 'selected') {
  const m = await ev(`(() => {
    const list = document.querySelector('[role="tablist"]'), selected = list.querySelector('[aria-selected="true"]');
    const tab = ${target === 'selected' ? 'selected' : 'document.activeElement'};
    const a = list.getBoundingClientRect(), b = tab.getBoundingClientRect(), s = getComputedStyle(tab), l = getComputedStyle(list);
    const p = getComputedStyle(tab, '::after'), pseudo = p.content !== 'none' && p.outlineStyle !== 'none';
    const r = pseudo ? p : s, outer = parseFloat(r.outlineOffset) + parseFloat(r.outlineWidth);
    // ::after 는 absolute 라 계산된 inset 이 패딩 상자 기준 px 다. 탭은 아래에만 테두리(밑줄)가 있다.
    const box = pseudo ? { left: b.left + parseFloat(s.borderLeftWidth) + parseFloat(p.left), right: b.right - parseFloat(s.borderRightWidth) - parseFloat(p.right),
      top: b.top + parseFloat(s.borderTopWidth) + parseFloat(p.top), bottom: b.bottom - parseFloat(s.borderBottomWidth) - parseFloat(p.bottom) } : b;
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const rgb = color => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    const sb = selected.getBoundingClientRect();
    return { underlineBottom: sb.bottom, boxBottom: a.bottom, portBottom: a.top + list.clientTop + list.clientHeight,
      scrollbar: list.offsetHeight - list.clientHeight - list.clientTop - parseFloat(l.borderBottomWidth),
      paddingBottom: l.paddingBottom, borderBottom: l.borderBottomWidth, underlineWidth: getComputedStyle(selected).borderBottomWidth,
      baselineColor: rgb(l.getPropertyValue('--border-default')), ringColor: rgb(l.getPropertyValue('--border-focus')),
      brandColor: rgb(l.getPropertyValue('--action-primary-bg')),
      probeX: Math.floor(a.left + list.clientLeft) + 1, scrollX, scrollY,
      // 링 2px 안·글자 앞(좌우 안쪽 여백 12px) — 링·간격·밑줄만 지나는 세로 한 줄
      tabProbeX: Math.floor(b.left) + 6, tabTop: b.top, selectedProbeX: Math.floor(sb.left) + 6, selectedTop: sb.top,
      focused: document.activeElement === tab && tab.matches(':focus-visible'), selected: tab === selected, pseudo,
      buttonOutline: s.outlineStyle, outlineWidth: r.outlineWidth, outlineOffset: r.outlineOffset,
      ring: { left: box.left - outer, right: box.right + outer, top: box.top - outer, bottom: box.bottom + outer },
      clip: { left: a.left + list.clientLeft, right: a.left + list.clientLeft + list.clientWidth,
        top: a.top + list.clientTop, bottom: a.top + list.clientTop + list.clientHeight },
      scrollLeft: list.scrollLeft, overflow: list.scrollWidth > list.clientWidth };
  })()`);
  // 세로 탐침 여러 줄을 **한 번의 캡처**에서 읽는다(문서 좌표 — 뷰포트 좌표에 페이지 스크롤을 더한다).
  // 1px 폭 clip 캡처를 연달아 보내면 두 번째가 앞 clip 의 x 를 그대로 찍는 일이 잦다(2026-11-23 실측:
  // x=25 다음 x=34 를 40회 연속 → 26회가 x=25 열). 사이에 프레임 두 개를 기다리면 0/40 이다. 앞 검사의 캡처와
  // 겹치지 않도록 캡처 전에도 프레임 두 개를 기다린다.
  const T = Math.round(m.tabTop), P = Math.round(m.portBottom);
  const x0 = Math.min(m.probeX, m.tabProbeX, m.selectedProbeX), x1 = Math.max(m.probeX, m.tabProbeX, m.selectedProbeX) + 1;
  const y0 = Math.min(Math.floor(m.portBottom) - 3, T - 1, Math.round(m.selectedTop) - 1), y1 = Math.ceil(m.boxBottom) + 1;
  await ev('new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))');
  const shot = await cdp('Page.captureScreenshot', { format: 'png', clip: { x: x0 + m.scrollX, y: y0 + m.scrollY, width: x1 - x0, height: y1 - y0, scale: 1 } });
  const image = decodePng(Buffer.from(shot.data, 'base64'));
  // [y, 픽셀] 목록: x 열의 top 행부터 캡처 끝까지
  const column = (x, top) => [...Array(y1 - top).keys()].map(i => [top + i, image.pixel(x - x0, top + i - y0)]);
  const near = (color) => (c) => c.every((v, i) => Math.abs(v - color[i]) <= 2);
  const rows = (col, color) => col.filter(([, c]) => near(color)(c)).map(([y]) => y);
  // 목록 왼쪽 안쪽 여백(탭이 없는 자리)의 세로 한 줄로 기준선이 실제로 보이는 행을 찾는다.
  m.baselineRows = rows(column(m.probeX, Math.floor(m.portBottom) - 3), m.baselineColor);
  // 탭 줄만 본다 — 스크롤 영역 아래(클래식 스크롤바 자리)는 탭이 아니다.
  const tabColumn = column(m.tabProbeX, T - 1).filter(([y]) => y < P);
  m.ringRows = rows(tabColumn, m.ringColor); m.brandRows = rows(tabColumn, m.brandColor);
  // 실패 메시지에서 실제 픽셀을 볼 수 있게 같은 색이 이어지는 구간으로 줄여 남긴다.
  m.tabColumn = tabColumn.reduce((runs, [y, c]) => { const last = runs.at(-1), key = c.join(',');
    if (last?.color === key) last.to = y; else runs.push({ from: y, to: y, color: key }); return runs; }, []);
  assert.equal(m.paddingBottom, '0px'); assert.equal(m.borderBottom, '0px'); assert.equal(m.underlineWidth, '2px');
  // 선택 밑줄은 스크롤 영역 바닥에 닿는다(오버레이에서는 상자 바닥과 같다).
  assert.ok(Math.abs(m.underlineBottom - m.portBottom) <= .5, JSON.stringify(m));
  // 기준선은 스크롤 영역 바로 위 한 줄에 실제로 보인다 — 스크롤바에 가려지지 않는다.
  assert.deepEqual(m.baselineRows, [P - 1], JSON.stringify(m));
  assert.ok(m.focused); assert.equal(m.outlineWidth, '2px'); assert.equal(m.outlineOffset, '-2px');
  // 링 네 변이 스크롤 영역 안에 있다 — 잘리지 않는다.
  assert.ok(m.ring.left >= m.clip.left - .5 && m.ring.right <= m.clip.right + .5 && m.ring.top >= m.clip.top - .5 && m.ring.bottom <= m.clip.bottom + .5, JSON.stringify(m));
  if (target === 'selected') {
    // 선택+포커스: 버튼 outline 은 꺼지고 ::after 링의 아래 변이 밑줄 2px + 간격 2px 위에서 끝난다.
    assert.ok(m.selected && m.pseudo, JSON.stringify(m)); assert.equal(m.buttonOutline, 'none');
    assert.ok(Math.abs(m.ring.bottom - (m.portBottom - 4)) <= .5, JSON.stringify(m));
    // 픽셀: 위 링 2줄 … 아래 링 2줄 · 간격 2줄 · 브랜드 밑줄 2줄(바닥 = 기준선 행).
    assert.deepEqual(m.ringRows, [T, T + 1, P - 6, P - 5], JSON.stringify(m));
    assert.deepEqual(m.brandRows, [P - 2, P - 1], JSON.stringify(m));
  } else {
    // 포커스만: 버튼 outline 그대로(바뀌기 전과 같다) — 링 아래 변이 탭 바닥에 있고 ::after 는 없다.
    assert.ok(!m.selected && !m.pseudo, JSON.stringify(m)); assert.equal(m.buttonOutline, 'solid');
    assert.ok(Math.abs(m.ring.bottom - m.portBottom) <= .5, JSON.stringify(m));
    assert.deepEqual(m.ringRows, [T, T + 1, P - 2, P - 1], JSON.stringify(m)); assert.deepEqual(m.brandRows, [], JSON.stringify(m));
    // 함께 보이는 선택 탭(포커스 없음)은 밑줄만 있고 링은 없다.
    const selectedColumn = column(m.selectedProbeX, Math.round(m.selectedTop) - 1).filter(([y]) => y < P);
    m.selectedRingRows = rows(selectedColumn, m.ringColor); m.selectedBrandRows = rows(selectedColumn, m.brandColor);
    assert.deepEqual(m.selectedRingRows, [], JSON.stringify(m)); assert.deepEqual(m.selectedBrandRows, [P - 2, P - 1], JSON.stringify(m));
  }
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
        await check(`D2 상세 포커스만 있는 탭 링 불변·선택 탭 밑줄 ${context}`, async () => {
          // manual 이라 화살표는 포커스만 옮긴다 — 포커스만 있는 탭과 선택만 된 탭이 함께 보인다.
          await key('ArrowRight', 39);
          await wait(`document.activeElement?.getAttribute('role') === 'tab' && document.activeElement.getAttribute('aria-selected') === 'false'`);
          return tabs('focus-only');
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
    // 포커스만 있는 탭은 manual 탭에서만 생긴다. 상세 화면을 좁혀(260px) 탭이 넘치게 하면 클래식 스크롤바 위에서
    // 선택+포커스·포커스만·선택만 세 상태를 모두 본다. 폭마다 같은 결과라 1440 회차에서 한 번만 돈다.
    if (width === 1440) for (const [state, hidden] of [['기본', false], ['두께 0(CDP)', true]]) await check(`D2 좁은 상세 탭 세 상태 링·밑줄 ${theme} 260px 스크롤바 ${state}`, async () => {
      await cdp('Emulation.setScrollbarsHidden', { hidden });
      await cdp('Emulation.setDeviceMetricsOverride', { width: 260, height: 1000, deviceScaleFactor: 1, mobile: false });
      try {
        await load('qa-detailscreen--상세화면', theme);
        await key('Tab', 9); await ev(`document.querySelector('[role="tab"][aria-selected="true"]').focus()`);
        const selected = await tabs(); assert.ok(selected.overflow);
        if (hidden) assert.equal(selected.scrollbar, 0);
        await key('ArrowRight', 39);
        await wait(`document.activeElement?.getAttribute('role') === 'tab' && document.activeElement.getAttribute('aria-selected') === 'false'`);
        const focusOnly = await tabs('focus-only');
        return { scrollbar: selected.scrollbar, ringRows: [selected.ringRows, focusOnly.ringRows], brandRows: [selected.brandRows, focusOnly.selectedBrandRows] };
      } finally {
        await cdp('Emulation.setScrollbarsHidden', { hidden: false });
        await cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
      }
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
