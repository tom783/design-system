// 상단 바(목표 75) — 1단계: AppShell header 64 고정 · 사용자 메뉴 · 알림 토스트 · 권한 없음/찾을 수 없음.
// 2단계: 맥락 전환기(ContextSwitcher·묶음) · 알림 센터(벨 + 패널) · 개수 표식(CountBadge) — 진짜 Tab/Esc 초점 복귀와 낭독(role·aria-live·이름).
// 규격: 상단 바 규칙 표 r1 0절(P1~P10)·1~8절 · Figma 03 확정 223:740 · 223:1766 · 223:1923 · 223:977 · 223:2044 · 216:1216 · 211:10253~5.
//
// 라이트·다크 × 1440·1024·768·390 마다 Screens/AppHeader 스토리를 열고 잰다. 캡처는 OUT 에 실제 크기로 남는다.
//   - 헤더: 높이 64 · SideNav brand 행 아래끝과 차이 0 · 좌우 패딩 24/16 · 벨·사용자 메뉴 38(1024 미만 44) · 가로 넘침 0
//   - 사용자 메뉴: 진짜 Tab 으로 트리거 → Enter 열림(aria-expanded) → 화살표 이동 → Esc 닫힘·트리거로 초점 복귀 · 폭 240~320 · 항목 38
//   - 알림 토스트: status 낭독·aria-live polite · 폼 하단 고정 줄 위 16 · 같은 묶음 건수 갱신·하나 · 저장 결과와 겹치면 알림이 위
//   - State page: 상단 바 아래선 → 아이콘 96 · 최대 폭 480 · 아이콘 40 · 제목 h1 17/24 600 · role=status · 행동 높이
//   - 글자 대비 4.5:1(라이트·다크) — 새로 생긴 조합(고정 알림 위 이동 링크 등)을 실제 계산 색으로 잰다
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, storybookBase, actions, CANVAS } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/top-bar';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ outDir: OUT });
const { cdp, ev, sleep } = browser;
const { open } = storybook(browser);
const act = actions(browser);
const results = [];
const measures = [];

const index = await (await fetch(`${await storybookBase()}/index.json`)).json();
const ids = Object.fromEntries(Object.values(index.entries).filter(e => e.type === 'story' && e.title === 'Screens/AppHeader')
  .map(e => [e.name, e.id]));
for (const name of ['헤더', '헤더 선택실패', '사용자메뉴', '사용자메뉴 긴이름', '알림토스트 일반', '알림토스트 고정', '알림토스트 묶음', '알림토스트 겹침', '권한없음', '찾을수없음']) {
  assert.ok(ids[name], `Screens/AppHeader 스토리 '${name}' 가 없다 — ${Object.keys(ids).join(', ')}`);
}
const componentId = (title, name) => {
  const entry = Object.values(index.entries).find(e => e.type === 'story' && e.title === title && e.name === name);
  assert.ok(entry, `${title} 스토리 '${name}' 가 없다`);
  return entry.id;
};
const PENDING = componentId('Components/ContextSwitcher', '선택진행중');
const RAIL = componentId('Components/CountBadge', '점 접힌레일');

