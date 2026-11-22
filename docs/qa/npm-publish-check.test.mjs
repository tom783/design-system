import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { npmFixChanges, publishCorrections } from '../../scripts/npm-publish-check.mjs';

// 0.4.0 release dry-run(run 45075868803, npm 11.19.1) 에서 그대로 옮긴 줄.
const CI_LOG = [
  'npm notice name: @s2life/ui',
  'npm warn publish npm auto-corrected some errors in your package.json when publishing.  Please run "npm pkg fix" to address these errors.',
  'npm warn publish errors corrected:',
  'npm warn publish "bin[s2life-mcp]" script name server.mjs was invalid and removed',
  'npm notice name: @s2life/mcp',
].join('\n');

// 실제 tarball 모양(package/ 아래)으로 만들어 npm pkg fix 를 돌린다 — pack-verify 가 쓰는 경로 그대로다.
async function fixture(bin, files = ['server.mjs']) {
  const dir = await mkdtemp(join(tmpdir(), 's2-npm-fix-'));
  await mkdir(join(dir, 'src/package'), { recursive: true });
  const pkg = { name: '@s2life/mcp', version: '9.9.9', type: 'module', bin, files };
  await writeFile(join(dir, 'src/package/package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
  for (const file of files) {
    await writeFile(join(dir, 'src/package', file), '#!/usr/bin/env node\n');
    await chmod(join(dir, 'src/package', file), 0o755);
  }
  execFileSync('tar', ['-czf', join(dir, 'pkg.tgz'), '-C', join(dir, 'src'), 'package']);
  return { dir, tarball: join(dir, 'pkg.tgz'), pkg };
}

test('npm 이 게시하며 고칠 bin("./server.mjs")을 잡는다 — 0.4.0 경고의 원인', async () => {
  const { dir, tarball, pkg } = await fixture({ 's2life-mcp': './server.mjs' });
  try {
    const { packed, changes } = npmFixChanges(tarball, join(dir, 'work'));
    assert.deepEqual(packed, pkg, 'tarball 안 package.json 은 원본 그대로다');
    assert.deepEqual(changes, ['bin: {"s2life-mcp":"./server.mjs"} → {"s2life-mcp":"server.mjs"}']);
    // tarball 원본은 건드리지 않는다(풀어 둔 사본만 고친다).
    assert.equal(JSON.parse(execFileSync('tar', ['-xOzf', tarball, 'package/package.json'], { encoding: 'utf8' })).bin['s2life-mcp'], './server.mjs');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('npm pkg fix 형태(bin "server.mjs")면 고칠 것이 0건이다', async () => {
  const { dir, tarball } = await fixture({ 's2life-mcp': 'server.mjs' });
  try {
    assert.deepEqual(npmFixChanges(tarball, join(dir, 'work')).changes, []);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('bin 이 tarball 에 없는 파일을 가리키면 잡는다 — 내용은 그대로라 필드 비교로는 안 보인다', async () => {
  const { dir, tarball } = await fixture({ 's2life-mcp': 'missing.mjs' });
  try {
    const { changes } = npmFixChanges(tarball, join(dir, 'work'));
    assert.equal(changes.length, 1);
    assert.match(changes[0], /No bin file found at missing\.mjs/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('publish 출력의 자동 교정 경고를 잡고, 로그인 경고 같은 다른 경고는 넘긴다', () => {
  const found = publishCorrections(CI_LOG);
  assert.equal(found.length, 3);
  assert.match(found.at(-1), /bin\[s2life-mcp\]/);
  assert.deepEqual(publishCorrections('npm warn publish This command requires you to be logged in to http://127.0.0.1:1/ (dry-run)\nnpm notice Publishing to http://127.0.0.1:1/ with tag latest and public access (dry-run)'), []);
});

test('저장소의 세 package.json 은 npm pkg fix 형태다 — bin 경로에 ./ 를 붙이지 않는다', async () => {
  for (const name of ['tokens', 'ui', 'mcp']) {
    const pkg = JSON.parse(await readFile(new URL(`../../packages/${name}/package.json`, import.meta.url), 'utf8'));
    for (const [bin, target] of Object.entries(pkg.bin ?? {})) assert.doesNotMatch(target, /^\.\//, `${name}: bin ${bin} → ${target}`);
  }
});
