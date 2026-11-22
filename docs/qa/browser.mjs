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
// `--no-sandbox` 는 **이 문제의** 해결책이 아니다. Chrome 내부 샌드박스와
// Orca 의 외부 Seatbelt 는 별개라, 꺼도 TransformProcessType 크래시는 그대로다.
//
// ── 헷갈리지 마라: 리눅스 CI 의 "No usable sandbox!" 는 다른 문제다 ──
// Ubuntu 23.10+ 는 AppArmor 로 비특권 user namespace 를 막고, 그래서 Chromium
// zygote 샌드박스가 초기화에 실패한다. 증상만 비슷하고 원인이 다르다.
// 거기서도 `--no-sandbox` 를 쓰지 않는다 — CI 워크플로에서 커널 제한만 풀고
// 샌드박스는 켜둔다 (.github/workflows/verify.yml).
//
// ══ 바이너리 구하기 ══
//
//   npx playwright install chromium-headless-shell
//
// 또는 환경변수로 직접 지정: DS_HEADLESS_SHELL=/path/to/chrome-headless-shell

import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { inflateSync } from 'node:zlib';
import { join } from 'node:path';
import { checkStorybook, sbUrl } from './storybook-target.mjs';

export { sbUrl, DEFAULT_SB_URL } from './storybook-target.mjs';

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
    // GUI 번들 거부가 **먼저**다. 이건 파일시스템이 아니라 의도에 관한 규칙이라
    // 플랫폼과 무관해야 한다. 존재 확인을 앞에 두면 리눅스에서는 그 경로가 없어
    // "경로가 없습니다" 로 새고, 이 규칙을 지키는 테스트가 macOS 에서만 통과한다
    // (실제로 CI 에서 그렇게 깨졌다 — verify 에 단위 테스트를 넣고서야 드러났다).
    if (override.includes('.app/Contents/MacOS/')) {
      throw new Error(
        `DS_HEADLESS_SHELL 이 GUI 앱 번들을 가리킵니다: ${override}\n` +
        '  샌드박스 안에서 TransformProcessType 으로 크래시합니다. chrome-headless-shell 을 쓰세요.',
      );
    }
    if (!existsSync(override)) throw new Error(`DS_HEADLESS_SHELL 경로가 없습니다: ${override}`);
    return override;
  }
  const cache = playwrightCaches().find(existsSync);
  if (!cache) throw new Error(`headless shell 을 찾지 못했습니다.\n  ${INSTALL_HINT}`);
  for (const dir of revisionsNewestFirst(readdirSync(cache))) {
    for (const arch of ARCHES) {
      const bin = join(cache, dir, `chrome-headless-shell-${arch}`, binName());
      if (existsSync(bin)) return bin;
    }
  }
  throw new Error(`headless shell 을 찾지 못했습니다 (${cache} 확인).\n  ${INSTALL_HINT}`);
}

// ── 경로 규칙은 순수 함수로 빼둔다. CI(리눅스)에서 돌려봐야 하는데
//    macOS 에서 그걸 실행해 볼 수는 없으므로 최소한 규칙은 테스트한다. ──

const ARCHES = ['mac-arm64', 'mac-x64', 'linux64', 'linux-arm64', 'win64'];
const binName = (platform = process.platform) => (platform === 'win32' ? 'chrome-headless-shell.exe' : 'chrome-headless-shell');

/** Playwright 브라우저 캐시 후보. PLAYWRIGHT_BROWSERS_PATH 가 최우선이다. */
export function playwrightCaches(env = process.env, platform = process.platform, home = homedir()) {
  if (env.PLAYWRIGHT_BROWSERS_PATH && env.PLAYWRIGHT_BROWSERS_PATH !== '0') return [env.PLAYWRIGHT_BROWSERS_PATH];
  if (platform === 'darwin') return [join(home, 'Library/Caches/ms-playwright')];
  if (platform === 'win32') return [join(env.LOCALAPPDATA ?? join(home, 'AppData/Local'), 'ms-playwright')];
  // 리눅스. XDG 를 따르는 설치본도 있어서 둘 다 본다.
  return [join(home, '.cache/ms-playwright'), join(env.XDG_CACHE_HOME ?? join(home, '.cache'), 'ms-playwright')];
}

/** 리비전이 큰 쪽이 먼저. 자릿수가 달라지면(999 vs 1234) 문자열 정렬이 틀린다. */
export function revisionsNewestFirst(entries) {
  return entries
    .filter((d) => /^chromium_headless_shell-\d+$/.test(d))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
}