const q = selector => `${CANVAS}.querySelector(${JSON.stringify(selector)})`;
async function wait(expression, label = expression, timeout = 6000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await ev(expression).catch(() => false)) return;
    await sleep(25);
  }
  throw new Error(`조건 대기 실패: ${label}`);
}
async function check(label, run) {
  try { const m = await run(); results.push({ label, pass: true }); if (m) measures.push({ label, ...m });
    console.log(`✓ ${label}${m ? ` — ${JSON.stringify(m)}` : ''}`); }
  catch (error) {
    results.push({ label, pass: false, error: error.message }); console.error(`✗ ${label}: ${error.message}`);
    await browser.shot(`failure-${results.length}`);
  }
}
async function viewport(width) {
  await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
}
const frames = () => ev('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))');
async function story(name, theme, { waitPlay = true } = {}) {
  const rendered = await open(ids[name], { extra: `&globals=theme:${theme}`, waitPlay });
  assert.equal(rendered.sbError, null, `${name}: Storybook 오류`);
  assert.deepEqual(rendered.errors, [], `${name}: 콘솔 오류`);
  await wait(`document.documentElement.dataset.theme === ${JSON.stringify(theme)} && !!${q('[data-slot="app-shell-header"]')}`, `${name} 렌더`);
  await ev('document.fonts.ready.then(() => true)');
  await frames();
}
async function openStory(id, theme, { waitPlay = true } = {}) {
  const rendered = await open(id, { extra: `&globals=theme:${theme}`, waitPlay });
  assert.equal(rendered.sbError, null, `${id}: Storybook 오류`);
  assert.deepEqual(rendered.errors, [], `${id}: 콘솔 오류`);
  await ev('document.fonts.ready.then(() => true)');
  await frames();
}
// 낭독 — 브라우저가 계산한 접근성 트리의 역할·이름·속성(aria-live 등)을 CDP 로 읽는다. 문서 전역에서 유일한 선택자를 쓴다.
await cdp('Accessibility.enable');
async function ax(selector) {
  const { root } = await cdp('DOM.getDocument', { depth: 0 });
  const { nodeId } = await cdp('DOM.querySelector', { nodeId: root.nodeId, selector });
  if (!nodeId) throw new Error(`접근성 대상 없음: ${selector}`);
  const { nodes } = await cdp('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
  const node = nodes[0];
  const prop = name => node.properties?.find(item => item.name === name)?.value?.value;
  return { role: node.role?.value, name: node.name?.value ?? '', live: prop('live'), expanded: prop('expanded'), busy: prop('busy'), focusable: prop('focusable') };
}
/** 진짜 Tab 으로 도착 — 바로 앞 초점 자리(문서 순서)에 초점을 두고 Tab 을 누른다. 프로그램 focus() 로 대신하지 않는다. */
async function tabInto(target, label) {
  const ok = await ev(`(() => { const target = ${target};
    const all = [...document.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter(el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden');
    const at = all.indexOf(target); if (at < 1) return false; all[at - 1].focus(); return true; })()`);
  assert.ok(ok, `${label}: 앞 초점 자리를 찾지 못했다`);
  await act.key('Tab');
  await wait(`document.activeElement === ${target}`, `${label}: 진짜 Tab 으로 도착`);
  // 앞 자리(접힌 레일 항목 등)의 툴팁은 떠난 뒤 120ms 에 닫힌다 — 캡처에 남지 않게 기다린다. 도착한 자리의 툴팁은 그대로 둔다.
  await wait(`[...document.querySelectorAll('[role="tooltip"]')].filter(t => t.matches(':popover-open'))
    .every(t => (${target}.getAttribute('aria-describedby') ?? '').split(' ').includes(t.id))`, `${label}: 앞 자리 툴팁 닫힘`);
}
const settled = selector => wait(`[...document.querySelectorAll(${JSON.stringify(selector)})].every(n => n.getAnimations().every(a => a.playState === 'finished'))`, `${selector} 정착`);
const activeLabel = () => ev(`document.activeElement?.dataset?.label ?? document.activeElement?.textContent?.trim()`);
async function settleToasts() {
  await wait(`[...document.querySelectorAll('[data-sonner-toast]')].every(t => t.dataset.mounted === 'true' && t.getAnimations().every(a => a.playState === 'finished'))`, '토스트 정착');
  await sleep(60); await frames();
}
async function capture(file) {
  const r = await cdp('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${file}.png`, Buffer.from(r.data, 'base64'));
}

// 페이지 안 도우미 — 대비(계산 색을 캔버스로 sRGB 로 바꿔 WCAG 공식), 가로 넘침.
const helpers = `(() => {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgba = color => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data]; };
  const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const background = el => { for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor;
    const v = rgba(c); if (v[3] === 255 && c !== 'rgba(0, 0, 0, 0)') return v; } return rgba(getComputedStyle(document.body).backgroundColor); };
  window.__contrast = el => { const a = lum(rgba(getComputedStyle(el).color)), b = lum(background(el));
    return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100; };
  window.__overflow = () => { const main = document.querySelector('[data-slot="app-shell-main"]'), header = document.querySelector('[data-slot="app-shell-header"]');
    return Math.max(document.documentElement.scrollWidth - innerWidth, main ? main.scrollWidth - main.clientWidth : 0, header ? header.scrollWidth - header.clientWidth : 0); };
  return true; })()`;

const WIDTHS = [1440, 1024, 768, 390];
try {
  for (const theme of ['light', 'dark']) {
    for (const width of WIDTHS) {
      await viewport(width);
      const narrow = width < 1024, tap = narrow ? 44 : 38, pad = narrow ? 16 : 24;

      await check(`[${theme} ${width}] 헤더 64 · brand 아래선 차이 0 · 패딩 ${pad} · 누름 ${tap} · 넘침 0`, async () => {
        await story('헤더', theme); await ev(helpers);
        const m = await ev(`(() => {
          const h = ${q('[data-slot="app-shell-header"]')}, b = ${q('[data-slot="side-nav-brand"]')}, s = getComputedStyle(h);
          const end = ${q('[data-slot="app-shell-header-end"]')}, bell = end.querySelector('[data-slot="notification-bell"]');
          const buttons = [...end.querySelectorAll('button')], hr = h.getBoundingClientRect(), br = b.getBoundingClientRect();
          const user = end.querySelector('button[aria-label="김철수, 사용자 메뉴"]');
          const rightmost = buttons.reduce((a, c) => c.getBoundingClientRect().right > a.getBoundingClientRect().right ? c : a);
          const name = user.querySelector('.max-w-40');
          return { header: hr.height, brandDiff: br.bottom - hr.bottom, headerTop: hr.top, padL: s.paddingLeft, padR: s.paddingRight,
            border: s.borderBottomWidth, endGap: hr.right - parseFloat(s.paddingRight) - end.getBoundingClientRect().right,
            bell: [bell.getBoundingClientRect().width, bell.getBoundingClientRect().height],
            user: [Math.round(user.getBoundingClientRect().width), user.getBoundingClientRect().height],
            userLast: rightmost.getAttribute('aria-label'), nameShown: getComputedStyle(name).display !== 'none',
            nameMax: getComputedStyle(name).maxWidth, centerDiff: Math.abs((bell.getBoundingClientRect().top + bell.getBoundingClientRect().bottom) / 2 - (hr.top + (hr.height - 1) / 2)),
            textContrast: __contrast(${q('[data-slot="app-shell-header-start"] .ds-context-switcher-value')}), nameContrast: __contrast(name), overflow: __overflow() };
        })()`);
        assert.equal(m.header, 64, '헤더 높이');
        assert.equal(m.brandDiff, 0, 'SideNav brand 행 아래선과 같은 y');
        assert.equal(m.headerTop, 0);
        assert.equal(m.padL, `${pad}px`); assert.equal(m.padR, `${pad}px`);
        assert.equal(m.border, '1px');
        assert.ok(Math.abs(m.endGap) < 0.5, `오른쪽 묶음이 오른끝(패딩 안쪽)에 붙는다 ${m.endGap}`);
        assert.deepEqual(m.bell, [tap, tap], '알림 진입 누름 면적');
        assert.equal(m.user[1], tap, '사용자 메뉴 트리거 높이');
        if (narrow) assert.equal(m.user[0], 44, '1024 미만 사용자 메뉴는 아바타만 44×44');
        assert.equal(m.nameShown, !narrow);
        assert.equal(m.nameMax, '160px');
        assert.equal(m.userLast, '김철수, 사용자 메뉴', '사용자 메뉴가 맨 오른쪽');
        assert.ok(m.centerDiff <= 0.5, `세로 가운데 ${m.centerDiff}`);
        assert.ok(m.textContrast >= 4.5 && (narrow || m.nameContrast >= 4.5), `대비 ${m.textContrast}·${m.nameContrast}`);
        assert.equal(m.overflow, 0, '가로 넘침');
        await capture(`header-${theme}-${width}`);
        return { header: m.header, brandDiff: m.brandDiff, bell: m.bell, user: m.user, textContrast: m.textContrast };
      });

      await check(`[${theme} ${width}] 사용자 메뉴: 진짜 Tab → Enter 열림 → 화살표 → Esc 닫힘·트리거 복귀`, async () => {
        await story('헤더', theme); await ev(helpers);
        const trigger = q('button[aria-label="김철수, 사용자 메뉴"]');
        await ev(`${q('[data-slot="notification-bell"]')}.focus()`);
        await act.key('Tab');
        await wait(`document.activeElement === ${trigger}`, 'Tab 으로 사용자 메뉴 트리거');
        await act.enter();
        await wait(`!!document.querySelector('[role="menu"]') && document.querySelector('[role="menu"]').contains(document.activeElement)`, '메뉴 열림·초점 안');
        await wait(`document.querySelector('[role="menu"]').getAnimations().every(a => a.playState === 'finished')`, '메뉴 정착');
        const m = await ev(`(() => { const menu = document.querySelector('[role="menu"]'), r = menu.getBoundingClientRect();
          const items = [...menu.querySelectorAll('[role="menuitem"]')], logout = items.find(i => i.textContent.trim() === '로그아웃');
          const sep = logout.previousElementSibling;
          return { expanded: ${trigger}.getAttribute('aria-expanded'), width: Math.round(r.width), items: items.map(i => Math.round(i.getBoundingClientRect().height)),
            labels: items.map(i => i.textContent.trim()), logoutColor: getComputedStyle(logout).color, itemColor: getComputedStyle(items[0]).color,
            logoutIcon: !!logout.querySelector('svg'), sepBefore: sep?.getAttribute('role'), inside: r.right <= innerWidth && r.left >= 0,
            contrast: __contrast(logout), caption: __contrast(menu.querySelector('[data-slot="dropdown-menu-label"] .text-fg-muted')) }; })()`);
        assert.equal(m.expanded, 'true');
        assert.ok(m.width >= 240 && m.width <= 320, `메뉴 폭 ${m.width}`);
        assert.ok(m.items.every(h => h === tap), `항목 높이 ${m.items} — 38, 1024 미만 44(Figma 223:433)`);
        // 640 미만은 조직 전환을 하위 메뉴 대신 메뉴 안에 펼친다(하위 목록이 화면에 들어가지 않는다).
        assert.deepEqual(m.labels, width < 640 ? ['내 계정', '조직 설정', '알림 설정', '도움말', '로그아웃']
          : ['내 계정', '조직 전환', '조직 설정', '알림 설정', '도움말', '로그아웃']);
        assert.equal(m.logoutColor, m.itemColor, '로그아웃은 중립 글자(위험 표시 없음)');
        assert.equal(m.logoutIcon, false, '휴지통 아이콘 없음');
        assert.equal(m.sepBefore, 'separator', '로그아웃 위 구분선');
        assert.ok(m.inside, '메뉴가 화면 안');
        assert.ok(m.contrast >= 4.5 && m.caption >= 4.5, `대비 ${m.contrast}·${m.caption}`);
        await capture(`usermenu-${theme}-${width}`);
        const first = await ev('document.activeElement.textContent.trim()');
        await act.key('ArrowDown', { raw: true });
        await wait(`document.activeElement.textContent.trim() !== ${JSON.stringify(first)}`, '화살표 이동');
        await act.key('Escape', { raw: true });
        await wait(`!document.querySelector('[role="menu"]')`, 'Esc 닫힘');
        await wait(`document.activeElement === ${trigger}`, 'Esc 뒤 트리거로 초점 복귀');
        assert.equal(await ev(`${trigger}.getAttribute('aria-expanded')`), 'false');
        assert.equal(await ev(`${trigger}.matches(':focus-visible')`), true, '돌아온 초점의 링이 보인다(P7)');
        return { width: m.width, item: Math.min(...m.items), first, contrast: m.contrast };
      });

      await check(`[${theme} ${width}] 사용자 메뉴 조직 전환: ${width < 640 ? '메뉴 안에 펼침' : '하위 목록'} · 현재 조직 = 표시 + 굵게 + 선택 바탕 · 화면 안`, async () => {
        await story('헤더', theme); await ev(helpers);
        const trigger = q('button[aria-label="김철수, 사용자 메뉴"]');
        await ev(`${trigger}.focus()`); await act.enter();
        await wait(`!!document.querySelector('[role="menu"]') && document.querySelector('[role="menu"]').contains(document.activeElement)`, '메뉴 열림');
        await act.key('ArrowDown', { raw: true });
        if (width >= 640) {
          await wait(`document.activeElement.textContent.trim() === '조직 전환'`, '조직 전환으로 이동');
          await act.key('ArrowRight', { raw: true });
          await wait(`document.querySelectorAll('[role="menu"]').length === 2 && document.querySelectorAll('[role="menu"]')[1].contains(document.activeElement)`, '하위 목록 열림');
        } else {
          await wait(`document.activeElement.getAttribute('role') === 'menuitemradio'`, '펼친 조직 목록으로 이동');
        }
        await wait(`[...document.querySelectorAll('[role="menu"]')].every(m => m.getAnimations().every(a => a.playState === 'finished'))`, '목록 정착');
        const m = await ev(`(() => { const menus = document.querySelectorAll('[role="menu"]'), sub = menus[menus.length - 1], items = [...sub.querySelectorAll('[role="menuitemradio"]')];
          const checked = items.find(i => i.getAttribute('aria-checked') === 'true'), other = items.find(i => i !== checked);
          return { items: items.map(i => [i.textContent.trim(), i.getAttribute('aria-checked'), Math.round(i.getBoundingClientRect().height)]),
            weight: [getComputedStyle(checked).fontWeight, getComputedStyle(other).fontWeight], bg: getComputedStyle(checked).backgroundColor !== getComputedStyle(other).backgroundColor,
            indicator: !!checked.querySelector('svg') && !other.querySelector('svg'), inside: sub.getBoundingClientRect().left >= 0 && sub.getBoundingClientRect().right <= innerWidth,
            contrast: __contrast(checked) }; })()`);
        assert.deepEqual(m.items.map(i => i.slice(0, 2)), [['운영 조직', 'true'], ['물류 조직', 'false']]);
        assert.ok(m.items.every(i => i[2] === tap), `항목 높이 ${JSON.stringify(m.items)}`);
        assert.deepEqual(m.weight, ['600', '400'], '현재 조직은 굵게');
        assert.equal(m.bg, true, '현재 조직은 선택 바탕');
        assert.equal(m.indicator, true, '현재 조직은 표시(모양) — 색만으로 알리지 않는다');
        assert.ok(m.inside, '하위 목록이 화면 안');
        assert.ok(m.contrast >= 4.5, `대비 ${m.contrast}`);
        await capture(`usermenu-org-${theme}-${width}`);
        await act.key('Escape', { raw: true });
        await wait(`!document.querySelector('[role="menu"]')`, 'Esc 로 모두 닫힘');
        await wait(`document.activeElement === ${trigger}`, '트리거로 초점 복귀');
        return { items: m.items, weight: m.weight };
      });
      await check(`[${theme} ${width}] 사용자 메뉴 긴 이름: 160 말줄임 · 초점에 전체 이름 툴팁`, async () => {
        await story('사용자메뉴 긴이름', theme); await ev(helpers);
        await wait(`!!document.querySelector('[role="tooltip"]:popover-open')`, '툴팁');
        await frames(); await sleep(250);
        const m = await ev(`(() => { const t = document.querySelector('[role="tooltip"]:popover-open'), label = ${q('button[aria-haspopup="menu"] .max-w-40')};
          const trigger = ${q('button[aria-haspopup="menu"]')}.getBoundingClientRect();
          return { tip: t.textContent, labelWidth: label.offsetParent ? Math.round(label.getBoundingClientRect().width) : 0, trigger: [Math.round(trigger.width), trigger.height],
            tipInside: t.getBoundingClientRect().left >= 0 && t.getBoundingClientRect().right <= innerWidth, overflow: __overflow() }; })()`);
        assert.equal(m.tip, '김철수 · 통합 운영 관리 담당자 · 야간 운영팀');
        assert.ok(narrow ? m.labelWidth === 0 : m.labelWidth <= 160, `이름 폭 ${m.labelWidth}`);
        assert.ok(m.tipInside, '툴팁이 화면 안');
        assert.equal(m.overflow, 0);
        await capture(`usermenu-longname-${theme}-${width}`);
        return { labelWidth: m.labelWidth, trigger: m.trigger };
      });

      // ── 2단계: 맥락 전환기 ──────────────────────────────────────────────────────────────
      // 1024 이상 두 전환기 펼침 · 1024 미만 둘째 아이콘만(768) · 그래도 넘치면 "맥락" 한 트리거(390). Figma 223:740 · 223:1769 · 223:1923.
      const layout = width >= 1024 ? 'wide' : width >= 768 ? 'icon' : 'collapsed';
      const START = '[data-slot="app-shell-header-start"]';
      await check(`[${theme} ${width}] 맥락 전환기 배치(${layout}) · 높이 ${tap} · 구분선 1×20 · 낭독 이름 · 대비 · 넘침 0`, async () => {
        await story('헤더', theme); await ev(helpers);
        const m = await ev(`(() => {
          const start = ${q(START)}, group = start.querySelector('[data-slot="context-switcher-group"]');
          const triggers = [...start.querySelectorAll('[data-slot="context-switcher"]')], divider = start.querySelector('.ds-context-switcher-divider');
          const probe = document.createElement('span'); probe.style.background = 'var(--border-subtle)'; document.body.append(probe);
          const subtle = getComputedStyle(probe).backgroundColor; probe.remove();
          return { collapsed: group.hasAttribute('data-collapsed'), labels: triggers.map(t => t.getAttribute('aria-label')),
            sizes: triggers.map(t => [Math.round(t.getBoundingClientRect().width), t.getBoundingClientRect().height]),
            values: triggers.map(t => t.querySelector('.ds-context-switcher-value')?.textContent ?? null),
            maxWidth: getComputedStyle(triggers[0]).maxWidth, weight: getComputedStyle(triggers[0]).fontWeight,
            divider: divider ? [divider.getBoundingClientRect().width, divider.getBoundingClientRect().height, getComputedStyle(divider).backgroundColor === subtle] : null,
            gaps: divider ? [divider.getBoundingClientRect().left - triggers[0].getBoundingClientRect().right, triggers[1].getBoundingClientRect().left - divider.getBoundingClientRect().right] : null,
            contrast: triggers.map(t => t.querySelector('.ds-context-switcher-value')).filter(Boolean).map(__contrast), overflow: __overflow() }; })()`);
        assert.equal(m.collapsed, layout === 'collapsed', `접힘 ${JSON.stringify(m)}`);
        assert.ok(m.sizes.every(([, h]) => h === tap), `트리거 높이 ${JSON.stringify(m.sizes)}`);
        assert.equal(m.maxWidth, '240px'); assert.equal(m.weight, '600');
        if (layout === 'collapsed') {
          assert.deepEqual(m.values, ['맥락']);
          assert.equal((await ax(`${START} [data-slot="context-switcher"]`)).name, '맥락: 마케팅관리, 스토어 A');
        } else {
          assert.deepEqual(m.values, layout === 'wide' ? ['마케팅관리', '스토어 A'] : ['마케팅관리', null], '좁은 폭은 둘째가 아이콘만');
          if (layout === 'icon') assert.deepEqual(m.sizes[1], [44, 44], '아이콘만 44×44');
          assert.deepEqual(m.divider, [1, 20, true], '구분선 1px · 높이 20 · --border-subtle');
          assert.ok(m.gaps.every(gap => Math.abs(gap - 8) <= 0.5), `구분선 좌우 8 ${m.gaps}`);
          const names = [await ax(`${START} [aria-label="제품: 마케팅관리"]`), await ax(`${START} [aria-label="스토어: 스토어 A"]`)];
          assert.deepEqual(names.map(n => [n.role, n.name]), [['button', '제품: 마케팅관리'], ['button', '스토어: 스토어 A']], '낭독 "<종류>: <현재 값>"');
        }
        assert.ok(m.contrast.every(c => c >= 4.5), `대비 ${m.contrast}`);
        assert.equal(m.overflow, 0, '가로 넘침');
        return { layout, sizes: m.sizes, gaps: m.gaps, contrast: m.contrast };
      });

      await check(`[${theme} ${width}] 맥락 전환기: 진짜 Tab → Enter 열림 → 첫 글자(ㅍ)·화살표 → Esc 닫힘·트리거 복귀(:focus-visible)`, async () => {
        await story('헤더', theme); await ev(helpers);
        const trigger = q(`${START} [data-slot="context-switcher"]`);
        await tabInto(trigger, '전환기');
        await act.enter();
        await wait(`!!document.querySelector('[data-slot="context-switcher-content"]')?.contains(document.activeElement)`, '목록 열림·초점 안');
        await settled('[data-slot="context-switcher-content"]');
        const m = await ev(`(() => { const menu = document.querySelector('[data-slot="context-switcher-content"]'), r = menu.getBoundingClientRect(), t = ${trigger}.getBoundingClientRect();
          const items = [...menu.querySelectorAll('[data-slot="context-switcher-item"]')], current = items.filter(i => i.hasAttribute('data-selected'));
          const other = items.find(i => !i.hasAttribute('data-selected'));
          return { role: menu.getAttribute('role'), expanded: ${trigger}.getAttribute('aria-expanded'), width: Math.round(r.width), top: r.top - t.bottom, left: r.left - t.left,
            items: items.map(i => [i.dataset.label, Math.round(i.getBoundingClientRect().height), i.getAttribute('role'), i.getAttribute('aria-current') ?? i.getAttribute('aria-checked')]),
            current: current.map(i => [i.dataset.label, getComputedStyle(i).fontWeight, !!i.querySelector('.ds-context-switcher-check'), getComputedStyle(i).backgroundColor !== getComputedStyle(other).backgroundColor]),
            sections: [...menu.querySelectorAll('.ds-context-switcher-section-label')].map(l => l.textContent),
            radius: getComputedStyle(menu).borderRadius, inside: r.left >= 0 && r.right <= innerWidth,
            contrast: items.map(i => i.querySelector('.ds-context-switcher-item-label')).map(__contrast) }; })()`);
        assert.equal(m.role, 'menu'); assert.equal(m.expanded, 'true');
        assert.ok(m.width >= 240 && m.width <= 360, `패널 폭 ${m.width}`);
        assert.ok(Math.abs(m.top - 4) <= 1 && (m.inside), `트리거 아래 +4 ${m.top} · 화면 안`);
        assert.equal(m.radius, '8px');
        assert.ok(m.items.every(i => i[1] === tap), `항목 높이 ${JSON.stringify(m.items)}`);
        const products = m.items.filter(i => ['마케팅관리', '판매관리', '물류관리'].includes(i[0]));
        assert.deepEqual(products.map(i => [i[0], i[2], i[3]]), [['마케팅관리', 'menuitem', 'true'], ['판매관리', 'menuitem', null], ['물류관리', 'menuitem', null]], '제품은 링크 항목 · 지금 항목 aria-current');
        assert.ok(m.current.every(([, weight, check, bg]) => weight === '600' && check && bg), `지금 항목 = 600 + 체크 + 선택 바탕(P5) ${JSON.stringify(m.current)}`);
        if (layout === 'collapsed') assert.deepEqual(m.sections, ['제품', '스토어'], '접힌 목록은 종류별');
        assert.ok(m.contrast.every(c => c >= 4.5), `항목 대비 ${m.contrast}`);
        await capture(`switcher-open-${theme}-${width}`);
        assert.equal(await activeLabel(), '마케팅관리', '키보드로 열면 첫 항목');
        await act.key('ㅍ', { text: 'ㅍ', code: 'KeyV', keyCode: 86 });
        await wait(`document.activeElement?.dataset?.label === '판매관리'`, '첫 글자(초성 ㅍ) → 판매관리');
        await act.key('ArrowDown', { raw: true });
        await wait(`document.activeElement?.dataset?.label === '물류관리'`, '화살표 이동');
        assert.equal(await ev(`document.activeElement.matches(':focus-visible')`), true, '항목 초점 링');
        await act.key('Escape', { raw: true });
        await wait(`!document.querySelector('[data-slot="context-switcher-content"]')`, 'Esc 닫힘');
        await wait(`document.activeElement === ${trigger}`, 'Esc 뒤 트리거로 초점 복귀');
        assert.equal(await ev(`${trigger}.getAttribute('aria-expanded')`), 'false');
        assert.equal(await ev(`${trigger}.matches(':focus-visible')`), true, '돌아온 초점의 링(P7)');
        return { width: m.width, items: m.items.length, current: m.current.map(c => c[0]) };
      });

      if (layout !== 'collapsed') await check(`[${theme} ${width}] 스토어 전환기: Tab → Enter → "전체" 맨 위·구분선·지금 항목·안내 줄 · 첫 글자(ㅅ) → Esc 복귀${layout === 'icon' ? ' · 아이콘만 툴팁' : ''}`, async () => {
        await story('헤더', theme); await ev(helpers);
        const trigger = q(`${START} [aria-label="스토어: 스토어 A"]`);
        await tabInto(trigger, '스토어 전환기');
        if (layout === 'icon') {
          await wait(`!!document.querySelector('[role="tooltip"]:popover-open')`, '아이콘만 — 초점에 이름 툴팁');
          assert.equal(await ev(`document.querySelector('[role="tooltip"]:popover-open').textContent`), '스토어: 스토어 A');
        }
        await act.enter();
        await wait(`!!document.querySelector('[data-slot="context-switcher-content"]')?.contains(document.activeElement)`, '목록 열림');
        await settled('[data-slot="context-switcher-content"]');
        const m = await ev(`(() => { const menu = document.querySelector('[data-slot="context-switcher-content"]');
          const items = [...menu.querySelectorAll('[data-slot="context-switcher-item"]')], sep = menu.querySelector('.ds-context-switcher-separator');
          const guide = menu.querySelector('[data-slot="context-switcher-guide"]');
          return { items: items.map(i => [i.dataset.label, i.getAttribute('role'), i.getAttribute('aria-checked')]),
            sepAfterAll: sep?.previousElementSibling?.dataset.label, guide: guide?.textContent, guideContrast: guide ? __contrast(guide.querySelector('span')) : 0,
            guideLine: guide ? getComputedStyle(guide).borderTopWidth : null }; })()`);
        assert.deepEqual(m.items, [['전체 스토어', 'menuitemradio', 'false'], ['스토어 A', 'menuitemradio', 'true'], ['스토어 B', 'menuitemradio', 'false'], ['스토어 C', 'menuitemradio', 'false']]);
        assert.equal(m.sepAfterAll, '전체 스토어', '"전체" 아래 구분선');
        assert.equal(m.guide, '다른 스토어가 필요하면 관리자에게'); assert.equal(m.guideLine, '1px');
        assert.ok(m.guideContrast >= 4.5, `안내 줄 대비 ${m.guideContrast}`);
        await capture(`switcher-store-open-${theme}-${width}`);
        await act.key('ㅅ', { text: 'ㅅ', code: 'KeyT', keyCode: 84 });
        await wait(`document.activeElement?.dataset?.label === '스토어 A'`, '첫 글자(초성 ㅅ) → 스토어 A');
        await act.key('Escape', { raw: true });
        await wait(`!document.querySelector('[data-slot="context-switcher-content"]') && document.activeElement === ${trigger}`, 'Esc 닫힘·복귀');
        assert.equal(await ev(`${trigger}.matches(':focus-visible')`), true);
        return { items: m.items.length };
      });

      await check(`[${theme} ${width}] 전환기 선택 진행 중: 스피너 16 + 새 값 · aria-busy · status 낭독(polite) · 다시 열지 않음`, async () => {
        await openStory(PENDING, theme); await ev(helpers);
        const trigger = `document.querySelector('[data-slot="context-switcher"]')`;
        await wait(`${trigger}?.getAttribute('aria-busy') === 'true'`, '진행 중');
        // 스피너는 돌고 있어 상자(bbox)가 커진다 — 계산 크기로 잰다.
        const m = await ev(`(() => { const t = ${trigger}, s = getComputedStyle(t.querySelector('.ds-context-switcher-spinner')), spin = { width: parseFloat(s.width), height: parseFloat(s.height) };
          const status = t.parentElement.querySelector('[role="status"]');
          return { value: t.querySelector('.ds-context-switcher-value').textContent, spin: [spin.width, spin.height], status: status?.textContent, height: t.getBoundingClientRect().height }; })()`);
        assert.equal(m.value, '스토어 B', '트리거에 새 값');
        assert.deepEqual(m.spin, [16, 16], '현재 값 자리 스피너 16');
        assert.equal(m.status, '선택한 새 값으로 바꾸는 중');
        assert.equal(m.height, tap);
        const name = await ax('[data-slot="context-switcher"]');
        assert.deepEqual([name.role, name.name, Boolean(name.busy)], ['button', '스토어: 스토어 B', true]);
        const live = await ax('[data-slot="context-switcher"] + [role="status"]');
        assert.equal(live.live, 'polite', 'status 영역은 polite');
        await capture(`switcher-pending-${theme}-${width}`);
        await ev(`${trigger}.focus()`); await act.enter(); await sleep(250);
        assert.equal(await ev(`!!document.querySelector('[data-slot="context-switcher-content"]')`), false, '진행 중에는 다시 열지 않는다');
        return m;
      });

      await check(`[${theme} ${width}] 전환기 선택 실패: 원래 값(스토어 A) 복귀 · 오류 토스트(alert, 닫을 때까지) · 넘침 0`, async () => {
        await story('헤더 선택실패', theme); await ev(helpers); await settleToasts();
        const m = await ev(`(() => { const toast = [...document.querySelectorAll('[data-sonner-toast]')].find(t => t.textContent.includes('스토어를 바꾸지 못했습니다'));
          const alert = toast?.querySelector('[role="alert"]'); const bar = document.querySelector('.ds-form-action-bar');
          return { alert: alert?.textContent, text: toast?.textContent, close: !!toast?.querySelector('[data-close-button]'),
            gap: bar.getBoundingClientRect().top - toast.getBoundingClientRect().bottom, contrast: __contrast(alert), overflow: __overflow() }; })()`);
        assert.equal(m.alert, '스토어를 바꾸지 못했습니다');
        assert.match(m.text, /이전 스토어를 유지합니다/);
        assert.equal(m.close, true, '닫을 때까지(닫기 버튼)');
        assert.ok(Math.abs(m.gap - 16) <= 0.5, `폼 하단 줄 위 16 ${m.gap}`);
        assert.ok(m.contrast >= 4.5, `대비 ${m.contrast}`);
        const name = (await ax(layout === 'collapsed' ? `${START} [data-slot="context-switcher"]` : `${START} [aria-label^="스토어"]`));
        assert.equal(name.name, layout === 'collapsed' ? '맥락: 마케팅관리, 스토어 A' : '스토어: 스토어 A', '원래 값으로 돌아온다');
        assert.notEqual(name.busy, true);
        assert.equal(m.overflow, 0);
        await capture(`switcher-failed-${theme}-${width}`);
        return { contrast: m.contrast, gap: m.gap };
      });

      // ── 2단계: 알림 센터 · 벨 · 개수 표식 ────────────────────────────────────────────────────
      await check(`[${theme} ${width}] 벨: 이름 "알림, 안 읽음 2개, 급한 알림 있음" · ${tap}×${tap} · 표식 18 · 중심 = 아이콘 모서리 (+6, −6)`, async () => {
        await story('헤더', theme); await ev(helpers);
        const m = await ev(`(() => { const bell = ${q('[data-slot="notification-bell"]')}, icon = bell.querySelector('svg.lucide-bell').getBoundingClientRect();
          const badge = bell.querySelector('[data-slot="count-badge"]'), b = badge.getBoundingClientRect(), r = bell.getBoundingClientRect();
          return { size: [r.width, r.height], icon: [icon.width, icon.height], badge: [b.height, b.width >= b.height], dot: !!badge.querySelector('.ds-count-badge-dot'),
            center: [b.left + b.width / 2 - icon.right, b.top + b.height / 2 - icon.top], hidden: badge.getAttribute('aria-hidden'),
            contrast: __contrast(badge.querySelector('span:not(.ds-count-badge-dot)')) }; })()`);
        const name = await ax('[data-slot="notification-bell"]');
        assert.deepEqual([name.role, name.name, name.expanded], ['button', '알림, 안 읽음 2개, 급한 알림 있음', false]);
        assert.deepEqual(m.size, [tap, tap]); assert.deepEqual(m.icon, [20, 20]);
        assert.deepEqual(m.badge, [18, true], '표식 높이 18 · 최소 폭 18');
        assert.equal(m.dot, true, '급함 = 점(모양) + 위험 색');
        assert.ok(Math.abs(m.center[0] - 6) <= 0.5 && Math.abs(m.center[1] + 6) <= 0.5, `표식 중심 ${m.center}`);
        assert.equal(m.hidden, 'true', '표식 글자는 벨 이름이 대신 읽는다');
        assert.ok(m.contrast >= 4.5, `표식 대비 ${m.contrast}`);
        return { center: m.center, contrast: m.contrast };
      });

      await check(`[${theme} ${width}] 알림 센터: 진짜 Tab → 벨 · Enter → 대화상자 "알림"(${narrow ? 'Sheet' : '팝오버 400'}) · 제목 초점 · Tab 순서 · 한 줄 낭독 · Esc → 벨 복귀`, async () => {
        await story('헤더', theme); await ev(helpers);
        const bell = q('[data-slot="notification-bell"]');
        await tabInto(bell, '벨');
        await act.enter();
        await wait(`!!document.querySelector('.ds-notification-center[role="dialog"]')`, '패널 열림');
        // 팝오버·Sheet 공통 클래스로 찾는다(Sheet 는 자기 data-slot="sheet-content" 를 갖는다). 벨 바탕 전환(140ms)도 끝난 뒤 잰다.
        await settled('.ds-notification-center');
        await wait(`${bell}.getAnimations().every(a => a.playState === 'finished')`, '벨 바탕 전환');
        await wait(`document.activeElement?.dataset?.slot === 'notification-center-title'`, '열면 제목에 초점');
        const dialog = await ax('.ds-notification-center[role="dialog"]');
        assert.deepEqual([dialog.role, dialog.name], ['dialog', '알림'], '대화상자 "알림"');
        const m = await ev(`(() => { const panel = document.querySelector('.ds-notification-center'), p = panel.getBoundingClientRect(), b = ${bell}.getBoundingClientRect();
          const probe = document.createElement('span'); probe.style.background = 'var(--bg-selected)'; document.body.append(probe);
          const selected = getComputedStyle(probe).backgroundColor; probe.remove();
          const rows = [...panel.querySelectorAll('[data-slot="notification-row"]')], hit = panel.querySelector('.ds-notification-center-hit');
          const before = getComputedStyle(hit, '::before');
          return { rect: [Math.round(p.left), Math.round(p.top), Math.round(p.width), Math.round(p.height)], bell: [Math.round(b.right), Math.round(b.bottom)],
            expanded: ${bell}.getAttribute('aria-expanded'), bellBg: getComputedStyle(${bell}).backgroundColor === selected,
            rows: rows.map(r => Math.round(r.getBoundingClientRect().height)), dot: (() => { const d = panel.querySelector('.ds-notification-row-dot').getBoundingClientRect(); return [d.width, d.height]; })(),
            urgent: (() => { const u = panel.querySelector('.ds-notification-row-urgent').getBoundingClientRect(); return [u.width, u.height]; })(),
            weights: rows.map(r => getComputedStyle(r.querySelector('.ds-notification-row-title')).fontWeight),
            hit: hit.getBoundingClientRect().height - 2 * parseFloat(before.top), tabs: [...panel.querySelectorAll('[role="tab"]')].map(t => Math.round(t.getBoundingClientRect().height)),
            contrast: { title: __contrast(panel.querySelector('[data-slot="notification-center-title"]')), source: __contrast(panel.querySelector('.ds-notification-row-source')),
              time: __contrast(panel.querySelector('.ds-notification-row-time')), overdue: __contrast(panel.querySelector('[data-level="overdue"]')),
              soon: __contrast(panel.querySelector('[data-level="soon"]')), rowTitle: __contrast(panel.querySelector('.ds-notification-row-title-text')) },
            overflow: __overflow() }; })()`);
        assert.equal(m.expanded, 'true'); assert.equal(m.bellBg, true, '열림 = 선택 바탕');
        if (narrow) {
          const expectWidth = Math.min(400, width);
          assert.deepEqual([m.rect[0] + m.rect[2], m.rect[1], m.rect[2], m.rect[3]], [width, 0, expectWidth, 900], `오른쪽 Sheet 전체 높이${width < 400 ? ' · 전체 폭' : ' 400'} ${m.rect}`);
          assert.ok(m.tabs.every(h => h >= 44), `탭 높이 ${m.tabs}`);
        } else {
          assert.equal(m.rect[2], 400, '팝오버 폭 400');
          assert.ok(Math.abs(m.rect[0] + m.rect[2] - m.bell[0]) <= 1, `벨 오른쪽 맞춤 ${m.rect} · ${m.bell}`);
          assert.ok(Math.abs(m.rect[1] - m.bell[1] - 4) <= 1, `벨 아래 4 ${m.rect[1]} · ${m.bell[1]}`);
          assert.ok(m.rect[3] <= Math.min(640, 900 - 96), `최대 높이 ${m.rect[3]}`);
        }
        assert.ok(m.rows.length === 3 && m.rows.every(h => h >= 72), `한 줄 최소 72 ${m.rows}`);
        assert.deepEqual(m.dot, [8, 8], '안 읽음 점 8'); assert.deepEqual(m.urgent, [16, 16], '급함 아이콘 16');
        assert.deepEqual(m.weights, ['600', '600', '400'], '안 읽음 600 · 읽음 400');
        assert.ok(m.hit >= tap - 0.5, `모두 읽음 누름 면적 ${m.hit}`);
        assert.ok(Object.values(m.contrast).every(c => c >= 4.5), `대비 ${JSON.stringify(m.contrast)}`);
        const names = [];
        for (const id of ['cancel-a', 'order-a', 'return-b']) names.push((await ax(`[data-slot="notification-row"][href*="${{ 'cancel-a': 'cancel', 'order-a': 'status=new', 'return-b': 'returns' }[id]}"]`)));
        assert.deepEqual(names.map(n => [n.role, n.name]), [
          ['link', '판매관리 · 스토어 A, 취소 요청 2건, 2건, 2시간 초과, 방금, 안 읽음'],
          ['link', '판매관리 · 스토어 A, 신규 주문 37건, 37건, 4시간 남음, 12분 전, 안 읽음'],
          ['link', '물류관리 · 스토어 B, 반품 입고 확인 5건, 5건, 1영업일 이내, 3시간 전, 읽음']], '한 줄 = 링크 "<출처>, <제목>, <건수>, <기한>, <시각>, 안 읽음/읽음"');
        await capture(`center-open-${theme}-${width}`);
        const order = [];
        for (let step = 0; step < (narrow ? 4 : 3); step += 1) {
          await act.key('Tab');
          order.push(await ev(`document.activeElement.getAttribute('aria-label') ?? document.activeElement.textContent.trim()`));
        }
        assert.deepEqual(order, narrow ? ['모두 읽음', '알림 설정', '닫기', '처리 필요'] : ['모두 읽음', '알림 설정', '처리 필요'], `Tab 순서 ${order}`);
        await act.key('Escape', { raw: true });
        await wait(`!document.querySelector('.ds-notification-center')`, 'Esc 닫힘');
        await wait(`document.activeElement === ${bell}`, 'Esc 뒤 벨로 초점 복귀');
        assert.equal(await ev(`${bell}.getAttribute('aria-expanded')`), 'false');
        assert.equal(await ev(`${bell}.matches(':focus-visible')`), true, '돌아온 초점의 링(P7)');
        assert.equal(m.overflow, 0);
        return { rect: m.rect, rows: m.rows, hit: m.hit, contrast: m.contrast };
      });

      await check(`[${theme} ${width}] 개수 표식: SideNav ${narrow ? '레일 점 8 · 이름 "라벨, 3개"' : '알약 · 이름 "라벨 3개"'} · 접힌 레일 이야기(급함 점 · 이름)`, async () => {
        await story('헤더', theme); await ev(helpers);
        const link = '[data-slot="side-nav-item"][href="#schedule"]';
        const m = await ev(`(() => { const a = document.querySelector(${JSON.stringify(link)});
          const pill = a.querySelector('.ds-side-nav-count'), dot = a.querySelector('.ds-side-nav-count-dot');
          const visible = n => n && getComputedStyle(n).display !== 'none';
          return { pill: visible(pill) ? [pill.getBoundingClientRect().height, pill.textContent] : null, dot: visible(dot) ? [dot.getBoundingClientRect().width, dot.getBoundingClientRect().height] : null,
            contrast: visible(pill) ? __contrast(pill.querySelector('span')) : null }; })()`);
        const name = await ax(link);
        if (narrow) {
          assert.equal(m.pill, null); assert.deepEqual(m.dot, [8, 8], '레일 점 8');
          assert.equal(name.name, '발행 일정, 3개');
        } else {
          assert.deepEqual(m.pill, [18, '33개'], '알약 18 · 보이는 3 + 낭독 3개'); assert.equal(m.dot, null);
          assert.equal(name.name, '발행 일정 3개');
          assert.ok(m.contrast >= 4.5, `알약 대비 ${m.contrast}`);
        }
        await openStory(RAIL, theme, { waitPlay: false });
        const rail = await ax('[data-slot="side-nav-item"][href="#alerts"]');
        assert.equal(rail.name, '확인할 알림, 2개, 급함', '접힌 레일 — 급함도 말로');
        const urgentDot = await ev(`(() => { const d = document.querySelector('[href="#alerts"] .ds-side-nav-count-dot'); const p = document.createElement('span');
          p.style.background = 'var(--status-danger-fg)'; document.body.append(p); const danger = getComputedStyle(p).backgroundColor; p.remove();
          return [d.getBoundingClientRect().width, getComputedStyle(d).backgroundColor === danger]; })()`);
        assert.deepEqual(urgentDot, [8, true], '급함 점 = 위험 글자색');
        await capture(`countbadge-rail-${theme}-${width}`);
        return { pill: m.pill, dot: m.dot, name: name.name };
      });

      // 폼 하단 고정 줄(63) 위 16 · 낭독. 좁은 화면(≤600, sonner 경계)은 폭이 화면 − 32 다(기존 그대로).
      const toastWidth = width <= 600 ? width - 32 : 356;
      await check(`[${theme} ${width}] 알림 토스트 일반: status·polite · 줄 위 16 · 폭 ${toastWidth}`, async () => {
        await story('알림토스트 일반', theme); await ev(helpers); await settleToasts();
        const m = await ev(`(() => { const t = document.querySelector('.ds-toaster-notification [data-sonner-toast]'), bar = document.querySelector('.ds-form-action-bar');
          const r = t.getBoundingClientRect(), b = bar.getBoundingClientRect(), status = t.querySelector('[role="status"]');
          const link = t.querySelector('a[data-slot="toast-link"]');
          return { gap: b.top - r.bottom, width: r.width, right: innerWidth - r.right, bar: b.height, live: t.closest('section').getAttribute('aria-live'),
            status: status.textContent, name: t.closest('section').getAttribute('aria-label'), link: [link.textContent, link.getAttribute('href'), Math.round(link.getBoundingClientRect().height)],
            source: __contrast(t.querySelector('[data-slot="toast-source"]')), title: __contrast(t.querySelector('[data-slot="toast-title"]')), linkContrast: __contrast(link),
            close: t.querySelector('[data-close-button]')?.getAttribute('aria-label'), overflow: __overflow() }; })()`);
        assert.equal(m.bar, 63);
        assert.ok(Math.abs(m.gap - 16) <= 0.5, `줄 위 간격 ${m.gap}`);
        assert.ok(Math.abs(m.width - toastWidth) <= 0.5, `폭 ${m.width}`);
        assert.equal(m.live, 'polite'); assert.equal(m.name, '업무 알림');
        assert.equal(m.status, '판매관리 · 스토어 A취소 요청 1건 · 스토어 A');
        assert.deepEqual(m.link, ['이동', '#orders', 38]);
        assert.equal(m.close, '알림 닫기');
        assert.ok(m.source >= 4.5 && m.title >= 4.5 && m.linkContrast >= 4.5, `대비 ${m.source}·${m.title}·${m.linkContrast}`);
        assert.equal(m.overflow, 0);
        await capture(`toast-normal-${theme}-${width}`);
        return { gap: m.gap, width: m.width, contrast: [m.source, m.title, m.linkContrast] };
      });
      await check(`[${theme} ${width}] 알림 토스트 고정: 위험 톤 · 닫기 · 대비`, async () => {
        await story('알림토스트 고정', theme); await ev(helpers); await settleToasts();
        const m = await ev(`(() => { const t = document.querySelector('.ds-toaster-notification [data-sonner-toast]'), bar = document.querySelector('.ds-form-action-bar');
          const probe = document.createElement('span'); probe.style.background = 'var(--status-danger-bg)'; document.body.append(probe);
          const danger = getComputedStyle(probe).backgroundColor; probe.remove();
          return { pinned: t.classList.contains('ds-toast-pinned'), bg: getComputedStyle(t).backgroundColor === danger, gap: bar.getBoundingClientRect().top - t.getBoundingClientRect().bottom,
            close: !!t.querySelector('[data-close-button]'), source: __contrast(t.querySelector('[data-slot="toast-source"]')),
            title: __contrast(t.querySelector('[data-slot="toast-title"]')), link: __contrast(t.querySelector('a[data-slot="toast-link"]')) }; })()`);
        assert.deepEqual([m.pinned, m.bg, m.close], [true, true, true]);
        assert.ok(Math.abs(m.gap - 16) <= 0.5, `줄 위 간격 ${m.gap}`);
        assert.ok(m.source >= 4.5 && m.title >= 4.5 && m.link >= 4.5, `대비 ${m.source}·${m.title}·${m.link}`);
        await capture(`toast-pinned-${theme}-${width}`);
        return { contrast: [m.source, m.title, m.link] };
      });
      if (theme === 'light') await check(`[${width}] 알림 토스트 묶음: 1건 → 3건 · 하나`, async () => {
        await story('알림토스트 묶음', theme); await settleToasts();
        const m = await ev(`({ count: document.querySelectorAll('.ds-toaster-notification [data-sonner-toast]').length,
          title: document.querySelector('.ds-toaster-notification [data-slot="toast-title"]').textContent })`);
        assert.deepEqual(m, { count: 1, title: '취소 요청 3건 · 스토어 A' });
        await capture(`toast-group-${theme}-${width}`);
      });
      await check(`[${theme} ${width}] 저장 결과와 겹치면 알림이 위 · 둘 다 줄 위`, async () => {
        await story('알림토스트 겹침', theme); await settleToasts();
        await sleep(120); await frames(); // 묶음 높이 재기(rAF) 뒤 자리 전환 끝
        await wait(`[...document.querySelectorAll('.ds-toaster-notification')].every(o => o.getAnimations().every(a => a.playState === 'finished'))`, '알림 묶음 이동');
        const m = await ev(`(() => { const n = document.querySelector('.ds-toaster-notification [data-sonner-toast]').getBoundingClientRect();
          const a = document.querySelector('[data-sonner-toaster]:not(.ds-toaster-notification) [data-sonner-toast]').getBoundingClientRect();
          const bar = document.querySelector('.ds-form-action-bar').getBoundingClientRect();
          return { between: a.top - n.bottom, actionGap: bar.top - a.bottom, overlap: n.bottom > a.top }; })()`);
        assert.equal(m.overlap, false, '알림과 저장 결과가 겹친다');
        assert.ok(m.between >= 8 && m.between <= 16, `둘 사이 ${m.between}`);
        assert.ok(Math.abs(m.actionGap - 16) <= 0.5, `저장 결과도 줄 위 16 ${m.actionGap}`);
        await capture(`toast-stack-${theme}-${width}`);
        return m;
      });

      for (const [name, file, icon, title] of [['권한없음', 'state-forbidden', 'lucide-lock-keyhole', '이 화면을 볼 권한이 없습니다'],
        ['찾을수없음', 'state-not-found', 'lucide-search-x', '찾을 수 없습니다']]) {
        await check(`[${theme} ${width}] ${name}: 위 96 · 최대 480 · 아이콘 40 · h1 17/24 600 · status · 행동 ${tap}`, async () => {
          await story(name, theme); await ev(helpers);
          const m = await ev(`(() => { const header = ${q('[data-slot="app-shell-header"]')}.getBoundingClientRect(), s = ${q('[data-slot="empty-state"]')};
            const icon = s.querySelector('svg'), t = s.querySelector('[data-slot="state-title"]'), d = s.querySelector('[data-slot="state-description"]');
            const main = ${q('[data-slot="app-shell-content"]')}.getBoundingClientRect(), r = s.getBoundingClientRect(), ts = getComputedStyle(t);
            const actions = [...s.querySelectorAll('.ds-state-actions > *')];
            return { top: icon.getBoundingClientRect().top - header.bottom, width: r.width, center: Math.abs((r.left + r.right) / 2 - (main.left + main.right) / 2),
              icon: [icon.getBoundingClientRect().width, icon.getBoundingClientRect().height, icon.classList.contains(${JSON.stringify(icon)})],
              tag: t.tagName, font: [ts.fontSize, ts.lineHeight, ts.fontWeight], desc: getComputedStyle(d).fontSize, role: s.getAttribute('role'),
              text: t.textContent, actions: actions.map(a => [a.tagName, Math.round(a.getBoundingClientRect().height)]),
              titleC: __contrast(t), descC: __contrast(d), strongC: d.querySelector('strong') ? __contrast(d.querySelector('strong')) : null,
              h1s: ${CANVAS}.querySelectorAll('h1').length, overflow: __overflow() }; })()`);
          assert.ok(Math.abs(m.top - 96) <= 0.5, `상단 바 아래선 → 아이콘 ${m.top}`);
          assert.ok(m.width <= 480 && m.center <= 0.5, `폭 ${m.width} · 가운데 ${m.center}`);
          assert.deepEqual(m.icon, [40, 40, true]);
          assert.equal(m.tag, 'H1'); assert.equal(m.h1s, 1, '페이지의 h1 하나');
          assert.deepEqual(m.font, ['17px', '24px', '600']);
          assert.equal(m.desc, '14px');
          assert.equal(m.role, 'status'); assert.equal(m.text, title);
          assert.deepEqual(m.actions.map(a => a[0]), ['BUTTON', 'A']);
          assert.ok(m.actions.every(a => narrow ? a[1] >= 44 : a[1] === 38), `행동 높이 ${JSON.stringify(m.actions)}`);
          assert.ok(m.titleC >= 4.5 && m.descC >= 4.5 && (m.strongC ?? 99) >= 4.5, `대비 ${m.titleC}·${m.descC}·${m.strongC}`);
          assert.equal(m.overflow, 0);
          await capture(`${file}-${theme}-${width}`);
          return { top: m.top, width: m.width, actions: m.actions.map(a => a[1]), contrast: [m.titleC, m.descC] };
        });
      }
    }
  }
  await check('모든 경로에서 콘솔 오류 0건', async () => assert.deepEqual(browser.errors().filter(m => !/Warning:|DevTools|favicon|preload/i.test(m)), []));
} finally {
  writeFileSync(`${OUT}/results.json`, JSON.stringify({ results, measures, errors: browser.errors() }, null, 2));
  browser.close();
}
const failed = results.filter(result => !result.pass).length;
console.log(`\n${results.length}건 검사 · ${results.length - failed}건 통과 · ${failed}건 실패`);
if (failed) process.exitCode = 1;
