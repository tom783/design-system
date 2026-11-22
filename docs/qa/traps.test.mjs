// 함정 린트 — AGENTS.md "이미 밟은 함정" 중 기계로 잡을 수 있는 것.
// 한 번 밟은 것을 사람 기억에 맡기지 않는다. 걸리면 그 절을 읽고 고친다.
// 일부러 그렇게 쓰는 곳은 같은 줄이나 바로 위 두 줄에 `함정 예외: <이유>` 를 적는다(Enter 규칙만).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const qaDir = join(root, 'docs/qa');
const read = (path) => readFileSync(path, 'utf8');
const rel = (path) => relative(root, path);
const qaFiles = readdirSync(qaDir).filter((f) => f.endsWith('.mjs') && !f.endsWith('.test.mjs')).map((f) => join(qaDir, f));
// 하네스와 측정 스크립트 — 도우미(browser·storybook-target·static-server)는 함정을 설명·거부하느라 문자열을 품는다.
const HELPERS = new Set(['browser.mjs', 'storybook-target.mjs', 'static-server.mjs']);
const harnessFiles = qaFiles.filter((f) => !HELPERS.has(f.split('/').pop()));
const isComment = (line) => /^\s*(\/\/|\*|\/\*)/.test(line);
const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
};

/** 주석이 아닌 줄에서 re 에 걸리는 곳: ["파일:줄  내용"] */
function scan(files, re) {
  const hits = [];
  for (const f of files) {
    read(f).split('\n').forEach((line, i) => {
      if (!isComment(line) && re.test(line)) hits.push(`${rel(f)}:${i + 1}  ${line.trim().slice(0, 120)}`);
    });
  }
  return hits;
}
const none = (hits, why) => assert.deepEqual(hits, [], `${why}\n  ${hits.join('\n  ')}`);

test('함정: Enter 를 text 없이 keyDown 으로 보내지 않는다', () => {
  // 버튼의 Enter 활성화는 keypress(=text '\r')에서 일어난다. text 없는 Enter 는 실제 키 입력을
  // 재현하지 못해 "Enter 가 안 먹는다" 는 거짓 실패나, 반대로 먹어야 할 것을 못 보는 거짓 통과를 만든다.
  // 공용 act.key('Enter') 는 text 를 붙인다. 일부러 keydown 만 볼 때는 { text: null } 이나 함정 예외 주석.
  const hits = [];
  for (const f of harnessFiles) {
    const src = read(f), lines = src.split('\n');
    for (const m of src.matchAll(/dispatchKeyEvent['"]\s*,\s*\{([^}]*)\}/g)) {
      const body = m[1];
      if (!/key\s*:\s*['"]Enter['"]/.test(body) || !/type\s*:\s*['"](?:raw)?[kK]eyDown['"]/.test(body) || /\btext\s*:/.test(body)) continue;
      const line = src.slice(0, m.index).split('\n').length;
      if (lines.slice(Math.max(0, line - 3), line).some((l) => l.includes('함정 예외:'))) continue;
      hits.push(`${rel(f)}:${line}  ${lines[line - 1].trim().slice(0, 120)}`);
    }
  }
  none(hits, 'text 없는 Enter keyDown — act.key(\'Enter\') 를 쓰거나 이유를 `함정 예외:` 로 적어라 (AGENTS.md 함정)');
});

test('함정: CANVAS 를 선택자 문자열에 붙이지 않는다 — JS 표현식이다', () => {
  // `${CANVAS} [data-x]` 를 querySelector 에 넘기면 SyntaxError 다. ${CANVAS}.querySelector(...) 로 쓴다.
  none(scan(harnessFiles, /\$\{CANVAS\}(?:\s+[[#.:*>a-zA-Z]|[[>#])|querySelector(?:All)?\(\s*`\$\{CANVAS\}/),
    'CANVAS 를 선택자로 이어 붙였다 — ${CANVAS}.querySelector(...) 나 act.click(sel, { root: \'canvas\' })');
});

test('함정: 하네스는 고정 6099 대신 storybookBase()(DS_SB_URL)로 서버를 찾는다', () => {
  // 고정 포트는 다른 작업 폴더의 서버를 검사하고 통과하게 만든다(2026-11-22).
  none(scan(harnessFiles, /6099/), '고정 6099 — storybookBase() 를 쓰면 DS_SB_URL·nonce·build-info 확인을 거친다');
});

test('함정: CDP 포트를 고정하지 않는다 — 브라우저가 고른다', () => {
  // 9476·9472 를 두 하네스가 같이 써서 병렬 실행에서 남의 브라우저에 붙을 수 있었다.
  none(scan(harnessFiles, /launchBrowser\(\{[^}]*\bport\s*:/), 'launchBrowser({ port }) — 빼면 DevToolsActivePort 로 빈 포트를 쓴다');
});

test('함정: GUI Chrome 바이너리·--headless=new·--no-sandbox 를 쓰지 않는다', () => {
  // macOS 샌드박스에서 GUI 바이너리는 TransformProcessType 에서 abort 한다. --headless=new 도 같은 경로다.
  // --no-sandbox 는 그 문제의 해결책이 아니고 보안만 약해진다(리눅스 CI 는 커널 제한만 푼다).
  none(scan(harnessFiles, /\.app\/Contents\/MacOS|['"`]--headless(?:=new)?['"`]/), 'GUI Chrome 직접 실행 — browser.mjs launchBrowser() 를 거쳐라');
  const workflows = walk(join(root, '.github')).filter((f) => /\.ya?ml$/.test(f));
  none(scan([...qaFiles, ...workflows], /['"]--no-sandbox['"]|^\s*[^#]*\s--no-sandbox\b/), '--no-sandbox — 샌드박스는 켜 둔다');
});

test('함정: npx http-server 로 하네스 서버를 띄우지 않는다', () => {
  // 바인드에 실패해도 조용히 죽어 남의 서버를 검사하게 했다. static-server.mjs(run-all)를 쓴다.
  const hooks = walk(join(root, '.githooks'));
  none(scan([...harnessFiles, ...hooks], /http-server/), 'http-server — pnpm qa(run-all) 나 node docs/qa/static-server.mjs');
});

test('함정: 글자 크기를 text-[var(--…)] 로 쓰지 않는다 — text-[length:var(--…)]', () => {
  // Tailwind 가 color 로 컴파일하고 tailwind-merge 가 함께 쓴 글자색을 지운다.
  const src = walk(join(root, 'packages/ui/src')).filter((f) => /\.(tsx?|mdx)$/.test(f));
  none(scan(src, /text-\[var\(--/), 'text-[var(--x)] — text-[length:var(--x)] 로 명시하라');
});
