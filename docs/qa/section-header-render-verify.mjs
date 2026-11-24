// 목표 64(0.6.0 3b) — 섹션 제목 줄(SectionHeader · 규칙 표 S-1~S-11 r1 · Figma 203:8~11).
// 디자인 총괄 자가 점검 목록을 수치로 단정한다: 라이트·다크 × 1440·1024·768·390 ×
//   Components/SectionHeader 추천 조합 · 대시보드(기간 선택 섹션 + 링크·버튼 섹션) · 출고 상세(제목 + 개수)
// 동작 0·1·2·넘침(⋯)·좁은 폭은 같은 파일의 작은 스토리로 본다.
// 실제 크기(deviceScaleFactor 1) 화면을 OUT 에 `<sha>-<테마>-<폭>-<화면>.png` 로 남긴다. 본문이 창보다 길면 창 높이를 늘려 한 장에 담는다.
// 실행: pnpm qa --only section-header-render-verify (서버·출처 확인은 run-all 이 한다).
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, CANVAS } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/section-header';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ windowSize: '1440,900', outDir: OUT });
const { ev, cdp, sleep } = browser;
const { open } = storybook(browser);
const results = [], shots = [];
const THEMES = ['light', 'dark'];
const VIEWPORTS = [[1440, 900], [1024, 768], [768, 1024], [390, 844]];
let sha = 'nosha';
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
  await ev(`document.fonts.load('600 20px "Pretendard Variable"', '오늘 핵심 지표 최근 출고 품목 0123456789')`);
  await ev('document.fonts.ready');
  await ev(`(document.activeElement instanceof HTMLElement) && document.activeElement.blur()`);
  // 웹폰트로 제목 폭이 바뀌면 부품이 다시 잰다(ResizeObserver) — 두 프레임 기다린다.
  await frames(); await frames();
}
async function shot(theme, width, height, screen) {
  // 본문(AppShell main)이 창보다 길면 창 높이를 늘려 섹션 전부를 한 장에 담는다.
  const need = await ev(`(() => { const m = document.querySelector('[data-slot="app-shell-main"]'); return m ? Math.ceil(m.scrollHeight - m.clientHeight) : 0; })()`);
  if (need > 0) { await cdp('Emulation.setDeviceMetricsOverride', { width, height: height + need, deviceScaleFactor: 1, mobile: false }); await frames(); await frames(); }
  const r = await cdp('Page.captureScreenshot', { format: 'png' });
  const file = `${OUT}/${sha}-${theme}-${width}-${screen}.png`;
  writeFileSync(file, Buffer.from(r.data, 'base64'));
  shots.push(file);
  if (need > 0) await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  return file;
}

const HELPERS = `
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgb = color => { ctx.clearRect(0,0,1,1); ctx.fillStyle = color; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data]; };
  const token = name => rgb(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
  const same = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 1);
  const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height }; };
  const visible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' && el.getBoundingClientRect().width > 0;
  const textBox = node => { const r = document.createRange(); r.selectNodeContents(node); const rects = [...r.getClientRects()].filter(x => x.width > 0);
    return rects.length ? { left: Math.min(...rects.map(x => x.left)), right: Math.max(...rects.map(x => x.right)), top: Math.min(...rects.map(x => x.top)), lines: new Set(rects.map(x => Math.round(x.top))).size } : null; };
  const main = document.querySelector('[data-slot="app-shell-main"]');
  const pageHeader = document.querySelector('[data-slot="page-header"]');
  const section = name => {
    const root = document.querySelector('[data-section="' + name + '"]');
    const head = root.querySelector(':scope > [data-slot="section-header-head"]');
    const title = head.querySelector('[data-slot="section-header-title"]');
    const titleText = textBox(title.firstChild);
    const count = head.querySelector('[data-slot="section-header-count"]');
    const desc = head.querySelector('[data-slot="section-header-description"]');
    const content = root.children[1];
    const actionEls = [...head.querySelectorAll('[data-slot="section-header-actions"] a, [data-slot="section-header-actions"] button, [data-slot="section-header-actions"] [role="radiogroup"]')]
      .filter(el => visible(el) && !el.closest('[role="radiogroup"] button') && !(el.matches('button') && el.closest('[role="radiogroup"]')));
    const ts = getComputedStyle(title);
    const actions = actionEls.map(el => ({ ...box(el), name: el.getAttribute('aria-label') ?? el.textContent.trim(),
      role: el.getAttribute('role') ?? el.tagName.toLowerCase(), primary: same(rgb(getComputedStyle(el).backgroundColor), token('--action-primary-bg')) && getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)' }));
    const rs = getComputedStyle(root), hs = getComputedStyle(head);
    return {
      tag: title.tagName.toLowerCase(), titleId: title.id, labelledby: root.getAttribute('aria-labelledby'), sectionTag: root.tagName.toLowerCase(),
      title: box(title), titleLines: titleText?.lines, titleTextRight: titleText?.right,
      font: [ts.fontSize, ts.lineHeight, ts.fontWeight], titleColor: same(rgb(ts.color), token('--text-primary')),
      count: count ? { ...box(count), text: count.textContent, fontSize: getComputedStyle(count).fontSize, weight: getComputedStyle(count).fontWeight,
        numeric: getComputedStyle(count).fontVariantNumeric, secondary: same(rgb(getComputedStyle(count).color), token('--text-secondary')) } : null,
      desc: desc ? { ...box(desc), font: [getComputedStyle(desc).fontSize, getComputedStyle(desc).lineHeight], secondary: same(rgb(getComputedStyle(desc).color), token('--text-secondary')) } : null,
      head: box(head), root: box(root), content: box(content), actions,
      borders: [rs.borderTopWidth, rs.borderBottomWidth, hs.borderTopWidth, hs.borderBottomWidth], shadow: rs.boxShadow,
      link: (() => { const l = [...head.querySelectorAll('[data-slot="section-header-link"]')].find(visible); return l ? { color: same(rgb(getComputedStyle(l).color), token('--text-link')) } : null; })(),
    };
  };
`;
const inPage = body => ev(`(() => { ${HELPERS} ${body} })()`);

