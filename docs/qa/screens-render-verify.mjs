// 정식 Screens 스토리(주문 목록·주문 상세 D2·대시보드 · 출고 등록 셸) 검증. 1440×900(셸은 768·390 도), 라이트·다크.
// 2026-11-22 디자인 검토 확정안: 제목 display 34/40·700(T34), 상세 파괴적 액션 D2, 대시보드 타일 줄.
// 0.7.1: 대표 화면 넷의 상단 바 64(Screens/AppHeader 와 같은 묶음)·섹션 제목 줄(SectionHeader).
// 0.7.1 C2(디자인 총괄 손질): 사이드 brand = 지금 제품 이름 · 5행 이하 표 정렬 없음 · 대시보드 추이 차트 좁은 폭 1열.
// 0.7.1 묶음 검수: 사이드 brand 아이콘과 같은 아이콘을 쓰는 메뉴 항목이 없다(출고 등록 Truck 두 번 → '출고 관리' PackageCheck).
// 실행: pnpm qa --only screens-render-verify (서버·출처 확인은 run-all 이 한다).
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, CANVAS } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/screens';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ windowSize: '1440,900', outDir: OUT });
const { ev, cdp, sleep } = browser;
const { open } = storybook(browser);
const results = [];
const q = selector => `document.querySelector(${JSON.stringify(selector)})`;
const close = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 1);
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
// 폭을 바꾼 뒤 ResizeObserver(넘침 판정)가 반영될 두 프레임.
const frames2 = () => ev('new Promise(d => requestAnimationFrame(() => requestAnimationFrame(d)))');

