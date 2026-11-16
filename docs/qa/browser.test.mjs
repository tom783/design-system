// 브라우저 경로 규칙 테스트.
// macOS 에서 리눅스 CI 를 실행해 볼 수는 없으므로, 최소한 경로 규칙은 여기서 막는다.
// (처음 쓴 코드는 ~/Library/Caches 만 보고 있어서 리눅스에서는 절대 못 찾았다.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playwrightCaches, revisionsNewestFirst, resolveHeadlessShell } from './browser.mjs';

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