// 자가 점검 목록 공통 단정 — 제목·설명·개수 글자, 동작 한 묶음·세로 가운데·간격, 여백, 구분선, 주요 버튼 0.
function assertSection(s, label) {
  assert.equal(s.sectionTag, 'section'); assert.equal(s.labelledby, s.titleId, `${label}: aria-labelledby = 제목 id(S-10)`);
  assert.deepEqual(s.font, ['20px', '28px', '600'], `${label}: 제목 title-sm 20/28 600(S-3)`);
  assert.ok(s.titleColor, `${label}: 제목 text-primary`);
  if (s.desc) {
    assert.deepEqual(s.desc.font, ['14px', '20px'], `${label}: 설명 body-sm 14/20`); assert.ok(s.desc.secondary, `${label}: 설명 text-secondary`);
    near(s.desc.top - s.title.bottom, 4, `${label}: 설명은 제목 아래 4(S-3)`);
  }
  if (s.count) {
    assert.equal(s.count.fontSize, '20px', `${label}: 개수 같은 크기(S-4)`); assert.ok(s.count.secondary, `${label}: 개수 text-secondary`);
    assert.ok(s.count.numeric.includes('tabular-nums'), `${label}: 개수 tabular-nums`);
    near(s.count.left - s.titleTextRight, 8, `${label}: 개수는 제목 옆 8(S-4)`);
  }
  const lineCenter = s.title.top + 14;
  for (const a of s.actions) {
    near((a.top + a.bottom) / 2, lineCenter, `${label}: '${a.name}' 세로 가운데 = 제목 첫 줄(28) 가운데(S-6)`);
    assert.ok(!a.primary, `${label}: 주요 버튼 0(S-5)`);
  }
  if (s.actions.length) {
    const sorted = [...s.actions].sort((x, y) => x.left - y.left);
    for (let i = 1; i < sorted.length; i++) near(sorted[i].left - sorted[i - 1].right, 8, `${label}: 동작 간격 8`);
    near(sorted.at(-1).right, s.head.right, `${label}: 동작 묶음 = 머리 오른끝(SD-1 A)`);
    assert.ok(sorted[0].left - Math.max(s.title.left, s.titleTextRight ?? 0, s.count?.right ?? 0) >= 16 - 0.5, `${label}: 제목과 동작 ≥ 16(S-2)`);
    // 한 줄 — 모든 동작의 세로 가운데가 같다(두 줄로 갈라진 동작 0).
    assert.ok(sorted.every(a => Math.abs((a.top + a.bottom) / 2 - lineCenter) <= 0.5), `${label}: 동작은 한 줄`);
  }
  // 머리 → 내용 12: 머리 = 제목·설명·동작 중 가장 아래.
  const headBottom = Math.max(s.title.bottom, s.desc?.bottom ?? 0, ...s.actions.map(a => a.bottom));
  near(s.content.top - headBottom, 12, `${label}: 머리 → 내용 12(S-7)`);
  assert.deepEqual(s.borders, ['0px', '0px', '0px', '0px'], `${label}: 구분선 없음(S-8)`); assert.equal(s.shadow, 'none');
  return { headToContent: +(s.content.top - headBottom).toFixed(2), actionCenterDelta: s.actions.map(a => +(((a.top + a.bottom) / 2) - lineCenter).toFixed(2)),
    actions: s.actions.map(a => `${a.name} ${a.width.toFixed(0)}×${a.height.toFixed(0)}`), descGap: s.desc ? +(s.desc.top - s.title.bottom).toFixed(2) : null,
    countGap: s.count ? +(s.count.left - s.titleTextRight).toFixed(2) : null };
}

