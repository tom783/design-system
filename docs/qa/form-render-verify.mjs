// R09 폼 play 검증. 기존 render-verify.mjs의 CDP·포커스 에뮬레이션 방식을 따른다.
// pnpm build-storybook 후 localhost:6099에서 정적 서버를 실행하고 이 파일을 실행한다.
import { writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const BASE = 'http://localhost:6099';
const OUT = '.context/form-qa';
const PORT = 9437;
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(OUT, 'chrome-'))}`,
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
if (!ws) throw new Error('Chrome CDP 연결 실패: 로컬 포트 사용 권한을 확인하세요');
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
  const id = ++mid;
  pending.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params }));
  setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error(method + ' 타임아웃')); } }, 40000);
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


const index = await (await fetch(`${BASE}/index.json`)).json();
const stories = Object.values(index.entries).filter(entry => entry.type === 'story' && entry.title === 'Components/Form');
if (!stories.length) throw new Error('폼 스토리를 찾지 못했습니다');
const results = [];
for (const story of stories) {
  consoleErrors = []; pageExceptions = [];
  await cdp('Page.navigate', { url: `${BASE}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story` });
  let complete = false;
  for (let i = 0; i < 100; i++) {
    complete = await evalIn("document.querySelector('#storybook-root')?.dataset.playComplete === 'true'").catch(() => false);
    if (complete || consoleErrors.length || pageExceptions.length) break;
    await sleep(100);
  }
  const errors = [...consoleErrors, ...pageExceptions];
  const metrics = await evalIn(`(() => {
    const root = document.querySelector('#storybook-root');
    return { reservedHeight: root?.dataset.reservedHeight, formHeight: root?.dataset.formHeight, reservationIncrease: root?.dataset.reservationIncrease };
  })()`);
  const result = { name: story.name, complete, errors, metrics };
  results.push(result);
  console.log(JSON.stringify(result));
  await shot(story.id);
}
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
ws.close(); chrome.kill();
process.exit(results.every(result => result.complete && !result.errors.length) ? 0 : 1);
