// ============================================================================
//  렌더 검증 — 실제 브라우저에서 Storybook 스토리를 돌려 확인한다
// ----------------------------------------------------------------------------
//  쓰는 법
//    pnpm build-storybook
//    python3 -m http.server 6099 --directory storybook-static &
//    node docs/qa/render-verify.mjs ./shots
//
//  두 축으로 본다
//    A. 스토리의 play(상호작용 테스트) assertion 이 터지는가
//    B. play 와 무관한 구조 검사 — 가상화 DOM 수, sticky 오프셋, 다크 토큰
//
//  의존성 0. chromedriver·playwright 없이 CDP 를 직접 쓴다
//  (Node 24 의 전역 WebSocket).
//
//  ※ 반드시 Emulation.setFocusEmulationEnabled 를 켠다 ※
//  헤드리스 Chrome 은 문서가 시스템 포커스를 갖지 않으면 focus/focusin 이벤트를
//  억제한다. 이걸 빠뜨리면 포커스 관련 기능이 "깨진 것처럼" 보인다.
//  2026-11-14 에 실제로 이것 때문에 멀쩡한 포커스 복구 코드를 버그로 오판했다.
// ============================================================================
import { writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = 'http://localhost:6099';
const OUT = process.argv[2] || './shots2';
const PORT = 9432;
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'v2-'))}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  '--window-size=1440,1000', '--force-device-scale-factor=1', '--disable-extensions',
  'about:blank',
], { stdio: 'ignore' });
process.on('exit', () => { try { chrome.kill(); } catch {} });

let ws, mid = 0;
const pending = new Map();
let consoleErrors = [];
let pageExceptions = [];

for (let i = 0; i < 80; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const p = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; }
  } catch {}
  await sleep(250);
}
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id); pending.delete(m.id);
    return m.error ? rej(new Error(m.error.message)) : res(m.result);
  }
  // play 함수 실패는 콘솔 에러나 예외로 드러난다
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    consoleErrors.push(m.params.args.map((a) => a.value ?? a.description ?? a.type).join(' ').slice(0, 400));
  }
  if (m.method === 'Runtime.exceptionThrown') {
    pageExceptions.push((m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text ?? '').slice(0, 400));
  }
};
const cdp = (method, params = {}) => new Promise((res, rej) => {
  pending.set(++mid, { res, rej });
  ws.send(JSON.stringify({ id: mid, method, params }));
  setTimeout(() => { if (pending.has(mid)) { pending.delete(mid); rej(new Error(method + ' 타임아웃')); } }, 40000);
});
await cdp('Page.enable'); await cdp('Runtime.enable');
// 헤드리스는 문서가 시스템 포커스를 갖지 않아 focus/focusin 이벤트를 억제한다.
// 이걸 켜지 않으면 포커스 관련 기능이 "깨진 것처럼" 보인다 — 실제로 오판했던 지점.
await cdp('Emulation.setFocusEmulationEnabled', { enabled: true });