try {
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  for (const theme of ['light', 'dark']) {
    await check(`목록: 제목 T34·툴바 한 줄·검색 폭 320·N건 선택·페이지 범위 ${theme}`, async () => {
      // 0.5.0 목록 툴바: 선택이 있으면 BulkActionBar 가 FilterBar 자리를 대체한다(필터 바는 보이지 않게 남아 높이를 정한다).
      // 필터 0개 + 3건 선택 스토리 — '취소 요청' 행(ORD-20475)이 선택에 들어 있어 아래 칩 대비 검사도 이 화면에서 한다.
      await load('screens-orderlist--필터없음선택됨', theme);
      const t = await title(); assertTitle(t);
      const m = await ev(`(() => { ${colorHelpers}
        const bar=${q('[data-screen="toolbar"]')}, controls=bar.querySelector('[data-slot="filter-bar-controls"]'), control=bar.querySelector('[data-slot="filter-bar-search"]');
        const tops=[...controls.children].map(el => Math.round(el.getBoundingClientRect().top));
        const selected=[...document.querySelectorAll('[data-slot="data-table-row"][data-selected]')];
        const row=selected[0], surface=token('--bg-surface'), rowBg=rgb(getComputedStyle(row.querySelector('td')).backgroundColor);
        // 툴바 아래 간격: Field 밖 DatePicker 의 오류는 입력 아래 20px 에 걸친다(2026-11-22 기준 변경). 툴바에
        // DatePicker 가 있으면 아래 요소까지 20px 이상이어야 한다. 지금 목록의 기간은 필터 칩이라 해당하지 않는다.
        const below={ gap:bar.nextElementSibling.getBoundingClientRect().top - bar.getBoundingClientRect().bottom, datePicker:!!bar.querySelector('[data-slot="date-picker"]') };
        return { tops, below, search:control.getBoundingClientRect().width, barHeight:bar.getBoundingClientRect().height,
          status:${q('[data-slot="bulk-action-bar-count"]')}.textContent, selected:selected.map(r => r.dataset.rowId),
          range:${q('[data-slot="pagination-range"]')}?.textContent, rows:document.querySelectorAll('[data-slot="data-table-row"]').length,
          primary:[...document.querySelectorAll('button, a')].filter(el => same(rgb(getComputedStyle(el).backgroundColor), token('--action-primary-bg'))).map(el => el.textContent.trim()),
          selectedRow:{ background:rowBg, selectedToken:token('--bg-selected-row'), vsSurface:contrast(rowBg, surface) } }; })()`);
      assert.equal(new Set(m.tops).size, 1, `툴바가 한 줄이어야 한다 ${JSON.stringify(m.tops)}`);
      assert.equal(m.search, 320); assert.equal(m.status, '3건 선택');
      if (m.below.datePicker) assert.ok(m.below.gap >= 20, `DatePicker 가 있는 툴바 아래 간격 ${m.below.gap}px < 20`);
      assert.deepEqual(m.selected, ['ORD-20480', 'ORD-20479', 'ORD-20475']);
      assert.equal(m.range, '1–20 / 1,284건'); assert.equal(m.rows, 20);
      assert.deepEqual(m.primary, ['주문 등록'], '주요 버튼은 화면당 하나');
      assert.ok(m.selectedRow.background.every((v, i) => Math.abs(v - m.selectedRow.selectedToken[i]) <= 1), JSON.stringify(m.selectedRow));
      await browser.shot(`list-${theme}`);
      return { title: t, ...m };
    });
    await check(`목록: 선택 행(bg-selected-row)·호버 행·선택 행 위 danger 칩 구별 ${theme}`, async () => {
      // 2026-11-22: 다크 선택 행이 brand-900 와인색이라 '취소 요청' 칩과 같은 계열로 읽혔다. 실제 포인터로 호버 행을 만든다.
      const point = await ev(`(() => { const r=${q('[data-row-id="ORD-20478"] td:nth-child(4)')}.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point }); await sleep(300);
      const m = await ev(`(() => { ${colorHelpers}
        const lab = c => { const [r,g,b]=c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
          const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b), m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b), s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
          return [.2104542553*l+.793617785*m-.0040720468*s, 1.9779984951*l-2.428592205*m+.4505937099*s, .0259040371*l+.7827717662*m-.808675766*s]; };
        const dE = (a,b) => { const x=lab(a), y=lab(b); return Math.hypot(x[0]-y[0],x[1]-y[1],x[2]-y[2])*100; };
        const row=${q('[data-row-id="ORD-20475"]')}, hover=${q('[data-row-id="ORD-20478"]')}, chip=row.querySelector('[data-slot="status-chip"]');
        const bg=el => rgb(getComputedStyle(el.querySelector('td')).backgroundColor);
        const selected=bg(row), hovered=bg(hover), chipBg=rgb(getComputedStyle(chip).backgroundColor);
        const text=rgb(getComputedStyle(row.querySelector('td:nth-child(4)')).color), link=rgb(getComputedStyle(row.querySelector('a')).color);
        return { selectedRowIsSelected:row.hasAttribute('data-selected'), hoverMatches:hover.matches(':hover'), chip:chip.textContent,
          selected, hovered, chipBg, tokenRow:token('--bg-selected-row'), tokenHover:token('--bg-hover'),
          selectedVsHover:{ contrast:contrast(selected,hovered), dE:dE(selected,hovered) },
          chipVsSelected:{ contrast:contrast(chipBg,selected), dE:dE(chipBg,selected) },
          textOnSelected:contrast(text,selected), linkOnSelected:contrast(link,selected) }; })()`);
      assert.ok(m.selectedRowIsSelected && m.hoverMatches, JSON.stringify(m)); assert.equal(m.chip, '취소 요청');
      assert.ok(close(m.selected, m.tokenRow) && close(m.hovered, m.tokenHover), JSON.stringify(m));
      assert.ok(m.textOnSelected >= 4.5 && m.linkOnSelected >= 4.5, JSON.stringify(m));
      if (theme === 'dark') {
        assert.ok(m.selectedVsHover.contrast >= 1.2 && m.selectedVsHover.dE >= 10, JSON.stringify(m.selectedVsHover));
        assert.ok(m.chipVsSelected.contrast >= 1.2 && m.chipVsSelected.dE >= 10, JSON.stringify(m.chipVsSelected));
      }
      await browser.shot(`list-hover-${theme}`);
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 });
      return m;
    });
    await check(`목록: 검색어가 표·전체 건수를 함께 바꾼다 ${theme}`, async () => {
      // 선택 중에는 필터 바가 inert 라 검색할 수 없다(0.5.0 규격). 선택 없는 필터 0개 화면에서 잰다.
      await load('screens-orderlist--필터없음', theme);
      // 제어 입력이라 네이티브 setter + input 이벤트로 React onChange 를 부른다.
      await ev(`(() => { const input=${q('[data-screen="toolbar"] input[type="search"]')};
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'ORD-204'); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
      // ORD-20481 ~ ORD-20400 의 82건이 남는다.
      await wait(`${q('[data-slot="pagination-range"]')}?.textContent === '1–20 / 82건'`, '검색 결과 82건');
      const m = await ev(`({ rows:document.querySelectorAll('[data-slot="data-table-row"]').length,
        status:${q('[data-slot="bulk-action-bar-count"]')}.textContent, clear:!!${q('[aria-label="검색어 지우기"]')} })`);
      assert.deepEqual(m, { rows: 20, status: '', clear: true });
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
    await check(`목록 390: 상태 열 고정 — 첫 화면 오른쪽 끝에 보이고 고정선, 1440 은 선 없음 ${theme}`, async () => {
      // 디자인 검수 2026-11-24 조건: 기준 화면이 상태 열을 고정해야 AI 도 따라 한다(§4.4). 선택 3건 화면에서 잰다.
      const probe = () => ev(`(() => { const root=${q('[data-slot="data-table"]')}, scroll=root.querySelector('[data-slot="data-table-scroll"]');
        const sb=scroll.getBoundingClientRect(), inner=sb.right - scroll.clientLeft - (scroll.offsetWidth - scroll.clientWidth - 2*scroll.clientLeft);
        const head=root.querySelector('[data-slot="data-table-head"][data-column-id="status"]'), cell=root.querySelector('[data-slot="data-table-row"] [data-column-id="status"]');
        const h=head.getBoundingClientRect(), s=getComputedStyle(head);
        return { overflow: scroll.scrollWidth - scroll.clientWidth > 1, flag: root.hasAttribute('data-overflow-x'), pinned: cell.style.position,
          headInside: h.left >= sb.left && h.right <= inner + 1, rightGap: Math.round(inner - h.right),
          edge: s.borderLeftWidth + ' ' + (/rgba\\(\\d+, \\d+, \\d+, 0\\)/.test(s.borderLeftColor) ? 'clear' : 'visible'),
          chip: cell.querySelector('[data-slot="status-chip"]')?.textContent ?? null }; })()`);
      await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
      try {
        await load('screens-orderlist--선택됨', theme);
        await frames2();
        const narrow = await probe();
        assert.ok(narrow.overflow && narrow.flag, `390 은 표가 넘친다 ${JSON.stringify(narrow)}`);
        assert.equal(narrow.pinned, 'sticky'); assert.ok(narrow.headInside, `상태 머리 칸이 스크롤 영역 안 ${JSON.stringify(narrow)}`);
        assert.ok(Math.abs(narrow.rightGap) <= 1, `상태 열이 오른쪽 끝 ${narrow.rightGap}`);
        assert.equal(narrow.edge, '1px visible'); assert.ok(narrow.chip, '상태 칩이 보인다');
        await browser.shot(`orderlist-390-status-pinned-${theme}`);
        await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
        await load('screens-orderlist--선택됨', theme);
        await frames2();
        const wide = await probe();
        assert.ok(!wide.overflow && !wide.flag && wide.edge === '1px clear', `1440 은 넘치지 않고 고정선 없음 ${JSON.stringify(wide)}`);
        return { narrow, wide };
      } finally {
        await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      }
    });

    await check(`대표 화면 넷: 상단 바 64·brand 아래선·brand 아이콘 ≠ 메뉴 아이콘·사용자 메뉴 맨 오른쪽·가로 넘침 0·섹션 제목 줄 (1440·768·390) ${theme}`, async () => {
      // 0.7.1(목표 0.7.1 C): 대표 화면도 Screens/AppHeader 와 같은 상단 바(docs/examples/app-header.tsx appHeader)를 쓰고, 카드 밖 섹션
      // 머리는 손 조립 h2 가 아니라 SectionHeader 다. AI 는 기준 화면을 따라 하므로 빠지면 여기서 막는다.
      // [스토리, 섹션 제목 줄, 사이드 brand(= 전환기 지금 제품), 정렬 버튼 수(null = 보지 않음)]. brand 는 따로 지은 이름이 아니라 지금 제품
      // 이름이다(SideNav brand 는 지금 서비스 이름 표시 전용 — Screens/AppHeader 의 마케팅관리와 같은 규칙, 0.7.1 C2). 품목 3개·최근 5건
      // 표에는 정렬을 달지 않는다(§24.5).
      const SCREENS = [
        ['screens-orderlist--기본', [], '판매관리', null], ['screens-orderdetail--기본', ['주문 상품'], '판매관리', 0],
        ['screens-shipmentcreate--기본', [], '물류관리', null], ['screens-dashboard--기본', ['최근 주문'], '판매관리', 0],
      ];
      const rows = [];
      try {
        for (const [width, height] of [[1440, 900], [768, 1024], [390, 844]]) {
          await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
          for (const [id, sections, product, sorts] of SCREENS) {
            await load(id, theme);
            await frames2();
            const m = await ev(`(() => { const header=${q('[data-slot="app-shell-header"]')}, main=${q('[data-slot="app-shell-main"]')};
              const brand=${q('[data-slot="side-nav-brand"]')}, h=header.getBoundingClientRect();
              // 아이콘 이름 = lucide 가 svg 에 붙이는 lucide-<이름> 클래스(별칭이 있으면 그 클래스도 — 같은 아이콘이면 같은 묶음이다).
              const lucide=el => [...el.querySelectorAll('svg')].flatMap(s => [...s.classList].filter(c => c.startsWith('lucide-')));
              const items=brand ? [...brand.closest('[data-slot="side-nav"]').querySelectorAll('[data-slot="side-nav-item"]')] : [];
              const ends=[...header.querySelectorAll('[data-slot="app-shell-header-end"] button')];
              const right=ends.reduce((a, b) => b.getBoundingClientRect().right > a.getBoundingClientRect().right ? b : a);
              return { header:h.height, headerTop:h.top, brandGap:brand && brand.getBoundingClientRect().height ? brand.getBoundingClientRect().bottom - h.bottom : null,
                rightmost:right.getAttribute('aria-label'), switchers:header.querySelectorAll('[data-slot="context-switcher-group"]').length,
                pageOverflow:document.documentElement.scrollWidth - innerWidth, mainOverflow:main.scrollWidth - main.clientWidth,
                sections:[...main.querySelectorAll('[data-slot="section-header-title"]')].map(el => el.firstChild.textContent),
                looseH2:[...main.querySelectorAll('h2')].filter(el => !el.closest('[data-slot="section-header"]')).length,
                brand:brand?.textContent ?? null, brandIcons:brand ? lucide(brand) : null,
                itemIcons:items.map(el => [el.querySelector('[data-slot="side-nav-item-label"]')?.textContent ?? null, lucide(el)]), product:header.querySelector('[data-slot="context-switcher"][aria-label^="제품: "]')?.getAttribute('aria-label') ?? null,
                sorts:main.querySelectorAll('[data-slot="data-table-sort"]').length }; })()`);
            rows.push({ id, width, ...m });
            // 390 서랍 셸(출고 등록)은 메뉴가 닫혀 brand 가 DOM 에 없다 · 접힌 '맥락' 트리거에는 제품 전환기가 따로 없다.
            if (m.brand !== null) assert.equal(m.brand, product, `${id} ${width} 사이드 brand = 지금 제품`);
            if (m.brandIcons !== null) {
              // 0.7.1 묶음 검수: 출고 등록 brand '물류관리'와 메뉴 '출고 관리'가 둘 다 Truck 이라 한 사이드 메뉴에 같은 아이콘이 두 번
              // 보였다. 메뉴 항목은 brand 아이콘을 쓰지 않는다. 아이콘을 못 찾아 빈 목록끼리 비교해 통과하는 일이 없게 먼저 센다.
              assert.ok(m.brandIcons.length > 0 && m.itemIcons.some(([, icons]) => icons.length > 0),
                `${id} ${width} 사이드 아이콘을 찾지 못함 ${JSON.stringify({ brand: m.brandIcons, items: m.itemIcons })}`);
              const clash = m.itemIcons.filter(([, icons]) => icons.some(c => m.brandIcons.includes(c))).map(([label]) => label);
              assert.deepEqual(clash, [], `${id} ${width} 사이드 brand 아이콘(${m.brandIcons})과 같은 메뉴 항목`);
            }
            if (m.product !== null) assert.equal(m.product, `제품: ${product}`, `${id} ${width} 전환기 지금 제품`);
            if (sorts !== null) assert.equal(m.sorts, sorts, `${id} ${width} 5행 이하 표 정렬 버튼`);
            assert.equal(m.header, 64, `${id} ${width} header 64`);
            if (m.brandGap !== null) assert.equal(m.brandGap, 0, `${id} ${width} brand 아래선`);
            assert.equal(m.rightmost, '김철수, 사용자 메뉴'); assert.equal(m.switchers, 1);
            assert.ok(m.pageOverflow <= 0 && m.mainOverflow <= 0, `${id} ${width} 가로 넘침 ${JSON.stringify(m)}`);
            assert.deepEqual(m.sections, sections, `${id} 섹션 제목 줄`); assert.equal(m.looseH2, 0, `${id} 손 조립 h2`);
            if (id === 'screens-dashboard--기본') {
              // 추이 차트 두 장 — 768 부터 2열, 390 은 1열. 390 에서 2열이면 칸이 139 이하라 축 숫자가 svg 왼쪽 밖으로 나가고
              // 불릿 이름·값이 말줄임됐다(C2 실측). 축·값 글자가 svg 안에 다 들어가고 말줄임이 없는지 본다.
              const t = await ev(`(() => { const sec=${q('[data-screen="trends"]')};
                const charts=[...sec.children].map(el => { const svg=el.querySelector('svg[data-slot="trend-band"], svg[data-slot="bullet-row"]'), b=svg.getBoundingClientRect();
                  const texts=[...svg.querySelectorAll('text')];
                  return { x:Math.round(el.getBoundingClientRect().left), width:el.getBoundingClientRect().width,
                    outside:texts.filter(t => { const r=t.getBoundingClientRect(); return r.left < b.left - 0.5 || r.right > b.right + 0.5; }).map(t => t.textContent),
                    ellipsis:texts.filter(t => [...t.childNodes].some(n => n.nodeType === 3 && n.textContent.includes('…'))).length }; });
                return { columns:new Set(charts.map(c => c.x)).size, charts }; })()`);
              rows.at(-1).trends = t;
              assert.equal(t.columns, width < 768 ? 1 : 2, `대시보드 ${width} 추이 칸 수`);
              for (const c of t.charts) { assert.deepEqual(c.outside, [], `대시보드 ${width} 축·값 글자가 svg 밖`); assert.equal(c.ellipsis, 0, `대시보드 ${width} 말줄임`); }
            }
          }
        }
      } finally {
        await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      }
      return rows;
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
