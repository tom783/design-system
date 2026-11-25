// 상단 바 1단계(목표 75) — AppShell header 64 고정 · 사용자 메뉴 · 알림 토스트 · 권한 없음/찾을 수 없음.
// 규격: 상단 바 규칙 표 r1 0절(P1~P10)·1·6·7·8절 · Figma 216:1216 · 211:10253 · 211:10254 · 211:10255.
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
for (const name of ['헤더', '사용자메뉴', '사용자메뉴 긴이름', '알림토스트 일반', '알림토스트 고정', '알림토스트 묶음', '알림토스트 겹침', '권한없음', '찾을수없음']) {
  assert.ok(ids[name], `Screens/AppHeader 스토리 '${name}' 가 없다 — ${Object.keys(ids).join(', ')}`);
}

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
          const end = ${q('[data-slot="app-shell-header-end"]')}, bell = end.querySelector('button[aria-label="알림"]');
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
            textContrast: __contrast(${q('[data-slot="app-shell-header-start"] span')}), nameContrast: __contrast(name), overflow: __overflow() };
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
        await ev(`${q('button[aria-label="알림"]')}.focus()`);
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
