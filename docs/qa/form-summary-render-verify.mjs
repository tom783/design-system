// 목표 57 — 폼 하단 고정 액션 줄(FormActionBar · 규칙 표 F-1~F-13)과 표 합계 행(DataTable summary · T-1~T-12).
// 디자인 총괄 시각 검수 매트릭스: 라이트·다크 × 1440·1024·768·390 ×
//   Screens/ProductCreate 등록·수정·저장 중·오류 2개·Tab 포커스(마지막 두 줄)·짧은 폼
//   Screens/OrderDetail 합계+내역·페이지네이션 2행·선택 열·빈 표·로딩(390 은 가로 스크롤 고정 열)
// 수치를 단정하고 실제 크기(deviceScaleFactor 1) 화면을 OUT 에 `<sha>-<테마>-<폭>-<상태>.png` 로 남긴다.
// 실행: pnpm qa --only form-summary-render-verify (서버·출처 확인은 run-all 이 한다).
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, CANVAS, actions } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/form-summary';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ windowSize: '1440,900', outDir: OUT });
const { ev, cdp, sleep } = browser;
const { open } = storybook(browser);
const act = actions(browser);
const results = [], shots = [];
const THEMES = ['light', 'dark'];
// 1단계 관찰과 같은 창 크기(DPR 1).
const VIEWPORTS = [[1440, 900], [1024, 768], [768, 1024], [390, 844]];
let sha = 'nosha';
const q = selector => `document.querySelector(${JSON.stringify(selector)})`;
const near = (actual, expected, message, tolerance = 0.5) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} ≠ ${expected}`);
async function wait(expression, label = expression) {
  for (let i = 0; i < 125; i++) { if (await ev(expression).catch(() => false)) return; await sleep(40); }
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
  await ev(`document.fonts.load('14px "Pretendard Variable"', '저장하지 않은 변경 있음 합계 0123456789원')`);
  await ev('document.fonts.ready');
  await ev(`(document.activeElement instanceof HTMLElement) && document.activeElement.blur()`);
  await frames();
}
async function shot(theme, width, state) {
  await frames();
  const r = await cdp('Page.captureScreenshot', { format: 'png' });
  const file = `${OUT}/${sha}-${theme}-${width}-${state}.png`;
  writeFileSync(file, Buffer.from(r.data, 'base64'));
  shots.push(file);
  return file;
}

const HELPERS = `
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgb = color => { ctx.clearRect(0,0,1,1); ctx.fillStyle = color; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data]; };
  const token = name => rgb(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
  const same = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 1);
  const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height }; };
  const visible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const textRight = el => { const r = document.createRange(); r.selectNodeContents(el); const rects = [...r.getClientRects()].filter(x => x.width > 0); return rects.length ? Math.max(...rects.map(x => x.right)) : null; };
  const main = document.querySelector('[data-slot="app-shell-main"]');
  const port = () => { const r = main.getBoundingClientRect(); return { left: r.left + main.clientLeft, right: r.left + main.clientLeft + main.clientWidth,
    top: r.top + main.clientTop, bottom: r.top + main.clientTop + main.clientHeight }; };
