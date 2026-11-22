// 게시본의 package.json 을 npm 이 게시하면서 고치지 않는지 본다.
//
// npm publish 는 올리기 직전 package.json 을 `npm pkg fix` 와 같은 함수(@npmcli/package-json 의 fix)로 고친 뒤
// 그 결과를 레지스트리 메타데이터로 보낸다. tarball 안 package.json 은 고치지 않는다. 그래서 저장소·tarball·
// 메타데이터 셋이 서로 다른 값을 갖게 되고, 경고 문구도 실제 동작과 다를 수 있다.
// 실측(0.4.0 release dry-run run 45075868803, npm 11.19.1): bin "./server.mjs" 를 "server.mjs" 로 고치면서
// `"bin[s2life-mcp]" script name server.mjs was invalid and removed` 라고 경고했다. 실제로는 bin 을 지우지 않았지만
// (같은 함수로 재현한 메타데이터 bin = {"s2life-mcp":"server.mjs"}) 경고만 보면 "게시본에 실행 명령이 없다"로 읽힌다.
// 그래서 게시 전에 npm 이 고칠 필드가 0개인지 확인한다.
//
//   node scripts/npm-publish-check.mjs   세 패키지를 npm publish --dry-run 으로 돌려 자동 교정 경고를 찾는다 (pnpm publish:check)
//
// pack-verify 는 같은 판정을 npmFixChanges(tarball) 로 한다(게시 명령을 부르지 않는다).
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

export const PACKAGES = ['tokens', 'ui', 'mcp'];

// npm 이 내용을 고쳤거나(auto-corrected) bin 이 가리키는 파일이 없다는(No bin file found) 경고.
const CORRECTION = /auto-corrected|errors corrected|No bin file found/;

// tarball 을 풀어 그 안에서 `npm pkg fix` 를 돌린다. npm publish 가 메타데이터로 보낼 값을 만드는 함수와 같다.
// 반환: 원래 package.json 과 고쳐진 필드 목록(`필드: 전 → 후`). bin 파일이 없다는 경고도 목록에 넣는다 —
// binRefs 단계는 내용을 고치지 않고 경고만 남겨서 필드 비교로는 안 보인다.
export function npmFixChanges(tarball, workDir, env = process.env) {
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });
  execFileSync('tar', ['-xzf', tarball, '-C', workDir]);
  const dir = join(workDir, 'package');
  const read = () => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const packed = read();
  // 사용자 npmrc 의 loglevel 이 경고를 숨기지 않게 고정한다.
  const fix = spawnSync('npm', ['pkg', 'fix', '--loglevel=warn', '--color=false'], { cwd: dir, env, encoding: 'utf8', timeout: 60000 });
  if (fix.status !== 0) throw new Error(`npm pkg fix 실패(${fix.status ?? fix.signal}): ${fix.stderr || fix.error?.message}`);
  const fixed = read();
  const changes = [...new Set([...Object.keys(packed), ...Object.keys(fixed)])]
    .filter((key) => !isDeepStrictEqual(packed[key], fixed[key]))
    .map((key) => `${key}: ${JSON.stringify(packed[key])} → ${JSON.stringify(fixed[key])}`);
  for (const line of fix.stderr.split(/\r?\n/)) if (/No bin file found/.test(line)) changes.push(line.trim());
  return { packed, changes };
}

// npm publish 출력에서 자동 교정 경고를 찾는다. 교정 목록은 여러 줄 경고라 `npm warn` 줄을 전부 돌려줘 원인을 보인다.
export function publishCorrections(output) {
  const warns = output.split(/\r?\n/).filter((line) => line.startsWith('npm warn '));
  return warns.some((line) => CORRECTION.test(line)) ? warns : [];
}

// 게시는 구조적으로 하지 않는다. --dry-run 을 인자와 환경 변수 둘 다로 고정하고, 레지스트리를 닫힌 로컬 포트로
// 돌린다(CLI 인자가 publishConfig.registry 를 이긴다 — 실측 "Publishing to http://127.0.0.1:1/ … (dry-run)").
// prepublishOnly 의 허가 관문(S2LIFE_PUBLISH)은 --ignore-scripts 로 건너뛰는데, 위 두 겹이 그 역할을 대신한다.
// 닫힌 포트에 재시도하면 패키지마다 70초를 기다려서 --fetch-retries=0 을 준다.
const CLOSED_REGISTRY = 'http://127.0.0.1:1/';
export function publishDryRun(root, name) {
  const args = ['publish', '--dry-run', '--ignore-scripts', `--registry=${CLOSED_REGISTRY}`, '--fetch-retries=0',
    '--loglevel=notice', '--color=false', '--workspace', `packages/${name}`];
  const result = spawnSync('npm', args, { cwd: root, encoding: 'utf8', timeout: 120000, env: { ...process.env, npm_config_dry_run: 'true' } });
  const output = `${result.stdout}\n${result.stderr}`;
  // 출력을 실제로 받았는지 확인한다. 경고가 안 보이는 이유가 "없어서"인지 "못 봐서"인지 가른다.
  const ran = result.status === 0 && /Publishing to \S+ .*\(dry-run\)/.test(output);
  return { ran, status: result.status, output, corrections: publishCorrections(output) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const npmVersion = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim();
  let failed = false;
  for (const name of PACKAGES) {
    const { ran, status, output, corrections } = publishDryRun(root, name);
    if (!ran) {
      failed = true;
      console.error(`✗ ${name}: npm publish --dry-run 이 끝나지 않았다(종료 ${status})\n${output.slice(-1500)}`);
    } else if (corrections.length) {
      failed = true;
      console.error(`✗ ${name}: npm 이 게시하면서 package.json 을 고친다 — 저장소에서 \`npm pkg fix --workspace packages/${name}\` 로 맞춰라\n  ${corrections.join('\n  ')}`);
    } else {
      console.log(`• ${name}: npm publish --dry-run 자동 교정 0건`);
    }
  }
  console.log(`npm ${npmVersion} · node ${process.version}`);
  if (failed) process.exit(1);
}
