// 안내 렌더 검증 — 기존 render-verify.mjs의 CDP·포커스 에뮬레이션 방식.
// pnpm build-storybook; 정적 서버 :6099 실행 후 node docs/qa/guide-render-verify.mjs
// playComplete가 확인된 뒤에만 캡처한다. JS 폴백은 브라우저 기능 탐지만 강제로 끈다.
import { writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = 'http://localhost:6099';
const OUT = process.argv[2] || './guide-shots';
const PORT = 9487;
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'guide-'))}`,
  '--no-first-run', '--disable-gpu', '--window-size=1440,1000',
  '--force-device-scale-factor=1', '--disable-extensions', 'about:blank',
], { stdio: 'ignore' });
process.on('exit', () => { try { chrome.kill(); } catch {} });

let ws, mid = 0; const pending = new Map();
let consoleErrors = [], pageExceptions = [];
for (let i = 0; i < 80; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const p = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; }
  } catch {}
  await sleep(250);
}
if (!ws) { console.error('Chrome CDP에 연결하지 못했습니다. 브라우저 실행·포트 권한을 확인하세요.'); process.exit(1); }
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id); pending.delete(m.id);
    return m.error ? rej(new Error(m.error.message)) : res(m.result);
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
    consoleErrors.push(m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300));
  if (m.method === 'Runtime.exceptionThrown')
    pageExceptions.push((m.params.exceptionDetails.exception?.description ?? '').slice(0, 300));
};
const cdp = (method, params = {}) => new Promise((res, rej) => {
  pending.set(++mid, { res, rej });
  ws.send(JSON.stringify({ id: mid, method, params }));
  setTimeout(() => { if (pending.has(mid)) { pending.delete(mid); rej(new Error(method + ' 타임아웃')); } }, 40000);
});
await cdp('Page.enable'); await cdp('Runtime.enable');
await cdp('Emulation.setFocusEmulationEnabled', { enabled: true });

const evalIn = async (src) => {
  const r = await cdp('Runtime.evaluate', { expression: src, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result?.value;
};
const shot = async (n) => {
  const r = await cdp('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64'));
};
const results = [];
async function open(id) {
  consoleErrors = []; pageExceptions = [];
  await cdp('Page.navigate', { url: `${BASE}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story` });
  let done = false;
  for (let i = 0; i < 120; i++) {
    done = await evalIn(`!!document.querySelector('[data-play-complete="true"]')`).catch(() => false);
    if (done || consoleErrors.length || pageExceptions.length) break;
    await sleep(100);
  }
  const error = await evalIn(`document.body.classList.contains('sb-show-errordisplay') ? document.body.innerText : null`).catch(() => null);
  const errors = [...consoleErrors, ...pageExceptions].filter(m => !/Warning:|DevTools|favicon|preload/i.test(m));
  return { done, error, errors };
}
async function run(name, suffix = '') {
  const result = await open(`components-guide--${name}`);
  const pass = result.done && !result.error && result.errors.length === 0;
  results.push({ name: name + suffix, pass, ...result });
  console.log(`${pass ? '✓' : '✗'} ${name}${suffix} ${pass ? '' : JSON.stringify(result)}`);
  if (pass) await shot(name + suffix);
}
for (const name of ['툴팁-기본', '툴팁-포커스', '툴팁-테이블안', '힌트', '투어-3단계', '투어-건너뛰기', '투어-대상없음', '투어-단계초과', '모션-감소', '투어-중앙대체', '툴팁-참조병합', '투어-스크롤후표시']) await run(name);
await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await run('모션-감소', '-reduce');
await cdp('Emulation.setEmulatedMedia', { features: [] });
const injected = await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `{
  const original = CSS.supports.bind(CSS);
  CSS.supports = (...args) => args[0] === 'anchor-name' ? false : original(...args);
}` });
for (const name of ['툴팁-포커스', '힌트', '투어-3단계', '투어-대상없음', '투어-중앙대체', '투어-스크롤후표시']) await run(name, '-js');
const closeOnScroll = await open('components-guide--툴팁-포커스');
const fallback = await evalIn(`(() => {
  const tip = document.querySelector('[data-slot="guide-bubble"]');
  const before = tip.matches(':popover-open');
  const rect = tip.getBoundingClientRect();
  document.dispatchEvent(new Event('scroll'));
  return { before, path: tip.dataset.place, finite: [rect.x, rect.y].every(Number.isFinite) };
})()`);
await sleep(50);
const closed = await evalIn(`!document.querySelector('[data-slot="guide-bubble"]').matches(':popover-open')`);
const pass = closeOnScroll.done && fallback.before && fallback.path === 'js' && fallback.finite && closed;
results.push({ name: '폴백 스크롤 닫기', pass, fallback, closed });
console.log(`${pass ? '✓' : '✗'} 폴백 스크롤 닫기`);
await cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier: injected.identifier });
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
ws.close(); chrome.kill();
console.log(`검사 ${results.length}건 · 실패 ${results.filter(r => !r.pass).length}건`);
process.exit(results.every(r => r.pass) ? 0 : 1);
