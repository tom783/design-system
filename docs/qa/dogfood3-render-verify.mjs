// R29: 하네스 작성만 수행한다. 실행은 pnpm qa에서 기존 하네스와 함께 한다.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, CANVAS } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/dogfood3';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ port: 9476, outDir: OUT });
const { cdp, ev, sleep } = browser;
const { open } = storybook(browser);
const results = [];
const measurements = {};
const q = selector => `${CANVAS}.querySelector(${JSON.stringify(selector)})`;
const all = selector => `${CANVAS}.querySelectorAll(${JSON.stringify(selector)})`;
const probe = name => `[data-probe="${name}"]`;
const dateInput = '[data-slot="date-picker"] input';
const header = 'thead input[type="checkbox"]';
const frame = () => ev('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))');
async function wait(expression, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await ev(expression)) return;
    await sleep(25);
  }
  throw new Error(`조건 대기 실패: ${expression}`);
}
async function check(label, run) {
  try { await run(); results.push({ label, pass: true }); console.log(`✓ ${label}`); }
  catch (error) {
    results.push({ label, pass: false, error: error.message }); console.error(`✗ ${label}: ${error.message}`);
    await browser.shot(`failure-${results.length}`);
  }
}
async function story(id) {
  assert.deepEqual(browser.errors(), [], '직전 스토리 콘솔 오류');
  const result = await open(id, { waitPlay: false });
  assert.equal(result.sbError, null);
  await ev('document.fonts.ready.then(() => true)');
  await frame();
  assert.deepEqual(browser.errors(), [], '스토리 콘솔 오류');
}
async function click(selector) { await ev(`${q(selector)}.click()`); await frame(); }
async function inputValue(selector, value) {
  await ev(`(() => {
    const input = ${q(selector)};
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  // React가 input 초안을 반영한 다음 Enter를 보낸다. 같은 평가 안에서 보내면 이전 draft를 확정할 수 있다.
  await frame();
  await ev(`${q(selector)}.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))`);
  await frame();
}
const changes = () => ev(`JSON.parse(${q(probe('selection-changes'))}.textContent)`);
async function counts(expected, { mixed = false, checked = expected > 0 } = {}) {
  await wait(`Number(${q(probe('app-selection'))}.dataset.count) === ${expected}`);
  const actual = await ev(`(() => {
    const head = ${q(header)};
    return {
      app: Number(${q(probe('app-selection'))}.dataset.count),
      toolbar: ${q('[data-slot="data-table-toolbar"] [role="status"]')}.textContent,
      rows: [...${all('tbody input[type="checkbox"]')}].filter(input => input.checked).length,
      mixed: head.indeterminate, checked: head.checked,
    };
  })()`);
  assert.deepEqual(actual, { app: expected, toolbar: `${expected}개 선택`, rows: expected, mixed, checked });
}
async function selectedStory(suffix) {
  await story(`components-datatable--선택자동해제${suffix}`);
  await wait(`!!${q(header)}`);
  const ids = await ev(`[...${all('[data-slot="data-table-row"]')}].map(row => row.dataset.rowId)`);
  await click(header);
  await counts(3);
  await click(probe('clear-log'));
  return ids;
}

try {
  for (const suffix of ['', '-비제어']) {
    const mode = suffix ? '비제어' : '제어';
    await check(`G1 ${mode}: 전체 선택 → 겹치지 않는 필터, 한 번만 [] 통지·세 개수 일치·헤더 없음`, async () => {
      await selectedStory(suffix);
      await click(probe('filter-부산'));
      await counts(0, { checked: false });
      assert.deepEqual(await changes(), [[]]);
      await click(probe('rerender'));
      assert.deepEqual(await changes(), [[]], '같은 결과로 다시 통지하지 않는다');
    });
    await check(`G1 ${mode}: 겹치는 필터는 순서를 보존한 교집합을 한 번 통지`, async () => {
      const ids = await selectedStory(suffix);
      await click(probe('filter-겹침'));
      await counts(2, { mixed: true, checked: false });
      assert.deepEqual(await changes(), [ids.slice(1)]);
    });
    for (const state of ['loading', 'error']) {
      await check(`G1 ${mode}: ${state}의 임시 빈 data → 복귀 후 선택 유지·콜백 0회`, async () => {
        await selectedStory(suffix);
        await click(probe(state));
        assert.equal(await ev(`Number(${q(probe('app-selection'))}.dataset.count)`), 3);
        assert.deepEqual(await changes(), []);
        await click(probe('ready'));
        await counts(3);
        assert.deepEqual(await changes(), []);
      });
    }
    await check(`G1 ${mode}: 같은 data 재렌더는 선택·콜백을 바꾸지 않는다`, async () => {
      await selectedStory(suffix);
      await click(probe('rerender'));
      await counts(3);
      assert.deepEqual(await changes(), []);
    });
    await check(`G1 ${mode}: hasMore·onLoadMore 행 덧붙이기에도 기존 선택 유지`, async () => {
      await selectedStory(suffix);
      await click(probe('append'));
      await wait(`${all('[data-slot="data-table-row"]')}.length === 4`);
      await counts(3, { mixed: true, checked: false });
      assert.deepEqual(await changes(), []);
    });
    await check(`G1 ${mode}: 확정된 빈 필터는 선택도 비운다`, async () => {
      await selectedStory(suffix);
      await click(probe('filter-빈 결과'));
      await wait(`Number(${q(probe('app-selection'))}.dataset.count) === 0`);
      assert.deepEqual(await changes(), [[]]);
      // 행이 0개면 선택 열 헤더에 체크박스가 그려지지 않는다(실측). 없음도 indeterminate 아님이다.
      assert.equal(await ev(`${q(header)}?.indeterminate ?? false`), false);
    });
  }

  await story('components-datepicker--툴바정렬');
  const toolbarInput = `${probe('date-toolbar')} ${dateInput}`;
  await check('G2: 범위 placeholder 전체 폭이 입력 내용 영역에 들어간다(동일 계산 스타일 span)', async () => {
    const size = await ev(`(() => {
      const input = ${q(toolbarInput)}, style = getComputedStyle(input), span = document.createElement('span');
      // canvas는 대체 글꼴·자간·tabular 수치를 다르게 잰다. 실제 조판 요소를 쓴다.
      for (const property of ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontStretch', 'fontVariantNumeric', 'fontFeatureSettings', 'letterSpacing', 'textTransform']) span.style[property] = style[property];
      span.style.whiteSpace = 'pre'; span.style.position = 'absolute'; span.style.visibility = 'hidden';
      span.textContent = input.placeholder; input.parentElement.append(span);
      const width = span.getBoundingClientRect().width;
      span.remove();
      return { text: width, available: input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight), input: input.clientWidth };
    })()`);
    assert.ok(size.text <= size.available + 1, JSON.stringify(size));
    measurements.placeholder = size;
  });
  await check('G2: 범위 값 전체 scrollWidth ≤ clientWidth + 1', async () => {
    await inputValue(toolbarInput, '2026-11-10 ~ 2026-11-30');
    await wait(`${q(probe('range-value'))}.textContent === '2026-11-10 ~ 2026-11-30'`);
    const size = await ev(`({ scroll: ${q(toolbarInput)}.scrollWidth, client: ${q(toolbarInput)}.clientWidth })`);
    assert.ok(size.scroll <= size.client + 1, JSON.stringify(size));
  });
  await check('G2: 단일 날짜의 기존 최소 루트 폭 240px 유지', async () => {
    const width = await ev(`getComputedStyle(${q(`${probe('single-width')} [data-slot="date-picker"]`)}).minWidth`);
    assert.equal(width, '240px');
  });
  await check('G3: items-center 툴바의 네 입력·버튼 중심이 ±1px', async () => {
    const measures = await ev(`(() => {
      const toolbar = ${q(probe('date-toolbar'))};
      return ['[data-slot="multi-select-trigger"]', '[data-slot="select-trigger"]', '[data-slot="date-picker"] input', '[data-probe="toolbar-button"]'].map(selector => {
        const rect = toolbar.querySelector(selector).getBoundingClientRect();
        return { selector, height: rect.height, center: rect.top + rect.height / 2 };
      });
    })()`);
    for (const item of measures) {
      assert.equal(item.height, 38);
      assert.ok(Math.abs(item.center - measures[0].center) <= 1, JSON.stringify(measures));
    }
    measurements.toolbar = measures;
  });
  await check('G3: Field 밖 오류는 보이고 읽히며 형제 위치·루트 높이를 바꾸지 않는다', async () => {
    const geometry = () => ev(`(() => {
      const button = ${q(probe('toolbar-button'))}.getBoundingClientRect();
      return { top: button.top, left: button.left, rootHeight: ${q(`${probe('date-toolbar')} [data-slot="date-picker"]`)}.getBoundingClientRect().height };
    })()`);
    const before = await geometry();
    await inputValue(toolbarInput, '2026-02-30 ~ 2026-03-01');
    assert.deepEqual(await geometry(), before);
    const error = await ev(`(() => {
      const input = ${q(toolbarInput)}, node = document.getElementById(input.getAttribute('aria-describedby').split(/\\s+/)[0]);
      return { invalid: input.getAttribute('aria-invalid'), text: node.textContent, live: node.getAttribute('aria-live'), position: getComputedStyle(node).position, visible: node.getBoundingClientRect().height > 0, icon: !!node.querySelector('svg') };
    })()`);
    assert.equal(error.invalid, 'true'); assert.equal(error.live, 'polite'); assert.equal(error.position, 'absolute');
    assert.ok(error.visible && error.icon);
    assert.equal(error.text, '시작일: 2026년 2월은 01~28일로 입력하세요.');
    assert.equal(before.rootHeight, 38);
  });

  await story('components-datepicker--필드오류공유');
  await check('G3: Field 안 오류 공간 하나·입력 38px·오류 전후 아래 칸 위치 불변', async () => {
    const geometry = () => ev(`(() => {
      const field = ${q('[data-slot="field"]')}, date = field.querySelector('[data-slot="date-picker"]'), error = field.querySelector('[data-slot="field-error"]');
      return { nextTop: ${q(probe('after-date-field'))}.getBoundingClientRect().top, dateHeight: date.getBoundingClientRect().height, errorHeight: error.getBoundingClientRect().height };
    })()`);
    const before = await geometry();
    assert.equal(before.dateHeight, 38); assert.equal(before.errorHeight, 20);
    await inputValue(dateInput, '2026-02-30 ~ 2026-03-01');
    await wait(`!!${q('[data-slot="field-error"] [data-slot="date-picker-error"]')}`);
    assert.deepEqual(await geometry(), before);
    const error = await ev(`(() => {
      const input = ${q(dateInput)}, field = input.closest('[data-slot="field"]'), node = field.querySelector('[data-slot="field-error"]');
      return { connected: input.getAttribute('aria-describedby').split(/\\s+/)[0] === node.id, live: node.getAttribute('aria-live'), count: field.querySelectorAll('[data-slot="date-picker-error"]').length, text: node.textContent, icon: !!node.querySelector('svg') };
    })()`);
    assert.ok(error.connected && error.icon);
    assert.equal(error.text, '시작일: 2026년 2월은 01~28일로 입력하세요.');
    assert.equal(error.live, 'polite'); assert.equal(error.count, 1);
    measurements.field = { before, after: await geometry() };
  });
  await check('G3: Field 안 순서 오류는 한 줄(위치 불변)·형식 오류는 최소 폭 306px 에서 두 줄로 아래 칸을 한 줄만큼 민다', async () => {
    const geometry = () => ev(`(() => {
      const field = ${q('[data-slot="field"]')}, error = field.querySelector('[data-slot="field-error"]');
      return { nextTop: ${q(probe('after-date-field'))}.getBoundingClientRect().top, errorHeight: error.getBoundingClientRect().height,
        text: error.textContent, width: error.getBoundingClientRect().width, sectionWidth: ${q(probe('date-fields'))}.getBoundingClientRect().width };
    })()`);
    await click(probe('clear-date')); await wait(`${q('[data-slot="field-error"]')}.textContent === ''`);
    const base = await geometry();
    // 두 날짜가 실재하고 거꾸로면 순서만 말한다. 230px 라 Field 예약 한 줄(20px) 안에 든다.
    await inputValue(dateInput, '2026-11-15 ~ 2026-11-10');
    await wait(`${q('[data-slot="field-error"]')}.textContent === '종료일을 시작일과 같거나 이후로 입력하세요.'`);
    const order = await geometry();
    assert.equal(order.errorHeight, base.errorHeight); assert.equal(order.nextTop, base.nextTop);
    // 형식 문구는 292px 로 286px 를 넘는다(디자인 확정안: 앞부분을 줄이지 않고 두 줄 허용).
    // 이 스토리의 상자는 w-fit 이라 먼저 그대로 잰다 — 줄을 바꾸는 대신 상자가 문구 폭만큼 넓어질 수 있다.
    await inputValue(dateInput, '2026-11-15');
    await wait(`${q('[data-slot="field-error"]')}.textContent === 'YYYY-MM-DD ~ YYYY-MM-DD 형식으로 입력하세요.'`);
    const fit = await geometry();
    // 실제 폼처럼 폭이 정해진 칸(최소 폭 306px)에서는 두 줄이 되고 아래 칸이 늘어난 높이만큼 밀린다.
    await ev(`${q(probe('date-fields'))}.style.width = '306px'`); await frame();
    const format = await geometry();
    await ev(`${q(probe('date-fields'))}.style.width = ''`); await frame();
    const shift = format.nextTop - base.nextTop;
    measurements.fieldLines = { base, order, fit, format, shift, fitWidening: fit.sectionWidth - base.sectionWidth };
    assert.equal(format.errorHeight, base.errorHeight * 2, '306px 에서 두 줄 = 예약 한 줄의 두 배');
    assert.equal(shift, format.errorHeight - base.errorHeight, '아래 칸은 늘어난 오류 높이만큼만 밀린다');
  });
  await check('G3: Field의 업무 오류 우선·정상 값 교체 후 자체 오류 제거', async () => {
    await click(probe('external-error'));
    assert.equal(await ev(`${q('[data-slot="field-error"]')}.textContent`), '출고 가능한 기간을 선택하세요.');
    await click(probe('external-error'));
    await click(probe('clear-date'));
    await wait(`${q('[data-slot="field-error"]')}.textContent === ''`);
    assert.notEqual(await ev(`${q(dateInput)}.getAttribute('aria-invalid')`), 'true');
  });

  for (const theme of ['light', 'dark']) {
    await check(`G4 ${theme}: 중립 면이 검정이 아니며 범례 색은 불투명하다`, async () => {
      await story('components-charts--중립계열');
      await ev(`document.documentElement.dataset.theme = '${theme}'`);
      await wait(`!!${q('[data-slot="composition-series"]')}`);
      const colors = await ev(`(() => {
        const area = [...${all('[data-slot="composition-series"]')}].find(node => node.getAttribute('fill') === 'var(--status-neutral-fg)');
        const legend = [...${all('[data-slot="chart-legend"] li')}].find(node => node.textContent === '대기').firstElementChild;
        return { fill: getComputedStyle(area).fill, legend: getComputedStyle(legend).backgroundColor };
      })()`);
      assert.notEqual(colors.fill, 'rgb(0, 0, 0)'); assert.notEqual(colors.fill, 'none');
      assert.notEqual(colors.legend, 'rgba(0, 0, 0, 0)'); assert.notEqual(colors.legend, 'transparent');
      assert.equal(colors.fill, colors.legend);
      measurements[theme] = colors;
    });
  }
  await check('콘솔 오류 0건', async () => { assert.deepEqual(browser.errors(), []); });
} catch (error) {
  results.push({ label: '하네스 실행', pass: false, error: error.message });
  console.error(error.stack);
} finally {
  await browser.close();
  writeFileSync(`${OUT}/results.json`, JSON.stringify({ results, measurements }, null, 2) + '\n');
}
const failed = results.filter(result => !result.pass);
console.log(`검사 ${results.length}건 · 통과 ${results.length - failed.length} · 실패 ${failed.length}`);
if (failed.length) process.exitCode = 1;
