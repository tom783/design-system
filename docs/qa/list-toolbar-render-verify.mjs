// 0.5.0 목록 툴바 — FilterBar · BulkActionBar (DESIGN.md §4.2, 디자인 총괄 확정 규격 Figma 174:2).
// 검수 매트릭스: 라이트·다크 × 1440·1024·768 × 칩 0·3·8개 × 선택 전/후 + `+N` 팝오버 + 보기 변경됨 + 포커스(칩 해제·`+N`·초기화).
// 화면은 Screens/OrderList(실제 AppShell 조립)다. 캡처는 실제 크기(deviceScaleFactor 1)로 OUT 에 남는다.
// 실행: pnpm qa --only list-toolbar-render-verify (서버·출처 확인은 run-all 이 한다).
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, CANVAS, actions } from './browser.mjs';
import { fitChipCount } from '../../packages/ui/src/components/filter-bar/fit-chips.ts';

const OUT = process.argv[2] || '.qa-shots/list-toolbar';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ windowSize: '1440,900', outDir: OUT });
const { ev, cdp, sleep } = browser;
const { open } = storybook(browser);
const act = actions(browser);
const results = [];
const q = selector => `document.querySelector(${JSON.stringify(selector)})`;
const near = (a, b, tolerance = 1) => Math.abs(a - b) <= tolerance;
async function wait(expression, label = expression) {
  for (let i = 0; i < 125; i++) { if (await ev(expression).catch(() => false)) return; await sleep(40); }
  throw new Error(`조건 대기 실패: ${label}`);
}
async function check(label, run) {
  try { const measurements = await run(); results.push({ label, pass: true, measurements }); console.log(`✓ ${label}`); }
  catch (e) { results.push({ label, pass: false, error: e.message }); console.error(`✗ ${label}: ${e.message}`); await browser.shot(`failure-${results.length}`); }
}
async function load(story, theme, width) {
  await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
  const r = await open(`screens-orderlist--${story}`, { extra: `&globals=theme:${theme}` });
  assert.equal(r.sbError, null); assert.deepEqual(r.errors, []);
  await wait(`${CANVAS}.dataset.playComplete === 'true'`, `${story} play 완료`);
  await wait(`document.documentElement.dataset.theme === '${theme}'`);
  await ev(`document.fonts.load('14px "Pretendard Variable"', '주문 필터 초기화')`);
  await ev('document.fonts.ready');
  // 칩 측정은 ResizeObserver 로 글꼴 로드 뒤 다시 돈다. 두 프레임을 넘겨 측정이 끝난 상태를 잰다.
  await ev('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
}

const helpers = `
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgb = color => { ctx.clearRect(0,0,1,1); ctx.fillStyle = color; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data]; };
  const token = name => rgb(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
  const same = (a,b) => a.every((v,i) => Math.abs(v-b[i]) <= 1);
  const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height }; };
`;
// 한 화면의 툴바·칩 줄·바·표 상태를 잰다.
const snapshot = () => ev(`(() => { ${helpers}
  const root = ${q('[data-slot="bulk-action-bar"]')}, fb = ${q('[data-slot="filter-bar"]')};
  const row = fb.querySelector('[data-slot="filter-bar-chips"]'), rowStyle = getComputedStyle(row);
  const chips = [...row.querySelectorAll(':scope > ul > [data-slot="filter-bar-chip"]')];
  const more = row.querySelector(':scope > [data-slot="filter-bar-more"]'), reset = row.querySelector(':scope > [data-slot="filter-bar-reset"]');
  const layer = row.querySelector('[data-slot="filter-bar-measure"]');
  const items = [...chips, more, reset].filter(Boolean);
  const trigger = fb.querySelector('[data-slot="filter-bar-trigger"]');
  const panel = root.querySelector('[data-slot="bulk-action-bar-panel"]'), replaced = root.querySelector('[data-slot="bulk-action-bar-replaced"]');
  const panelStyle = getComputedStyle(panel);
  const buttons = [...panel.querySelectorAll('button')];
  const danger = buttons.at(-1), divider = panel.querySelector('[data-slot="bulk-action-bar-divider"]');
  const table = ${q('[data-slot="data-table-table"]')};
  const selectedRows = [...document.querySelectorAll('[data-slot="data-table-row"][data-selected]')].map(tr => {
    const cells = [...tr.children];
    // 마지막 칸이 고정 열(상태 pinnedEnd, §4.4)이면 표가 넘칠 때 보이는 영역 오른쪽 끝에 붙는다 — 그때 행 바탕의 끝은 그 자리다.
    return { left: cells[0].getBoundingClientRect().left, right: cells.at(-1).getBoundingClientRect().right,
      lastPinned: cells.at(-1).style.position === 'sticky',
      allSelectedBg: cells.every(td => same(rgb(getComputedStyle(td).backgroundColor), token('--bg-selected-row'))) };
  });
  return {
    width: fb.getBoundingClientRect().width,
    trigger: { text: trigger.textContent, label: trigger.getAttribute('aria-label') },
    controls: { view: box(fb.querySelector('[data-slot="filter-bar-view"] [data-slot="select-trigger"]')), search: box(fb.querySelector('[data-slot="filter-bar-search"]')),
      trigger: box(trigger), save: box(fb.querySelector('[data-slot="filter-bar-save-view"]')), changed: box(fb.querySelector('[data-slot="filter-bar-view-changed"]')),
      box: box(fb.querySelector('[data-slot="filter-bar-controls"]')) },
    row: { ...box(row), gap: parseFloat(rowStyle.columnGap), empty: row.querySelector('[data-slot="filter-bar-empty"]')?.textContent ?? null },
    centers: items.map(el => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; }),
    lastRight: items.length ? Math.max(...items.map(el => el.getBoundingClientRect().right)) : null,
    visible: chips.length, hidden: more ? Number(more.textContent.replace('+', '')) : 0, chipLabels: chips.map(el => el.textContent),
    moreWidth: more?.getBoundingClientRect().width ?? 0, resetWidth: reset?.getBoundingClientRect().width ?? 0,
    measured: layer ? { chips: [...layer.querySelectorAll('[data-measure="chip"]')].map(el => el.getBoundingClientRect().width),
      more: layer.querySelector('[data-measure="more"]').getBoundingClientRect().width, reset: layer.querySelector('[data-measure="reset"]').getBoundingClientRect().width } : null,
    rootHeight: root.getBoundingClientRect().height, filterBarHeight: fb.getBoundingClientRect().height,
    tableTop: table.getBoundingClientRect().top, tableLeft: table.getBoundingClientRect().left, tableRight: table.getBoundingClientRect().right,
    visibleRight: (() => { const sc = table.parentElement; return sc.getBoundingClientRect().left + sc.clientLeft + sc.clientWidth; })(),
    active: root.hasAttribute('data-active'), position: getComputedStyle(root).position,
    replaced: { inert: replaced.hasAttribute('inert'), visibility: getComputedStyle(replaced).visibility },
    panel: { ...box(panel), visibility: panelStyle.visibility, bg: rgb(panelStyle.backgroundColor), border: rgb(panelStyle.borderTopColor),
      sunken: token('--bg-sunken'), subtle: token('--border-subtle'), brand: token('--action-primary-bg'), selected: token('--bg-selected'),
      role: panel.getAttribute('role') },
    status: { text: root.querySelector('[data-slot="bulk-action-bar-count"]').textContent, role: root.querySelector('[data-slot="bulk-action-bar-count"]').getAttribute('role'),
      live: root.querySelector('[data-slot="bulk-action-bar-count"]').getAttribute('aria-live'), box: box(root.querySelector('[data-slot="bulk-action-bar-count"]')) },
    buttons: buttons.map(el => ({ text: el.textContent.trim(), ...box(el) })),
    danger: danger ? { bg: rgb(getComputedStyle(danger).backgroundColor), token: token('--action-danger-bg') } : null,
    divider: divider ? { ...box(divider), display: getComputedStyle(divider).display } : null,
    selectedRows,
  }; })()`);

const STATES = [['필터없음', 0, false], ['필터없음선택됨', 0, true], ['기본', 3, false], ['선택됨', 3, true], ['필터8개', 8, false], ['필터8개선택됨', 8, true]];
const NARROW = 720; // DESIGN.md §4.2 — 바 폭 720px 미만이면 검색이 둘째 줄, 일괄 작업 액션이 둘째 줄.

function assertFilterBar(m, chips) {
  // 트리거: 0개면 숫자 없이 '필터'(review-r2 2).
  assert.equal(m.trigger.text, chips ? `필터 ${chips}` : '필터');
  assert.equal(m.trigger.label, chips ? `필터 ${chips}개 적용` : null);
  // 칩 줄: 한 줄 · 32px 이상 · 넘치지 않음 · 보이는 + 숨은 = 적용 수.
  assert.ok(m.row.height >= 32 && m.row.height < 40, `칩 줄 높이 ${m.row.height}`);
  assert.ok(m.centers.every(c => near(c, m.centers[0])), `칩 줄이 한 줄이 아니다 ${JSON.stringify(m.centers)}`);
  assert.equal(m.visible + m.hidden, chips);
  if (chips === 0) { assert.equal(m.row.empty, '적용된 필터 없음'); assert.equal(m.resetWidth, 0, '0개면 초기화를 숨긴다'); return; }
  assert.ok(m.lastRight <= m.row.right + 0.5, `칩 줄이 넘친다 ${m.lastRight} > ${m.row.right}`);
  assert.ok(m.resetWidth > 0, '칩이 있으면 초기화가 있다');
  // 실제 폭으로 정한 개수인가: 측정값 그대로의 계산과 같고, 하나 더 넣으면 넘친다.
  assert.equal(m.visible, fitChipCount({ available: m.row.width, chips: m.measured.chips, gap: m.row.gap, more: m.measured.more, reset: m.measured.reset }));
  if (m.hidden) {
    const remaining = m.row.right - m.lastRight, next = m.measured.chips[m.visible];
    const need = m.hidden >= 2 ? next + m.row.gap : next - m.moreWidth;
    assert.ok(remaining < need + 0.5, `칩 하나가 더 들어간다: 남은 ${remaining.toFixed(1)} ≥ 필요 ${need.toFixed(1)}`);
  }
  // 첫 줄: 넓으면 한 줄, 좁으면 검색이 둘째 줄 전체 폭.
  const { view, search, trigger, box: controls } = m.controls;
  if (m.width >= NARROW) {
    assert.ok(near(view.top, trigger.top) && near(search.top + search.height / 2, trigger.top + trigger.height / 2, 2), '넓은 바는 보기·검색·필터가 한 줄');
    assert.ok(search.width >= 200 && search.width <= 320, `검색 폭 ${search.width}`);
  } else {
    assert.ok(search.top >= view.bottom, '좁은 바는 검색이 보기·필터 아래 줄');
    assert.ok(near(search.width, controls.width), `좁은 바의 검색은 전체 폭 ${search.width} / ${controls.width}`);
    assert.ok(near(view.top, trigger.top), '좁은 바 1줄: 보기 + 필터');
  }
}

function assertBulkBar(m, before) {
  assert.ok(m.active && m.position === 'sticky', '선택 중에는 sticky');
  assert.equal(m.status.text, '3건 선택'); assert.equal(m.status.role, 'status'); assert.equal(m.status.live, 'polite');
  assert.equal(m.panel.role, 'group');
  // 대체: 필터 바는 보이지 않고 조작 불가, 같은 높이 같은 자리 — 표 시작점이 선택 전과 같다.
  assert.deepEqual(m.replaced, { inert: true, visibility: 'hidden' });
  assert.ok(near(m.panel.height, m.rootHeight) && near(m.rootHeight, m.filterBarHeight), `바 높이 ${m.panel.height} · 칸 ${m.rootHeight} · 필터 바 ${m.filterBarHeight}`);
  assert.ok(near(m.tableTop, before.tableTop), `선택 전후 표 시작점 ${before.tableTop} → ${m.tableTop}`);
  // 중립 바탕: bg/sunken + border/subtle. 브랜드·선택 틴트가 아니다(r1 F3).
  assert.ok(m.panel.visibility === 'visible' && near(0, 0));
  assert.deepEqual([m.panel.bg, m.panel.border].map((c, i) => c.every((v, j) => Math.abs(v - [m.panel.sunken, m.panel.subtle][i][j]) <= 1)), [true, true],
    `바탕 ${m.panel.bg} 경계 ${m.panel.border}`);
  // 순서: N건 선택 → 선택 해제 → 안전 액션 → 구분선 → 위험 액션 맨 끝.
  assert.deepEqual(m.buttons.map(b => b.text), ['선택 해제', '송장 출력', '출고 처리', '주문 취소']);
  assert.ok(m.status.box.right <= m.buttons[0].left, '건수가 선택 해제 앞');
  assert.ok(m.danger.bg.every((v, i) => Math.abs(v - m.danger.token[i]) <= 1), '위험 액션은 danger');
  const [, , safe, danger] = m.buttons;
  assert.ok(m.divider && m.divider.display !== 'none' && m.divider.width >= 1 && m.divider.height >= 16, '구분선이 보인다');
  assert.ok(m.divider.left >= safe.right && m.divider.right <= danger.left, '구분선은 위험 액션 바로 앞');
  if (m.panel.width >= NARROW) assert.ok(near(m.buttons[0].top, danger.top, 2), '넓은 바는 한 줄');
  else assert.ok(danger.top >= m.status.box.bottom, '좁은 바는 액션이 둘째 줄'); // review-r2 4: 구분선은 위에서 함께 단정
  // 선택 행 바탕은 표 행 전체 폭(r1 F1).
  assert.ok(m.selectedRows.length === 3 && m.selectedRows.every(r => r.allSelectedBg && near(r.left, m.tableLeft)
    && near(r.right, r.lastPinned ? Math.min(m.tableRight, m.visibleRight) : m.tableRight)),
    JSON.stringify({ rows: m.selectedRows, tableRight: m.tableRight, visibleRight: m.visibleRight }));
}

try {
  for (const theme of ['light', 'dark']) for (const width of [1440, 1024, 768]) {
    const before = {};
    for (const [story, chips, selected] of STATES) {
      await check(`매트릭스 ${theme} ${width} 칩 ${chips}개 선택 ${selected ? '후' : '전'}`, async () => {
        await load(story, theme, width);
        const m = await snapshot();
        assertFilterBar(m, chips);
        if (!selected) {
          assert.equal(m.active, false); assert.equal(m.status.text, ''); assert.equal(m.status.role, 'status', 'live region 은 선택 전에도 있다');
          assert.deepEqual(m.replaced, { inert: false, visibility: 'visible' });
          before[chips] = m;
          // 칩 줄 높이는 0개일 때도 남는다 — 칩 수와 상관없이 표 시작점이 같다.
          if (before[0]) assert.ok(near(m.tableTop, before[0].tableTop), `칩 ${chips}개 표 시작점 ${m.tableTop} ≠ 0개 ${before[0].tableTop}`);
        } else assertBulkBar(m, before[chips]);
        await browser.shot(`${theme}-${width}-chips${chips}-${selected ? 'after' : 'before'}`);
        return { visible: m.visible, hidden: m.hidden, barWidth: Math.round(m.width), tableTop: m.tableTop, rootHeight: m.rootHeight };
      });
    }
    await check(`+N 팝오버 ${theme} ${width}: + N 아래·눌린 모양·하나씩 해제·Esc 복귀`, async () => {
      await load('숨은필터열림', theme, width);
      await wait(`!!${q('[data-slot="filter-bar-more-content"]')}`);
      await sleep(250); // 등장 전환이 끝난 뒤 잰다.
      const m = await ev(`(() => { ${helpers}
        const more = ${q('[data-slot="filter-bar-more"]')}, pop = ${q('[data-slot="filter-bar-more-content"]')}, s = getComputedStyle(more);
        // 본문 = AppShell 본문 스크롤 영역의 내용 상자(여백 안쪽, 스크롤바 제외).
        const main = ${q('[data-slot="app-shell-main"]')}, ms = getComputedStyle(main), mr = main.getBoundingClientRect();
        const body = { left: mr.left + main.clientLeft + parseFloat(ms.paddingLeft), right: mr.left + main.clientLeft + main.clientWidth - parseFloat(ms.paddingRight),
          top: mr.top + main.clientTop + parseFloat(ms.paddingTop), bottom: mr.top + main.clientTop + main.clientHeight - parseFloat(ms.paddingBottom) };
        return { more: box(more), pop: box(pop), body, expanded: more.getAttribute('aria-expanded'), hidden: Number(more.textContent.replace('+','')),
          bg: rgb(s.backgroundColor), color: rgb(s.color), ink: token('--status-neutral-fg'), surface: token('--bg-surface'), outline: s.outlineStyle,
          title: pop.querySelector('[data-slot="filter-bar-more-title"]').textContent, items: pop.querySelectorAll('[data-slot="filter-bar-chip"]').length,
          role: pop.getAttribute('role'), name: pop.getAttribute('aria-labelledby') && document.getElementById(pop.getAttribute('aria-labelledby')).textContent }; })()`);
      assert.equal(m.expanded, 'true'); assert.equal(m.role, 'dialog'); assert.equal(m.title, `숨은 필터 ${m.hidden}개`); assert.equal(m.items, m.hidden);
      // review-r2 1: 팝오버는 +N 아래에 붙고, +N 은 포커스 링이 아니라 눌린 모양.
      assert.ok(m.pop.top >= m.more.bottom && m.pop.top - m.more.bottom <= 8, `팝오버 위치 ${m.pop.top} / +N 아래 ${m.more.bottom}`);
      assert.ok(m.pop.left <= m.more.left + 1 && m.pop.right >= m.more.right - 1, '팝오버가 +N 가로 범위를 덮는다');
      // 검수 T1(4e925e9): 1440 에서 팝오버가 본문 오른쪽 끝을 넘어 스크롤바 위까지 나갔다. 네 변이 본문 안, 가장자리와 16px 이상.
      const edges = { left: m.pop.left - m.body.left, right: m.body.right - m.pop.right, top: m.pop.top - m.body.top, bottom: m.body.bottom - m.pop.bottom };
      assert.ok(Object.values(edges).every(gap => gap >= 16 - 0.5), `팝오버와 본문 가장자리 ${JSON.stringify(edges)}`);
      assert.ok(m.bg.every((v, i) => Math.abs(v - m.ink[i]) <= 1) && m.color.every((v, i) => Math.abs(v - m.surface[i]) <= 1), `눌린 모양 ${m.bg}/${m.color}`);
      assert.equal(m.outline, 'none');
      await browser.shot(`${theme}-${width}-popover`);
      m.edges = edges;
      // 팝오버 안에서 첫 숨은 칩을 Enter 로 해제 → 포커스는 팝오버 안 다음 칩. Esc → +N 으로 복귀.
      await ev(`${q('[data-slot="filter-bar-more-content"] [data-slot="filter-bar-chip-remove"]')}.focus()`);
      const before = await ev(`[...document.querySelectorAll('[data-slot="filter-bar-more-content"] [data-slot="filter-bar-chip"]')].map(el => el.textContent)`);
      await act.enter();
      await wait(`document.querySelectorAll('[data-slot="filter-bar-more-content"] [data-slot="filter-bar-chip"]').length === ${before.length - 1}`, '숨은 칩 하나 해제');
      await wait(`document.activeElement?.closest('[data-slot="filter-bar-chip"]')?.textContent === ${JSON.stringify(before[1])}`, '다음 숨은 칩으로 포커스');
      await act.key('Escape');
      await wait(`!${q('[data-slot="filter-bar-more-content"]')} && document.activeElement === ${q('[data-slot="filter-bar-more"]')}`, 'Esc 로 +N 복귀');
      return m;
    });
    await check(`보기 변경됨 ${theme} ${width}: 보기 바로 뒤 '변경됨'·필터 뒤 보기 저장·설명 연결`, async () => {
      await load('보기변경됨', theme, width);
      const m = await snapshot();
      const described = await ev(`(() => { const t = ${q('[data-slot="filter-bar-view"] [data-slot="select-trigger"]')}; return (t.getAttribute('aria-describedby') ?? '').split(' ').map(id => document.getElementById(id)?.textContent).join(' '); })()`);
      const { view, changed, trigger, save } = m.controls;
      assert.equal(described, '변경됨');
      assert.ok(changed.left > view.right && changed.left - view.right <= 32, `'변경됨'이 보기 바로 뒤 ${changed.left - view.right}px`);
      assert.ok(save && save.left > trigger.right, '보기 저장은 필터 트리거 뒤');
      assert.ok(near(save.top, trigger.top), '보기 저장은 트리거와 같은 줄');
      await browser.shot(`${theme}-${width}-view-changed`);
      return { gap: changed.left - view.right };
    });
  }

  for (const theme of ['light', 'dark']) {
    await check(`키보드 ${theme}: Tab 순서·2px 중립 링·칩 해제 뒤 다음 칩·초기화 뒤 필터 트리거`, async () => {
      await load('필터8개', theme, 1440);
      const describe = `(() => { const el = document.activeElement; if (!el) return null;
        if (el.closest('[data-slot="filter-bar-chip"]')) return 'chip:' + el.closest('[data-slot="filter-bar-chip"]').textContent;
        const slot = el.closest('[data-slot]')?.dataset.slot; return slot + ':' + (el.getAttribute('aria-label') ?? el.textContent.trim()); })()`;
      await ev(`${q('[data-slot="filter-bar-view"] [data-slot="select-trigger"]')}.focus()`);
      const m0 = await snapshot();
      const order = [await ev(describe)];
      for (let i = 0; i < m0.visible + 5; i++) { await act.key('Tab', { keyCode: 9 }); order.push(await ev(describe)); }
      assert.deepEqual(order, ['select-trigger:저장된 보기', 'input:주문 검색', 'filter-bar-trigger:필터 8개 적용',
        ...m0.chipLabels.map(label => `chip:${label}`), `filter-bar-more:숨은 필터 +${m0.hidden}`, 'filter-bar-reset:필터 초기화', 'checkbox:전체 선택']);
      // 링: 칩 해제·+N·초기화 모두 2px 실선 border/focus.
      const ring = async (selector, name) => {
        await ev(`${q(selector)}.focus()`);
        const s = await ev(`(() => { ${helpers} const s = getComputedStyle(document.activeElement); return { style: s.outlineStyle, width: s.outlineWidth, offset: s.outlineOffset, color: rgb(s.outlineColor), focus: token('--border-focus'), visible: document.activeElement.matches(':focus-visible'), shadow: s.boxShadow.replace(/rgba\\(0, 0, 0, 0\\) 0px 0px 0px 0px(, )?/g, '').trim() || 'none' }; })()`);
        assert.ok(s.visible && s.style === 'solid' && s.width === '2px' && s.color.every((v, i) => Math.abs(v - s.focus[i]) <= 1), `${name} 링 ${JSON.stringify(s)}`);
        await browser.shot(`${theme}-1440-focus-${name}`);
        return s;
      };
      // 키보드로 이동한 뒤라 :focus-visible 이 켜진 상태다.
      await ring('[data-slot="filter-bar-chips"] > ul [data-slot="filter-bar-chip-remove"]', 'chip');
      await ring('[data-slot="filter-bar-more"]', 'more');
      await ring('[data-slot="filter-bar-reset"]', 'reset');
      // 0.7.1: 보기 Select 와 바로 옆 검색 입력의 포커스 모양이 같다(전엔 Select 만 1px box-shadow 링 · outline none).
      const view = await ring('[data-slot="filter-bar-view"] [data-slot="select-trigger"]', 'view-select');
      const search = await ring('[data-slot="filter-bar-search"] input', 'search-input');
      assert.deepEqual({ ...view, focus: null }, { ...search, focus: null }, `보기 Select ↔ 검색 입력 링 ${JSON.stringify({ view, search })}`);
      assert.equal(view.shadow, 'none', `보기 Select 그림자 링 ${view.shadow}`);
      // 첫 칩을 Enter 로 해제 → 다음 칩(새 첫 칩) 해제 버튼으로.
      await ev(`${q('[data-slot="filter-bar-chips"] > ul [data-slot="filter-bar-chip-remove"]')}.focus()`);
      await act.enter();
      await wait(`${q('[data-slot="filter-bar-trigger"]')}.textContent === '필터 7'`, '칩 하나 해제');
      assert.equal(await ev(describe), `chip:${m0.chipLabels[1]}`);
      // 마지막 보이는 칩을 Space 로 해제 → 다음 칩이 줄에 있으면 그 칩, `+N` 안이면 `+N`.
      const m1 = await snapshot();
      await ev(`[...document.querySelectorAll('[data-slot="filter-bar-chips"] > ul [data-slot="filter-bar-chip-remove"]')].at(-1).focus()`);
      await act.key(' ', { keyCode: 32, text: ' ' });
      await wait(`${q('[data-slot="filter-bar-trigger"]')}.textContent === '필터 6'`, '마지막 보이는 칩 해제');
      const m2 = await snapshot();
      // 전체 순서는 측정 사본이 갖는다(보이는 칩 + 숨은 칩). 지운 자리의 다음 칩은 그 순서의 같은 위치다.
      const nextLabel = (await ev(`[...document.querySelectorAll('[data-slot="filter-bar-measure"] [data-slot="filter-bar-chip"]')].map(el => el.textContent)`))[m1.visible - 1];
      const target = await ev(describe);
      if (m2.visible >= m1.visible) assert.equal(target, `chip:${nextLabel}`, '다음 칩이 줄에 있으면 그 칩');
      else assert.equal(target, `filter-bar-more:숨은 필터 +${m2.hidden}`, '다음 칩이 +N 안이면 +N');
      // 초기화 → 0개, '필터', 포커스는 필터 트리거.
      await ev(`${q('[data-slot="filter-bar-reset"]')}.focus()`); await act.enter();
      await wait(`${q('[data-slot="filter-bar-trigger"]')}.textContent === '필터'`, '초기화');
      assert.equal(await ev(describe), 'filter-bar-trigger:필터');
      assert.equal(await ev(`${q('[data-slot="filter-bar-empty"]')}?.textContent`), '적용된 필터 없음');
      return { order, afterLast: target };
    });
    await check(`일괄 작업 ${theme}: 체크하면 바·live region, 선택 해제 뒤 보기 Select 로 포커스, sticky`, async () => {
      await load('기본', theme, 1440);
      // live region 은 선택 전부터 DOM 에 있다. 첫 행 체크 → '1건 선택'.
      assert.equal(await ev(`${q('[data-slot="bulk-action-bar-count"]')}.textContent`), '');
      await ev(`${q('[data-slot="data-table-row"] input[type="checkbox"]')}.click()`);
      await wait(`${q('[data-slot="bulk-action-bar-count"]')}.textContent === '1건 선택'`, '1건 선택');
      // sticky: 본문을 내리면 바가 스크롤 영역 윗변에 딱 붙는다(본문 여백 틈으로 행이 비치지 않는다).
      const stick = await ev(`(async () => { const main = ${q('[data-slot="app-shell-main"]')}, bar = ${q('[data-slot="bulk-action-bar"]')};
        const top0 = bar.getBoundingClientRect().top; main.scrollTop = 400; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const r = { before: top0, after: bar.getBoundingClientRect().top, mainTop: main.getBoundingClientRect().top, scrolled: main.scrollTop,
          coversRows: document.elementFromPoint(bar.getBoundingClientRect().left + 8, bar.getBoundingClientRect().top + 8)?.closest('[data-slot="bulk-action-bar"]') === bar };
        return r; })()`);
      assert.ok(stick.scrolled > 0 && near(stick.after, stick.mainTop) && stick.coversRows, `sticky ${JSON.stringify(stick)}`);
      await browser.shot(`${theme}-1440-sticky`);
      await ev(`${q('[data-slot="app-shell-main"]')}.scrollTop = 0`);
      await ev(`${q('[data-slot="bulk-action-bar-clear"]')}.focus()`); await act.enter();
      await wait(`${q('[data-slot="bulk-action-bar-count"]')}.textContent === ''`, '선택 해제');
      await wait(`document.activeElement === ${q('[data-slot="filter-bar-view"] [data-slot="select-trigger"]')}`, '돌아온 필터 바의 첫 조작 요소로 포커스');
      return stick;
    });
    // 0.7.1: 바는 DOM 에서 표 앞이라 행을 고른 뒤 Tab 으로는 닿지 않았다(Shift+Tab 9번). 바가 나타난 순간의 포커스(그 행
    // 체크박스) 바로 뒤에 바를 Tab 순서로 한 번 끼운다. 진짜 키만 쓴다 — 낭독은 live region 글자 변화 횟수로 센다.
    await check(`일괄 작업 키보드 ${theme}: 행 Space 뒤 Tab → 바 4단추 → 그 행 다음 · Shift+Tab 왕복 · 한 번뿐 · 'N건 선택' 낭독 한 번`, async () => {
      await load('기본', theme, 1440);
      await ev(`(() => { window.__live = []; document.querySelectorAll('[aria-live], [role="status"], [role="alert"]').forEach(n =>
        new MutationObserver(() => window.__live.push((n.dataset.slot ?? n.getAttribute('role')) + ':' + n.textContent)).observe(n, { childList: true, subtree: true, characterData: true })); return true; })()`);
      const live = () => ev('window.__live.splice(0)');
      const row = (i, part) => `document.querySelectorAll('[data-slot="data-table-row"]')[${i}].querySelector(${JSON.stringify(part)})`;
      const at = () => ev(`(() => { const el = document.activeElement; const r = el.closest('[data-slot="data-table-row"]');
        return el.closest('[data-slot="bulk-action-bar-panel"]') ? '바:' + el.textContent : r ? '행' + ([...r.parentElement.children].indexOf(r) + 1) + ':' + el.tagName.toLowerCase() : el.dataset.slot ?? el.tagName; })()`);
      // 표 머리에서 Tab 으로 첫 행 체크박스에 닿게 한다(키보드로 온 상태).
      await ev(`[...document.querySelectorAll('thead button, thead input')].at(-1).focus()`);
      await act.key('Tab'); assert.equal(await at(), '행1:input');
      await act.key(' '); await wait(`${q('[data-slot="bulk-action-bar-count"]')}.textContent === '1건 선택'`, '1건 선택');
      assert.deepEqual(await live(), ['bulk-action-bar-count:1건 선택'], '0→1 낭독 한 번');
      const forward = [];
      for (let i = 0; i < 6; i++) { await act.key('Tab'); forward.push(await at()); }
      assert.deepEqual(forward, ['바:선택 해제', '바:송장 출력', '바:출고 처리', '바:주문 취소', '행1:a', '행2:input'], `선택 뒤 Tab ${JSON.stringify(forward)}`);
      await browser.shot(`${theme}-1440-bulk-tab-return`);
      // 한 번뿐: 돌아온 뒤 행1 체크박스로 되돌아가 Tab 해도 바로 가지 않는다.
      await act.key('Tab', { shift: true }); await act.key('Tab', { shift: true }); assert.equal(await at(), '행1:input');
      await act.key('Tab'); assert.equal(await at(), '행1:a', '한 번 지나간 뒤에는 원래 순서');
      // 늘림·줄임: 둘째 행 Space 두 번 → 각각 한 번씩 읽힌다. 바는 이미 있어 끼우지 않는다.
      await act.key('Tab'); assert.equal(await at(), '행2:input');
      await act.key(' '); await wait(`${q('[data-slot="bulk-action-bar-count"]')}.textContent === '2건 선택'`, '2건 선택');
      await act.key(' '); await wait(`${q('[data-slot="bulk-action-bar-count"]')}.textContent === '1건 선택'`, '다시 1건');
      assert.deepEqual(await live(), ['bulk-action-bar-count:2건 선택', 'bulk-action-bar-count:1건 선택'], '늘림·줄임 낭독 각 한 번');
      await act.key('Tab'); assert.equal(await at(), '행2:a', '바가 이미 있을 때 선택을 바꿔도 끼우지 않는다');
      // 새로 나타날 때만 끼운다 — 모두 해제 뒤 셋째 행으로 다시 고르면 그 행 뒤에 끼운다. Shift+Tab 은 그 행으로 돌아온다.
      await ev(`${row(0, 'input')}.focus()`); await act.key(' ');
      await wait(`${q('[data-slot="bulk-action-bar-count"]')}.textContent === ''`, '모두 해제');
      await ev(`${row(2, 'input')}.focus()`); await act.key(' ');
      await wait(`${q('[data-slot="bulk-action-bar-count"]')}.textContent === '1건 선택'`, '셋째 행 1건');
      await act.key('Tab'); assert.equal(await at(), '바:선택 해제');
      await act.key('Tab', { shift: true }); assert.equal(await at(), '행3:input', 'Shift+Tab 은 바를 끼운 그 행으로');
      assert.deepEqual(await live(), ['bulk-action-bar-count:', 'bulk-action-bar-count:1건 선택'], '모두 해제는 빈 글자(읽히지 않음)·다시 고르면 한 번');
      return { forward };
    });
    await check(`위험 액션 ${theme}: AlertDialog 기본 포커스 안전 쪽·확정 뒤 선택 비움·검색으로 포커스`, async () => {
      await load('선택됨', theme, 1440);
      await ev(`[...${q('[data-slot="bulk-action-bar-panel"]')}.querySelectorAll('button')].at(-1).click()`);
      await wait(`!!${q('[role="alertdialog"]')}`, '확인창');
      await wait(`document.activeElement?.textContent === '계속 보기'`, '기본 포커스는 계속 보기');
      await ev(`[...${q('[role="alertdialog"]')}.querySelectorAll('button')].find(b => b.textContent === '주문 취소').click()`);
      await wait(`!${q('[role="alertdialog"]')} && ${q('[data-slot="bulk-action-bar-count"]')}.textContent === ''`, '확정 뒤 선택 비움');
      await wait(`document.activeElement === ${q('[data-slot="filter-bar-search"] input')}`, '검색으로 포커스');
    });
  }
} finally {
  browser.close();
  writeFileSync(`${OUT}/results.json`, JSON.stringify({ results, errors: browser.errors() }, null, 2));
}
const failed = results.filter(r => !r.pass);
console.log(`검사 ${results.length}건 · 통과 ${results.length - failed.length} · 실패 ${failed.length}`);
process.exitCode = failed.length ? 1 : 0;
