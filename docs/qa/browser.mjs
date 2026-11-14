// 검증용 헤드리스 브라우저 — 모든 CDP 하네스가 여기를 거친다.
//
// ══ 왜 GUI Chrome 을 쓰지 않는가 ══
//
// `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` 을 직접 실행하면
// 에이전트 샌드박스(Orca/Codex 의 Seatbelt) 안에서 **크래시한다.** 실제 리포트:
//
//   Parent Process: node   ·   Responsible Process: Orca
//   Termination Reason: SIGNAL 6, Abort trap
//     abort()
//     ___RegisterApplication_block_invoke
//     _RegisterApplication
//     TransformProcessType          ← Chrome 이 GUI 앱으로 등록을 시도
//     ChromeMain
//
// `--headless=new` 는 **GUI 바이너리를 창 없이 돌리는 것**이라 그대로
// `TransformProcessType` 을 호출하고, 샌드박스 안에서는 coreservicesd 체크인이
// 실패해 abort 한다. 헤드리스라고 안전한 게 아니다.
//
// `chrome-headless-shell` 은 AppKit·LaunchServices 를 아예 링크하지 않는 별도
// 바이너리라 이 경로를 타지 않는다. 기동도 더 빠르다(실측 342ms).
//
// `--no-sandbox` 는 해결책이 아니다. Chrome 내부 샌드박스와 Orca 의 외부
// Seatbelt 는 별개이고, 끄면 보안만 약해지고 크래시는 그대로다.
//
// ══ 바이너리 구하기 ══
//
//   npx playwright install chromium-headless-shell
//
// 또는 환경변수로 직접 지정: DS_HEADLESS_SHELL=/path/to/chrome-headless-shell

import { spawn } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

const INSTALL_HINT =
  'npx playwright install chromium-headless-shell\n' +
  '  또는 DS_HEADLESS_SHELL=/path/to/chrome-headless-shell 로 경로를 지정하세요.';

/**
 * headless shell 바이너리를 찾는다.
 *
 * **GUI Chrome 으로 폴백하지 않는다.** 조용히 폴백하면 이 파일이 막으려는
 * 크래시가 그대로 돌아온다. 못 찾으면 설치 방법과 함께 던진다.
 */
export function resolveHeadlessShell() {
  const override = process.env.DS_HEADLESS_SHELL;
  if (override) {
    if (!existsSync(override)) throw new Error(`DS_HEADLESS_SHELL 경로가 없습니다: ${override}`);
    if (override.includes('.app/Contents/MacOS/')) {
      throw new Error(
        `DS_HEADLESS_SHELL 이 GUI 앱 번들을 가리킵니다: ${override}\n` +
        '  샌드박스 안에서 TransformProcessType 으로 크래시합니다. chrome-headless-shell 을 쓰세요.',
      );
    }
    return override;
  }
  const cache = join(homedir(), 'Library/Caches/ms-playwright');
  if (!existsSync(cache)) throw new Error(`headless shell 을 찾지 못했습니다.\n  ${INSTALL_HINT}`);
  // 리비전 번호가 큰 쪽이 최신이다. 자릿수가 달라지면(999 vs 1234) 문자열 정렬이 틀린다.
  const dirs = readdirSync(cache)
    .filter((d) => d.startsWith('chromium_headless_shell-'))
    .sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]));
  for (const dir of dirs.reverse()) {
    for (const arch of ['mac-arm64', 'mac-x64', 'linux64', 'win64']) {
      const bin = join(cache, dir, `chrome-headless-shell-${arch}`, 'chrome-headless-shell');
      if (existsSync(bin)) return bin;
    }
  }
  throw new Error(`headless shell 을 찾지 못했습니다 (${cache} 확인).\n  ${INSTALL_HINT}`);
}

/**
 * 브라우저를 띄우고 CDP 세션을 연다.
 *
 * 반환: { cdp, ev, shot, errors, resetErrors, close }
 *  - ev()   는 예외를 그대로 던진다. 삼키면 조용히 통과하는 검사가 생긴다.
 *  - errors() 는 console.error 와 페이지 예외를 모은 것. 노이즈는 호출부가 거른다.
 */
