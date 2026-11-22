// 남의 서버를 검사하지 못하게 하는 장치들의 테스트 — 정적 서버·nonce·build-info.
// 2026-11-22 에 run-all 이 다른 작업 폴더의 6099 를 자기 서버로 받아들이고 통과한 적이 있다.
// 실제 소켓을 쓰지만 포트는 0(빈 포트)만 쓴다. 고정 포트를 잡으면 다른 작업과 부딪친다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { portTaken, startStaticServer } from './static-server.mjs';
import {
  BUILD_INFO_FILE, NONCE_FILE, checkStorybook, judgeBuildInfo, sbUrl, strictMode, writeBuildInfo, writeNonce,
} from './storybook-target.mjs';

const HEAD = { sha: 'a'.repeat(40), dirty: false };
const tempBuild = (info = { sha: HEAD.sha, dirty: false, builtAt: 'x' }) => {
  const dir = mkdtempSync(join(tmpdir(), 'ds-sb-'));
  writeFileSync(join(dir, 'index.json'), '{"entries":{}}');
  if (info) writeFileSync(join(dir, BUILD_INFO_FILE), JSON.stringify(info));
  return dir;
};

test('주소·엄격 모드: DS_SB_URL 이 없으면 6099, CI=true·DS_QA_STRICT=1 이면 엄격', () => {
  assert.equal(sbUrl({}), 'http://localhost:6099');
  assert.equal(sbUrl({ DS_SB_URL: 'http://127.0.0.1:5000/' }), 'http://127.0.0.1:5000');
  assert.equal(strictMode({}), false);
  assert.equal(strictMode({ CI: 'true' }), true);
  assert.equal(strictMode({ DS_QA_STRICT: '1' }), true);
});

test('build-info 판정: 없음·sha 불일치는 거부, dirty 는 로컬 경고·엄격 거부', () => {
  assert.equal(judgeBuildInfo(null, HEAD).ok, false);
  assert.equal(judgeBuildInfo({ sha: 'b'.repeat(40) }, HEAD).ok, false);
  assert.match(judgeBuildInfo({ sha: 'b'.repeat(40) }, HEAD).message, /HEAD\(aaaaaaa\)/);
  assert.deepEqual(judgeBuildInfo({ sha: HEAD.sha, dirty: false }, HEAD), { ok: true, message: null });
  const local = judgeBuildInfo({ sha: HEAD.sha, dirty: true }, HEAD);
  assert.equal(local.ok, true); assert.match(local.message, /^경고/);
  assert.equal(judgeBuildInfo({ sha: HEAD.sha, dirty: true }, HEAD, { strict: true }).ok, false);
  assert.equal(judgeBuildInfo({ sha: HEAD.sha }, { sha: null }).ok, false);
});

test('정적 서버: 포트 0 은 빈 포트, 파일을 캐시 없이 주고 폴더 밖은 막는다', async () => {
  const dir = tempBuild();
  const s = await startStaticServer({ root: dir });
  try {
    assert.ok(s.port > 0);
    const r = await fetch(`${s.url}/index.json`);
    assert.equal(r.status, 200);
    // 출처 파일만 no-store. 나머지(글꼴 등)를 no-store 로 하면 스토리마다 글꼴을 다시 받아 play 도중
    // 레이아웃이 바뀐다(peek '다녀온행' 리눅스 CI 실패, run 45052756950).
    assert.equal(r.headers.get('cache-control'), 'public, max-age=3600');
    writeFileSync(join(dir, NONCE_FILE), 'n');
    assert.equal((await fetch(`${s.url}/${NONCE_FILE}`)).headers.get('cache-control'), 'no-store');
    assert.equal((await fetch(`${s.url}/${BUILD_INFO_FILE}`)).headers.get('cache-control'), 'no-store');
    assert.match(r.headers.get('content-type'), /application\/json/);
    assert.equal((await fetch(`${s.url}/없음.js`)).status, 404);
    // URL 파서가 %2e%2e 는 정규화하므로 %2f 로 감싼 상위 경로로 시험한다.
    assert.equal((await fetch(`${s.url}/..%2f..%2fetc%2fpasswd`)).status, 403);
  } finally { await s.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('정적 서버: 지정한 포트가 차 있으면 listen 전에 즉시 실패한다', async () => {
  const other = createServer((_, res) => res.end('남의 서버'));
  await new Promise((r) => other.listen(0, '127.0.0.1', r));
  const { port } = other.address();
  const dir = tempBuild();
  try {
    assert.equal(await portTaken(port), true);
    const t = Date.now();
    await assert.rejects(startStaticServer({ root: dir, port }), /이미 다른 프로세스가 쓰고 있습니다/);
    assert.ok(Date.now() - t < 3000, '기다리지 않고 바로 실패');
  } finally { other.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('nonce: 다른 폴더를 서빙하는 서버는 거부한다', async () => {
  const mine = tempBuild(), theirs = tempBuild();
  const myNonce = writeNonce(mine); writeNonce(theirs);
  const s = await startStaticServer({ root: theirs });
  try {
    await assert.rejects(
      checkStorybook({ base: s.url, env: { DS_SB_NONCE: myNonce }, staticDir: mine, head: HEAD }),
      /nonce 불일치/,
    );
  } finally { await s.close(); rmSync(mine, { recursive: true, force: true }); rmSync(theirs, { recursive: true, force: true }); }
});

test('nonce·build-info: 내 폴더·같은 sha 면 통과, sha 가 다르면 거부', async () => {
  const dir = tempBuild();
  const nonce = writeNonce(dir);
  const s = await startStaticServer({ root: dir });
  try {
    const ok = await checkStorybook({ base: s.url, env: { DS_SB_NONCE: nonce }, staticDir: dir, head: HEAD });
    assert.equal(ok.base, s.url);
    assert.equal(ok.warning, null);
    await assert.rejects(
      checkStorybook({ base: s.url, env: { DS_SB_NONCE: nonce }, staticDir: dir, head: { sha: 'c'.repeat(40), dirty: false } }),
      /HEAD\(ccccccc\)와 다릅니다/,
    );
  } finally { await s.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('nonce: 단독 실행(DS_SB_NONCE 없음)은 내 빌드 폴더의 값을 쓰고, 없으면 새로 만든다', async () => {
  const dir = tempBuild();
  const s = await startStaticServer({ root: dir });
  try {
    const r = await checkStorybook({ base: s.url, env: {}, staticDir: dir, head: HEAD });
    assert.equal(r.base, s.url);
  } finally { await s.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('서버가 없으면 기다리지 않고 실패한다', async () => {
  const dir = tempBuild();
  const s = await startStaticServer({ root: dir });
  const url = s.url; await s.close();
  try {
    await assert.rejects(checkStorybook({ base: url, env: { DS_SB_NONCE: 'x' }, staticDir: dir, head: HEAD }), /읽지 못했습니다/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('writeBuildInfo: sha·dirty·builtAt 를 남긴다', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ds-sb-'));
  try {
    const info = writeBuildInfo(dir, { sha: HEAD.sha, dirty: true }, new Date('2026-11-23T00:00:00Z'));
    assert.deepEqual(info, { sha: HEAD.sha, dirty: true, builtAt: '2026-11-23T00:00:00.000Z' });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
