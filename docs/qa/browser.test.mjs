// 브라우저 경로 규칙 테스트.
// macOS 에서 리눅스 CI 를 실행해 볼 수는 없으므로, 최소한 경로 규칙은 여기서 막는다.
// (처음 쓴 코드는 ~/Library/Caches 만 보고 있어서 리눅스에서는 절대 못 찾았다.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { playwrightCaches, revisionsNewestFirst, resolveHeadlessShell, parityArgs, decodePng, cdpRequests, devToolsActivePort, actions, qs, CANVAS, PLAY_SETTLED } from './browser.mjs';

test('macOS 캐시 경로', () => {
  assert.deepEqual(playwrightCaches({}, 'darwin', '/Users/x'), ['/Users/x/Library/Caches/ms-playwright']);
});

test('리눅스 캐시 경로 — CI 가 쓰는 자리', () => {
  const paths = playwrightCaches({}, 'linux', '/home/x');
  assert.ok(paths.includes('/home/x/.cache/ms-playwright'), paths.join(','));
});

test('리눅스에서 XDG_CACHE_HOME 을 존중한다', () => {
  const paths = playwrightCaches({ XDG_CACHE_HOME: '/custom' }, 'linux', '/home/x');
  assert.ok(paths.includes('/custom/ms-playwright'), paths.join(','));
});

test('Windows 캐시 경로', () => {
  const paths = playwrightCaches({ LOCALAPPDATA: 'C:\\Users\\x\\AppData\\Local' }, 'win32', 'C:\\Users\\x');
  assert.equal(paths.length, 1);
  assert.match(paths[0], /ms-playwright$/);
});

test('PLAYWRIGHT_BROWSERS_PATH 가 최우선', () => {
  assert.deepEqual(playwrightCaches({ PLAYWRIGHT_BROWSERS_PATH: '/opt/pw' }, 'linux', '/home/x'), ['/opt/pw']);
});

test("PLAYWRIGHT_BROWSERS_PATH=0 은 '기본 경로를 써라'는 뜻이라 무시한다", () => {
  const paths = playwrightCaches({ PLAYWRIGHT_BROWSERS_PATH: '0' }, 'linux', '/home/x');
  assert.ok(paths.includes('/home/x/.cache/ms-playwright'));
});

test('리비전은 숫자로 정렬한다 (999 < 1234)', () => {
  assert.deepEqual(
    revisionsNewestFirst(['chromium_headless_shell-999', 'chromium_headless_shell-1234', 'chromium_headless_shell-1208']),
    ['chromium_headless_shell-1234', 'chromium_headless_shell-1208', 'chromium_headless_shell-999'],
  );
});

test('관계없는 디렉터리는 걸러낸다', () => {
  assert.deepEqual(
    revisionsNewestFirst(['chromium-1234', 'ffmpeg-1011', 'chromium_headless_shell-1234', '.DS_Store']),
    ['chromium_headless_shell-1234'],
  );
});

// 이 검사는 **플랫폼과 무관해야 한다.** 존재 확인이 앞에 있으면 리눅스에서는
// 경로가 없어 다른 오류로 새고, macOS 에서만 통과한다 (CI 에서 실제로 깨졌다).
test('GUI 앱 번들을 지정하면 거부한다 — 경로가 없는 플랫폼에서도', () => {
  const prev = process.env.DS_HEADLESS_SHELL;
  process.env.DS_HEADLESS_SHELL = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  try {
    assert.throws(() => resolveHeadlessShell(), /GUI 앱 번들|TransformProcessType/);
  } finally {
    if (prev === undefined) delete process.env.DS_HEADLESS_SHELL; else process.env.DS_HEADLESS_SHELL = prev;
  }
});

