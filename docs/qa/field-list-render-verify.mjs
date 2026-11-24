// 0.6.0 3a — 반복 입력 줄(FieldList · 디자인 총괄 규칙 표 L-1~L-17 · 자가 점검 목록 · Figma 203:4~7 r1).
// 검수 매트릭스: 라이트·다크 × 1440·1024·768·390 × Screens/ShipmentCreate 기본·줄 오류·칸 오류·최소·최대·빈 목록·
//   묶음 오류(빈 목록·최대 초과)·추가 직후 포커스.
// 자가 점검 목록 항목을 수치로 단정하고, 내용 전체 높이 화면(deviceScaleFactor 1)을 OUT 에 `<sha>-<테마>-<폭>-<상태>.png` 로
// 남긴다. 상호작용(라이트 1440·390): 추가 → 새 줄 첫 칸 · 삭제 → 다음 줄 삭제 → 이전 줄 → 추가 버튼 · min/max ·
// 되돌리기 토스트(5초) · '오류 N개' 수와 이동.
// 실행: pnpm qa --only field-list-render-verify [결과 폴더] (서버·출처 확인은 run-all 이 한다).
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, CANVAS, actions } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/field-list';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ windowSize: '1440,900', outDir: OUT });
const { ev, cdp, sleep } = browser;
const { open } = storybook(browser);
const act = actions(browser);
const results = [], shots = [];
const THEMES = ['light', 'dark'];
const VIEWPORTS = [[1440, 900], [1024, 768], [768, 1024], [390, 844]];
let sha = 'nosha';
const near = (actual, expected, message, tolerance = 0.5) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} ≠ ${expected}`);
async function wait(expression, label = expression, tries = 125) {
  for (let i = 0; i < tries; i++) { if (await ev(expression).catch(() => false)) return; await sleep(40); }
  throw new Error(`조건 대기 실패: ${label}`);
}
async function check(label, run) {
  try { const measurements = await run(); results.push({ label, pass: true, measurements }); console.log(`✓ ${label}`); }
  catch (e) { results.push({ label, pass: false, error: e.message }); console.error(`✗ ${label}: ${e.message}`); await browser.shot(`failure-${results.length}`); }
}
const frames = () => ev('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
async function load(id, theme, [width, height]) {
  await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  const r = await open(id, { extra: `&globals=theme:${theme}` });
  assert.equal(r.sbError, null); assert.deepEqual(r.errors, []);
  await wait(`${CANVAS}.dataset.playComplete === 'true'`, `${id} play 완료`);
  await wait(`document.documentElement.dataset.theme === '${theme}'`);
  // 테마는 마운트 뒤 바뀐다. 버튼 색 전환(--dur-fast 140ms)이 끝난 뒤 잰다.
  await sleep(220);
  await ev(`document.fonts.load('14px "Pretendard Variable"', '품목명 수량 중량 0123456789 개 kg 최대 오류')`);
  await ev('document.fonts.ready');
  await frames();
}
/** 내용 전체가 보이게 창 높이를 본문 스크롤 높이로 늘려 찍는다(줄 20개·390 쌓기도 한 장에). */
async function shot(theme, [width, height], state) {
  const full = await ev(`(() => { const m = document.querySelector('[data-slot="app-shell-main"]'); return m.scrollHeight - m.clientHeight; })()`);
  if (full > 0) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: height + full, deviceScaleFactor: 1, mobile: false });
    await sleep(120);
  }
  await frames();
  const r = await cdp('Page.captureScreenshot', { format: 'png' });
  const file = `${OUT}/${sha}-${theme}-${width}-${state}.png`;
  writeFileSync(file, Buffer.from(r.data, 'base64'));
  shots.push(file);
  if (full > 0) await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  return file;
}

const HELPERS = `
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgb = color => { ctx.clearRect(0,0,1,1); ctx.fillStyle = color; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data]; };
  const token = name => rgb(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
  const same = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 1);
  const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height }; };
  const visible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' && el.getBoundingClientRect().width > 1;
  const main = document.querySelector('[data-slot="app-shell-main"]');
  const list = document.querySelector('[data-slot="field-list"]');
  const body = list.querySelector('[data-slot="field-list-body"]');
  const slot = (name, root = list) => root.querySelector('[data-slot="field-list-' + name + '"]');
  const slots = (name, root = list) => [...root.querySelectorAll('[data-slot="field-list-' + name + '"]')];
  const control = cell => cell.querySelector('input, textarea, button[role="combobox"]');
  const text = el => { const s = getComputedStyle(el); return { size: s.fontSize, lineHeight: s.lineHeight, weight: s.fontWeight,
    danger: same(rgb(s.color), token('--status-danger-fg')), secondary: same(rgb(s.color), token('--text-secondary')) }; };
  const message = el => el && el.textContent ? { ...box(el), text: el.textContent, ...text(el), icon: box(el.querySelector('svg')) } : null;
