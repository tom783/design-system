// 입력 단위 접미사(Input unit) 검증 — 목표 49 4a, 2026-11-23 디자인 총괄 규격(DESIGN §17.1.1).
//  ① 자리: 접미사 오른쪽 끝 = 입력 경계 1px + 끝 여백 12px 안쪽, 값 칸은 접미사 왼쪽 4px 에서 끝난다
//  ② 글자: 값과 같은 14px/400·행간·글꼴, 세로 가운데가 값과 같다
//  ③ 색: 기본·포커스·오류 text-tertiary(오류도 빨갛지 않다), 비활성 text-disabled
//  ④ 접근성: aria-describedby 맨 앞이 접미사 → 낭독 설명이 "원 …"(값 바로 뒤), Field 오류·설명·앱의 id 와 합친다,
//            접미사 span 자체는 접근성 트리에서 숨는다(두 번 읽지 않는다), 접미사를 눌러도 입력에 포커스가 간다
//  ⑤ 복사·붙여넣기: 입력 값 복사·칸을 끌어 선택한 복사에 접미사가 섞이지 않고, 붙여넣은 값에도 없다(실제 클립보드)
//  ⑥ 폭: 최소 폭 = 120 + 4 + 접미사 폭(값 칸 94px 유지), 긴 값·긴 접미사가 접미사 밑으로 들어가지 않는다(픽셀)
//  ⑦ FormRow 같은 줄: 접미사가 있어도 입력칸 윗선·높이가 같다(한쪽 설명·오류 포함)
//  ⑧ 검수 매트릭스: 라이트·다크 × 기본·포커스·비활성·오류 × '원'·'개월' 칸마다 실제 크기(배율 1) 캡처 — 파일 이름에 빌드 sha
// 1280×900, 배율 1. 좌표 단정은 레이아웃 값으로, 겹침은 그려진 픽셀로 본다.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, storybookBase, CANVAS, decodePng, actions } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/input-unit';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ windowSize: '1280,900', outDir: OUT });
const { ev, cdp, sleep } = browser;
const { open } = storybook(browser);
const act = actions(browser);
const results = [];
const STATES = ['default', 'focus', 'disabled', 'error'];
const UNITS = [['원', 'won'], ['개월', 'months']];
async function wait(expression, label = expression) {
  for (let i = 0; i < 100; i++) { if (await ev(expression)) return; await sleep(40); }
  throw new Error(`조건 대기 실패: ${label}`);
}
async function check(label, run) {
  try { const measurements = await run(); results.push({ label, pass: true, measurements }); console.log(`✓ ${label} — ${JSON.stringify(measurements)}`); }
  catch (e) { results.push({ label, pass: false, error: e.message }); console.error(`✗ ${label}: ${e.message}`); await browser.shot(`failure-${results.length}`); }
}
async function load(id, theme) {
  const r = await open(id, { extra: `&globals=theme:${theme}` });
  assert.equal(r.sbError, null); assert.deepEqual(r.errors, []);
  await wait(`${CANVAS}.querySelector('[data-slot="input-unit"]') !== null`, `${id} 렌더`);
  await wait(`document.documentElement.dataset.theme === '${theme}'`);
  await ev(`document.fonts.load('14px "Pretendard Variable"', '판매가 39,000 원 개월 %')`);
  await ev('document.fonts.ready');
  // 글꼴이 바뀌면 접미사 폭을 다시 잰다(ResizeObserver) — 그 갱신이 그려질 때까지 프레임 두 개.
  await frames();
}
const frames = () => ev('new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))');
const sel = probe => `[data-probe=${JSON.stringify(probe)}]`;