try {
  await open('components-sectionheader--동작없음', { waitPlay: false });
  sha = await ev(`fetch('/build-info.json').then(r => r.ok ? r.json() : {}).then(i => (i.sha ?? 'nosha').slice(0, 7) + (i.dirty ? '-dirty' : '')).catch(() => 'nosha')`);
  for (const theme of THEMES) for (const viewport of VIEWPORTS) {
    const [width, height] = viewport;
    await check(`대시보드 ${theme} ${width}: 글자·동작 한 묶음·세로 가운데·여백 24/32/12·좁은 폭 접힘·이름·가로 스크롤 0`, async () => {
      await load('components-sectionheader--추천조합대시보드', theme, viewport);
      const m = await inPage(`const metrics = section('metrics'), recent = section('recent');
        return { metrics, recent, pageBottom: pageHeader.getBoundingClientRect().bottom, overflowX: main.scrollWidth - main.clientWidth,
          docOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          more: (() => { const b = document.querySelector('[data-section="recent"] [data-slot="section-header-compact"] [data-slot="section-header-more"]'); return b && visible(b) ? box(b) : null; })(),
          csv: [...document.querySelectorAll('[data-section="recent"] [data-slot="section-header-button"]')].some(visible) };`);
      const a = assertSection(m.metrics, '기간 선택 섹션'), b = assertSection(m.recent, '최근 출고 섹션');
      near(m.metrics.title.top - m.pageBottom, 24, '페이지 머리 바로 아래 첫 섹션 위 24(S-7)');
      near(m.recent.title.top - m.metrics.content.bottom, 32, '앞 섹션 끝 → 제목 32(S-7)');
      assert.equal(m.metrics.tag, 'h2'); assert.equal(m.recent.tag, 'h2');
      assert.ok(m.recent.link?.color, '링크형 동작 = text-link');
      // 기간 선택은 들어가면 그대로(390 도).
      assert.deepEqual(m.metrics.actions.map(x => x.name), ['오늘 핵심 지표 조회 기간'], '기간 선택은 접지 않는다');
      if (width >= 480) {
        assert.deepEqual(m.recent.actions.map(x => x.name), ['최근 출고 전체 보기', '최근 출고 CSV 내보내기'], '넓은 폭: 링크 + 버튼 한 묶음');
        assert.equal(m.more, null, '넓은 폭에 ⋯ 없음');
      } else {
        assert.deepEqual(m.recent.actions.map(x => x.name), ['최근 출고 전체 보기', '최근 출고 더 보기'], '좁은 폭: 링크 1개 + ⋯(SD-3 A)');
        assert.ok(!m.csv, 'CSV 는 ⋯ 안으로');
        near(m.more.width, 38, '⋯ 누름 영역 38'); near(m.more.height, 38, '⋯ 누름 영역 38');
      }
      assert.ok(m.overflowX <= 0.5 && m.docOverflowX <= 0.5, `가로 스크롤 0: 본문 ${m.overflowX} · 문서 ${m.docOverflowX}`);
      await shot(theme, width, height, 'dashboard');
      return { metrics: a, recent: b, firstTop: +(m.metrics.title.top - m.pageBottom).toFixed(2), nextTop: +(m.recent.title.top - m.metrics.content.bottom).toFixed(2),
        overflowX: m.overflowX, more: m.more ? `${m.more.width}×${m.more.height}` : null };
    });
    await check(`출고 상세 ${theme} ${width}: 제목 + 개수 8·같은 크기·보조색·고정폭 숫자, 위 24·아래 12`, async () => {
      await load('components-sectionheader--추천조합상세', theme, viewport);
      const m = await inPage(`return { items: section('items'), pageBottom: pageHeader.getBoundingClientRect().bottom, overflowX: main.scrollWidth - main.clientWidth };`);
      const a = assertSection(m.items, '품목 섹션');
      assert.equal(m.items.count.text, '5'); assert.equal(m.items.count.weight, '400');
      assert.deepEqual(m.items.actions, [], '동작 0');
      near(m.items.title.top - m.pageBottom, 24, '페이지 머리 바로 아래 첫 섹션 위 24');
      assert.ok(m.overflowX <= 0.5, `가로 스크롤 0: ${m.overflowX}`);
      await shot(theme, width, height, 'detail');
      return { items: a, firstTop: +(m.items.title.top - m.pageBottom).toFixed(2) };
    });
  }

  await check('동작 0·1·2: 이름에 섹션 이름 · 링크 href · ⋯ 없음', async () => {
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    const zero = await open('components-sectionheader--동작없음'); assert.equal(zero.sbError, null);
    assert.equal(await ev(`document.querySelectorAll('[data-slot="section-header-actions"]').length`), 0);
    await open('components-sectionheader--동작하나');
    assert.equal(await ev(`document.querySelector('a[aria-label="최근 출고 전체 보기"]').getAttribute('href')`), '#shipments');
    await open('components-sectionheader--동작둘');
    const names = await ev(`[...document.querySelectorAll('[data-slot="section-header-full"] > *')].map(el => el.getAttribute('aria-label'))`);
    assert.deepEqual(names, ['최근 출고 전체 보기', '최근 출고 CSV 내보내기']);
    return { names };
  });
  await check('넘침: 둘까지 줄에, 나머지는 ⋯ 메뉴 · h3 · Esc 로 ⋯ 복귀', async () => {
    const r = await open('components-sectionheader--넘침'); assert.equal(r.sbError, null);
    const m = await ev(`(() => { const full = document.querySelector('[data-slot="section-header-full"]');
      return { heading: document.querySelector('[data-slot="section-header-title"]').tagName, inline: [...full.children].map(el => el.getAttribute('aria-label')) }; })()`);
    assert.equal(m.heading, 'H3');
    assert.deepEqual(m.inline, ['최근 출고 전체 보기', '최근 출고 CSV 내보내기', '최근 출고 더 보기']);
    return m;
  });
  await check('좁은 폭 294: 다 들어가면 그대로(기간 선택), 넘치면 링크 1개 + ⋯ · 메뉴에 CSV', async () => {
    await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
    const r = await open('components-sectionheader--좁은폭'); assert.equal(r.sbError, null);
    await frames();
    const m = await inPage(`const metrics = document.querySelector('[data-section="metrics"] [data-slot="section-header-head"]'), recent = document.querySelector('[data-section="recent"] [data-slot="section-header-head"]');
      return { metricsFit: metrics.dataset.fit ?? null, recentFit: recent.dataset.fit, recentWidth: recent.getBoundingClientRect().width,
        visibleNames: [...recent.querySelectorAll('a, button')].filter(visible).map(el => el.getAttribute('aria-label')) };`);
    assert.equal(m.recentFit, 'compact'); assert.deepEqual(m.visibleNames, ['최근 출고 전체 보기', '최근 출고 더 보기']);
    near(m.recentWidth, 294, '그릇 294');
    return m;
  });
  await check('넓어지면 다시 펼친다(그릇 폭을 다시 잰다)', async () => {
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await ev(`void (document.querySelector('[data-section="recent"]').parentElement.style.width = '470px')`);
    await wait(`document.querySelector('[data-section="recent"] [data-slot="section-header-head"]').dataset.fit === 'full'`, '470 그릇에서 다 들어가면 full');
    const names = await inPage(`return [...document.querySelectorAll('[data-section="recent"] [data-slot="section-header-head"] a, [data-section="recent"] [data-slot="section-header-head"] button')].filter(visible).map(el => el.getAttribute('aria-label'));`);
    assert.deepEqual(names, ['최근 출고 전체 보기', '최근 출고 CSV 내보내기']);
    return { names };
  });
  await check('콘솔 오류 0건', async () => assert.deepEqual(browser.errors(), []));
} finally {
  writeFileSync(`${OUT}/results.json`, JSON.stringify({ sha, results, shots }, null, 2));
  browser.close();
}
const failed = results.filter(r => !r.pass);
console.log(`\n검사 ${results.length}건 · 통과 ${results.length - failed.length} · 실패 ${failed.length} · 스크린샷 ${shots.length}장 ${OUT}/${sha}-*.png`);
process.exitCode = failed.length ? 1 : 0;