`;
const inPage = body => ev(`(() => { ${HELPERS} ${body} })()`);

// ── 폼 하단 고정 액션 줄 ─────────────────────────────────────────────
const BAR = `const bar = document.querySelector('[data-slot="form-action-bar"]');
  const column = document.querySelector('form[aria-label]').firstElementChild;
  const slot = name => bar.querySelector('[data-slot="form-action-bar-' + name + '"]');`;
const barState = () => inPage(`${BAR}
  const s = getComputedStyle(bar), submit = slot('submit'), cancel = slot('cancel'), status = slot('status'), errors = slot('errors');
  const del = slot('delete'), more = slot('more');
  const order = [...bar.querySelectorAll('button')].filter(visible).map(el => el.getAttribute('aria-label')?.startsWith('오류') ? '오류 링크' : (el.getAttribute('aria-label') ?? el.textContent.trim()));
  return { bar: box(bar), port: port(), column: box(column), position: s.position, zIndex: s.zIndex, boxShadow: s.boxShadow,
    bg: same(rgb(s.backgroundColor), token('--bg-sunken')), borderTop: [s.borderTopWidth, same(rgb(s.borderTopColor), token('--border-subtle'))],
    paddingInline: [parseFloat(s.paddingLeft), parseFloat(s.paddingRight)], gutter: parseFloat(getComputedStyle(main).getPropertyValue('--app-shell-gutter')),
    scrollPaddingBottom: getComputedStyle(main).scrollPaddingBottom, overflowX: main.scrollWidth - main.clientWidth,
    submit: { ...box(submit), text: submit.textContent.trim(), ariaDisabled: submit.getAttribute('aria-disabled'), opacity: getComputedStyle(submit).opacity,
      primary: same(rgb(getComputedStyle(submit).backgroundColor), token('--action-primary-bg')), type: submit.type },
    cancel: cancel ? { ...box(cancel), disabled: cancel.disabled } : null,
    status: { text: status.textContent, visible: visible(status) && status.getBoundingClientRect().width > 1, box: box(status),
      secondary: same(rgb(getComputedStyle(status).color), token('--text-secondary')) },
    errors: errors ? { text: errors.textContent, visible: visible(errors), box: box(errors), danger: same(rgb(getComputedStyle(errors).color), token('--status-danger-fg')),
      underline: getComputedStyle(errors).textDecorationLine } : null,
    del: del ? { ...box(del), visible: visible(del), disabled: del.disabled, danger: same(rgb(getComputedStyle(del).color), token('--status-danger-fg')) } : null,
    more: more ? { ...box(more), visible: visible(more), label: more.getAttribute('aria-label') } : null,
    order };`);

function assertBar(m, { width, state }) {
  near(m.bar.height, 63, `줄 높이 63(F-4) ${state}`);
  near(m.gutter, width >= 1024 ? 24 : 16, '본문 여백 변수');
  near(m.bar.left, m.port.left, `줄 왼끝 = 본문 왼끝(F-2) ${state}`);
  near(m.bar.right, m.port.right, `줄 오른끝 = 본문 오른끝(F-2) ${state}`);
  near(m.bar.bottom, m.port.bottom, `줄 아래끝 = 본문 바닥(FD-1 A) ${state}`);
  assert.ok(m.overflowX <= 0.5, `본문 가로 스크롤 ${m.overflowX}px(관찰 1)`);
  assert.deepEqual(m.paddingInline, [m.gutter, m.gutter], '좌우 여백 = gutter');
  assert.equal(m.position, 'sticky'); assert.equal(m.zIndex, '5', '층 z 5(F-12)'); assert.equal(m.boxShadow, 'none', '그림자 없음');
  assert.ok(m.bg && m.borderTop[0] === '1px' && m.borderTop[1], `bg-sunken + 윗선 border-subtle 1px(FD-2 B) ${JSON.stringify(m.borderTop)}`);
  assert.equal(m.scrollPaddingBottom, '79px', 'scroll-padding-bottom 79(F-6)');
  near(m.submit.right, m.column.right, `저장 오른끝 = 폼 열 오른끝(F-3) ${state}`);
  assert.equal(m.submit.type, 'submit'); assert.equal(m.order.at(-1).replace('…', ''), m.submit.text.replace('…', ''), '저장이 오른쪽 끝(F-5)');
  near(m.submit.height, 38, '버튼 md 38');
  if (m.cancel) near(m.submit.left - m.cancel.right, 8, '취소–저장 간격 8');
  if (width < 480) {
    assert.ok(!m.status.visible, '480 미만은 상태 문구 숨김(F-10)');
    if (m.cancel) near(m.cancel.width, m.submit.width, '취소·저장 같은 폭(F-10)');
    if (m.cancel) near(m.cancel.left - (m.more?.visible ? m.more.right + 8 : m.column.left), 0, '취소가 줄을 채운다');
    if (m.more) { assert.ok(m.more.visible && !m.del.visible, '삭제는 더 보기 메뉴로'); near(m.more.width, 38, '⋯ 38'); near(m.more.height, 38, '⋯ 38');
      assert.equal(m.more.label, '더 보기'); near(m.more.left, m.column.left, '⋯ 폼 열 왼끝'); }
  } else if (m.del) {
    assert.ok(m.del.visible && !m.more.visible, '넓은 폭은 삭제 버튼');
    near(m.del.left, m.column.left, `삭제 왼끝 = 폼 열 왼끝(F-5) ${state}`);
    const next = [m.status.visible ? m.status.box : null, m.errors?.visible ? m.errors.box : null, m.cancel].filter(Boolean)[0];
    assert.ok(next.left - m.del.right >= 24, `삭제–다음 묶음 ≥ 24: ${next.left - m.del.right}`);
    assert.ok(m.del.danger, '삭제는 danger 글자');
  }
}

const formStates = [
  ['기본', '등록'], ['수정', '수정'], ['저장중', '저장중'], ['오류2개', '오류2개'], ['짧은폼', '짧은폼'],
];
try {
  await open('screens-productcreate--기본', { waitPlay: false });
  sha = await ev(`fetch('/build-info.json').then(r => r.ok ? r.json() : {}).then(i => (i.sha ?? 'nosha').slice(0, 7) + (i.dirty ? '-dirty' : '')).catch(() => 'nosha')`);
  for (const theme of THEMES) for (const viewport of VIEWPORTS) {
    const [width] = viewport;
    for (const [story, state] of formStates) {
      await check(`줄 ${theme} ${width} ${state}: 63·gutter·본문 바닥·저장 끝 = 폼 열 끝·순서·면·층`, async () => {
        await load(`screens-productcreate--${story}`, theme, viewport);
        const m = await barState();
        assertBar(m, { width, state });
        if (state === '수정') {
          if (width >= 480) assert.ok(m.status.visible && m.status.text === '저장하지 않은 변경 있음' && m.status.secondary, '상태 문구(F-7)');
          assert.deepEqual(m.order, width < 480 ? ['더 보기', '취소', '저장'] : ['삭제', '취소', '저장'], 'DOM 순서 = 보이는 순서(F-11)');
        }
        if (state === '저장중') {
          assert.equal(m.submit.text, '저장 중…'); assert.equal(m.submit.ariaDisabled, 'true');
          assert.ok(m.submit.primary && m.submit.opacity === '1', '주요색 유지·흐리게 하지 않음(F-8)');
          assert.ok(m.cancel.disabled && m.del.disabled, '취소·삭제 비활성(F-8)');
          assert.ok(!m.status.visible, '저장 중에는 상태 문구 없음');
        }
        if (state === '오류2개') {
          if (width >= 480) {
            assert.ok(m.errors.visible && m.errors.text === '오류 2개' && m.errors.danger && m.errors.underline === 'underline', `오류 링크(F-7) ${JSON.stringify(m.errors)}`);
            assert.deepEqual(m.order, ['오류 링크', '취소', '저장']);
          } else assert.ok(!m.errors.visible, '480 미만 오류 링크 숨김(F-10)');
          assert.ok(await ev(`!!${q('[data-screen="error-summary"][role="alert"]')}`), '폼 위 오류 요약');
        }
        if (state === '짧은폼') {
          const s = await inPage('return { scroll: main.scrollHeight - main.clientHeight, gap: document.querySelector(\'[data-slot="form-action-bar"]\').getBoundingClientRect().top - document.querySelector(\'form[aria-label]\').firstElementChild.getBoundingClientRect().bottom };');
          // 390 은 한 열로 접혀 '짧은 폼'도 본문보다 1px 길다(실측) — 그때는 줄이 원래 바닥에 있다. 바닥 고정은 assertBar 가 본다.
          if (width >= 480) assert.ok(s.scroll <= 0.5, `짧은 폼은 본문 스크롤 없음 ${s.scroll}`);
          if (width >= 480) assert.ok(s.gap >= 24, `짧은 폼도 줄은 본문 바닥(FD-1 A) — 폼 끝과 ${s.gap}px`);
          m.shortGap = s.gap;
        }
        if (state !== '짧은폼') {
          // 맨 아래에서 마지막 입력 아래끝 → 줄 윗끝 ≥ 24(F-6).
          const bottom = await inPage(`main.scrollTop = main.scrollHeight; const bar = document.querySelector('[data-slot="form-action-bar"]');
            const controls = [...document.querySelectorAll('form[aria-label] [data-slot="input"], form[aria-label] [data-slot="select-trigger"]')];
            const last = controls.at(-1); return { gap: bar.getBoundingClientRect().top - last.getBoundingClientRect().bottom, barBottom: bar.getBoundingClientRect().bottom, port: port().bottom };`);
          assert.ok(bottom.gap >= 24, `맨 아래 마지막 입력 → 줄 ${bottom.gap}`);
          near(bottom.barBottom, bottom.port, '맨 아래에서도 줄은 본문 바닥');
          m.bottomGap = bottom.gap;
          await inPage('main.scrollTop = 0; return 0;');
        }
        await shot(theme, width, state);
        return { width, bar: m.bar.height, gutter: m.gutter, save: [m.submit.right, m.column.right], order: m.order, bottomGap: m.bottomGap, shortGap: m.shortGap };
      });
    }
    await check(`줄 ${theme} ${width} Tab: 마지막 입력 → 취소 → 저장, 포커스 칸이 줄에 가리지 않는다(F-6·F-11)`, async () => {
      await load('screens-productcreate--기본', theme, viewport);
      await ev(`${q('form[aria-label] [data-slot="input"]')}.focus()`);
      const steps = [];
      const describe = `(() => { ${HELPERS} const el = document.activeElement, bar = document.querySelector('[data-slot="form-action-bar"]');
        const field = el.closest('[data-slot="field"]'), r = el.getBoundingClientRect(), b = bar.getBoundingClientRect(), p = port();
        return { name: field ? field.querySelector('[data-slot="field-label"]').firstChild.textContent : (el.getAttribute('aria-label') ?? el.textContent.trim()),
          inBar: bar.contains(el), covered: bar.contains(el) ? 0 : Math.max(0, Math.min(r.bottom, p.bottom) - Math.max(r.top, b.top)),
          above: Math.max(0, p.top - r.top), gapToBar: b.top - r.bottom }; })()`;
      steps.push(await ev(describe));
      for (let i = 0; i < 40 && !(steps.at(-1).inBar && steps.at(-1).name === '저장'); i++) {
        await ev('void (window.__previousFocus = document.activeElement)');
        await act.key('Tab');
        await wait('document.activeElement !== window.__previousFocus', 'Tab 뒤 포커스 이동');
        await frames();
        steps.push(await ev(describe));
        const name = steps.at(-1).name;
        if (name === '재고 수량') await shot(theme, width, 'Tab-재고수량');
        if (name === '출고 소요일') await shot(theme, width, 'Tab-출고소요일');
      }
      const names = steps.map(s => s.name);
      assert.deepEqual(names.slice(-3), ['출고 소요일', '취소', '저장'], `Tab 순서 끝 ${names.join(' → ')}`);
      const covered = steps.filter(s => !s.inBar && (s.covered > 0 || s.above > 0));
      assert.deepEqual(covered, [], `줄·본문 위에 가린 포커스 칸 ${JSON.stringify(covered)}`);
      return { width, path: names, minGapToBar: Math.min(...steps.filter(s => !s.inBar).map(s => s.gapToBar)) };
    });
  }

  // 마지막 칸 Enter = 저장(F-11), 저장 중 재제출 차단(F-8), 오류 링크 → 첫 오류 칸(F-7), 삭제 확인창 포커스 복귀(§6.2), 층(F-12).
  await check('마지막 칸 Enter 는 저장(제출)이다 — 줄의 취소로 포커스를 옮기지 않는다', async () => {
    await load('screens-productcreate--기본', 'light', [1440, 900]);
    await ev(`(() => { const inputs = [...document.querySelectorAll('form[aria-label] [data-slot="input"]')]; inputs.at(-1).focus(); })()`);
    const before = await ev('document.activeElement.closest("[data-slot=field]").querySelector("[data-slot=field-label]").firstChild.textContent');
    await act.enter();
    await wait(`${q('[data-slot="form-action-bar"]')}.hasAttribute('data-saving')`, '제출 → 저장 중');
    assert.equal(await ev(`document.activeElement?.closest('[data-slot="form-action-bar"]') ? 'bar' : 'form'`), 'form');
    await wait(`!!document.querySelector('[data-sonner-toast]')`, '저장 결과 토스트');
    return { from: before };
  });
  await check('저장 중에는 Enter·클릭으로 다시 제출되지 않는다(F-8)', async () => {
    await load('screens-productcreate--저장중', 'light', [1440, 900]);
    await ev(`${q('form[aria-label] [data-slot="input"]')}.focus()`);
    await act.enter();
    await ev(`${q('[data-slot="form-action-bar-submit"]')}.click()`);
    await sleep(1500);
    assert.equal(await ev(`!!document.querySelector('[data-sonner-toast]')`), false, '토스트가 떴다 — 저장 중 제출됨');
    assert.equal(await ev(`${q('[data-slot="form-action-bar-submit"]')}.textContent`), '저장 중…');
  });
  await check('오류 N개 링크를 누르면 첫 오류 칸(상품명)으로 포커스(F-7)', async () => {
    await load('screens-productcreate--오류2개', 'light', [1024, 768]);
    await ev(`${q('[data-slot="form-action-bar-errors"]')}.focus()`);
    await act.enter();
    await wait(`document.activeElement?.getAttribute('aria-invalid') === 'true'`);
    const m = await inPage(`const el = document.activeElement; return { label: el.closest('[data-slot="field"]').querySelector('[data-slot="field-label"]').firstChild.textContent,
      top: el.getBoundingClientRect().top - port().top };`);
    assert.equal(m.label, '상품명'); assert.ok(m.top >= 0, '첫 오류 칸이 보인다');
    return m;
  });
  await check('수정: 삭제 → 확인창 기본 포커스 계속 편집 → Esc → 삭제로 복귀(§6.2)', async () => {
    await load('screens-productcreate--수정', 'light', [1440, 900]);
    await ev(`${q('[data-slot="form-action-bar-delete"]')}.click()`);
    await wait(`document.activeElement?.textContent === '계속 편집'`);
    const m = await ev(`(() => { const d = document.querySelector('[role="alertdialog"]'); return { title: d.querySelector('[data-slot="alert-dialog-title"]').textContent,
      buttons: [...d.querySelectorAll('button')].map(b => b.textContent) }; })()`);
    assert.equal(m.title, '삭제하시겠습니까?'); assert.deepEqual(m.buttons, ['계속 편집', '삭제']);
    await shot('light', 1440, '수정-삭제확인');
    await act.key('Escape');
    await wait(`!document.querySelector('[role="alertdialog"]') && document.activeElement === ${q('[data-slot="form-action-bar-delete"]')}`);
    return m;
  });
  for (const theme of THEMES) {
    await check(`수정 390 ${theme}: ⋯ 메뉴의 삭제 → 확인창 → Esc → ⋯ 로 복귀(F-10)`, async () => {
      await load('screens-productcreate--수정', theme, [390, 844]);
      await ev(`${q('[data-slot="form-action-bar-more"]')}.focus()`);
      await act.enter();
      await wait(`!!document.querySelector('[role="menuitem"]') && document.activeElement?.getAttribute('role') === 'menuitem'`);
      await sleep(250);
      const menu = await inPage(`const items = [...document.querySelectorAll('[role="menuitem"]')], content = document.querySelector('[data-slot="dropdown-menu-content"]');
        const more = document.querySelector('[data-slot="form-action-bar-more"]').getBoundingClientRect(), c = content.getBoundingClientRect();
        return { items: items.map(i => i.textContent.trim()), icon: !!items[0].querySelector('[data-slot="dropdown-menu-destructive-icon"]'), gap: more.top - c.bottom, z: getComputedStyle(content.parentElement).zIndex };`);
      assert.deepEqual(menu.items, ['삭제']); assert.ok(menu.icon); near(menu.gap, 6, '메뉴 간격 6');
      await shot(theme, 390, '수정-더보기열림');
      await act.enter();
      await wait(`document.activeElement?.textContent === '계속 편집'`);
      await act.key('Escape');
      await wait(`!document.querySelector('[role="alertdialog"]') && document.activeElement === ${q('[data-slot="form-action-bar-more"]')}`);
      return menu;
    });
  }
  await check('열린 Select 목록은 줄 위에 그려진다(F-12)', async () => {
    await load('screens-productcreate--기본', 'light', [1440, 900]);
    await inPage('main.scrollTop = main.scrollHeight; return 0;');
    const trigger = `[...document.querySelectorAll('form[aria-label] [data-slot="select-trigger"]')].at(-1)`;
    await ev(`${trigger}.focus()`);
    await act.enter();
    await wait(`!!document.querySelector('[role="listbox"]')`);
    await sleep(250);
    const m = await inPage(`const list = document.querySelector('[role="listbox"]'), bar = document.querySelector('[data-slot="form-action-bar"]');
      const a = list.getBoundingClientRect(), b = bar.getBoundingClientRect();
      const overlap = { top: Math.max(a.top, b.top), bottom: Math.min(a.bottom, b.bottom), left: Math.max(a.left, b.left), right: Math.min(a.right, b.right) };
      const hit = overlap.bottom > overlap.top && overlap.right > overlap.left ? document.elementFromPoint((overlap.left + overlap.right) / 2, (overlap.top + overlap.bottom) / 2) : null;
      let z = list; while (z && getComputedStyle(z).zIndex === 'auto') z = z.parentElement;
      return { overlapH: Math.max(0, overlap.bottom - overlap.top), hitInList: hit ? list.contains(hit) || !!hit.closest('[data-radix-popper-content-wrapper]') : null, z: z ? getComputedStyle(z).zIndex : null };`);
    if (m.overlapH > 0) assert.equal(m.hitInList, true, '겹친 곳은 목록이 위');
    assert.ok(Number(m.z) > 5, `목록 층 ${m.z}`);
    await act.key('Escape');
    return m;
  });

  // ── 표 합계 행 ─────────────────────────────────────────────────────
  const tableState = () => inPage(`
    const table = document.querySelector('[data-slot="data-table"]'), scroll = table.querySelector('[data-slot="data-table-scroll"]');
    const foot = table.querySelector('[data-slot="data-table-summary"]');
    const rows = foot ? [...foot.querySelectorAll('[data-slot="data-table-summary-row"]')] : [];
    const bodyRow = table.querySelector('[data-slot="data-table-row"]');
    const cellOf = (row, id) => row.querySelector('[data-column-id="' + id + '"]');
    const valueRight = cell => { const v = cell?.querySelector('.ds-data-table-value'); return v ? textRight(v) : null; };
    const summary = rows.map(row => { const cells = [...row.children]; const label = row.querySelector('th');
      const sum = cellOf(row, 'sum'), qty = cellOf(row, 'qty'), s = getComputedStyle(sum ?? label);
      return { label: label?.textContent, scope: label?.getAttribute('scope'), labelColumn: label?.dataset.columnId, cells: cells.map(c => c.tagName + ':' + c.dataset.columnId + ':' + c.textContent),
        height: row.getBoundingClientRect().height, borderTop: [s.borderTopWidth, same(rgb(s.borderTopColor), token('--border-default')), same(rgb(s.borderTopColor), token('--border-subtle'))],
        bg: same(rgb(s.backgroundColor), token('--bg-canvas')), weight: s.fontWeight, size: s.fontSize, lineHeight: s.lineHeight, numeric: s.fontVariantNumeric,
        sumRight: valueRight(sum), qtyRight: valueRight(qty), sumSticky: sum?.style.position === 'sticky' ? sum.style.right : null,
        skeletons: cells.filter(c => c.querySelector('[data-slot="skeleton"]')).map(c => c.dataset.columnId) }; });
    const bodySum = bodyRow ? cellOf(bodyRow, 'sum') : null;
    const totals = document.querySelector('[data-screen="totals"]');
    const dl = totals ? [...totals.querySelectorAll('[data-slot="description-list-item"]')].map(p => ({ label: p.querySelector('dt').textContent, right: textRight(p.querySelector('dd')) })) : null;
    const cards = [...document.querySelectorAll('[data-screen="cards"] > [data-slot="card"]')].map(box);
    let overlap = 0;
    for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i], b = cards[j]; overlap = Math.max(overlap, Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))); }
    const lastBody = [...table.querySelectorAll('[data-slot="data-table-body"] > tr')].at(-1);
    return { summary, bodySumRight: valueRight(bodySum), bodyQtyRight: bodyRow ? valueRight(cellOf(bodyRow, 'qty')) : null,
      bodySumSticky: bodySum?.style.position === 'sticky' ? bodySum.style.right : null, scrollable: scroll.scrollWidth - scroll.clientWidth,
      scrollRight: scroll.getBoundingClientRect().left + scroll.clientLeft + scroll.clientWidth, tableRight: scroll.getBoundingClientRect().right,
      lastBodyBorder: lastBody?.firstElementChild ? getComputedStyle(lastBody.firstElementChild).borderBottomWidth : null,
      dl, cards: cards.length, cardColumns: new Set(cards.map(c => Math.round(c.left))).size, overlap, pageOverflow: main.scrollWidth - main.clientWidth,
      rowHeight: bodyRow?.getBoundingClientRect().height ?? null };`);

  const tableStates = [['기본', '합계+내역'], ['합계페이지네이션', '페이지네이션2행'], ['합계선택열', '선택열'], ['합계빈표', '빈표'], ['합계로딩', '로딩']];
  for (const theme of THEMES) for (const viewport of VIEWPORTS) {
    const [width] = viewport;
    for (const [story, state] of tableStates) {
      await check(`합계 ${theme} ${width} ${state}: tfoot·th scope·Δx 0·높이 40·선·바탕·카드 겹침 0`, async () => {
        await load(`screens-orderdetail--${story}`, theme, viewport);
        await inPage('main.scrollTop = main.scrollHeight; return 0;');
        await frames();
        const m = await tableState();
        assert.equal(m.overlap, 0, `카드 겹침(2c) ${m.overlap}`);
        assert.ok(m.pageOverflow <= 0.5, `본문 가로 스크롤 ${m.pageOverflow}`);
        if (state === '빈표') { assert.equal(m.summary.length, 0, '빈 표는 합계 행 숨김(T-9)'); await shot(theme, width, state); return { width, state }; }
        const first = m.summary[0];
        assert.equal(first.scope, 'row'); assert.equal(first.labelColumn, 'id', '라벨은 첫 데이터 열(T-3)');
        near(first.height, 40, '합계 행 높이 = 행 높이 40(T-5)');
        assert.ok(first.borderTop[0] === '1px' && first.borderTop[1], `위 1px border-default(T-5) ${JSON.stringify(first.borderTop)}`);
        assert.ok(first.bg, '바탕 = 머리 바탕 canvas(T-5)');
        assert.equal(first.weight, '600'); assert.equal(first.size, '14px'); assert.equal(first.lineHeight, '20px'); assert.equal(first.numeric, 'tabular-nums');
        assert.equal(m.lastBodyBorder, '0px', '합계 바로 위 본문 행 아랫선 없음 — 두 겹 금지');
        if (state === '로딩') {
          assert.equal(first.label, '합계'); assert.deepEqual(first.skeletons.sort(), ['qty', 'sum'], '값 자리만 숫자 폭 스켈레톤(T-9)');
        } else {
          near(first.sumRight, m.bodySumRight, '합계 금액 = 금액 열 글자 끝(T-1, 1단계 +15)');
          near(first.qtyRight, m.bodyQtyRight, '합계 수량 = 수량 열 글자 끝');
        }
        if (state === '합계+내역' || state === '선택열') {
          assert.equal(first.label, '합계');
          assert.deepEqual(m.dl.map(p => p.label), ['배송비', '결제 금액'], "내역에 '상품 합계' 중복 없음(TD-1 A)");
          for (const p of m.dl) near(p.right, m.bodySumRight, `${p.label} 값 끝 = 금액 열 글자 끝(TD-1 A)`);
        }
        if (state === '선택열') assert.ok(first.cells[0].startsWith('TD:') && first.cells[0].endsWith(':'), `선택 칸은 빈 td ${first.cells[0]}`);
        if (state === '페이지네이션2행') {
          assert.deepEqual(m.summary.map(r => r.label), ['이 페이지 합계', '전체 합계 · 128건'], '2행 라벨(T-7)');
          assert.ok(m.summary[1].borderTop[2], '둘째 행은 본문 행 선');
        }
        if (m.scrollable > 0.5) {
          assert.equal(first.sumSticky, '0px', `가로 스크롤 표는 금액 열 고정 — 합계 칸도 같은 sticky(TD-2 A)`);
          if (state !== '로딩') {
            assert.equal(m.bodySumSticky, '0px', '본문 금액 칸 고정');
            near(m.bodySumRight, m.scrollRight - 14, '고정 금액 열이 첫 화면에 보인다');
          }
        } else assert.equal(first.sumSticky, null, '넘치지 않으면 고정 안 함 — 고정선 없음');
        await shot(theme, width, state);
        return { width, state, scrollable: m.scrollable, cardColumns: m.cardColumns, sum: [first.sumRight, m.bodySumRight], dl: m.dl };
      });
    }
  }
  await check('선택해도 합계는 그대로다(T-10)', async () => {
    await load('screens-orderdetail--합계선택열', 'light', [1440, 900]);
    const before = await ev(`${q('[data-slot="data-table-summary"]')}.textContent`);
    await ev(`[...document.querySelectorAll('[data-slot="data-table-row"] input[type="checkbox"]')][1].click()`);
    await wait(`document.querySelectorAll('[data-slot="data-table-row"][data-selected]').length === 2`);
    assert.equal(await ev(`${q('[data-slot="data-table-summary"]')}.textContent`), before);
  });
  await check('표 자체 세로 스크롤이면 합계 행이 바닥에 붙는다(T-8)', async () => {
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    const r = await open('components-datatable--합계-세로스크롤', { waitPlay: false });
    assert.equal(r.sbError, null);
    await wait(`!!${q('[data-slot="data-table-summary"]')}`);
    await frames();
    const m = await ev(`(() => { const scroll = document.querySelector('[data-slot="data-table-scroll"]'), foot = document.querySelector('[data-slot="data-table-summary"]');
      const s = scroll.getBoundingClientRect(); return { footBottom: foot.getBoundingClientRect().bottom, portBottom: s.top + scroll.clientTop + scroll.clientHeight,
        scrolls: scroll.scrollHeight > scroll.clientHeight, label: foot.querySelector('th').textContent }; })()`);
    assert.ok(m.scrolls); near(m.footBottom, m.portBottom, '합계 행 아래끝 = 표 스크롤 영역 바닥');
    assert.equal(m.label, '전체 합계 · 10,000건');
    return m;
  });
  await check('콘솔 오류 0건', async () => assert.deepEqual(browser.errors(), []));
} finally {
  writeFileSync(`${OUT}/results.json`, JSON.stringify({ sha, results, shots }, null, 2));
  browser.close();
}
const failed = results.filter(r => !r.pass);
console.log(`\n검사 ${results.length}건 · 통과 ${results.length - failed.length} · 실패 ${failed.length} · 스크린샷 ${shots.length}장 ${OUT}/${sha}-*.png`);
process.exitCode = failed.length ? 1 : 0;
