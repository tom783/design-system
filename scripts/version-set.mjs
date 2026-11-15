import { readFile, writeFile } from 'node:fs/promises';

const version = process.argv[2];
if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version ?? '')) {
  console.error('사용법: pnpm version:set <x.y.z> (예: 0.2.0)');
  process.exit(1);
}
const urls = ['tokens', 'ui', 'mcp'].map((name) => new URL(`../packages/${name}/package.json`, import.meta.url));
// 모든 입력을 먼저 읽고 검사하여 잘못된 입력 때문에 일부 패키지만 바뀌지 않게 한다.
const packages = await Promise.all(urls.map(async (url) => JSON.parse(await readFile(url, 'utf8'))));
const names = new Set(packages.map((pkg) => pkg.name));
for (const pkg of packages) {
  pkg.version = version;
  for (const key of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'])
    for (const name of Object.keys(pkg[key] ?? {})) if (names.has(name)) pkg[key][name] = version;
}
await Promise.all(urls.map((url, i) => writeFile(url, `${JSON.stringify(packages[i], null, 2)}\n`)));
// pnpm lockfile까지 갱신해야 frozen-lockfile CI에서도 같은 범위를 사용한다.
const { execFileSync } = await import('node:child_process');
execFileSync('pnpm', ['install', '--lockfile-only', '--ignore-scripts'], { cwd: new URL('../', import.meta.url), stdio: 'inherit' });
console.log(`3개 패키지 버전과 상호 의존 범위: ${version}`);