/**
 * 헤드리스에 마우스가 있는 데스크톱 조건을 준다.
 * 리눅스 헤드리스는 포인터 장치가 없어 `(hover: hover)`·`(pointer: fine)` 이 false 다(2026-11-22,
 * Debian 컨테이너에서 CI run 45005304379 의 실패를 같은 수치로 재현). Tailwind v4 의 `hover:` 는
 * `@media (hover: hover)` 안이라 CDP 로 실제 포인터를 올려도 호버 색이 안 바뀐다(design-detail D1 10건).
 * 마우스 사용자의 호버 피드백을 검사하는 것이 하네스의 의도이므로 그 장치 조건을 준다 —
 * Playwright 도 데스크톱 컨텍스트에 같은 값을 넘긴다. macOS 는 원래 이 값이라 변화가 없다.
 *
 * 스크롤바·글꼴 힌팅은 일부러 건드리지 않는다. 실제 사용 환경(클래식 스크롤바, 리눅스 힌팅)을
 * 가리면 그 환경의 결함을 놓친다 — 실제로 탭 기준선이 클래식 스크롤바에 가려지던 결함이 이 차이로
 * 드러났다(DESIGN.md §16.1). 그런 차이는 하네스가 실측해서 단정한다.
 */
export function parityArgs() {
  return ['--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4'];
}

/**
 * PNG(8비트 RGB·RGBA, 비인터레이스 — Chrome 스크린샷 형식)를 행 단위 바이트로 푼다.
 * 계산 스타일이 아니라 **실제로 그려진 픽셀**을 봐야 하는 단정(예: 선이 스크롤바에 가려졌는가)에 쓴다.
 * 반환: { width, height, channels, pixel(x, y) → [r, g, b] }
 */
export function decodePng(buffer) {
  if (buffer.readUInt32BE(0) !== 0x89504e47) throw new Error('PNG 가 아니다');
  let pos = 8, width = 0, height = 0, channels = 0;
  const idat = [];
  while (pos < buffer.length) {
    const length = buffer.readUInt32BE(pos), type = buffer.toString('latin1', pos + 4, pos + 8);
    const body = buffer.subarray(pos + 8, pos + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0); height = body.readUInt32BE(4);
      const depth = body[8], color = body[9], interlace = body[12];
      if (depth !== 8 || interlace !== 0 || ![2, 6].includes(color)) throw new Error(`지원하지 않는 PNG (depth ${depth}, color ${color}, interlace ${interlace})`);
      channels = color === 6 ? 4 : 3;
    } else if (type === 'IDAT') idat.push(body);
    else if (type === 'IEND') break;
    pos += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat)), stride = width * channels, rows = [];
  let prev = new Uint8Array(stride);
  for (let y = 0, i = 0; y < height; y++, i += stride + 1) {
    const filter = raw[i], line = Uint8Array.from(raw.subarray(i + 1, i + 1 + stride));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? line[x - channels] : 0, b = prev[x], c = x >= channels ? prev[x - channels] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      line[x] = (line[x] + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter]) & 255;
    }
    rows.push(line); prev = line;
  }
  return { width, height, channels, pixel: (x, y) => [...rows[y].subarray(x * channels, x * channels + 3)] };
}

/**
 * CDP 요청·응답 짝 맞추기. send 는 문자열 한 건을 보내는 함수(ws.send).
 *
 * **응답(오류 포함)이 오면 타이머를 지운다.** 지우지 않으면 마지막 호출 뒤 timeout(45초)
 * 동안 그 타이머가 이벤트 루프를 붙잡아, process.exit() 대신 exitCode 로 끝나는 하네스가
 * 매번 약 45초씩 그냥 기다린다. 실측: 작업 0.2초 → 프로세스 종료 45.2초,
 * CI f172d30 에서 하네스 24개 · 1408초 중 약 1080초.
 * unref 는 하지 않는다 — 브라우저가 죽어 소켓이 닫힌 뒤에도 타임아웃 오류가 나야 한다.
 */
export function cdpRequests(send, { timeout = 45000 } = {}) {
  let mid = 0;
  const pending = new Map();
  const call = (method, params = {}) => new Promise((res, rej) => {
    const id = ++mid;
    const timer = setTimeout(() => {
      if (pending.delete(id)) rej(new Error(`${method} 타임아웃`));
    }, timeout);
    pending.set(id, { res, rej, timer });
    try {
      send(JSON.stringify({ id, method, params }));
    } catch (e) {
      pending.delete(id); clearTimeout(timer); rej(e);
    }
  });
  /** 응답이면 해당 요청을 끝내고 true. 이벤트이거나 이미 끝난(타임아웃 난) 요청이면 false. */
  const settle = (m) => {
    const p = m?.id ? pending.get(m.id) : undefined;
    if (!p) return false;
    pending.delete(m.id);
    clearTimeout(p.timer);
    if (m.error) p.rej(new Error(m.error.message)); else p.res(m.result);
    return true;
  };
  return { call, settle, pending: () => pending.size };
}