export async function launchBrowser({
  port,
  windowSize = '1440,1000',
  scale = 1,
  outDir = null,
  timeout = 45000,
} = {}) {
  if (!port) throw new Error('launchBrowser: port 가 필요합니다 (하네스마다 달라야 동시 실행이 가능).');
  if (outDir) mkdirSync(outDir, { recursive: true });
  const bin = resolveHeadlessShell();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const proc = spawn(bin, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), 'ds-qa-'))}`,
    '--no-first-run', '--disable-gpu',
    `--window-size=${windowSize}`,
    `--force-device-scale-factor=${scale}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let launchLog = '';
  proc.stderr.on('data', (d) => { launchLog += d; });
  const kill = () => { try { proc.kill(); } catch { /* 이미 죽었으면 그만 */ } };
  process.on('exit', kill);

  let ws;
  for (let i = 0; i < 100; i++) {
    if (proc.exitCode !== null) throw new Error(`브라우저가 즉시 종료됨 (code ${proc.exitCode})\n${launchLog.slice(0, 500)}`);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); break; }
    } catch { /* 아직 안 떴다 */ }
    await sleep(150);
  }
  if (!ws) { kill(); throw new Error(`CDP 연결 실패 (port ${port})\n${launchLog.slice(0, 500)}`); }
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let mid = 0;
  const pending = new Map();
  let consoleErrors = [];
  let pageExceptions = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      return m.error ? rej(new Error(m.error.message)) : res(m.result);
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      consoleErrors.push(m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300));
    }
    if (m.method === 'Runtime.exceptionThrown') {
      pageExceptions.push((m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text ?? '').slice(0, 300));
    }
  };
  const cdp = (method, params = {}) => new Promise((res, rej) => {
    const id = ++mid;
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error(`${method} 타임아웃`)); } }, timeout);
  });

  await cdp('Page.enable');
  await cdp('Runtime.enable');
  // 헤드리스는 창에 포커스가 없다. 켜지 않으면 포커스 검사가 전부 거짓 실패한다.
  await cdp('Emulation.setFocusEmulationEnabled', { enabled: true });

  const ev = async (expression) => {
    const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result?.value;
  };
  const shot = async (name) => {
    const r = await cdp('Page.captureScreenshot', { format: 'png' });
    if (outDir) writeFileSync(join(outDir, `${name}.png`), Buffer.from(r.data, 'base64'));
    return r.data;
  };

  return {
    cdp, ev, shot, sleep,
    errors: () => [...consoleErrors, ...pageExceptions],
    resetErrors: () => { consoleErrors = []; pageExceptions = []; },
    close: () => { try { ws.close(); } catch { /* 이미 닫힘 */ } kill(); },
  };
}

/** 스토리북 iframe 탐색 헬퍼. 하네스마다 복사하던 부분이다. */
export function storybook(session, { base = 'http://localhost:6099' } = {}) {
  const { cdp, ev, sleep, errors, resetErrors } = session;
  return {
    /**
     * @param waitPlay  play 가 data-play-complete 를 세울 때까지 기다린다.
     *                  **play 는 열었다가 전부 닫고 끝난다** — 사후 상태를
     *                  "열려 있다"고 가정하지 마라. 필요한 상태는 직접 만들어라.
     */
    async open(id, { extra = '', waitPlay = true, stable = false } = {}) {
      resetErrors();
      await cdp('Page.navigate', { url: `${base}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story${extra}` });
      for (let i = 0; i < 80; i++) {
        if (await ev('document.readyState').catch(() => '') === 'complete') break;
        await sleep(150);
      }
      if (waitPlay) {
        for (let i = 0; i < 70; i++) {
          if (await ev('!!document.querySelector(\'[data-play-complete="true"]\')').catch(() => false)) break;
          await sleep(200);
        }
      }
      if (stable) {
        let prev = -1, same = 0;
        for (let i = 0; i < 60 && same < 3; i++) {
          const len = await ev('document.body.innerHTML.length').catch(() => 0);
          same = len === prev ? same + 1 : 0; prev = len; await sleep(200);
        }
      }
      return {
        errors: errors().filter((m) => !/Warning:|DevTools|favicon|preload/i.test(m)),
        sbError: await ev(`(() => { const el = document.querySelector('#error-message');
          return document.body.classList.contains('sb-show-errordisplay') || el
            ? (el ? el.textContent.slice(0, 300) : 'errordisplay') : null; })()`).catch(() => null),
      };
    },
  };
}

/** 캔버스 안에서만 찾아라. document.querySelector 는 스토리북 자체 UI 를 잡는다. */
export const CANVAS = "(document.querySelector('#storybook-root')||document.querySelector('#root'))";
