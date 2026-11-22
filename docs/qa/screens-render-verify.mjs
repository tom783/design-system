// 정식 Screens 스토리(주문 목록·주문 상세 D2·대시보드) 검증. 1440×900, 라이트·다크.
// 2026-11-22 디자인 검토 확정안: 제목 display 34/40·700(T34), 상세 파괴적 액션 D2, 대시보드 타일 줄.
// 실행: pnpm qa 또는 정적 Storybook 서버(:6099)에서 이 파일로 한다.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, CANVAS } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/screens';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ port: 9520, windowSize: '1440,900', outDir: OUT });
const { ev, cdp, sleep } = browser;
const { open } = storybook(browser);
const results = [];
const q = selector => `document.querySelector(${JSON.stringify(selector)})`;
async function wait(expression, label = expression) {
  for (let i = 0; i < 100; i++) { if (await ev(expression)) return; await sleep(40); }
  throw new Error(`조건 대기 실패: ${label}`);
}
async function check(label, run) {
  try { const measurements = await run(); results.push({ label, pass: true, measurements }); console.log(`✓ ${label}`); }
  catch (e) { results.push({ label, pass: false, error: e.message }); console.error(`✗ ${label}: ${e.message}`); await browser.shot(`failure-${results.length}`); }
}
async function load(id, theme) {
  const r = await open(id, { extra: `&globals=theme:${theme}` });
  assert.equal(r.sbError, null); assert.deepEqual(r.errors, []);
  await wait(`${CANVAS}.dataset.playComplete === 'true'`, `${id} play 완료`);
  await wait(`document.documentElement.dataset.theme === '${theme}'`);
  await ev(`document.fonts.load('14px "Pretendard Variable"', '주문 목록 대시보드')`);
  await ev('document.fonts.ready');
}
const colorHelpers = `
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgb = color => { ctx.clearRect(0,0,1,1); ctx.fillStyle = color; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data]; };
  const lum = a => a.slice(0,3).map(v => v/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4).reduce((sum,v,i) => sum+v*[.2126,.7152,.0722][i],0);
  const contrast = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
  const token = name => rgb(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
  const same = (a,b) => a.every((v,i) => Math.abs(v-b[i]) <= 1);
`;
// 데이터 화면 제목은 display 34/40·700 단일안이다(T34). PageHeader 크기 옵션은 없다.
const title = () => ev(`(() => { const h=${q('[data-slot="page-header-title"]')}, s=getComputedStyle(h);
  return { size:s.fontSize, lineHeight:s.lineHeight, weight:s.fontWeight, h1:${CANVAS}.querySelectorAll('h1').length }; })()`);
function assertTitle(m) { assert.deepEqual(m, { size: '34px', lineHeight: '40px', weight: '700', h1: 1 }); }