/** user-data-dir/DevToolsActivePort 의 첫 줄(포트). 아직 없으면 null. */
export function devToolsActivePort(userDataDir) {
  try {
    const port = Number(readFileSync(join(userDataDir, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
    return Number.isInteger(port) && port > 0 ? port : null;
  } catch { return null; }
}

/**
 * 브라우저를 띄우고 CDP 세션을 연다.
 *
 * CDP 포트는 기본 0 — 브라우저가 빈 포트를 골라 user-data-dir/DevToolsActivePort 에 적고, 그걸 읽는다.
 * 하네스마다 고정 포트(9476·9472 …)를 쓰던 때는 두 하네스가 같은 번호를 써서 병렬 실행
 * (--jobs, 여러 작업 폴더)에서 남의 브라우저에 붙을 수 있었다. 디버깅용으로만 port 를 준다.
 *
 * 반환: { cdp, ev, shot, errors, resetErrors, close }
 *  - ev()   는 예외를 그대로 던진다. 삼키면 조용히 통과하는 검사가 생긴다.
 *  - errors() 는 console.error 와 페이지 예외를 모은 것. 노이즈는 호출부가 거른다.
 */
export async function launchBrowser({
  port = 0,
  windowSize = '1440,1000',
  scale = 1,
  outDir = null,
  timeout = 45000,
} = {}) {
  if (outDir) mkdirSync(outDir, { recursive: true });
  const bin = resolveHeadlessShell();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const userDataDir = mkdtempSync(join(tmpdir(), 'ds-qa-'));
  const proc = spawn(bin, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run', '--disable-gpu',
    `--window-size=${windowSize}`,
    `--force-device-scale-factor=${scale}`,
    ...parityArgs(),
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let launchLog = '';
  proc.stderr.on('data', (d) => { launchLog += d; });
  const kill = () => { try { proc.kill(); } catch { /* 이미 죽었으면 그만 */ } };
  process.on('exit', kill);

  let ws, cdpPort = port || null;
  for (let i = 0; i < 100; i++) {
    if (proc.exitCode !== null) throw new Error(`브라우저가 즉시 종료됨 (code ${proc.exitCode})\n${launchLog.slice(0, 500)}`);
    try {
      cdpPort ??= devToolsActivePort(userDataDir);
      if (!cdpPort) throw new Error('아직 포트 없음');
      const list = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); break; }
    } catch { /* 아직 안 떴다 */ }
    await sleep(150);
  }
  if (!ws) { kill(); throw new Error(`CDP 연결 실패 (port ${cdpPort ?? '미정'})\n${launchLog.slice(0, 500)}`); }
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  const requests = cdpRequests((data) => ws.send(data), { timeout });
  let consoleErrors = [];
  let pageExceptions = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (requests.settle(m)) return;
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      consoleErrors.push(m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300));
    }
    if (m.method === 'Runtime.exceptionThrown') {
      pageExceptions.push((m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text ?? '').slice(0, 300));
    }
  };
  const cdp = requests.call;

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

/**
 * waitPlay 를 끝내도 되는가(브라우저에서 평가). 표식이 섰거나, Storybook 렌더 단계로 보아 더 기다려도
 * 표식이 서지 않을 때 true. 2026-11-23 실측: 하네스 29개의 waitPlay 열기 273회는 전부 표식이 섰다
 * (표식 없는 스토리는 waitPlay:false 로 연다). 새 하네스가 그걸 빠뜨려도 14초씩 잃지 않게 둔 방어다.
 */
export const PLAY_SETTLED = `(() => {
  if (document.querySelector('[data-play-complete="true"]')) return true;
  if (document.body?.classList.contains('sb-show-errordisplay')) return true; // 없는 스토리·렌더 오류 — 아래에서 보고한다
  const r = window.__STORYBOOK_PREVIEW__?.currentRender;
  if (!r) return false;
  if (r.phase === 'errored' || r.phase === 'aborted') return true;
  return r.phase === 'finished' && !r.story?.playFunction;
})()`;

const checked = new Map();
/**
 * 검사할 스토리북 주소(DS_SB_URL, 없으면 6099). **처음 부를 때 서버가 이 작업 폴더의 HEAD 빌드인지
 * 확인한다** — nonce·build-info(storybook-target.mjs). 아니면 던진다. 남의 서버를 검사하고 통과하는 것을 막는다.
 * 고정 주소를 하네스에 쓰지 말고 이것을 쓴다(함정 린트가 6099 를 막는다).
 */