const evalIn = async (src) => {
  const r = await cdp('Runtime.evaluate', { expression: src, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result?.value;
};
const shot = async (name) => {
  const r = await cdp('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64'));
};

/** 스토리를 열고 play 함수가 끝날 때까지 기다린다. */
async function openStory(id, extra = '') {
  consoleErrors = []; pageExceptions = [];
  await cdp('Page.navigate', { url: `${BASE}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story${extra}` });
  for (let i = 0; i < 80; i++) {
    if (await evalIn('document.readyState').catch(() => '') === 'complete') break;
    await sleep(150);
  }
  // 컴포넌트가 붙을 때까지
  for (let i = 0; i < 60; i++) {
    if (await evalIn(`!!document.querySelector('[data-slot="data-table"]')`).catch(() => false)) break;
    await sleep(150);
  }
  // play 함수가 비동기 waitFor 를 쓰므로 안정화까지 넉넉히 기다린다.
  // 기준: innerText 가 두 번 연속 같으면 끝난 것으로 본다.
  let prev = '', stable = 0;
  for (let i = 0; i < 60 && stable < 3; i++) {
    const t = await evalIn(`(document.body.innerText||'').slice(0,600)`).catch(() => '');
    stable = t === prev ? stable + 1 : 0;
    prev = t;
    await sleep(250);
  }
  return {
    errors: [...consoleErrors],
    exceptions: [...pageExceptions],
    // Storybook 은 렌더·play 실패 시 에러 표시를 띄운다
    sbError: await evalIn(`(() => {
      const el = document.querySelector('#error-message, .sb-errordisplay_code, #error-stack');
      const shown = document.body.classList.contains('sb-show-errordisplay');
      return shown || el ? (el ? el.textContent.slice(0, 400) : 'errordisplay 표시됨') : null;
    })()`).catch(() => null),
  };
}

const results = [];
const check = (label, pass, detail) => { results.push({ label, pass, detail }); console.log(`  ${pass ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`); };

const STORIES = ['기본','정렬지정','단일선택','복수선택','행클릭과선택','컬럼고정','밀도','상태','내보내기',
  '가상화-1만행','무한스크롤','무한스크롤-선택유지','가상화-컬럼고정','부분로드-전체선택'];

// ══ A. play 함수 실행 결과 ══
console.log('── A. play(상호작용 테스트) 실행 결과 ──');
const playFails = [];
for (const name of STORIES) {
  const r = await openStory(`components-datatable--${name}`);
  // React 의 개발 경고는 실패로 보지 않는다. assertion 실패·예외만 본다.
  const real = [...r.errors, ...r.exceptions].filter((m) =>
    !/Warning:|DevTools|favicon|preload|was preloaded|React Router/i.test(m));
  const ok = !r.sbError && real.length === 0;
  if (!ok) playFails.push({ name, sbError: r.sbError, real });
  await shot(`play-${name}`);
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(16)}${ok ? '' : ` ← ${r.sbError ?? real[0]?.slice(0, 160)}`}`);
}
check(`play 함수 ${STORIES.length}개 스토리 무사 통과`, playFails.length === 0,
  playFails.length ? `실패 ${playFails.length}건: ${playFails.map((f) => f.name).join(', ')}` : '예외·에러 없음');

// ══ B. play 와 무관한 구조 검사 ══
const probe = `(() => {
  const root = document.querySelector('[data-slot="data-table"]');
  const table = root.querySelector('table');
  const rows = root.querySelectorAll('[data-slot="data-table-row"]');
  const scroll = root.querySelector('[data-slot="data-table-scroll"]');
  const head = root.querySelector('thead tr');
  return {
    domRows: rows.length,
    ariaRowCount: table.getAttribute('aria-rowcount'),
    headerRowIndex: head ? head.getAttribute('aria-rowindex') : null,
    rowIndexes: [...rows].slice(0, 3).map(r => r.getAttribute('aria-rowindex')),
    scrollTop: Math.round(scroll.scrollTop),
    scrollHeight: scroll.scrollHeight, clientHeight: scroll.clientHeight,
  };
})()`;

console.log('\n── B. 가상화 구조 (스크롤 0 으로 리셋 후) ──');
await openStory('components-datatable--가상화-1만행');
// play 가 스크롤을 움직였을 수 있으니 명시적으로 되돌린다 — v1 이 놓친 지점
await evalIn(`document.querySelector('[data-slot="data-table-scroll"]').scrollTop = 0`);
await sleep(600);
const b = await evalIn(probe);
check('DOM 행이 전체보다 훨씬 적다', b.domRows > 0 && b.domRows < 100, `${b.domRows}개 / 전체 ${b.ariaRowCount}`);
check('aria-rowcount = 10000', b.ariaRowCount === '10000', b.ariaRowCount);
check('헤더 aria-rowindex = 1', b.headerRowIndex === '1', b.headerRowIndex);
check('스크롤 0 에서 첫 행 aria-rowindex = 2', b.rowIndexes[0] === '2', `앞 3행 ${JSON.stringify(b.rowIndexes)}`);
check('aria-rowindex 가 연속 증가한다',
  b.rowIndexes[1] === String(Number(b.rowIndexes[0]) + 1), JSON.stringify(b.rowIndexes));
await shot('struct-virt-top');

console.log('\n── B. 고정 컬럼 sticky ──');
await openStory('components-datatable--가상화-컬럼고정');
const pin = `(() => {
  const root = document.querySelector('[data-slot="data-table"]');
  const scroll = root.querySelector('[data-slot="data-table-scroll"]');
  const sb = scroll.getBoundingClientRect();
  const row = root.querySelector('[data-slot="data-table-row"]');
  const pinned = [...row.querySelectorAll('td')].filter(c => c.className.includes('data-table-pinned'));
  return {
    scrollLeft: Math.round(scroll.scrollLeft),
    offsets: pinned.map(c => Math.round(c.getBoundingClientRect().left - sb.left)),
    bgs: [...new Set(pinned.map(c => getComputedStyle(c).backgroundColor))],
    maxScroll: scroll.scrollWidth - scroll.clientWidth,
  };
})()`;
await evalIn(`document.querySelector('[data-slot="data-table-scroll"]').scrollLeft = 0`);
await sleep(400);
const q0 = await evalIn(pin);
await evalIn(`const s=document.querySelector('[data-slot="data-table-scroll"]'); s.scrollLeft = s.scrollWidth;`);
await sleep(500);
const q1 = await evalIn(pin);
await shot('struct-pinned-right');
check('가로 스크롤 끝까지 밀어도 고정 오프셋이 유지된다',
  JSON.stringify(q0.offsets) === JSON.stringify(q1.offsets),
  `scrollLeft ${q0.scrollLeft}→${q1.scrollLeft} (최대 ${q1.maxScroll}) · ${JSON.stringify(q0.offsets)} → ${JSON.stringify(q1.offsets)}`);
check('고정 셀 배경이 불투명하다',
  q1.bgs.every((c) => !/rgba\(0, 0, 0, 0\)|transparent/.test(c)), q1.bgs.join(' / '));

console.log('\n── B. 다크 테마 토큰 적용 ──');
await openStory('components-datatable--컬럼고정', '&globals=theme:dark');
const dk = await evalIn(`(() => {
  const root = document.querySelector('[data-slot="data-table"]');
  const cell = root.querySelector('[data-slot="data-table-row"] td');
  const cs = getComputedStyle(cell);
  const rootCs = getComputedStyle(document.documentElement);
  return {
    theme: document.documentElement.getAttribute('data-theme'),
    cellBg: cs.backgroundColor, cellColor: cs.color,
    tokenSurface: rootCs.getPropertyValue('--bg-surface').trim(),
    tokenFg: rootCs.getPropertyValue('--text-primary').trim(),
  };
})()`);
await shot('struct-dark');
check('다크 테마가 적용된다', dk.theme === 'dark', `data-theme=${dk.theme}`);
// 다크에서 셀 배경이 어두워야 한다 (밝으면 토큰이 안 먹은 것)
const rgb = (dk.cellBg.match(/\d+/g) ?? []).map(Number);
const lum = rgb.length >= 3 ? (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255 : 1;
check('다크에서 셀 배경이 어둡다 (토큰이 실제로 먹음)', lum < 0.3,
  `${dk.cellBg} → 휘도 ${lum.toFixed(3)} · 토큰 --bg-surface=${dk.tokenSurface}`);

// ══ 요약 ══
ws.close(); chrome.kill();
const fail = results.filter((r) => !r.pass);
console.log('\n' + '═'.repeat(64));
console.log(`검사 ${results.length}건 · 통과 ${results.length - fail.length} · 실패 ${fail.length}`);
if (fail.length) { console.log('\n실패:'); for (const f of fail) console.log(`  ✗ ${f.label} — ${f.detail}`); }
if (playFails.length) {
  console.log('\nplay 실패 상세:');
  for (const f of playFails) console.log(`  [${f.name}] ${f.sbError ?? ''} ${f.real.join(' | ').slice(0, 500)}`);
}
writeFileSync(`${OUT}/results.json`, JSON.stringify({ results, playFails }, null, 2));
process.exit(fail.length ? 1 : 0);
