// ============================================================================
//  로딩 렌더 검증 — docs/qa/render-verify.mjs 와 같은 CDP 방식
// ----------------------------------------------------------------------------
//  pnpm qa --only loading-render-verify   (run-all 이 서버를 띄우고 출처를 확인한다)
//  node docs/qa/loading-render-verify.mjs ./shots
//
//  ※ 스크린샷은 play 가 끝난 "이후" 상태다 ※
//  play 가 버튼을 누르고 상태를 바꿔 놓기 때문에, 초기 모습을 보려면 되돌리는
//  조작을 먼저 해야 한다. 2026-11-14 에 이걸 몰라서 멀쩡한 TaskProgress 를
//  "렌더되지 않는다"고 오판했다 (play 가 '백그라운드로 보내기'를 누른 상태였다).
//
//  ※ 타이밍은 폴링하지 마라 ※
//  짧게 떴다 사라지는 로더를 놓치고, 페이지에 원래 있던 스켈레톤과 구분하지 못한다.
//  스토리의 play 가 MutationObserver 로 더 정확히 검증한다.
// ============================================================================
import { writeFileSync, mkdirSync } from 'node:fs';
import { launchBrowser, storybook, storybookBase } from './browser.mjs';

const BASE = await storybookBase(), OUT = process.argv[2] || './loading-shots', PORT = 9477;
mkdirSync(OUT, { recursive: true });
// GUI Chrome 을 직접 띄우지 않는다 — 샌드박스에서 TransformProcessType 으로
// 크래시한다. 이유와 대안은 browser.mjs 머리말에 있다.
const session = await launchBrowser({ port: PORT, windowSize: '1440,1000', outDir: OUT });
const { cdp, ev, shot, sleep } = session;
const evalIn = ev;

async function open(id, extra = '') {
  session.resetErrors();
  await cdp('Page.navigate', { url: `${BASE}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story${extra}` });
  for (let i = 0; i < 80; i++) { if (await evalIn('document.readyState').catch(() => '') === 'complete') break; await sleep(150); }
  let prev = 0, stable = 0;
  for (let i = 0; i < 50 && stable < 3; i++) {
    const t = await evalIn(`document.body.innerHTML.length`).catch(() => 0);
    stable = t === prev ? stable + 1 : 0; prev = t; await sleep(200);
  }
  return {
    errors: session.errors().filter((m) => !/Warning:|DevTools|favicon|preload/i.test(m)),
    sbError: await evalIn(`(() => { const el=document.querySelector('#error-message');
      return document.body.classList.contains('sb-show-errordisplay')||el ? (el?el.textContent.slice(0,300):'errordisplay') : null; })()`).catch(() => null),
  };
}
const results = [];
const check = (l, pass, d) => { results.push({ l, pass, d }); console.log(`  ${pass ? '✓' : '✗'} ${l}${d ? ` — ${d}` : ''}`); };

const countSkeleton = `(() => document.querySelectorAll('[data-slot^="skeleton"]').length)()`;

const STORIES = ['대기시간-계층','깜빡임-방지','스켈레톤-기본','스켈레톤-패턴','스켈레톤-치수일치','진행률','긴작업','모션-감소'];