// 입력 하나의 자리·글자·색·연결. 좌표는 문서 좌표(스크롤 더함)로 캡처에도 그대로 쓴다.
const measure = probe => ev(`(() => {
  const input = document.querySelector(${JSON.stringify(sel(probe))});
  const wrap = input.closest('[data-slot="input-control"]'), unit = wrap.querySelector('[data-slot="input-unit"]');
  const s = getComputedStyle(input), u = getComputedStyle(unit);
  const ir = input.getBoundingClientRect(), wr = wrap.getBoundingClientRect(), ur = unit.getBoundingClientRect();
  const range = document.createRange(); range.selectNodeContents(unit); const tr = range.getBoundingClientRect();
  const color = name => { const el = document.createElement('span'); el.style.color = 'var(' + name + ')'; wrap.appendChild(el);
    const c = getComputedStyle(el).color; el.remove(); return c; };
  const rgb = c => c.match(/\\d+(\\.\\d+)?/g).slice(0, 3).map(Number);
  const contentLeft = ir.left + parseFloat(s.borderLeftWidth) + parseFloat(s.paddingLeft);
  const contentRight = ir.right - parseFloat(s.borderRightWidth) - parseFloat(s.paddingRight);
  return {
    x: ir.left + scrollX, y: ir.top + scrollY, width: ir.width, height: ir.height, wrapperWidth: wr.width,
    unitLeft: ur.left - ir.left, unitWidth: ur.width, unitEndInset: ir.right - ur.right,
    contentLeft: contentLeft - ir.left, contentRight: contentRight - ir.left, contentWidth: contentRight - contentLeft,
    gap: ur.left - contentRight, textCenterDelta: (tr.top + tr.height / 2) - (ir.top + ir.height / 2),
    font: [u.fontSize, u.fontWeight, u.lineHeight, u.fontFamily].join(' | '),
    valueFont: [s.fontSize, s.fontWeight, s.lineHeight, s.fontFamily].join(' | '),
    color: u.color, tertiary: color('--text-tertiary'), disabledColor: color('--text-disabled'), danger: color('--status-danger-fg'),
    background: rgb(getComputedStyle(input).backgroundColor), borderColor: s.borderRightColor,
    textAlign: s.textAlign, numeric: s.fontVariantNumeric,
    describedBy: input.getAttribute('aria-describedby'), unitId: unit.id, unitText: unit.textContent,
    ariaHidden: unit.getAttribute('aria-hidden'), userSelect: u.userSelect || u.webkitUserSelect, pointerEvents: u.pointerEvents,
    value: input.value, invalid: input.getAttribute('aria-invalid'), disabled: input.disabled,
    overflow: input.scrollWidth > input.clientWidth,
    focused: document.activeElement === input, focusVisible: input.matches(':focus-visible'),
    outline: s.outlineStyle + ' ' + s.outlineWidth, outlineColor: s.outlineColor, focusColor: color('--border-focus'),
  };
})()`);

// 그려진 픽셀: 값 칸 끝 ~ 접미사 시작 사이(간격 4px)의 안쪽 세로 줄들이 전부 바탕색인가 — 값이 접미사 쪽으로 새지 않는다.
// 값 잉크의 오른쪽 끝·접미사 잉크의 왼쪽 끝도 함께 돌려준다(보고용). 캡처 전 프레임 두 개(연속 clip 캡처 stale 회피).
async function pixels(m, name) {
  await frames();
  const shot = await cdp('Page.captureScreenshot', { format: 'png', clip: { x: m.x, y: m.y, width: m.width, height: m.height, scale: 1 } });
  const buffer = Buffer.from(shot.data, 'base64');
  if (name) writeFileSync(`${OUT}/${name}.png`, buffer);
  const image = decodePng(buffer);
  const bg = m.background;
  const ink = (x) => { for (let y = 3; y < image.height - 3; y++) { const p = image.pixel(x, y); if (p.some((v, i) => Math.abs(v - bg[i]) > 24)) return true; } return false; };
  const gapColumns = [];
  for (let x = Math.ceil(m.contentRight); x <= Math.floor(m.unitLeft) - 1; x++) gapColumns.push(x);
  const inkInGap = gapColumns.filter(ink);
  let valueInkRight = null, unitInkLeft = null;
  for (let x = Math.ceil(m.contentRight) - 1; x >= Math.floor(m.contentLeft); x--) if (ink(x)) { valueInkRight = x + 1; break; }
  for (let x = Math.floor(m.unitLeft); x < Math.ceil(m.unitLeft + m.unitWidth); x++) if (ink(x)) { unitInkLeft = x; break; }
  return { gapColumns, inkInGap, valueInkRight, unitInkLeft, visibleGap: unitInkLeft !== null && valueInkRight !== null ? unitInkLeft - valueInkRight : null };
}