`;
const inPage = body => ev(`(() => { ${HELPERS} ${body} })()`);

const state = () => inPage(`
  const rows = slots('row');
  const card = document.querySelector('[data-screen="items"]');
  const head = slot('head');
  const lineColor = token('--border-input');
  return {
    width: body.getBoundingClientRect().width, card: box(card), overflowX: main.scrollWidth - main.clientWidth,
    fieldset: { invalid: list.getAttribute('aria-invalid'), describedBy: list.getAttribute('aria-describedby'),
      legendHidden: getComputedStyle(slot('legend')).position === 'absolute', name: slot('legend').textContent },
    error: message(slot('error')), errorRole: slot('error').getAttribute('role'), errorId: slot('error').id, bodyTop: box(body).top,
    head: visible(head) ? { ...box(head), ...text(head), columns: [...head.children].map(c => ({ ...box(c), text: c.textContent })) } : null,
    rows: rows.map(row => {
      const s = getComputedStyle(row), grid = slot('row-grid', row);
      const cells = slots('cell', row).map(cell => { const input = control(cell), cs = getComputedStyle(input), label = slot('cell-label', cell);
        const wrapper = input.closest('[data-slot="input-control"]') ?? input;
        return { ...box(wrapper), name: input.getAttribute('aria-label'), invalid: input.getAttribute('aria-invalid'), describedBy: input.getAttribute('aria-describedby'),
          dangerBorder: same(rgb(cs.borderTopColor), token('--status-danger-fg')), fieldBorder: same(rgb(cs.borderTopColor), lineColor),
          align: cs.textAlign, numeric: cs.fontVariantNumeric, numericCell: cell.dataset.numeric !== undefined,
          unit: box(cell.querySelector('[data-slot="input-unit"]')),
          label: visible(label) ? { ...box(label), ...text(label), text: label.textContent } : null,
          error: message(slot('cell-error', cell)) }; });
      const del = slot('delete', row), label = slot('row-label', row);
      return { ...box(row), grid: box(grid), border: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth],
        borderTopSubtle: same(rgb(s.borderTopColor), token('--border-subtle')), bg: s.backgroundColor, radius: s.borderTopLeftRadius,
        paddingTop: parseFloat(s.paddingTop), marginTop: parseFloat(s.marginTop),
        cells, rowError: message(slot('row-error', row)),
        del: { ...box(del), name: del.getAttribute('aria-label'), disabled: del.disabled, ghost: getComputedStyle(del).backgroundColor, icon: box(del.querySelector('svg')) },
        label: visible(label) ? { ...box(label), ...text(label), text: label.textContent } : null };
    }),
    empty: visible(slot('empty')) ? { ...box(slot('empty')), ...text(slot('empty')), text: slot('empty').textContent,
      paddingTop: parseFloat(getComputedStyle(slot('empty')).paddingTop) } : null,
    add: { ...box(slot('add')), text: slot('add').textContent, disabled: slot('add').disabled,
      secondary: same(rgb(getComputedStyle(slot('add')).backgroundColor), token('--bg-surface')) && same(rgb(getComputedStyle(slot('add')).borderTopColor), token('--border-strong')) },
    max: visible(slot('max')) ? { ...box(slot('max')), ...text(slot('max')), text: slot('max').textContent } : null,
    errorsLink: (() => { const e = document.querySelector('[data-slot="form-action-bar-errors"]'); return e ? { text: e.textContent, visible: visible(e) } : null; })(),
    gray: [...list.querySelectorAll('[data-slot="field-list-error"], [data-slot="field-list-cell-error"], [data-slot="field-list-row-error"]')]
      .filter(el => el.textContent && !same(rgb(getComputedStyle(el).color), token('--status-danger-fg'))).length,
  };`);

/** 자가 점검 목록(구조·폭) — 모든 상태 공통. */
function assertLayout(m, { width, label }) {
  const wide = width >= 1024;
  assert.equal(m.width >= 640, wide, `${label}: 그릇 ${m.width}px → ${wide ? '넓은' : '좁은'} 폭(768 카드 안쪽 638 < 640)`);
  assert.ok(m.overflowX <= 0.5, `${label}: 본문 가로 스크롤 ${m.overflowX}`);
  assert.equal(m.fieldset.name, '품목'); assert.ok(m.fieldset.legendHidden, 'legend 는 카드 제목과 같아 시각 숨김(L-1)');
  assert.equal(m.errorRole, 'alert', '묶음 오류 자리 role=alert(L-14)');
  assert.equal(m.gray, 0, '회색 오류 글자 0(자가 점검)');
  // 카드 안 줄마다 상자 0: 줄에 바탕·모서리·좌우·아래 테두리가 없다. 좁은 폭은 줄 사이 윗선 하나만.
  for (const [i, row] of m.rows.entries()) {
    assert.ok(/rgba\(0, 0, 0, 0\)|transparent/.test(row.bg), `${label}: 줄 ${i + 1} 바탕 없음 ${row.bg}`);
    assert.equal(row.radius, '0px'); assert.deepEqual(row.border.slice(1), ['0px', '0px', '0px'], `${label}: 줄 ${i + 1} 상자 테두리 0`);
    assert.equal(row.border[0], !wide && i > 0 ? '1px' : '0px', `${label}: 줄 ${i + 1} 윗선`);
    if (!wide && i > 0) assert.ok(row.borderTopSubtle, '줄 사이 선 = border-subtle(L-6)');
    // 입력 이름 = 줄 번호 + 열 이름(L-5)
    assert.deepEqual(row.cells.map(c => c.name), ['품목명', '수량', '중량'].map(col => `품목 ${i + 1} ${col}`));
    // 삭제 = ghost 아이콘 38×38 '품목 N 삭제', 줄 오른끝(자가 점검)
    near(row.del.width, 38, '삭제 폭 38'); near(row.del.height, 38, '삭제 높이 38'); near(row.del.icon.width, 16, '휴지통 아이콘 16');
    assert.equal(row.del.name, `품목 ${i + 1} 삭제`);
    assert.ok(/rgba\(0, 0, 0, 0\)|transparent/.test(row.del.ghost), 'ghost 바탕 투명');
    near(row.del.right, row.grid.right, '삭제가 줄 오른끝');
    // 숫자 칸 = tabular-nums 오른쪽 정렬, 단위 접미사 오른쪽(자가 점검 입력칸 정렬)
    for (const cell of row.cells.filter(c => c.numericCell)) {
      assert.equal(cell.align, 'right'); assert.equal(cell.numeric, 'tabular-nums');
      near(cell.right - cell.unit.right, 13, '단위 접미사 = 상자 안 오른쪽 12(테두리 1 + 12, §17.1.1)');
    }
  }
  // 같은 열 입력 왼끝·오른끝 Δx 0
  for (let c = 0; c < 3; c++) {
    const lefts = m.rows.map(r => r.cells[c].left), rights = m.rows.map(r => r.cells[c].right);
    if (wide) { assert.ok(Math.max(...lefts) - Math.min(...lefts) <= 0.5, `열 ${c} 왼끝 Δx`); assert.ok(Math.max(...rights) - Math.min(...rights) <= 0.5, `열 ${c} 오른끝 Δx`); }
  }
  // 추가 = secondary, 목록 아래 12, 왼끝(L-8)
  assert.ok(m.add.secondary, '추가 secondary'); assert.equal(m.add.text, '품목 추가');
  near(m.add.height, 38, '추가 md 38');
  const listLeft = m.rows[0]?.cells[0].left ?? m.empty?.left;
  near(m.add.left, listLeft, '추가 왼끝 = 목록 왼끝 Δx 0');
  const above = m.rows.length ? Math.max(...m.rows.map(r => r.bottom)) : m.empty.bottom;
  near(m.add.top - above, 12, '목록 아래 12');
  if (wide && m.rows.length) {
    assert.ok(m.head, '넓은 폭은 열 머리 한 줄');
    assert.equal(m.head.size, '13px'); assert.equal(m.head.weight, '500');
    assert.deepEqual(m.head.columns.map(c => c.text), ['품목명 *', '수량 *', '중량 *']);
    for (let c = 0; c < 3; c++) near(m.head.columns[c].left, m.rows[0].cells[c].left, `열 머리 ${c} 왼끝 = 입력 왼끝`);
    near(m.rows[0].top - m.head.bottom, 4, '열 머리 아래 4(L-5)');
    near(m.rows[0].cells[1].left - m.rows[0].cells[0].right, 16, '열 간격 16(L-4)');
    near(m.rows[0].cells[2].left - m.rows[0].cells[1].right, 16, '열 간격 16');
    near(m.rows[0].del.left - m.rows[0].cells[2].right, 16, '삭제 열 앞 16');
    assert.ok(m.rows[0].cells[1].width >= 128 - 0.5, '숫자 열 ≥ 8rem');
    near(m.rows[0].cells[0].width, 2 * m.rows[0].cells[1].width, '글자 칸 2fr = 숫자 칸 2배', 1);
    for (const row of m.rows) { assert.equal(row.label, null, '넓은 폭 줄 이름은 화면에 없다(낭독용)'); assert.ok(row.cells.every(c => c.label === null), '줄 안 레이블 반복 0(L-5)'); }
    // 줄 피치 46 — 앞 줄에 오류가 없을 때
    for (let i = 1; i < m.rows.length; i++) {
      const prev = m.rows[i - 1], clean = !prev.rowError && prev.cells.every(c => !c.error);
      if (clean) near(m.rows[i].top - prev.top, 46, `줄 피치 46 (${i}→${i + 1})`);
    }
  } else if (m.rows.length) {
    assert.equal(m.head, null, '좁은 폭은 열 머리 없음');
    for (const [i, row] of m.rows.entries()) {
      assert.ok(row.label, '줄 머리 보임'); assert.equal(row.label.text, `품목 ${i + 1}`);
      assert.ok(row.label.secondary && row.label.weight === '500' && row.label.size === '13px', '줄 머리 caption 500 text-secondary');
      near(row.del.top, row.grid.top, '삭제는 줄 머리 줄'); near(row.del.right, row.grid.right, '삭제 오른끝');
      const [name, qty, weight] = row.cells;
      near(name.left, row.grid.left, '첫 칸 왼끝'); near(name.width, row.grid.width, '첫 칸 전체 폭(L-6)');
      near(qty.top, weight.top, '숫자 칸 둘씩 한 줄(LD-3 A)'); near(weight.left - qty.right, 12, '숫자 칸 간격 12');
      near(weight.right, row.grid.right, '둘째 숫자 칸 오른끝');
      for (const cell of row.cells) { assert.ok(cell.label, '칸마다 레이블(L-6)'); near(cell.top - cell.label.bottom, 4, '레이블 아래 4'); }
      if (i > 0) { near(row.paddingTop, 16, '선 아래 16'); near(row.marginTop, 16, '선 위 16'); }
    }
  }
}

const STATES = [
  ['기본', '기본'], ['줄오류', '줄오류'], ['칸오류', '칸오류'], ['최소', '최소'], ['최대', '최대'], ['빈목록', '빈목록'],
  ['묶음오류빈목록', '묶음오류-빈목록'], ['묶음오류최대초과', '묶음오류-최대초과'], ['추가직후포커스', '추가직후포커스'],
];
const EXPECTED_ERRORS = { 줄오류: 1, 칸오류: 2, 묶음오류빈목록: 1, 묶음오류최대초과: 1 };

try {
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await open('screens-shipmentcreate--기본');
  sha = await ev(`fetch('/build-info.json').then(r => r.ok ? r.json() : {}).then(i => (i.sha ?? 'nosha').slice(0, 7) + (i.dirty ? '-dirty' : '')).catch(() => 'nosha')`);

  for (const theme of THEMES) for (const viewport of VIEWPORTS) {
    const [width] = viewport;
    for (const [story, name] of STATES) {
      await check(`${theme} ${width} ${name}: 자가 점검(상자 0·피치·Δx·열 간격·좁은 폭 쌓기·삭제·추가·오류 모양)`, async () => {
        await load(`screens-shipmentcreate--${story}`, theme, viewport);
        if (story !== '추가직후포커스') await ev(`(document.activeElement instanceof HTMLElement) && document.activeElement.blur()`);
        const m = await state();
        assertLayout(m, { width, label: `${theme} ${width} ${name}` });
        const result = { width, mode: m.width >= 640 ? 'wide' : 'narrow', listWidth: m.width, card: m.card.height, rows: m.rows.length };
        if (story === '기본' || story === '추가직후포커스') {
          if (story === '기본') assert.equal(m.rows.length, 5);
          if (width === 390 && story === '기본') assert.ok(m.card.height <= 1200, `390 3칸 줄 5개 카드 ${m.card.height} ≤ 1,200`);
          if (width >= 1024 && story === '기본') near(m.rows[4].bottom - m.rows[0].top, 4 * 46 + 38, '5줄 영역 = 피치 46 × 4 + 38');
        }
        if (story === '추가직후포커스') {
          assert.equal(m.rows.length, 6);
          assert.equal(await ev(`document.activeElement?.getAttribute('aria-label')`), '품목 6 품목명', '추가 후 포커스 = 새 줄 첫 칸');
          const ring = await ev(`(() => { const s = getComputedStyle(document.activeElement); return [s.outlineStyle, s.outlineWidth, s.outlineColor]; })()`);
          result.focusRing = ring;
        }
        if (story === '최소') {
          assert.equal(m.rows.length, 1); assert.ok(m.rows[0].del.disabled, 'min 에 닿으면 삭제 비활성'); near(m.rows[0].del.width, 38, '비활성도 자리 유지');
        }
        if (story === '최대' || story === '묶음오류최대초과') {
          assert.ok(m.add.disabled, 'max 에 닿으면 추가 비활성');
          assert.ok(m.max && m.max.text === '최대 20개' && m.max.secondary && m.max.size === '14px', `옆 '최대 20개' body-sm text-secondary ${JSON.stringify(m.max)}`);
          near(m.max.left - m.add.right, 8, "'최대 N개'는 버튼 오른쪽 8");
        } else assert.equal(m.max, null);
        if (story === '빈목록' || story === '묶음오류빈목록') {
          assert.equal(m.rows.length, 0); assert.equal(m.empty.text, '품목이 없습니다');
          assert.ok(m.empty.secondary && m.empty.size === '14px', '빈 상태 body-sm text-secondary'); near(m.empty.paddingTop, 12, '빈 상태 위아래 12');
        }
        if (story === '묶음오류빈목록' || story === '묶음오류최대초과') {
          const e = m.error;
          assert.ok(e && e.danger && e.size === '14px' && e.lineHeight === '20px', `묶음 오류 body-sm 14/20 위험색 ${JSON.stringify(e)}`);
          near(e.icon.width, 16, '아이콘 16'); near(e.top, m.bodyTop, '목록 머리 바로 아래(LD-2 A)');
          assert.equal(m.fieldset.invalid, 'true'); assert.ok(m.fieldset.describedBy?.split(' ').includes(m.errorId), 'fieldset aria-describedby → 묶음 오류');
          const next = m.empty ? m.empty.top : m.head?.top ?? m.rows[0].top;
          near(next - e.bottom, 12, '묶음 오류 아래 12');
        } else { assert.equal(m.error, null); assert.equal(m.fieldset.invalid, null); }
        if (story === '칸오류') {
          const invalid = m.rows.flatMap((r, i) => r.cells.filter(c => c.error).map(c => ({ ...c, row: i })));
          assert.deepEqual(invalid.map(c => c.name), ['품목 2 수량', '품목 4 중량']);
          for (const c of invalid) {
            assert.ok(c.error.danger && c.error.size === '13px', '칸 오류 = Field 오류 모양(caption 위험색)'); near(c.error.icon.width, 16, '아이콘 16');
            near(c.error.top - c.bottom, 4, '칸 아래 4'); near(c.error.left, c.left, '칸 왼끝'); assert.ok(c.dangerBorder, '입력 테두리 위험색');
            assert.equal(c.invalid, 'true'); assert.ok(c.describedBy.split(' ').length >= 1);
          }
        }
        if (story === '줄오류') {
          const row = m.rows[2];
          assert.ok(row.rowError && row.rowError.text === '같은 품목이 두 번 입력되었습니다.' && row.rowError.danger && row.rowError.size === '13px', '줄 오류 = Field 오류 모양');
          near(row.rowError.left, row.cells[0].left, '줄 오류는 첫 칸 왼끝(L-13)'); near(row.rowError.top - Math.max(...row.cells.map(c => c.bottom)), 4, '줄 아래 4');
          assert.ok(row.cells[0].dangerBorder && row.cells[0].invalid === 'true', '원인 칸(품목명) 테두리 위험색');
          assert.ok(row.cells.slice(1).every(c => c.fieldBorder && c.invalid !== 'true'), '나머지 칸 테두리는 그대로');
          assert.ok(m.rows.filter((_, i) => i !== 2).every(r => !r.rowError), '다른 줄 오류 없음');
        }
        if (EXPECTED_ERRORS[story]) assert.equal(m.errorsLink?.text, `오류 ${EXPECTED_ERRORS[story]}개`, "FormActionBar '오류 N개'가 묶음 오류도 센다(L-15)");
        else assert.equal(m.errorsLink, null);
        result.shot = await shot(theme, viewport, name);
        return result;
      });
    }
  }

  // ── '오류 N개'를 누르면(L-15) ──────────────────────────────────────
  for (const [story, target] of [['묶음오류빈목록', '품목 추가'], ['칸오류', '품목 2 수량'], ['줄오류', '품목 3 품목명'], ['묶음오류최대초과', '품목 1 품목명']]) {
    await check(`'오류 N개' → ${story}: ${target} 으로 포커스`, async () => {
      await load(`screens-shipmentcreate--${story}`, 'light', [1440, 900]);
      await ev(`document.querySelector('[data-slot="form-action-bar-errors"]').click()`);
      await wait(`(document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent?.trim()) === ${JSON.stringify(target)}`, target);
      return target;
    });
  }

  // ── 추가·삭제 포커스와 min/max ─────────────────────────────────────
  const focused = () => ev(`document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent?.trim()`);
  const names = () => ev(`[...document.querySelectorAll('[data-slot="field-list-row"]')].map(r => r.querySelector('input').value)`);
  for (const viewport of [[1440, 900], [390, 844]]) {
    await check(`${viewport[0]} 삭제 포커스: 다음 줄 삭제 → 이전 줄 삭제 → 추가 버튼(키보드)`, async () => {
      await load('screens-shipmentcreate--기본', 'light', viewport);
      const before = await names();
      await ev(`document.querySelector('[aria-label="품목 2 삭제"]').focus()`);
      await act.enter();
      await wait(`document.querySelectorAll('[data-slot="field-list-row"]').length === 4`);
      await frames();
      assert.equal(await focused(), '품목 2 삭제', '다음 줄(옛 3번)의 삭제로');
      assert.deepEqual(await names(), [before[0], before[2], before[3], before[4]], '두 번째 줄만 빠졌다');
      await ev(`document.querySelector('[aria-label="품목 4 삭제"]').focus()`);
      await act.enter();
      await wait(`document.querySelectorAll('[data-slot="field-list-row"]').length === 3`);
      await frames();
      assert.equal(await focused(), '품목 3 삭제', '마지막 줄이면 이전 줄 삭제로');
      for (const n of [3, 2, 1]) {
        await ev(`document.querySelector('[aria-label="품목 ${n} 삭제"]').focus()`);
        await act.enter();
        await wait(`document.querySelectorAll('[data-slot="field-list-row"]').length === ${n - 1}`);
      }
      await frames();
      assert.equal(await focused(), '품목 추가', '줄이 없으면 추가 버튼으로');
      assert.equal(await ev(`document.querySelector('[data-slot="field-list-empty"]')?.textContent`), '품목이 없습니다');
      return before;
    });
  }
  await check('min 1: 두 줄에서 하나를 지우면 남은 줄 삭제가 비활성이라 추가 버튼으로', async () => {
    await load('screens-shipmentcreate--최소', 'light', [1440, 900]);
    await ev(`document.querySelector('[data-slot="field-list-add"]').click()`);
    await wait(`document.activeElement?.getAttribute('aria-label') === '품목 2 품목명'`, '새 줄 첫 칸');
    assert.equal(await ev(`document.querySelector('[aria-label="품목 1 삭제"]').disabled`), false, 'min 보다 많으면 삭제 가능');
    await ev(`document.querySelector('[aria-label="품목 1 삭제"]').focus()`);
    await act.enter();
    await wait(`document.querySelectorAll('[data-slot="field-list-row"]').length === 1`);
    await frames();
    assert.equal(await focused(), '품목 추가');
    assert.equal(await ev(`document.querySelector('[aria-label="품목 1 삭제"]').disabled`), true);
  });
  await check('max 20: 추가를 거듭하면 20줄에서 추가 비활성 + 최대 20개, 포커스는 마지막 새 줄 첫 칸', async () => {
    await load('screens-shipmentcreate--기본', 'light', [1440, 900]);
    for (let n = 6; n <= 20; n++) {
      await ev(`document.querySelector('[data-slot="field-list-add"]').focus()`);
      await act.enter();
      await wait(`document.activeElement?.getAttribute('aria-label') === '품목 ${n} 품목명'`, `품목 ${n} 첫 칸`);
    }
    assert.equal(await ev(`document.querySelector('[data-slot="field-list-add"]').disabled`), true);
    assert.equal(await ev(`document.querySelector('[data-slot="field-list-max"]')?.textContent`), '최대 20개');
    assert.equal(await ev(`document.querySelector('[data-slot="field-list-add"]').getAttribute('aria-describedby') === document.querySelector('[data-slot="field-list-max"]').id`), true, '추가 버튼이 최대 문구를 설명으로 읽는다');
  });

  // ── 되돌리기 토스트(L-7) ───────────────────────────────────────────
  await check('입력이 있던 줄 삭제 → 토스트 "품목 2 삭제됨 · 되돌리기"(5초), 되돌리면 같은 자리·같은 값·첫 칸 포커스', async () => {
    await load('screens-shipmentcreate--기본', 'light', [1440, 900]);
    const before = await names();
    const started = Date.now();
    await ev(`document.querySelector('[aria-label="품목 2 삭제"]').click()`);
    await wait(`[...document.querySelectorAll('[data-sonner-toast]')].some(t => t.textContent.includes('품목 2 삭제됨'))`, '삭제 토스트');
    const toast = await ev(`(() => { const t = [...document.querySelectorAll('[data-sonner-toast]')].find(t => t.textContent.includes('품목 2 삭제됨'));
      const action = t.querySelector('[data-button]'); return { text: t.textContent, action: action?.textContent, role: t.querySelector('[role]')?.getAttribute('role') }; })()`);
    assert.equal(toast.action, '되돌리기'); assert.equal(toast.role, 'status');
    await ev(`[...document.querySelectorAll('[data-sonner-toast] [data-button]')].find(b => b.textContent === '되돌리기').click()`);
    await wait(`document.querySelectorAll('[data-slot="field-list-row"]').length === 5`);
    await wait(`document.activeElement?.getAttribute('aria-label') === '품목 2 품목명'`, '되돌린 줄 첫 칸');
    assert.deepEqual(await names(), before, '같은 자리·같은 값으로 돌아온다');
    return { toast, ms: Date.now() - started };
  });
  await check('되돌리기 토스트는 5초 뒤 사라진다', async () => {
    await load('screens-shipmentcreate--기본', 'light', [1440, 900]);
    await ev(`document.querySelector('[aria-label="품목 5 삭제"]').click()`);
    await wait(`[...document.querySelectorAll('[data-sonner-toast]')].some(t => t.textContent.includes('품목 5 삭제됨'))`, '삭제 토스트');
    const shown = Date.now();
    await sleep(4300);
    assert.ok(await ev(`[...document.querySelectorAll('[data-sonner-toast]')].some(t => t.textContent.includes('품목 5 삭제됨'))`), '4.3초에는 남아 있다');
    await wait(`![...document.querySelectorAll('[data-sonner-toast]')].some(t => t.textContent.includes('품목 5 삭제됨') && t.dataset.removed !== 'true')`, '5초 뒤 사라짐', 60);
    const gone = Date.now() - shown;
    assert.ok(gone >= 4300 && gone <= 6500, `사라진 시각 ${gone}ms`);
    return { gone };
  });
  await check('빈 줄(입력 없음) 삭제는 토스트 없이 지운다', async () => {
    await load('screens-shipmentcreate--추가직후포커스', 'light', [1440, 900]);
    await ev(`document.querySelector('[aria-label="품목 6 삭제"]').click()`);
    await wait(`document.querySelectorAll('[data-slot="field-list-row"]').length === 5`);
    await sleep(300);
    assert.equal(await ev(`document.querySelectorAll('[data-sonner-toast]').length`), 0);
  });
  await check('고치면 오류가 바로 풀리고 오류 수가 준다(§11.2)', async () => {
    await load('screens-shipmentcreate--칸오류', 'light', [1440, 900]);
    const input = `document.querySelector('[aria-label="품목 2 수량"]')`;
    await ev(`${input}.focus()`);
    await cdp('Input.insertText', { text: '5' });
    await wait(`${input}.getAttribute('aria-invalid') !== 'true'`, '칸 오류 풀림');
    assert.equal(await ev(`document.querySelector('[data-slot="form-action-bar-errors"]')?.textContent`), '오류 1개');
    assert.equal(await ev(`${input}.value`), '05');
  });
  await check('한글 입력 중 줄이 다시 그려지지 않는다(키 유지) — 조합 글자가 그대로 남는다', async () => {
    await load('screens-shipmentcreate--추가직후포커스', 'light', [1440, 900]);
    const before = await ev(`document.activeElement === document.querySelector('[aria-label="품목 6 품목명"]')`);
    await cdp('Input.imeSetComposition', { text: 'ㅎ', selectionStart: 1, selectionEnd: 1 });
    await cdp('Input.imeSetComposition', { text: '하', selectionStart: 1, selectionEnd: 1 });
    await cdp('Input.imeSetComposition', { text: '한', selectionStart: 1, selectionEnd: 1 });
    await cdp('Input.insertText', { text: '한' });
    await cdp('Input.imeSetComposition', { text: 'ㄱ', selectionStart: 1, selectionEnd: 1 });
    await cdp('Input.imeSetComposition', { text: '글', selectionStart: 1, selectionEnd: 1 });
    await cdp('Input.insertText', { text: '글' });
    await frames();
    const after = await ev(`({ value: document.querySelector('[aria-label="품목 6 품목명"]').value, focus: document.activeElement?.getAttribute('aria-label') })`);
    assert.ok(before); assert.deepEqual(after, { value: '한글', focus: '품목 6 품목명' });
    return after;
  });
  await check('좁은 폭 레이블 클릭은 그 칸으로 간다(label for)', async () => {
    await load('screens-shipmentcreate--기본', 'light', [390, 844]);
    await ev(`document.querySelectorAll('[data-slot="field-list-row"]')[1].querySelectorAll('[data-slot="field-list-cell-label"]')[2].click()`);
    await wait(`document.activeElement?.getAttribute('aria-label') === '품목 2 중량'`);
  });
  await check('콘솔 오류 0건', async () => assert.deepEqual(browser.errors(), []));
} finally {
  writeFileSync(`${OUT}/results.json`, JSON.stringify({ sha, results, shots }, null, 2));
  browser.close();
}
const failed = results.filter(r => !r.pass);
console.log(`\n검사 ${results.length}건 · 통과 ${results.length - failed.length} · 실패 ${failed.length} · 스크린샷 ${shots.length}장 ${OUT}/${sha}-*.png`);
process.exitCode = failed.length ? 1 : 0;
