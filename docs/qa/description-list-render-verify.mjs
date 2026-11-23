// 목표 49 DescriptionList — 디자인 총괄 규칙 표 5절 검수 매트릭스를 픽셀로 단정한다(DESIGN.md §16.7).
//   라이트·다크 × 가로형·두 열(720)·접힘(600)·세로형(320) × 빈 값·긴 값·칩·링크·합계 강조
//   + 카드 폭 경계(640·360) + 주문 상세 교체 뒤 위치.
// 실행은 pnpm qa(또는 pnpm qa --only description-list-render-verify). 매트릭스 스크린샷은 실제 크기(1x)로
// <출력>/<sha7>-<테마>-<배치>.png 에 남긴다 — 어느 빌드를 찍었는지 파일 이름에 남기려고 build-info 의 sha 를 쓴다.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/description-list';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ outDir: OUT });
const { cdp, ev, sleep } = browser;
const { open } = storybook(browser);
const results = [], measurements = [], errors = [];
const THEMES = ['light', 'dark'];
const LIST = '[data-slot="description-list"]';
let sha = 'nosha';

async function wait(expression) {
  const deadline = Date.now() + 6000;
  while (Date.now() < deadline) { if (await ev(expression)) return; await sleep(30); }
  throw new Error(`조건 대기 실패: ${expression}`);
}
async function story(name, theme = 'light', { prefix = 'components-descriptionlist', waitPlay = false } = {}) {
  errors.push(...browser.errors());
  const result = await open(`${prefix}--${name}`, { waitPlay });
  assert.equal(result.sbError, null); assert.deepEqual(result.errors, []);
  await wait(`!!document.querySelector(${JSON.stringify(LIST)})`);
  await ev(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
  await ev('document.fonts.ready');
  // 테마 속성이 바뀐 뒤 스타일·레이아웃이 반영되도록 두 프레임을 기다린다.
  await ev('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
}
async function check(label, run) {
  try { const m = await run(); if (m !== undefined) measurements.push({ label, ...m }); results.push({ label, pass: true }); console.log(`✓ ${label}`); }
  catch (error) { results.push({ label, pass: false, error: error.message }); console.error(`✗ ${label}: ${error.message}`); await browser.shot(`failure-${results.length}`); }
}
const near = (actual, expected, message, tolerance = 0.5) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} ≠ ${expected}`);

// 페이지 안 도우미 — 사각형·토큰 색·대비·기준선. 기준선은 높이 0 인 inline-block 을 줄 맨 앞에 넣어 그 위치로 잰다.
const HELPERS = `
  const rect = el => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom }; };
  const token = name => { const p = document.createElement('span'); p.style.color = 'var(' + name + ')'; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; };
  const lum = c => { const v = c.match(/[\\d.]+/g).slice(0, 3).map(Number).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4); return v[0] * .2126 + v[1] * .7152 + v[2] * .0722; };
  const contrast = (fg, bg) => { const a = lum(fg), b = lum(bg); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
  const baseline = el => { const m = document.createElement('span'); m.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'; el.prepend(m); const y = m.getBoundingClientRect().top; m.remove(); return y; };
  const pairs = list => [...list.querySelectorAll(':scope > dl > [data-slot="description-list-item"]')];
  const firstText = dd => dd.querySelector('[data-slot="status-chip"] > span:last-child') ?? dd.querySelector('a') ?? dd.querySelector('span:not([aria-hidden]):not(.sr-only)') ?? dd;
  const geometry = list => { const l = rect(list); return pairs(list).map(p => { const dt = p.querySelector('dt'), dd = p.querySelector('dd'); const s = getComputedStyle(p);
    return { label: dt.textContent, pair: rect(p), dt: rect(dt), dd: rect(dd), list: l, dtBase: baseline(dt), ddBase: baseline(firstText(dd)),
      borderTop: s.borderTopWidth + ' ' + s.borderTopStyle + ' ' + s.borderTopColor, paddingTop: s.paddingTop }; }); };
`;
const inPage = body => ev(`(() => { ${HELPERS} ${body} })()`);

// 검수 D1 합격 기준: 모든 쌍의 라벨 글자 기준선과 값 글자 기준선(칩 안 글자·링크 글자 포함) 차이 0~1px,
// 한 줄 쌍은 모두 24px 이고 라벨 기준선이 행 위에서 같은 거리(= 쌍 피치 32px 가 칩·버튼 줄을 포함해 같다).
function rhythm(rows, context) {
  const out = rows.map((p, i) => ({ label: p.label, top: +(p.pair.y - p.list.y).toFixed(2), h: +p.pair.h.toFixed(2),
    labelBaseline: +(p.dtBase - p.pair.y).toFixed(2), valueMinusLabel: +(p.ddBase - p.dtBase).toFixed(2),
    pitch: i ? +(p.dtBase - rows[i - 1].dtBase).toFixed(2) : null }));
  for (const r of out) assert.ok(Math.abs(r.valueMinusLabel) <= 1, `${context} ${r.label} 라벨·값 기준선 차이 ${r.valueMinusLabel}`);
  return out;
}
// 측정 예시 6쌍의 순서. 두 열에서는 앞 3개가 왼쪽 열, 뒤 3개가 오른쪽 열이다(위→아래, 가로 지그재그 금지).
const ORDER = ['주문번호', '주문 상태', '주문자', '연락처', '배송지', '메모'];

async function frameShot(theme, name, selector) {
  const clip = await ev(`(() => { const b = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
    return { x: Math.floor(b.x + scrollX), y: Math.floor(b.y + scrollY), width: Math.ceil(b.width), height: Math.ceil(b.height), scale: 1 }; })()`);
  // 연속 clip 캡처가 앞 프레임을 찍는 일을 피하려 캡처마다 두 프레임 기다린다.
  await ev('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
  const shot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip });
  const file = `${OUT}/${sha}-${theme}-${name}.png`;
  writeFileSync(file, Buffer.from(shot.data, 'base64'));
  return file;
}

try {
  await story('가로형');
  sha = (await ev(`fetch('/build-info.json').then(r => r.ok ? r.json() : {}).then(i => (i.sha ?? 'nosha').slice(0, 7) + (i.dirty ? '-dirty' : '')).catch(() => 'nosha')`));

  for (const theme of THEMES) {
    await check(`가로형 720 ${theme}: 라벨 88px·값 시작 112px·간격 24/8·모든 행 24px·라벨=값 글자 기준선(칩·링크)·피치 32`, async () => {
      await story('가로형', theme);
      const g = await inPage(`return geometry(document.querySelector(${JSON.stringify(LIST)}));`);
      assert.deepEqual(g.map(p => p.label), ORDER);
      near(g[0].list.w, 720 - 34, '카드 본문 폭(카드 720 - 경계 2 - 여백 32)');
      for (const [i, p] of g.entries()) {
        near(p.dt.x - p.list.x, 0, `${p.label} 라벨 시작`); near(p.dt.w, 88, `${p.label} 라벨 열 5.5rem`);
        near(p.dd.x - p.list.x, 112, `${p.label} 값 시작 = 88 + 24`);
        if (i > 0) near(p.pair.y - g[i - 1].pair.b, 8, `${p.label} 쌍 사이 8px`);
      }
      const r = rhythm(g, `가로형 ${theme}`);
      // 버튼(32)·칩(24) 줄도 24px 행이다. 글자 줄은 위아래 2px, 라벨 기준선은 모든 줄에서 같은 높이 → 피치 32.
      for (const row of r) near(row.h, 24, `${row.label} 행 24px(칩·버튼 줄 포함)`);
      for (const row of r) near(row.labelBaseline, r[2].labelBaseline, `${row.label} 라벨 기준선 높이`, 1);
      for (const row of r.slice(1)) near(row.pitch, 32, `${row.label} 쌍 피치`, 1);
      near(g[2].dt.y - g[2].pair.y, 2, '글자 줄 위 여백 2px');
      return { theme, rhythm: r, columns: g.map(p => ({ label: p.label, dtX: p.dt.x - p.list.x, ddX: p.dd.x - p.list.x })) };
    });
    await check(`글자·색·대비 ${theme}: 라벨 secondary·값 primary·빈 값 tertiary·링크 밑줄, body-sm 14/20·400`, async () => {
      await story('가로형', theme);
      const m = await inPage(`const list = document.querySelector(${JSON.stringify(LIST)}), p = pairs(list), card = list.closest('[data-slot="card"]');
        const bg = getComputedStyle(card).backgroundColor, dt = p[2].querySelector('dt'), dd = p[2].querySelector('dd');
        const empty = p[5].querySelector('[data-slot="description-list-empty"]'), dash = empty.querySelector('[aria-hidden="true"]'), link = p[0].querySelector('a');
        const s = el => getComputedStyle(el);
        return { bg, label: s(dt).color, value: s(dd).color, secondary: token('--text-secondary'), primary: token('--text-primary'),
          emptyColor: s(empty).color, tertiary: token('--text-tertiary'), dash: dash.textContent, srText: empty.querySelector('.sr-only').textContent,
          linkColor: s(link).color, linkToken: token('--text-link'), underline: s(link).textDecorationLine,
          font: [s(dt).fontSize, s(dt).lineHeight, s(dt).fontWeight, s(dd).fontSize, s(dd).lineHeight, s(dd).fontWeight],
          labelContrast: contrast(s(dt).color, bg), valueContrast: contrast(s(dd).color, bg), emptyContrast: contrast(s(empty).color, bg),
          linkContrast: contrast(s(link).color, bg), colon: p.some(x => x.querySelector('dt').textContent.trim().endsWith(':')) };`);
      assert.equal(m.label, m.secondary); assert.equal(m.value, m.primary); assert.equal(m.emptyColor, m.tertiary);
      assert.equal(m.linkColor, m.linkToken); assert.equal(m.underline, 'underline');
      assert.deepEqual(m.font, ['14px', '20px', '400', '14px', '20px', '400']);
      assert.equal(m.dash, '—'); assert.equal(m.srText, '없음'); assert.equal(m.colon, false, '라벨 끝 콜론 없음');
      assert.ok(m.labelContrast >= 4.5 && m.valueContrast >= 4.5 && m.linkContrast >= 4.5, JSON.stringify(m));
      // 빈 값 표시는 장식(aria-hidden)이고 의미는 "없음"이 전한다. 그래도 비텍스트 하한 3:1 은 넘어야 보인다.
      assert.ok(m.emptyContrast >= 3, `빈 값 대비 ${m.emptyContrast}`);
      return { theme, ...m };
    });
  }

  await check('접근성: dl·dt·dd 구조, 쌍마다 div, 빈 값은 "없음"으로만 읽힌다', async () => {
    await story('가로형');
    const m = await inPage(`const list = document.querySelector(${JSON.stringify(LIST)}), dl = list.firstElementChild;
      return { tag: dl.tagName, children: [...dl.children].map(c => c.tagName + '>' + [...c.children].map(x => x.tagName).join('+')),
        empty: pairs(list)[5].querySelector('dd').textContent };`);
    assert.equal(m.tag, 'DL'); assert.deepEqual(m.children, Array(6).fill('DIV>DT+DD'));
    assert.equal(m.empty, '—없음');
    const tree = await cdp('Accessibility.getFullAXTree');
    const names = tree.nodes.filter(n => !n.ignored && n.role?.value === 'StaticText').map(n => n.name?.value);
    assert.ok(names.includes('없음'), '화면 낭독기에 "없음"'); assert.ok(!names.includes('—'), '줄표는 읽히지 않는다');
    return m;
  });

  for (const theme of THEMES) {
    await check(`두 열 720 ${theme}: 카드 640 이상 — 왼쪽 열 위→아래 다음 오른쪽 열, 열 간격 24, 같은 줄 위·라벨 기준선 맞춤`, async () => {
      await story('두열', theme);
      const g = await inPage(`return geometry(document.querySelector(${JSON.stringify(LIST)}));`);
      assert.deepEqual(g.map(p => p.label), ORDER, 'DOM·읽는 순서는 그대로');
      const left = g.slice(0, 3), right = g.slice(3);
      for (const p of left) near(p.dt.x - p.list.x, 0, `${p.label} 왼쪽 열`);
      const valueWidth = left[0].dd.w;
      for (const p of right) near(p.dt.x - p.list.x, 88 + 24 + valueWidth + 24, `${p.label} 오른쪽 열 라벨`);
      for (const p of g) near(p.dd.w, valueWidth, `${p.label} 값 열 폭 같음`);
      for (let i = 0; i < 3; i++) near(left[i].pair.y, right[i].pair.y, `${i + 1}행 위 맞춤`);
      // 2행: 배송지(오른쪽, 두 줄)가 길어도 옆 주문 상태 쌍은 늘어나지 않는다.
      near(left[1].pair.h, 24, '옆 쌍 높이로 늘어나지 않음');
      const rl = rhythm(left, `두 열 왼쪽 ${theme}`), rr = rhythm(right, `두 열 오른쪽 ${theme}`);
      // 같은 줄의 두 라벨은 기준선이 같다(버튼 줄·칩 줄 옆 글자 줄). 1→2행 피치는 32(둘 다 한 줄).
      for (let i = 0; i < 3; i++) near(left[i].dtBase, right[i].dtBase, `${i + 1}행 왼쪽·오른쪽 라벨 기준선`, 1);
      near(rl[1].pitch, 32, '1→2행 피치', 1); near(rr[1].pitch, 32, '1→2행 피치(오른쪽)', 1);
      return { theme, valueWidth, rightLabelX: right[0].dt.x - right[0].list.x, left: rl, right: rr };
    });
    await check(`접힘 600 ${theme}: columns=2 여도 카드 640 미만은 한 열 가로형·기준선·피치 32`, async () => {
      await story('접힘', theme);
      const g = await inPage(`return geometry(document.querySelector(${JSON.stringify(LIST)}));`);
      near(g[0].list.w, 600 - 34, '카드 본문 폭');
      for (const [i, p] of g.entries()) { near(p.dt.x - p.list.x, 0, `${p.label} 한 열`); near(p.dd.x - p.list.x, 112, `${p.label} 값 시작`);
        if (i > 0) near(p.pair.y - g[i - 1].pair.b, 8, `${p.label} 쌍 사이`); }
      const r = rhythm(g, `접힘 ${theme}`);
      for (const row of r) near(row.h, 24, `${row.label} 행 24px`);
      for (const row of r.slice(1)) near(row.pitch, 32, `${row.label} 쌍 피치`, 1);
      return { theme, rhythm: r };
    });
    await check(`세로형 320 ${theme}: 카드 360 미만 — 라벨 위·값 아래 4px·쌍 사이 12px·긴 주소 줄바꿈(말줄임 없음)`, async () => {
      await story('세로형', theme);
      const g = await inPage(`return geometry(document.querySelector(${JSON.stringify(LIST)}));`);
      const wrap = await inPage(`const dd = pairs(document.querySelector(${JSON.stringify(LIST)}))[4].querySelector('dd'), s = getComputedStyle(dd);
        return { h: dd.getBoundingClientRect().height, scroll: dd.scrollWidth, client: dd.clientWidth, overflow: s.textOverflow, white: s.whiteSpace };`);
      for (const [i, p] of g.entries()) {
        near(p.dt.x, p.dd.x, `${p.label} 라벨·값 같은 시작`); near(p.dt.w, p.list.w, `${p.label} 라벨 전체 폭`);
        near(p.dd.y - p.dt.b, 4, `${p.label} 라벨–값 4px`);
        if (i > 0) near(p.pair.y - g[i - 1].pair.b, 12, `${p.label} 쌍 사이 12px`);
      }
      assert.ok(wrap.h >= 40, `긴 주소 두 줄 이상: ${wrap.h}`); assert.ok(wrap.scroll <= wrap.client + 1, '가로 넘침 없음');
      assert.notEqual(wrap.overflow, 'ellipsis'); assert.equal(wrap.white, 'normal');
      return { theme, wrap, rows: g.map(p => [p.label, Math.round(p.pair.y - p.list.y), p.pair.h]) };
    });
    await check(`합계 ${theme}: align=end 값 끝 정렬·고정폭 숫자, 마지막 쌍 600·위 구분선 1px border-subtle·위 여백 8px, 접지 않음`, async () => {
      await story('합계', theme);
      const g = await inPage(`return geometry(document.querySelector(${JSON.stringify(LIST)}));`);
      const m = await inPage(`const list = document.querySelector(${JSON.stringify(LIST)}), p = pairs(list), s = el => getComputedStyle(el);
        const text = dd => { const r = document.createRange(); r.selectNodeContents(dd); return r.getBoundingClientRect(); };
        return { ends: p.map(x => text(x.querySelector('dd')).right), listRight: list.getBoundingClientRect().right, align: s(p[0].querySelector('dd')).textAlign,
          numeric: s(p[0].querySelector('dd')).fontVariantNumeric, weights: p.map(x => [s(x.querySelector('dt')).fontWeight, s(x.querySelector('dd')).fontWeight]),
          emphasisLabel: s(p[2].querySelector('dt')).color, primary: token('--text-primary'), subtle: token('--border-subtle'), container: s(list).containerType };`);
      for (const end of m.ends) near(end, m.listRight, '값 끝이 묶음 끝에 맞음');
      assert.equal(m.align, 'end'); assert.match(m.numeric, /tabular-nums/);
      assert.deepEqual(m.weights, [['400', '400'], ['400', '400'], ['600', '600']]);
      assert.equal(m.emphasisLabel, m.primary);
      assert.equal(g[2].borderTop, `1px solid ${m.subtle}`); assert.equal(g[2].paddingTop, '8px');
      near(g[2].dt.y - g[2].pair.y, 9, '구분선 1 + 위 여백 8');
      near(g[2].pair.y - g[1].pair.b, 8, '강조 쌍 앞 간격 8');
      for (const p of g) near(p.dd.y, p.dt.y, `${p.label} 320 카드에서도 가로형`, 1);
      assert.equal(m.container, 'normal', '한 열 합계는 크기 격리 없음(내용 폭으로 붙일 수 있게)');
      return { theme, ...m, rows: g.map(p => [p.label, Math.round(p.pair.y - p.list.y), p.pair.h]) };
    });
  }

  await check('카드 폭 경계: 두 열은 카드 640부터(639 는 한 열), 세로형은 카드 360 미만(360 은 가로형)', async () => {
    await story('두열');
    const at = width => inPage(`const card = document.querySelector('[data-slot="card"]'); card.style.width = '${width}px';
      const g = geometry(card.querySelector(${JSON.stringify(LIST)})); return { width: g[0].list.w, columns: new Set(g.map(p => Math.round(p.dt.x))).size, vertical: g[0].dd.y > g[0].dt.y + 1 };`);
    const rows = {};
    for (const width of [640, 639, 361, 360, 359]) { rows[width] = await at(width); await ev('new Promise(r => requestAnimationFrame(r))'); rows[width] = await at(width); }
    assert.deepEqual([rows[640].columns, rows[639].columns], [2, 1]);
    assert.equal(rows[360].vertical, false); assert.equal(rows[359].vertical, true);
    near(rows[640].width, 606, '카드 640 = 본문 606'); near(rows[360].width, 326, '카드 360 = 본문 326');
    return rows;
  });

  await check('라벨 폭 고정: labelWidth=6 이면 카드 세 장의 값 시작선이 같다(96 + 24)', async () => {
    await story('라벨폭고정');
    const m = await inPage(`return [...document.querySelectorAll(${JSON.stringify(LIST)})].map(list => geometry(list).map(p => [Math.round(p.dt.w * 10) / 10, Math.round((p.dd.x - p.list.x) * 10) / 10]));`);
    for (const card of m) for (const [w, x] of card) { near(w, 96, '라벨 6rem'); near(x, 120, '값 시작 96 + 24'); }
    return { cards: m };
  });

  await check('경계값: 10rem 넘는 라벨은 줄바꿈, 0 은 값, 공백·null 은 빈 값, 외부 링크 밑줄, 식별자 한 줄', async () => {
    await story('경계값');
    const m = await inPage(`const p = pairs(document.querySelector(${JSON.stringify(LIST)}));
      return { labelW: p[0].querySelector('dt').getBoundingClientRect().width, labelH: p[0].querySelector('dt').getBoundingClientRect().height,
        zero: p[1].querySelector('dd').textContent, blanks: [p[2], p[3]].map(x => !!x.querySelector('[data-slot="description-list-empty"]')),
        zeroEmpty: !!p[1].querySelector('[data-slot="description-list-empty"]'), link: getComputedStyle(p[4].querySelector('a')).textDecorationLine,
        icon: !!p[4].querySelector('a svg'), idH: p[5].querySelector('dd').getBoundingClientRect().height,
        dtBase: baseline(p[0].querySelector('dt')), ddBase: baseline(p[0].querySelector('dd')) };`);
    near(m.labelW, 160, '라벨 최대 10rem'); assert.ok(m.labelH >= 40, `라벨 줄바꿈 ${m.labelH}`);
    near(m.dtBase, m.ddBase, '여러 줄 라벨도 첫 줄 기준선', 0.6);
    assert.equal(m.zero, '0'); assert.equal(m.zeroEmpty, false); assert.deepEqual(m.blanks, [true, true]);
    assert.equal(m.link, 'underline'); assert.equal(m.icon, true); near(m.idH, 20, '송장번호 한 줄');
    return m;
  });

  for (const theme of THEMES) {
    await check(`주문 상세 교체 ${theme}: 카드 세 장 가로형·라벨 88·값 112·행 간격 32 유지, 합계는 끝 정렬·강조`, async () => {
      await story('기본', theme, { prefix: 'screens-orderdetail', waitPlay: true });
      const m = await inPage(`const lists = [...document.querySelectorAll(${JSON.stringify(LIST)})];
        return { cards: lists.slice(0, 3).map(list => { const card = rect(list.closest('[data-slot="card"]')); return { card, rows: geometry(list) }; }),
          totals: geometry(lists[3]), section: rect(document.querySelector('section[aria-labelledby="order-items"]')) };`);
      assert.equal(m.cards.length, 3);
      for (const { card, rows } of m.cards) {
        near(rows[0].list.w, card.w - 34, '카드 본문 폭'); assert.ok(rows[0].list.w >= 326, `세로형으로 접히지 않는다 ${rows[0].list.w}`);
        for (const [i, p] of rows.entries()) {
          near(p.dt.x - card.x, 17, `${p.label} 라벨 x(손 조합과 같음)`); near(p.dt.w, 88, `${p.label} 라벨 88`);
          near(p.dd.x - card.x, 129, `${p.label} 값 x(17 + 88 + 24)`);
          if (i === 0) { near(p.pair.y - card.y, 51, '첫 쌍 y(손 조합과 같음)'); near(p.dt.y - p.pair.y, 2, '글자는 행 위 2px — 손 조합(행간 24)과 같은 글자 위치'); }
          else near(p.pair.y - rows[i - 1].pair.b, 8, `${p.label} 쌍 사이 8`);
        }
      }
      // 결제 카드의 결제 금액은 합계 강조다(구분선 + 위 여백 8).
      const pay = m.cards[2].rows; assert.ok(pay[3].borderTop.startsWith('1px solid')); near(pay[3].dt.y - pay[3].pair.y, 9, '결제 금액 강조');
      const totals = m.totals;
      for (const p of totals) { near(p.dd.r, m.section.r, `${p.label} 값 끝 = 표 끝`); near(p.dd.x - p.dt.r, 24, `${p.label} 라벨–값 24`); }
      near(totals[1].pair.y - totals[0].pair.b, 8, '합계 쌍 사이 8'); assert.ok(totals[2].borderTop.startsWith('1px solid'));
      return { theme, cards: m.cards.map(c => ({ card: c.card, rows: c.rows.map(p => [p.label, Math.round(p.pair.y - c.card.y), p.pair.h]) })),
        totals: totals.map(p => [p.label, Math.round(p.dt.x), Math.round(p.dd.r), Math.round(p.pair.y - m.section.y)]) };
    });
  }

  for (const theme of THEMES) {
    await check(`검수 매트릭스 스크린샷 ${theme}: 실제 크기 1x, 배치별 한 장 + 전체`, async () => {
      await story(theme === 'dark' ? '다크' : '검수매트릭스', theme);
      const files = [];
      const titles = await ev(`[...document.querySelectorAll('[data-matrix] > [data-slot="card"]')].map(c => c.dataset.frame + ':' + c.querySelector('h3').textContent)`);
      assert.equal(titles.length, 5);
      for (const [i, entry] of titles.entries()) {
        const name = entry.split(':')[1].replace(/\s+/g, '-');
        files.push(await frameShot(theme, `${i + 1}-${name}`, `[data-matrix] > [data-slot="card"]:nth-child(${i + 1})`));
      }
      files.push(await frameShot(theme, '0-전체', '[data-matrix]'));
      await story('기본', theme, { prefix: 'screens-orderdetail', waitPlay: true });
      files.push(await frameShot(theme, '9-주문상세', 'main'));
      return { theme, files };
    });
  }

  await check('Primary·다크 스토리 렌더와 전 경로 콘솔 오류 0건', async () => {
    await story('사용법'); assert.equal(await ev(`document.querySelectorAll(${JSON.stringify(LIST)}).length`), 1);
    errors.push(...browser.errors()); assert.deepEqual(errors, []);
  });
} finally {
  writeFileSync(`${OUT}/results.json`, JSON.stringify({ sha, results, measurements, errors }, null, 2));
  browser.close();
}
const failed = results.filter(r => !r.pass).length;
console.log(`\n${results.length}건 검사 · ${results.length - failed}건 통과 · ${failed}건 실패 · 스크린샷 ${OUT}/${sha}-*.png`);
if (failed) process.exitCode = 1;