// 검수 매트릭스 칸 캡처: Field 전체(레이블·입력·오류 줄)에 포커스 링이 들어가도록 사방 4px.
async function captureField(probe, name) {
  const r = await ev(`(() => { const b = document.querySelector(${JSON.stringify(sel(probe))}).getBoundingClientRect();
    return { x: Math.floor(b.left + scrollX) - 4, y: Math.floor(b.top + scrollY) - 4, width: Math.ceil(b.width) + 8, height: Math.ceil(b.height) + 8 }; })()`);
  await frames();
  const shot = await cdp('Page.captureScreenshot', { format: 'png', clip: { ...r, scale: 1 } });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(shot.data, 'base64'));
  return r;
}
async function captureProbe(probe, name, pad = 8) {
  const r = await ev(`(() => { const b = document.querySelector(${JSON.stringify(sel(probe))}).getBoundingClientRect();
    return { x: Math.floor(b.left + scrollX) - ${pad}, y: Math.floor(b.top + scrollY) - ${pad}, width: Math.ceil(b.width) + ${pad * 2}, height: Math.ceil(b.height) + ${pad * 2} }; })()`);
  await frames();
  const shot = await cdp('Page.captureScreenshot', { format: 'png', clip: { ...r, scale: 1 } });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(shot.data, 'base64'));
}

