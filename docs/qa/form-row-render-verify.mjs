// FormRow 같은 줄 정렬과 Screens/ProductCreate(F98 · (b)) 검증. 2026-11-22 오너 확정 기준:
//  ① 한쪽만 설명이 있는 줄의 입력칸 y 차이 0  ② 둘 다 설명이 없으면 높이 증가 0
//  ③ 오류 2개에도 입력칸 이동 0              ④ 한 열로 접히는 좁은 폭에서 빈 예약 행 없음
//  금액 칸(판매가·정가·공급가)은 Input unit="원"(2026-11-23 디자인 총괄 요청) — 접미사가 있어도 ①~③ 이 그대로다.
// 필드 피치 98(레이블 20+4 · 입력 38 · 4 · 오류 20 · 간격 12)도 함께 잰다. 1440×900, 라이트·다크.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, CANVAS } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/form-row';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ windowSize: '1440,900', outDir: OUT });
const { ev, cdp, sleep } = browser;
const { open } = storybook(browser);
const results = [];
const q = selector => `document.querySelector(${JSON.stringify(selector)})`;
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
  await wait(`${CANVAS}.dataset.playComplete === 'true'`, `${id} play 완료`);
  await wait(`document.documentElement.dataset.theme === '${theme}'`);
  await ev(`document.fonts.load('14px "Pretendard Variable"', '상품 등록 판매가')`);
  await ev('document.fonts.ready');
}
// 화면의 모든 입력칸(Input·SelectTrigger)의 윗선. 문서 좌표로 재서 본문 스크롤과 무관하게 한다.
const controls = () => ev(`[...${CANVAS}.querySelectorAll('form [data-slot="field"]')].map(field => {
  const control = field.querySelector('[data-slot="input"], [data-slot="select-trigger"]');
  return { label: field.querySelector('[data-slot="field-label"]').firstChild.textContent, top: control.getBoundingClientRect().top,
    labelTop: field.querySelector('[data-slot="field-label"]').getBoundingClientRect().top };
})`);
// 금액 칸 단위 접미사(§17.1.1): 경계 1 + 여백 12 안쪽, 값 칸과 4px, 낭독 설명의 맨 앞.
const units = () => ev(`[...${CANVAS}.querySelectorAll('[data-slot="input-unit"]')].map(unit => {
  const input = unit.closest('[data-slot="input-control"]').querySelector('[data-slot="input"]'), s = getComputedStyle(input);
  const r = input.getBoundingClientRect(), u = unit.getBoundingClientRect();
  return { label: unit.closest('[data-slot="field"]').querySelector('[data-slot="field-label"]').firstChild.textContent, text: unit.textContent,
    inset: r.right - u.right, gap: u.left - (r.right - parseFloat(s.borderRightWidth) - parseFloat(s.paddingRight)),
    describedFirst: input.getAttribute('aria-describedby').split(' ')[0] === unit.id };
})`);
function assertUnits(list) {
  assert.deepEqual(list.map(u => [u.label, u.text]), [['판매가', '원'], ['정가', '원'], ['공급가', '원']]);
  for (const u of list) {
    assert.ok(Math.abs(u.inset - 13) <= 0.01 && Math.abs(u.gap - 4) <= 0.01, `${u.label} 접미사 자리 ${u.inset}·간격 ${u.gap}`);
    assert.ok(u.describedFirst, `${u.label} 접미사가 aria-describedby 맨 앞이 아니다`);
  }
  return list.map(u => `${u.label} ${u.text}`);
}
const rowTops = () => ev(`Object.fromEntries([...${CANVAS}.querySelectorAll('[data-screen-row]')].map(row => [row.dataset.screenRow,
  [...row.querySelectorAll('[data-slot="input"], [data-slot="select-trigger"]')].map(el => el.getBoundingClientRect().top)]))`);