test('없는 경로를 지정하면 거부한다', () => {
  const prev = process.env.DS_HEADLESS_SHELL;
  process.env.DS_HEADLESS_SHELL = '/nope/chrome-headless-shell';
  try {
    assert.throws(() => resolveHeadlessShell(), /경로가 없습니다/);
  } finally {
    if (prev === undefined) delete process.env.DS_HEADLESS_SHELL; else process.env.DS_HEADLESS_SHELL = prev;
  }
});

test('환경 맞춤 인자는 마우스 있는 데스크톱 조건뿐 — 스크롤바·힌팅은 가리지 않고 샌드박스는 유지', () => {
  const args = parityArgs();
  assert.ok(args.some((a) => /^--blink-settings=.*primaryHoverType=2.*primaryPointerType=4/.test(a)), args.join(' '));
  // 실제 사용 환경을 가리는 인자는 넣지 않는다 — 클래식 스크롤바에서만 보이는 결함을 놓친다.
  for (const banned of ['--hide-scrollbars', '--font-render-hinting', 'no-sandbox'])
    assert.ok(!args.some((a) => a.includes(banned)), banned);
});

// 필터 5종(None·Sub·Up·Average·Paeth)이 섞인 RGB·RGBA PNG 를 직접 만들어 푼다.
function png(width, height, channels, rows, filters) {
  const chunk = (type, body) => {
    const head = Buffer.alloc(8); head.writeUInt32BE(body.length, 0); head.write(type, 4, 'latin1');
    return Buffer.concat([head, body, Buffer.alloc(4)]); // CRC 는 디코더가 보지 않는다.
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = channels === 4 ? 6 : 2;
  const stride = width * channels; let prev = new Uint8Array(stride);
  const raw = Buffer.concat(rows.map((row, y) => {
    const f = filters[y % filters.length], out = new Uint8Array(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? row[x - channels] : 0, b = prev[x], c = x >= channels ? prev[x - channels] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      out[x] = (row[x] - [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f]) & 255;
    }
    prev = row; return Buffer.concat([Buffer.from([f]), Buffer.from(out)]);
  }));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
for (const channels of [3, 4]) test(`decodePng — ${channels === 4 ? 'RGBA' : 'RGB'}, 필터 0~4`, () => {
  const width = 3, height = 5, color = (x, y) => [(x * 70 + y * 13) & 255, (200 - y * 31) & 255, (x * y * 29 + 7) & 255];
  const rows = Array.from({ length: height }, (_, y) => Uint8Array.from(Array.from({ length: width }, (_, x) => [...color(x, y), 255].slice(0, channels)).flat()));
  const image = decodePng(png(width, height, channels, rows, [0, 1, 2, 3, 4]));
  assert.equal(image.width, width); assert.equal(image.height, height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) assert.deepEqual(image.pixel(x, y), color(x, y), `${x},${y}`);
});

// ── CDP 요청 타이머 ──
// 응답 뒤에도 45초 타이머가 남아 하네스 24개가 매번 약 45초씩 종료를 기다렸다(CI f172d30, 1408초 중 약 1080초).
const timers = () => process.getActiveResourcesInfo().filter((r) => r === 'Timeout').length;

test('cdpRequests: 응답이 오면 타이머가 남지 않는다', async () => {
  const sent = [];
  const before = timers();
  const r = cdpRequests((d) => sent.push(JSON.parse(d)), { timeout: 60000 });
  const p = r.call('Runtime.evaluate', { expression: '1' });
  assert.equal(timers(), before + 1);
  assert.equal(r.settle({ id: sent[0].id, result: { value: 1 } }), true);
  assert.deepEqual(await p, { value: 1 });
  assert.equal(timers(), before);
  assert.equal(r.pending(), 0);
});

test('cdpRequests: 오류 응답도 타이머를 지우고 메시지로 실패한다', async () => {
  const sent = [];
  const before = timers();
  const r = cdpRequests((d) => sent.push(JSON.parse(d)), { timeout: 60000 });
  const p = r.call('Page.navigate');
  r.settle({ id: sent[0].id, error: { message: 'Cannot navigate' } });
  await assert.rejects(p, /Cannot navigate/);
  assert.equal(timers(), before);
});

test('cdpRequests: 진짜로 응답이 없으면 여전히 타임아웃이 난다', async () => {
  const sent = [];
  const before = timers();
  const r = cdpRequests((d) => sent.push(JSON.parse(d)), { timeout: 20 });
  await assert.rejects(r.call('Runtime.evaluate'), /Runtime\.evaluate 타임아웃/);
  assert.equal(r.pending(), 0);
  assert.equal(timers(), before);
  // 타임아웃 뒤 늦게 온 응답은 무시한다(이미 실패로 끝난 요청).
  assert.equal(r.settle({ id: sent[0].id, result: {} }), false);
});

test('cdpRequests: 이벤트(id 없음)는 응답으로 소비하지 않고, 보내기 실패는 타이머 없이 실패한다', async () => {
  const r = cdpRequests(() => {}, { timeout: 60000 });
  assert.equal(r.settle({ method: 'Runtime.consoleAPICalled', params: {} }), false);
  const before = timers();
  const broken = cdpRequests(() => { throw new Error('소켓 닫힘'); }, { timeout: 60000 });
  await assert.rejects(broken.call('Page.enable'), /소켓 닫힘/);
  assert.equal(timers(), before);
});

test('cdpRequests: 응답을 받은 프로세스는 timeout 을 기다리지 않고 바로 끝난다', () => {
  // 같은 프로세스 안의 카운트만으로는 "종료가 붙잡히지 않는다" 는 것을 직접 보지 못한다.
  const script = `import { cdpRequests } from ${JSON.stringify(new URL('./browser.mjs', import.meta.url).href)};
    let r; r = cdpRequests((d) => queueMicrotask(() => r.settle({ id: JSON.parse(d).id, result: {} })), { timeout: 30000 });
    await r.call('Runtime.evaluate');`;
  const t = Date.now();
  const out = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 20000 });
  assert.equal(out.status, 0, out.stderr);
  assert.ok(Date.now() - t < 10000, `종료까지 ${Date.now() - t}ms`);
});