async function ax(selector) {
  const { root } = await cdp('DOM.getDocument', { depth: 0 });
  const { nodeId } = await cdp('DOM.querySelector', { nodeId: root.nodeId, selector });
  const { nodes } = await cdp('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
  const node = nodes[0];
  return { ignored: node.ignored, role: node.role?.value, name: node.name?.value, description: node.description?.value, value: node.value?.value };
}
const near = (a, b, tolerance = 0.01) => Math.abs(a - b) <= tolerance;

// 자리·글자·색 공통 단정
function assertGeometry(m, label) {
  assert.ok(near(m.unitEndInset, 13), `${label}: 접미사 오른쪽 안쪽 ${m.unitEndInset} ≠ 경계 1 + 여백 12`);
  assert.ok(near(m.gap, 4), `${label}: 값 칸 끝 ~ 접미사 ${m.gap} ≠ 4`);
  assert.ok(Math.abs(m.textCenterDelta) <= 0.5, `${label}: 접미사 글자 세로 가운데 차이 ${m.textCenterDelta}`);
  assert.equal(m.font, m.valueFont, `${label}: 접미사 글자 ≠ 값 글자`);
  assert.match(m.font, /^14px \| 400 \| /, `${label}: body-sm 14px/400`);
  assert.equal(m.height, 38);
}

try {
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp('Accessibility.enable');
  const base = await storybookBase();
  const build = await (await fetch(`${base}/build-info.json`, { cache: 'no-store' })).json();
  const tag = `${String(build.sha).slice(0, 7)}${build.dirty ? '-dirty' : ''}`;
  console.log(`캡처 출처: 빌드 ${tag} · ${build.builtAt}`);
  await cdp('Browser.grantPermissions', { origin: new URL(base).origin, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] }).catch(() => {});

  for (const theme of ['light', 'dark']) {
    const story = theme === 'light' ? 'components-input--단위접미사' : 'components-input--단위접미사다크';
    await check(`①②③ 검수 매트릭스 자리·글자·색·픽셀 ${theme} (4상태 × 원·개월)`, async () => {
      await load(story, theme);
      const out = {};
      for (const state of STATES) for (const [unit, ascii] of UNITS) {
        const probe = `unit-${state}-${unit}`, label = `${theme} ${state} ${unit}`;
        if (state === 'focus') {
          // 키보드로 들어간다 — 앞 칸에서 Tab. 스크립트 focus() 는 :focus-visible 을 보장하지 않는다.
          const previous = unit === '원' ? 'unit-default-개월' : 'unit-focus-원';
          await ev(`document.querySelector(${JSON.stringify(sel(previous))}).focus()`);
          await act.key('Tab');
          await wait(`document.activeElement === document.querySelector(${JSON.stringify(sel(probe))})`, `${label} Tab 포커스`);
        } else await ev('document.activeElement?.blur()');
        const m = await measure(probe);
        assertGeometry(m, label);
        assert.equal(m.unitText, unit);
        assert.equal(m.textAlign, 'right'); assert.match(m.numeric, /tabular-nums/);
        // 색: 오류여도 빨갛지 않다. 비활성만 text-disabled.
        assert.equal(m.color, state === 'disabled' ? m.disabledColor : m.tertiary, `${label}: 접미사 색 ${m.color}`);
        assert.notEqual(m.color, m.danger, `${label}: 접미사가 오류 빨강`);
        if (state === 'error') { assert.equal(m.invalid, 'true'); assert.equal(m.borderColor, m.danger, `${label}: 오류 경계`); }
        if (state === 'disabled') assert.equal(m.disabled, true);
        if (state === 'focus') {
          assert.ok(m.focused && m.focusVisible, `${label}: 키보드 포커스`);
          assert.equal(m.outline, 'solid 2px'); assert.equal(m.outlineColor, m.focusColor);
        }
        const p = await pixels(m);
        assert.ok(p.gapColumns.length >= 3, `${label}: 간격 열 ${p.gapColumns.length}`);
        assert.deepEqual(p.inkInGap, [], `${label}: 값과 접미사 사이 간격에 잉크`);
        // 숫자 값의 잉크는 값 칸 끝(접미사 왼쪽 4px)에서 끝난다 — 글리프 옆 여백만큼(2px 이하) 안쪽.
        // 경계가 소수 좌표라 그 픽셀 열의 안티에일리어싱이 1px 미만 걸칠 수 있다(실측 222.89 칸 끝 · 잉크 열 222).
        assert.ok(p.valueInkRight !== null && m.contentRight - p.valueInkRight > -1 && m.contentRight - p.valueInkRight <= 2,
          `${label}: 값 잉크 끝 ${p.valueInkRight} / 값 칸 끝 ${m.contentRight}`);
        out[`${state}-${unit}`] = { unitWidth: +m.unitWidth.toFixed(2), gap: +m.gap.toFixed(2), inset: +m.unitEndInset.toFixed(2),
          visibleGap: p.visibleGap, color: m.color, wrapper: +m.wrapperWidth.toFixed(2) };
        await captureField(`unit-field-${state}-${unit}`, `input-unit-${theme}-${state}-${ascii}-${tag}`);
      }
      await ev('document.activeElement?.blur()');
      await captureProbe('unit-matrix', `input-unit-${theme}-matrix-${tag}`, 12);
      return out;
    });
  }

  await check('④ 접근성 — 낭독 설명이 접미사부터, Field 오류·설명·앱 id 와 합침, 접미사 span 은 트리에서 숨음', async () => {
    await load('components-input--단위접미사', 'light');
    const error = await ax(sel('unit-error-원'));
    assert.deepEqual(error, { ignored: false, role: 'textbox', name: '판매가 · 오류', description: '원 판매가를 1원 이상으로 입력하세요', value: '39,000' });
    const months = await ax(sel('unit-default-개월'));
    assert.equal(months.description, '개월'); assert.equal(months.value, '12');
    const m = await measure('unit-error-원');
    assert.equal(m.describedBy.split(' ')[0], m.unitId, '접미사 id 가 맨 앞');
    assert.equal(m.describedBy.split(' ').length, 2, '접미사 + Field 오류');
    assert.equal(m.ariaHidden, 'true'); assert.equal(m.pointerEvents, 'none'); assert.equal(m.userSelect, 'none');
    const unitNode = await ax(`#${CSS_ESCAPE(m.unitId)}`);
    assert.equal(unitNode.ignored, true, '접미사 span 이 따로 읽힌다');
    // 접미사를 눌러도 입력에 포커스가 간다(포인터 통과).
    const point = await ev(`(() => { const r = document.querySelector(${JSON.stringify(sel('unit-default-개월'))}).closest('[data-slot="input-control"]')
      .querySelector('[data-slot="input-unit"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    await act.pointerAt(point.x, point.y);
    await wait(`document.activeElement === document.querySelector(${JSON.stringify(sel('unit-default-개월'))})`, '접미사 클릭 → 입력 포커스');
    await ev('document.activeElement.blur()');
    await load('components-input--단위접미사폭', 'light');
    const own = await ax(sel('unit-described-%'));
    assert.equal(own.description, '% 최대 90까지 입력합니다.', '앱이 준 aria-describedby 를 지우지 않고 뒤에 잇는다');
    await load('components-input--단위접미사같은줄', 'light');
    const described = await ev(`[...document.querySelectorAll('[data-probe="unit-row-price"] input')].map(i => i.getAttribute('aria-describedby').split(' ').length)`);
    assert.deepEqual(described, [1, 2], 'FormRow: 접미사만 · 접미사 + 설명');
    return { error, months, own, described };
  });

  await check('⑤ 복사·붙여넣기 — 값 복사·끌어 선택 복사·붙여넣은 값에 접미사가 섞이지 않는다(실제 클립보드)', async () => {
    await load('components-input--단위접미사', 'light');
    const command = async (key, code, keyCode, name) => {
      await cdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code, windowsVirtualKeyCode: keyCode, commands: [name] });
      await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode });
    };
    const clipboard = () => ev('navigator.clipboard.readText()');
    // 입력 값 전체 선택 → 복사
    await ev(`document.querySelector(${JSON.stringify(sel('unit-default-원'))}).focus()`);
    await command('a', 'KeyA', 65, 'selectAll'); await command('c', 'KeyC', 67, 'copy');
    const valueCopy = await clipboard();
    assert.equal(valueCopy, '39,000');
    // 칸을 끌어 선택한 것과 같은 범위(레이블 ~ 입력 칸 전체) → 복사
    await ev(`(() => { document.activeElement.blur(); const s = getSelection(); s.removeAllRanges();
      s.selectAllChildren(document.querySelector(${JSON.stringify(sel('unit-field-default-개월'))})); })()`);
    const selected = await ev('getSelection().toString()');
    await command('c', 'KeyC', 67, 'copy');
    const fieldCopy = await clipboard();
    assert.ok(!fieldCopy.includes('개월') && !selected.includes('개월'), `칸 복사에 접미사: ${JSON.stringify(fieldCopy)}`);
    assert.ok(fieldCopy.includes('약정 기간'), `칸 복사에 레이블이 없다(선택 실패?): ${JSON.stringify(fieldCopy)}`);
    // 화면 전체 선택에도 '개월' 은 없다(레이블·오류 문구에 '개월' 을 쓰지 않았다).
    const page = await ev(`(() => { const s = getSelection(); s.selectAllChildren(${CANVAS}); const t = s.toString(); s.removeAllRanges(); return t; })()`);
    assert.ok(!page.includes('개월'), '전체 선택에 접미사');
    // 붙여넣기: 다른 칸에 값만 들어간다.
    await ev(`navigator.clipboard.writeText('39,000')`);
    await ev(`document.querySelector(${JSON.stringify(sel('unit-default-개월'))}).focus()`);
    await command('a', 'KeyA', 65, 'selectAll'); await command('v', 'KeyV', 86, 'paste');
    const pasted = await ev(`document.querySelector(${JSON.stringify(sel('unit-default-개월'))}).value`);
    assert.equal(pasted, '39,000');
    return { valueCopy, fieldCopy, pasted };
  });

  for (const theme of ['light', 'dark']) {
    await check(`⑥ 최소 폭 = 120 + 4 + 접미사 폭 · 긴 값이 접미사 밑으로 들어가지 않는다(픽셀) ${theme}`, async () => {
      await load('components-input--단위접미사폭', theme);
      const min = {};
      for (const key of ['none', '원', '개월', '%']) {
        const box = await ev(`(() => { const i = document.querySelector(${JSON.stringify(sel(`unit-min-${key}`))}), s = getComputedStyle(i);
          const outer = (i.closest('[data-slot="input-control"]') ?? i).getBoundingClientRect(), r = i.getBoundingClientRect();
          const unit = i.closest('[data-slot="input-control"]')?.querySelector('[data-slot="input-unit"]');
          return { outer: outer.width, input: r.width, content: r.width - parseFloat(s.borderLeftWidth) - parseFloat(s.borderRightWidth)
            - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight), unit: unit ? unit.getBoundingClientRect().width : 0 }; })()`);
        assert.ok(near(box.content, 94), `${key}: 값 칸 ${box.content} ≠ 94`);
        assert.ok(near(box.outer, 120 + (box.unit ? 4 + box.unit : 0)), `${key}: 최소 폭 ${box.outer}`);
        min[key] = { outer: +box.outer.toFixed(2), unit: +box.unit.toFixed(2) };
      }
      const long = {};
      for (const probe of ['unit-long-원', 'unit-long-개월', 'unit-icon-원', 'unit-empty-원', 'unit-described-%']) {
        const m = await measure(probe);
        assertGeometry(m, `${theme} ${probe}`);
        if (probe.startsWith('unit-long')) assert.ok(m.overflow, `${probe}: 값이 넘치지 않아 검사가 무의미하다`);
        if (probe === 'unit-icon-원') assert.equal(m.contentLeft, 37, '앞 아이콘: 경계 1 + 여백 12 + 아이콘 16 + 간격 8');
        const p = await pixels(m);
        assert.deepEqual(p.inkInGap, [], `${theme} ${probe}: 간격에 잉크(값이 접미사 쪽으로 샌다)`);
        long[probe] = { overflow: m.overflow, visibleGap: p.visibleGap, valueInkRight: p.valueInkRight, contentRight: +m.contentRight.toFixed(2) };
      }
      await captureProbe('unit-min', `input-unit-${theme}-min-width-${tag}`);
      await captureField('unit-long-원', `input-unit-${theme}-long-value-${tag}`);
      await captureField('unit-long-개월', `input-unit-${theme}-long-value-months-${tag}`);
      await captureField('unit-icon-원', `input-unit-${theme}-leading-icon-${tag}`);
      return { min, long };
    });

    await check(`⑦ FormRow 같은 줄 — 접미사·설명·오류가 있어도 입력칸 윗선·높이 같음 ${theme}`, async () => {
      await load('components-input--단위접미사같은줄', theme);
      const rows = await ev(`Object.fromEntries([...${CANVAS}.querySelectorAll('[data-probe^="unit-row-"]')].map(row => [row.dataset.probe,
        [...row.querySelectorAll('[data-slot="input"]')].map(i => { const r = i.getBoundingClientRect(),
          u = i.closest('[data-slot="input-control"]')?.querySelector('[data-slot="input-unit"]');
          return { top: r.top, height: r.height, width: r.width, unitInset: u ? r.right - u.getBoundingClientRect().right : null }; })]))`);
      for (const [key, [a, b]] of Object.entries(rows)) {
        assert.equal(a.top, b.top, `${key}: 입력칸 y 차이 ${a.top - b.top}`);
        assert.deepEqual([a.height, b.height], [38, 38]);
        assert.ok(near(a.width, b.width), `${key}: 두 칸 폭 ${a.width} · ${b.width}`);
        for (const item of [a, b]) if (item.unitInset !== null) assert.ok(near(item.unitInset, 13));
      }
      await captureProbe('unit-row-price', `input-unit-${theme}-formrow-price-${tag}`);
      await captureProbe('unit-row-term', `input-unit-${theme}-formrow-term-${tag}`);
      await captureProbe('unit-row-mixed', `input-unit-${theme}-formrow-mixed-${tag}`);
      return rows;
    });
  }

  await check('콘솔 오류 없음', () => {
    assert.deepEqual(browser.errors().filter(m => !/Warning:|DevTools|favicon|preload/i.test(m)), []);
  });
} finally {
  writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2)); browser.close();
}
function CSS_ESCAPE(id) { return id.replace(/[^a-zA-Z0-9_-]/g, ch => `\\${ch}`); }
const passed = results.filter(r => r.pass).length;
console.log(`${results.length}개 검사, ${passed}개 통과`);
process.exitCode = passed === results.length ? 0 : 1;