try {
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  for (const theme of ['light', 'dark']) {
    await check(`목록: 제목 T34·툴바 한 줄·검색 폭 320·N건 선택·페이지 범위 ${theme}`, async () => {
      await load('screens-orderlist--기본', theme);
      const t = await title(); assertTitle(t);
      const m = await ev(`(() => { ${colorHelpers}
        const bar=${q('[data-screen="toolbar"]')}, control=bar.querySelector('[data-slot="input-control"]');
        const tops=[...bar.children].map(el => Math.round(el.getBoundingClientRect().top));
        const selected=[...document.querySelectorAll('[data-slot="data-table-row"][data-selected]')];
        const row=selected[0], surface=token('--bg-surface'), rowBg=rgb(getComputedStyle(row.querySelector('td')).backgroundColor);
        return { tops, search:control.getBoundingClientRect().width, barHeight:bar.getBoundingClientRect().height,
          status:${q('[data-screen="bulk"] [role="status"]')}.textContent, selected:selected.map(r => r.dataset.rowId),
          range:${q('[data-slot="pagination-range"]')}?.textContent, rows:document.querySelectorAll('[data-slot="data-table-row"]').length,
          primary:[...document.querySelectorAll('button, a')].filter(el => same(rgb(getComputedStyle(el).backgroundColor), token('--action-primary-bg'))).map(el => el.textContent.trim()),
          selectedRow:{ background:rowBg, selectedToken:token('--bg-selected'), vsSurface:contrast(rowBg, surface) } }; })()`);
      assert.equal(new Set(m.tops).size, 1, `툴바가 한 줄이어야 한다 ${JSON.stringify(m.tops)}`);
      assert.equal(m.search, 320); assert.equal(m.status, '3건 선택');
      assert.deepEqual(m.selected, ['ORD-20480', 'ORD-20479', 'ORD-20477']);
      assert.equal(m.range, '1–20 / 1,284건'); assert.equal(m.rows, 20);
      assert.deepEqual(m.primary, ['주문 등록'], '주요 버튼은 화면당 하나');
      assert.ok(m.selectedRow.background.every((v, i) => Math.abs(v - m.selectedRow.selectedToken[i]) <= 1), JSON.stringify(m.selectedRow));
      await browser.shot(`list-${theme}`);
      return { title: t, ...m };
    });
    await check(`목록: 검색어가 표·전체 건수·선택을 함께 바꾼다 ${theme}`, async () => {
      // 제어 입력이라 네이티브 setter + input 이벤트로 React onChange 를 부른다.
      await ev(`(() => { const input=${q('[data-screen="toolbar"] input[type="search"]')};
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'ORD-204'); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
      // ORD-20481 ~ ORD-20400 의 82건이 남는다. 1페이지의 선택(20480·20479·20477)은 화면에 남아 유지된다.
      await wait(`${q('[data-slot="pagination-range"]')}?.textContent === '1–20 / 82건'`, '검색 결과 82건');
      const m = await ev(`({ rows:document.querySelectorAll('[data-slot="data-table-row"]').length,
        status:${q('[data-screen="bulk"] [role="status"]')}.textContent, clear:!!${q('[aria-label="검색어 지우기"]')} })`);
      assert.deepEqual(m, { rows: 20, status: '3건 선택', clear: true });
      return m;
    });

    await check(`상세 D2: 머리 액션 ⋯·수정·출고 처리, 화면에 채운 danger 없음, 삭제 흐름 후 ⋯ 로 복귀 ${theme}`, async () => {
      await load('screens-orderdetail--기본', theme);
      const t = await title(); assertTitle(t);
      const m = await ev(`(() => { ${colorHelpers}
        const actions=[...document.querySelectorAll('[data-slot="page-header-actions"] button')];
        const fill = el => rgb(getComputedStyle(el).backgroundColor);
        return { actions:actions.map(el => el.getAttribute('aria-label') ?? el.textContent.trim()),
          primary:actions.filter(el => same(fill(el), token('--action-primary-bg'))).map(el => el.textContent.trim()),
          danger:[...document.querySelectorAll('button')].filter(el => same(fill(el), token('--action-danger-bg'))).length,
          focus:document.activeElement?.getAttribute('aria-label'), breadcrumb:${q('[data-slot="page-header-breadcrumb"] [aria-current="page"]')}?.textContent }; })()`);
      assert.deepEqual(m.actions, ['주문 작업 더보기', '수정', '출고 처리']);
      assert.deepEqual(m.primary, ['출고 처리']); assert.equal(m.danger, 0, '채운 danger 는 확정 단계에서만');
      assert.equal(m.focus, '주문 작업 더보기', 'play 의 삭제 흐름이 끝나면 ⋯ 로 돌아온다');
      assert.equal(m.breadcrumb, 'ORD-20481');
      await browser.shot(`detail-${theme}`);
      return { title: t, ...m };
    });
    await check(`상세 D2: 더보기 메뉴의 삭제 항목은 아이콘 + 4.5:1 이상 글자 ${theme}`, async () => {
      await load('screens-orderdetail--더보기메뉴열림', theme);
      await wait(`${q('[data-slot="dropdown-menu-content"]')}?.getBoundingClientRect().width > 0`);
      await sleep(250); // 등장 애니메이션이 끝난 뒤 잰다.
      const m = await ev(`(() => { ${colorHelpers}
        const panel=${q('[data-slot="dropdown-menu-content"]')}, items=[...panel.querySelectorAll('[role="menuitem"]')];
        const del=items.find(el => el.textContent.trim() === '삭제'), icon=del.querySelector('[data-slot="dropdown-menu-destructive-icon"]');
        const bg=rgb(getComputedStyle(panel).backgroundColor), text=rgb(getComputedStyle(del).color);
        return { items:items.map(el => el.textContent.trim()), icon:!!icon, separators:panel.querySelectorAll('[role="separator"]').length,
          text, bg, contrast:contrast(text,bg), iconColor:rgb(getComputedStyle(icon).stroke), token:token('--status-danger-fg'),
          last:items.at(-1) === del }; })()`);
      assert.deepEqual(m.items, ['주문서 인쇄', '송장 번호 복사', '삭제']); assert.ok(m.icon && m.last); assert.equal(m.separators, 1);
      assert.ok(m.contrast >= 4.5, JSON.stringify(m)); assert.deepEqual(m.text, m.token); assert.deepEqual(m.iconColor, m.text);
      await browser.shot(`detail-menu-${theme}`);
      return m;
    });
    await check(`상세 D2: 삭제 확인은 기본 포커스 취소·확정 채운 danger ${theme}`, async () => {
      await load('screens-orderdetail--삭제확인', theme);
      await wait(`document.activeElement?.textContent === '취소'`, '취소에 포커스');
      await sleep(250);
      const m = await ev(`(() => { ${colorHelpers}
        const dialog=${q('[role="alertdialog"]')}, action=dialog.querySelector('[data-slot="alert-dialog-action"]');
        const fill=rgb(getComputedStyle(action).backgroundColor), label=rgb(getComputedStyle(action).color);
        return { title:dialog.querySelector('[data-slot="alert-dialog-title"]').textContent, focus:document.activeElement.textContent,
          action:action.textContent, filledDanger:same(fill, token('--action-danger-bg')), label:contrast(label, fill),
          buttons:[...dialog.querySelectorAll('button')].map(el => el.textContent) }; })()`);
      assert.equal(m.title, '주문을 삭제하시겠습니까?'); assert.equal(m.focus, '취소');
      assert.equal(m.action, '주문 삭제'); assert.ok(m.filledDanger); assert.ok(m.label >= 4.5);
      assert.deepEqual(m.buttons, ['취소', '주문 삭제']);
      await browser.shot(`detail-confirm-${theme}`);
      return m;
    });

    await check(`대시보드: 타일 4개 한 줄·축약 쉼표·차트·최근 주문 5행 ${theme}`, async () => {
      await load('screens-dashboard--기본', theme);
      const t = await title(); assertTitle(t);
      await wait(`document.querySelectorAll('[data-screen="tiles"] ~ section svg').length >= 2`, '차트 렌더');
      const m = await ev(`(() => { const tiles=[...${q('[data-screen="tiles"]')}.children];
        return { count:tiles.length, tops:[...new Set(tiles.map(el => Math.round(el.getBoundingClientRect().top)))].length,
          values:tiles.map(el => el.querySelector('[data-slot="stat-tile-value"]')?.textContent),
          rows:document.querySelectorAll('[data-slot="data-table-row"]').length,
          overflow:document.querySelector('main')?.scrollWidth > document.querySelector('main')?.clientWidth }; })()`);
      assert.equal(m.count, 4); assert.equal(m.tops, 1, '1440px 에서 타일은 한 줄');
      assert.ok(m.values.includes('3,842만원'), JSON.stringify(m.values)); assert.ok(m.values.includes('1,284건'));
      assert.equal(m.rows, 5); assert.equal(m.overflow, false);
      await browser.shot(`dashboard-${theme}`);
      return { title: t, ...m };
    });
    await check(`Screens 실행 중 콘솔 오류 없음 ${theme}`, () => {
      assert.deepEqual(browser.errors().filter(m => !/Warning:|DevTools|favicon|preload/i.test(m)), []);
    });
  }
} finally {
  writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2)); browser.close();
}
const passed = results.filter(r => r.pass).length;
console.log(`${results.length}개 검사, ${passed}개 통과`);
process.exitCode = passed === results.length ? 0 : 1;
