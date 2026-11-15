import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, copyFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

test('버전 명령은 세 패키지·상호 의존 범위·lockfile을 함께 바꾼다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 's2-version-'));
  const read = async (path) => JSON.parse(await readFile(join(dir, path), 'utf8'));
  try {
    await mkdir(join(dir, 'scripts'));
    await copyFile(new URL('../../scripts/version-set.mjs', import.meta.url), join(dir, 'scripts/version-set.mjs'));
    await writeFile(join(dir, 'package.json'), JSON.stringify({ private: true, packageManager: 'pnpm@10.32.1' }));
    await writeFile(join(dir, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\nlinkWorkspacePackages: true\n');
    for (const name of ['tokens', 'ui', 'mcp']) {
      await mkdir(join(dir, `packages/${name}`), { recursive: true });
      await writeFile(join(dir, `packages/${name}/package.json`), JSON.stringify({ name: `@s2life/${name}`, version: '0.1.0', ...(name === 'ui' ? { dependencies: { '@s2life/tokens': '0.1.0' }, peerDependencies: { '@s2life/mcp': '0.1.0' } } : {}) }));
    }
    const invalid = spawnSync(process.execPath, ['scripts/version-set.mjs', '1.2'], { cwd: dir, encoding: 'utf8' });
    assert.equal(invalid.status, 1);
    assert.equal((await read('packages/ui/package.json')).version, '0.1.0');
    execFileSync(process.execPath, ['scripts/version-set.mjs', '2.3.4'], { cwd: dir, stdio: 'pipe', timeout: 30000 });
    for (const name of ['tokens', 'ui', 'mcp']) assert.equal((await read(`packages/${name}/package.json`)).version, '2.3.4');
    const ui = await read('packages/ui/package.json');
    assert.equal(ui.dependencies['@s2life/tokens'], '2.3.4');
    assert.equal(ui.peerDependencies['@s2life/mcp'], '2.3.4');
    assert.match(await readFile(join(dir, 'pnpm-lock.yaml'), 'utf8'), /specifier: 2\.3\.4/);
  } finally { await rm(dir, { recursive: true }); }
});