export function storybookBase(base = sbUrl()) {
  if (!checked.has(base)) {
    checked.set(base, checkStorybook({ base }).then((r) => {
      if (r.warning) console.error(r.warning);
      return r.base;
    }));
  }
  return checked.get(base);
}

/** 스토리북 iframe 탐색 헬퍼. 하네스마다 복사하던 부분이다. */
export function storybook(session, { base: fixedBase } = {}) {
  const { cdp, ev, sleep, errors, resetErrors } = session;
  return {
    /**
     * @param waitPlay  play 가 data-play-complete 를 세울 때까지 기다린다(최대 14초).
     *                  play 가 **없는** 스토리가 렌더를 마쳤거나, play 가 오류로 끝났거나, 스토리가 없어
     *                  오류 화면이 뜨면 바로 멈춘다 —
     *                  그 표식은 영영 서지 않으므로 14초를 그냥 버리게 된다(PLAY_SETTLED).
     *                  **play 는 열었다가 전부 닫고 끝난다** — 사후 상태를
     *                  "열려 있다"고 가정하지 마라. 필요한 상태는 직접 만들어라.
     */
    async open(id, { extra = '', waitPlay = true, stable = false } = {}) {
      const base = await storybookBase(fixedBase);
      resetErrors();
      await cdp('Page.navigate', { url: `${base}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story${extra}` });
      for (let i = 0; i < 80; i++) {
        if (await ev('document.readyState').catch(() => '') === 'complete') break;
        await sleep(150);
      }
      if (waitPlay) {
        for (let i = 0; i < 70; i++) {
          if (await ev(PLAY_SETTLED).catch(() => false)) break;
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
      // #error-message 는 오류가 없어도 빈 채로 존재한다(레이아웃에 따라).
      // 요소의 존재만으로 오류 처리하면 멀쩡한 스토리가 ''(빈 문자열) 오류로 잡힌다 —
      // 실제로 components-toast--다크 가 그렇게 거짓 실패했다.
      // 판정 기준은 "표시 중인 오류 화면" 이거나 "실제 오류 문구가 있음" 이다.
      const sbError = await ev(`(() => {
        const shown = document.body.classList.contains('sb-show-errordisplay');
        const text = (document.querySelector('#error-message')?.textContent ?? '').trim();
        return shown || text ? (text.slice(0, 300) || 'errordisplay') : null; })()`).catch(() => null);

      // 빈 페이지는 "오류 없음"으로 보인다. 서버가 엉뚱한 디렉터리에서 돌거나(404)
      // 스토리 id 가 틀리면 모든 검사가 조용히 통과해버린다 — 실제로 당했다.
      // 캔버스가 비어 있으면 뒤따르는 단언이 전부 무의미하므로 여기서 멈춘다.
      if (!sbError) {
        // 렌더를 기다렸다가 판정한다. waitPlay:false 로 열면 React 마운트 전이라
        // 한 번만 보면 멀쩡한 스토리도 '비어 있음' 으로 잡힌다.
        let rendered = -1;
        for (let i = 0; i < 40; i++) {
          rendered = await ev(`(() => { const r = ${CANVAS};
            return r ? r.innerHTML.trim().length : -1; })()`).catch(() => -1);
          if (rendered > 0) break;
          await sleep(125);
        }
        if (rendered <= 0) {
          throw new Error(
            `스토리가 렌더되지 않았습니다: ${id}\n` +
            `  캔버스 ${rendered === -1 ? '없음(#storybook-root 부재)' : '비어 있음'}.\n` +
            `  ${base} 가 storybook-static 을 서빙하는지, 스토리 id 가 맞는지 확인하세요.`,
          );
        }
      }
      return { errors: errors().filter((m) => !/Warning:|DevTools|favicon|preload/i.test(m)), sbError };
    },
  };
}

/** 캔버스 안에서만 찾아라. document.querySelector 는 스토리북 자체 UI 를 잡는다. */
export const CANVAS = "(document.querySelector('#storybook-root')||document.querySelector('#root'))";

// ══ 공용 조작 도우미 ══
// 하네스 20여 개가 key·click·press·enter·pointer 를 저마다 다시 정의하고 있었다(31곳). 차이가 실제로
// 필요한 것(raw 키다운·키 사이 대기·Enter 의 text 생략)은 옵션으로 남기고 몸통은 여기 하나로 둔다.
// 하네스는 원래 서명을 지키는 한 줄 어댑터만 둔다 — 호출부와 동작은 그대로다.

/** windowsVirtualKeyCode. */
export const KEY_CODES = {
  Backspace: 8, Tab: 9, Enter: 13, Escape: 27, ' ': 32, PageUp: 33, PageDown: 34,
  End: 35, Home: 36, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Delete: 46,
};

/** 선택자 → 요소 표현식. root 'canvas' 는 스토리 루트 안에서 찾는다. CANVAS 를 선택자 문자열에 붙이지 않는다(함정). */
export const qs = (selector, root = 'document') =>
  `${root === 'canvas' ? CANVAS : 'document'}.querySelector(${JSON.stringify(selector)})`;

/**
 * 세션에 묶은 조작 도우미. const act = actions(browser)
 *
 * key(name, opts) — 키 하나를 누르고 뗀다.
 *   Enter 는 keyDown + text '\r' 로 보낸다. 버튼의 Enter 활성화는 keypress(=text)에서 일어나서 text 없는
 *   Enter 는 실제 키 입력을 재현하지 못한다(함정 린트가 막는다). keydown 만 봐야 하면 { text: null }.
 *   raw: true    Enter 가 아닌 키를 rawKeyDown 으로(화살표가 Radix keydown/keyup 추적을 살리려면 필요)
 *   keyCode·code 기본은 KEY_CODES[name]·name(' ' 은 'Space')
 *   shift        modifiers 8
 *   unmodifiedText  text 와 같은 값을 unmodifiedText 로도 보낸다
 *   hold         keyDown 과 keyUp 사이: ms 이거나 async 함수(조건 대기). 라이브러리가 keydown 중 세운
 *                상태를 keyup 이 지우기 전에 읽을 때 쓴다. 실패해도 keyUp 은 보낸다.
 * press(name, { until, wait, ...key 옵션 }) — until 조건을 wait 로 기다리는 동안 누르고 있는다(없으면 120ms).
 * enter(opts)            — key('Enter', opts)
 * click(selector, { root })        — 요소의 .click(). 좌표를 쓰지 않는다(스크롤·애니메이션에 흔들림).
 * pointerAt(x, y)                  — 진짜 포인터: 이동·누름·뗌(바깥 클릭처럼 꼭 필요할 때만).
 * pointerClick(selector, { root }) — 요소를 nearest 로 끌어와 가운데를 진짜 포인터로 누른다(Radix pointerdown).
 * computed(selector, props, { root }) — getComputedStyle 값 배열.
 * findPortal(selector, { timeout })   — 캔버스 **밖**(document.body 포털)에 그 요소가 생길 때까지 기다린다.
 */
export function actions(session) {
  const { cdp, ev } = session;
  const sleep = session.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  async function key(name, { keyCode = KEY_CODES[name], code = name === ' ' ? 'Space' : name, raw = false,
    text = name === 'Enter' ? '\r' : null, unmodifiedText = false, shift = false, hold } = {}) {
    const base = { key: name, code, windowsVirtualKeyCode: keyCode, ...(shift ? { modifiers: 8 } : {}) };
    const typed = text != null ? { text, ...(unmodifiedText ? { unmodifiedText: text } : {}) } : {};
    await cdp('Input.dispatchKeyEvent', { type: text != null || !raw ? 'keyDown' : 'rawKeyDown', ...base, ...typed });
    try {
      if (typeof hold === 'function') await hold();
      else if (hold) await sleep(hold);
    } finally {
      await cdp('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
    }
  }
  const pointerAt = async (x, y) => {
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  };
  return {
    key,
    press: (name, { until, wait, ...opts } = {}) => key(name, { ...opts, hold: until ? () => wait(until) : 120 }),
    enter: (opts) => key('Enter', opts),
    click: (selector, { root } = {}) => ev(`${qs(selector, root)}.click()`),
    pointerAt,
    async pointerClick(selector, { root } = {}) {
      await ev(`${qs(selector, root)}.scrollIntoView({ block: 'nearest' })`);
      const p = await ev(`(() => { const r = ${qs(selector, root)}.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
      await pointerAt(p.x, p.y);
    },
    computed: (selector, props, { root } = {}) =>
      ev(`(() => { const s = getComputedStyle(${qs(selector, root)}); return ${JSON.stringify(props)}.map((p) => s[p]); })()`),
    async findPortal(selector, { timeout = 3000 } = {}) {
      const expr = `[...document.querySelectorAll(${JSON.stringify(selector)})].some((el) => !${CANVAS}?.contains(el))`;
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) { if (await ev(expr).catch(() => false)) return true; await sleep(50); }
      throw new Error(`포털 대기 실패: ${selector} (${timeout}ms)`);
    },
  };
}