test('devToolsActivePort: 브라우저가 고른 CDP 포트(첫 줄)를 읽고, 아직 없으면 null', () => {
  // 하네스마다 고정 포트를 쓰던 때는 9476·9472 를 두 하네스가 같이 써서 병렬 실행에서 부딪쳤다.
  const dir = mkdtempSync(join(tmpdir(), 'ds-devtools-'));
  try {
    assert.equal(devToolsActivePort(dir), null);
    writeFileSync(join(dir, 'DevToolsActivePort'), '55274\n/devtools/browser/8c51');
    assert.equal(devToolsActivePort(dir), 55274);
    writeFileSync(join(dir, 'DevToolsActivePort'), '');
    assert.equal(devToolsActivePort(dir), null);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ── 공용 조작 도우미 ──
const fakeSession = (evResult = () => true) => {
  const log = [];
  return {
    log,
    cdp: async (method, params) => { log.push([method, params]); return {}; },
    ev: async (expr) => { log.push(['ev', expr]); return evResult(expr); },
    sleep: async (ms) => { log.push(['sleep', ms]); },
  };
};

test('act.key: Enter 는 keyDown + text \\r — text 없는 Enter 는 버튼을 누르지 못한다', async () => {
  const s = fakeSession(); await actions(s).key('Enter');
  assert.deepEqual(s.log, [
    ['Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' }],
    ['Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }],
  ]);
});

test('act.key: raw 는 Enter 가 아닌 키만 rawKeyDown, text:null 은 명시적으로 keydown 만', async () => {
  const a = fakeSession(); await actions(a).key('ArrowDown', { raw: true });
  assert.equal(a.log[0][1].type, 'rawKeyDown'); assert.equal(a.log[0][1].windowsVirtualKeyCode, 40);
  const b = fakeSession(); await actions(b).key('Enter', { raw: true });
  assert.equal(b.log[0][1].type, 'keyDown'); assert.equal(b.log[0][1].text, '\r');
  const c = fakeSession(); await actions(c).key('Enter', { text: null });
  assert.equal(c.log[0][1].type, 'keyDown'); assert.equal('text' in c.log[0][1], false);
  const d = fakeSession(); await actions(d).key(' ', { shift: true });
  assert.deepEqual(d.log[0][1], { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, modifiers: 8 });
  assert.equal(d.log[1][1].modifiers, 8);
});

test('act.press: 조건을 기다리는 동안 누르고 있고, 대기가 실패해도 keyUp 을 보낸다', async () => {
  const s = fakeSession();
  const wait = async (c) => { s.log.push(['wait', c]); throw new Error('시간 초과'); };
  await assert.rejects(actions(s).press('ArrowDown', { raw: true, until: 'ok', wait }), /시간 초과/);
  assert.deepEqual(s.log.map((x) => x[0] === 'wait' ? 'wait' : x[1].type), ['rawKeyDown', 'wait', 'keyUp']);
  const t = fakeSession(); await actions(t).press('Tab');
  assert.deepEqual(t.log.map((x) => x[0] === 'sleep' ? `sleep ${x[1]}` : x[1].type), ['keyDown', 'sleep 120', 'keyUp']);
});

test('act.click·pointerClick·computed: 선택자는 JSON 으로 감싸고 canvas 는 스토리 루트 안에서', async () => {
  assert.equal(qs('[data-x="1"]', 'canvas'), `${CANVAS}.querySelector("[data-x=\\"1\\"]")`);
  const a = fakeSession(); await actions(a).click('#b', { root: 'canvas' });
  assert.deepEqual(a.log, [['ev', `${CANVAS}.querySelector("#b").click()`]]);
  const b = fakeSession((e) => (/getBoundingClientRect/.test(e) ? { x: 5, y: 7 } : true));
  await actions(b).pointerClick('#t');
  assert.deepEqual(b.log.filter((x) => x[0] !== 'ev').map(([, p]) => [p.type, p.x, p.y]),
    [['mouseMoved', 5, 7], ['mousePressed', 5, 7], ['mouseReleased', 5, 7]]);
  const c = fakeSession(() => ['0s', '0s']);
  assert.deepEqual(await actions(c).computed('#p', ['animationDuration', 'transitionDuration']), ['0s', '0s']);
  assert.match(c.log[0][1], /getComputedStyle\(document\.querySelector\("#p"\)\)/);
});

test('act.findPortal: 캔버스 밖 요소를 기다리고, 끝내 없으면 선택자를 대며 실패한다', async () => {
  let n = 0;
  const a = fakeSession(() => ++n >= 3);
  assert.equal(await actions(a).findPortal('[role="listbox"]'), true);
  const b = fakeSession(() => false);
  await assert.rejects(actions(b).findPortal('[role="dialog"]', { timeout: 120 }), /포털 대기 실패: \[role="dialog"\]/);
});

test('PLAY_SETTLED: 표식·오류 화면·play 없는 스토리의 finished 에서 끝난다', () => {
  const run = (doc, render) => new Function('document', 'window', `return ${PLAY_SETTLED};`)(doc, { __STORYBOOK_PREVIEW__: render ? { currentRender: render } : undefined });
  const doc = (flag = false, error = false) => ({ querySelector: () => (flag ? {} : null), body: { classList: { contains: () => error } } });
  assert.equal(run(doc(true)), true);
  assert.equal(run(doc(false, true)), true);
  assert.equal(run(doc(), { phase: 'finished', story: {} }), true);
  assert.equal(run(doc(), { phase: 'finished', story: { playFunction() {} } }), false); // play 가 표식을 세울 것이다
  assert.equal(run(doc(), { phase: 'errored', story: { playFunction() {} } }), true);
  assert.equal(run(doc(), { phase: 'rendering', story: {} }), false);
  assert.equal(run(doc()), false);
});