try {
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  for (const theme of ['light', 'dark']) {
    let base;
    await check(`① 한쪽만 설명이 있는 줄의 입력칸 y 차이 0 · 피치 98 ${theme}`, async () => {
      await load('screens-productcreate--기본', theme);
      const rows = await rowTops();
      const diff = Object.fromEntries(Object.entries(rows).map(([key, [a, b]]) => [key, Math.abs(a - b)]));
      for (const [key, value] of Object.entries(diff)) assert.equal(value, 0, `${key} 줄 입력칸 y 차이 ${value}`);
      base = await controls();
      const byLabel = Object.fromEntries(base.map(item => [item.label, item]));
      const pitch = { '상품명→카테고리': byLabel['카테고리'].labelTop - byLabel['상품명'].labelTop,
        '재고 수량→배송비 유형': byLabel['배송비 유형'].labelTop - byLabel['재고 수량'].labelTop };
      assert.deepEqual(pitch, { '상품명→카테고리': 98, '재고 수량→배송비 유형': 98 });
      const unit = assertUnits(await units());
      await browser.shot(`create-${theme}`);
      return { diff, pitch, fields: base.length, unit };
    });
    await check(`② 둘 다 설명이 없는 FormRow 높이 = Field 하나 높이(증가 0) ${theme}`, async () => {
      const m = await ev(`(() => { const single=${q('[data-slot="field"]')}.getBoundingClientRect().height;
        return { single, rows:Object.fromEntries([...${CANVAS}.querySelectorAll('[data-screen-row]')].filter(row => !row.querySelector('[data-slot="field-description"]'))
          .map(row => [row.dataset.screenRow, row.getBoundingClientRect().height])) }; })()`);
      assert.equal(m.single, 86);
      for (const [key, height] of Object.entries(m.rows)) assert.equal(height, m.single, `${key}: ${height}`);
      assert.deepEqual(Object.keys(m.rows).sort(), ['category', 'shipping', 'stock', 'tax']);
      return m;
    });
    await check(`③ 오류 2개에도 입력칸 13개 이동 0 ${theme}`, async () => {
      await load('screens-productcreate--오류2개', theme);
      const errored = await controls();
      const errors = await ev(`[...${CANVAS}.querySelectorAll('[data-slot="field-error"] span')].map(el => el.textContent)`);
      assert.deepEqual(errors, ['상품명을 입력하세요', '판매가를 1원 이상으로 입력하세요']);
      assert.equal(errored.length, 13); assert.equal(base.length, 13);
      // 목표 57: 오류 상태는 폼 위 오류 요약(F-7)이 있어 폼 전체가 요약 높이 + 간격 16 만큼 내려간다. 오류 자리 예약은
      // 칸끼리의 이동이므로 그만큼 뺀 뒤 잰다.
      const shift = await ev(`(() => { const s=${CANVAS}.querySelector('[data-screen="error-summary"]'); return s ? s.getBoundingClientRect().height + 16 : null; })()`);
      assert.ok(shift > 16, '오류 요약이 폼 위에 있다');
      const moved = Math.max(...errored.map((item, index) => Math.abs(item.top - shift - base[index].top)));
      assert.equal(moved, 0);
      const rows = await rowTops();
      for (const [key, [a, b]] of Object.entries(rows)) assert.equal(Math.abs(a - b), 0, `${key} 줄 오류 상태 y 차이`);
      const unit = assertUnits(await units());
      await browser.shot(`create-errors-${theme}`);
      return { moved, shift, errors, unit };
    });
  }

  await check('④ 480px 미만에서 한 열로 접히고 빈 설명 행이 남지 않는다', async () => {
    await load('components-form--같은줄정렬', 'light');
    const measure = width => ev(`(() => { const box=${q('[data-probe="form-rows"]')}; box.style.width='${width}px';
      const row=${q('[data-probe="row-description"]')}, fields=[...row.querySelectorAll('[data-slot="field"]')];
      const rect = el => el.getBoundingClientRect();
      const plain = fields[1], label = plain.querySelector('[data-slot="field-label"]'), input = plain.querySelector('input');
      return { width: ${width}, columns: new Set(fields.map(f => Math.round(rect(f).left))).size,
        labelToInput: rect(input).top - rect(label).bottom, rowHeight: rect(row).height,
        stacked: rect(fields[0]).height + 12 + rect(fields[1]).height,
        plainHeight: rect(${q('[data-probe="row-plain"]')}).height, single: rect(${q('[data-probe="single"]')}).height }; })()`);
    const wide = await measure(520), edge = await measure(480), narrow = await measure(479), small = await measure(320);
    for (const m of [wide, edge]) { assert.equal(m.columns, 2); assert.equal(m.plainHeight, m.single); assert.equal(m.labelToInput, 4 + 20 + 4, '설명 행 예약(20+4) + 레이블 아래 4'); }
    for (const m of [narrow, small]) {
      assert.equal(m.columns, 1);
      assert.equal(m.labelToInput, 4, '설명 없는 칸에 빈 설명 행이 남지 않는다');
      assert.equal(m.rowHeight, m.stacked, '쌓인 높이 = Field 둘 + 간격 12');
      assert.equal(m.plainHeight, m.single * 2 + 12);
    }
    await browser.shot('form-row-narrow');
    return { wide, edge, narrow, small };
  });
  await check('FormRow 안 오류는 입력칸을 움직이지 않는다(같은 줄)', async () => {
    await load('components-form--같은줄정렬', 'light');
    const tops = () => ev(`[...${q('[data-probe="row-plain"]')}.querySelectorAll('input')].map(el => el.getBoundingClientRect().top)`);
    const before = await tops();
    await load('components-form--같은줄정렬-오류', 'light');
    const after = await tops();
    assert.deepEqual(after, before); assert.equal(after[0], after[1]);
    return { before, after };
  });
  await check('FormRow 실행 중 콘솔 오류 없음', () => {
    assert.deepEqual(browser.errors().filter(m => !/Warning:|DevTools|favicon|preload/i.test(m)), []);
  });
} finally {
  writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2)); browser.close();
}
const passed = results.filter(r => r.pass).length;
console.log(`${results.length}개 검사, ${passed}개 통과`);
process.exitCode = passed === results.length ? 0 : 1;
