// 브라우저 경로 규칙 테스트.
// macOS 에서 리눅스 CI 를 실행해 볼 수는 없으므로, 최소한 경로 규칙은 여기서 막는다.
// (처음 쓴 코드는 ~/Library/Caches 만 보고 있어서 리눅스에서는 절대 못 찾았다.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { playwrightCaches, revisionsNewestFirst, resolveHeadlessShell, parityArgs, decodePng } from './browser.mjs';

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