console.log('── A. 렌더 + play ──');
const fails = [];
for (const name of STORIES) {
  const r = await open(`components-loading--${name}`);
  const sk = await evalIn(countSkeleton);
  await shot(`load-${name}`);
  const ok = !r.sbError && r.errors.length === 0;
  if (!ok) fails.push({ name, err: r.sbError ?? r.errors[0] });
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(14)} 스켈레톤 요소 ${String(sk).padStart(3)}개${ok ? '' : ` ← ${String(r.sbError ?? r.errors[0]).slice(0,120)}`}`);
}
check(`로딩 스토리 ${STORIES.length}개 렌더·play`, fails.length === 0,
  fails.length ? fails.map((f) => f.name).join(', ') : '예외 없음');

// R08: 기존 차트 엣지와 로딩 연결을 같은 브라우저·play 환경에서 회귀 검증한다.
console.log('── A-2. 차트 렌더 + play ──');
const chartStories = ['추이밴드', '추이밴드-선만', '추이밴드-축기준', '추이밴드-음수', '추이밴드-엣지',
  '불릿', '구성변화', '구성변화-절대값', '반응형', '구성변화-엣지',
  '로딩-추이밴드', '로딩-불릿', '로딩-치수일치', '오류', '비어있음', '지연로딩'];
for (const theme of ['light', 'dark']) {
  for (const name of chartStories) {
    const r = await open(`components-charts--${name}`, `&globals=theme:${theme}`);
    check(`차트 ${theme} · ${name} · play`, !r.sbError && r.errors.length === 0, r.sbError ?? r.errors[0]);
    if (name === '로딩-치수일치') {
      const dims = await evalIn(`(() => {
        const groups = [...document.querySelectorAll('[data-compare]')];
        return groups.filter((_, i) => i % 2 === 0).map((group, i) => {
          const a = group.querySelector('[data-slot="chart-plot"]').getBoundingClientRect().height;
          const b = groups[i * 2 + 1].querySelector('[data-slot="chart-plot"]').getBoundingClientRect().height;
          return { pair: group.dataset.compare, loading: a, ready: b, diff: Math.abs(a - b) };
        });
      })()`);
      check(`차트 ${theme} · 플롯 치수 차이 2px 이내`, dims.length === 13 && dims.every(d => d.diff <= 2), JSON.stringify(dims));
      await shot(`chart-dim-${theme}`);
    }
  }
}

// ══ B. 타이밍은 스토리 play 가 검증한다 ══
// 폴링으로 로더 등장을 쫓는 방식은 틀렸다 — 짧게 떴다 사라지는 상태를 놓치고,
// 페이지에 이미 있는 스켈레톤과 구분하지 못한다. 스토리의 play 가
// MutationObserver 로 "요청 동안 어떤 로더가 등장했는가"를 기록해 구간별로 단언하며,
// 그쪽이 더 정확하다. A 섹션의 play 통과가 곧 타이밍 검증이다.
console.log('\n── B. 대기시간 구간 (스토리 play 가 검증) ──');
{
  const r = await open('components-loading--대기시간-계층');
  const done = await evalIn(`document.querySelector('#storybook-root, #root')?.dataset?.playComplete === 'true'
    || !!document.querySelector('[data-play-complete="true"]')`).catch(() => false);
  check('대기시간 계층 play 가 끝까지 통과', r.errors.length === 0 && !r.sbError,
    `150ms 로더 없음 / 300ms 버튼만 / 1.5s 스켈레톤 / 5s 진행률 — play 단언 기준${done ? ' · 완료 플래그 확인' : ''}`);
}

// ══ C. 스켈레톤 치수 일치 (DESIGN.md 9.2) ══
console.log('\n── C. 스켈레톤 치수가 실제 컴포넌트와 맞는가 ──');
await open('components-loading--스켈레톤-치수일치');
const dim = await evalIn(`(() => {
  // 스토리가 실제/스켈레톤을 쌍으로 두었다고 가정하고 같은 역할 요소의 높이를 비교한다
  const groups = [...document.querySelectorAll('[data-compare]')];
  if (groups.length >= 2) {
    const h = groups.map(g => Math.round(g.getBoundingClientRect().height));
    return { mode: 'data-compare', heights: h, diff: Math.abs(h[0]-h[1]) };
  }
  // 폴백: 스켈레톤 컨테이너와 그 형제의 높이
  const sk = document.querySelector('[data-slot="skeleton-card"], [data-slot^="skeleton"]');
  const all = [...document.querySelectorAll('section, div')].filter(d => d.children.length);
  return { mode: 'fallback', skeletonH: sk ? Math.round(sk.getBoundingClientRect().height) : null,
           bodyText: document.body.innerText.slice(0,160).replace(/\\n+/g,' | ') };
})()`);
await shot('dim-match');
if (dim.mode === 'data-compare') {
  check('실제와 스켈레톤의 높이 차이가 4px 이내', dim.diff <= 4, `높이 ${dim.heights.join(' vs ')} · 차이 ${dim.diff}px`);
} else {
  console.log(`  · 비교 마커(data-compare) 없음 — 스크린샷으로 확인: ${JSON.stringify(dim).slice(0,200)}`);
}

// ══ D. 접근성 ══
console.log('\n── D. 접근성 ──');
await open('components-loading--스켈레톤-패턴');
const a11y = await evalIn(`(() => {
  const busy = document.querySelectorAll('[aria-busy="true"]').length;
  const status = document.querySelectorAll('[role="status"]').length;
  const hidden = [...document.querySelectorAll('[data-slot^="skeleton"]')];
  const notHidden = hidden.filter(el => el.getAttribute('aria-hidden') !== 'true' && !el.closest('[aria-hidden="true"]')).length;
  return { busy, status, skeletons: hidden.length, notHidden, text: document.body.innerText.slice(0,120).replace(/\\n+/g,' | ') };
})()`);
check('aria-busy 가 있다', a11y.busy > 0, `${a11y.busy}개`);
check('role=status 로 상태를 알린다', a11y.status > 0, `${a11y.status}개`);
check('스켈레톤이 콘텐츠로 읽히지 않는다(aria-hidden)', a11y.notHidden === 0,
  `전체 ${a11y.skeletons}개 중 숨겨지지 않은 것 ${a11y.notHidden}개`);

// ══ E. prefers-reduced-motion ══
console.log('\n── E. 모션 감소 ──');
for (const [label, reduce] of [['기본', false], ['reduce', true]]) {
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }] });
  await open('components-loading--스켈레톤-기본');
  const anim = await evalIn(`(() => {
    const els = [...document.querySelectorAll('[data-slot^="skeleton"]')];
    const names = els.map(e => getComputedStyle(e).animationName).filter(n => n && n !== 'none');
    return { total: els.length, animated: names.length, sample: names[0] ?? 'none' };
  })()`);
  await shot(`motion-${label}`);
  if (reduce) check('reduce 에서 애니메이션이 멈춘다', anim.animated === 0, `${anim.total}개 중 애니메이션 ${anim.animated}개`);
  else check('기본에서는 애니메이션이 돈다', anim.animated > 0, `${anim.total}개 중 ${anim.animated}개 (${anim.sample})`);
}
await cdp('Emulation.setEmulatedMedia', { features: [] });

// ══ F. 다크 ══
console.log('\n── F. 다크 테마 ──');
await open('components-loading--스켈레톤-패턴', '&globals=theme:dark');
const dk = await evalIn(`(() => {
  const sk = document.querySelector('[data-slot^="skeleton"]');
  const cs = sk ? getComputedStyle(sk) : null;
  const rootCs = getComputedStyle(document.documentElement);
  return { bg: cs ? cs.backgroundColor : null, token: rootCs.getPropertyValue('--skeleton-bg').trim() };
})()`);
await shot('dark-skeleton');
const rgb = (dk.bg?.match(/\d+/g) ?? []).map(Number);
const lum = rgb.length >= 3 ? (0.2126*rgb[0]+0.7152*rgb[1]+0.0722*rgb[2])/255 : 1;
check('다크에서 스켈레톤이 어둡다 (토큰 적용)', lum < 0.3, `${dk.bg} → 휘도 ${lum.toFixed(3)} · 토큰 ${dk.token}`);

session.close();
const f = results.filter((r) => !r.pass);
console.log('\n' + '═'.repeat(62));
console.log(`검사 ${results.length}건 · 통과 ${results.length - f.length} · 실패 ${f.length}`);
if (f.length) { console.log('\n실패:'); for (const x of f) console.log(`  ✗ ${x.l} — ${x.d}`); }
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
process.exit(f.length ? 1 : 0);
