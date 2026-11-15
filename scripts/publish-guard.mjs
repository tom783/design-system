// 배포 직전 마지막 관문. 각 패키지의 prepublishOnly 가 부른다.
//
// 두 가지를 본다:
//   1) 사람이 명시적으로 허가했는가 (S2LIFE_PUBLISH=1)
//   2) 검증을 통과하는 상태인가 (pnpm verify)
//
// 2번이 필요한 이유: 첫 배포는 로컬에서 하게 되는데, 그러면 CI 가 돌지 않는다.
// 토큰 대비 100건·MCP drift·Radix 경계·타입이 깨진 채로 나가는 것을 막는다.
// 브라우저 검증(pnpm gate)까지는 여기서 돌리지 않는다 — 패키지마다 147초씩
// 세 번 도는 것은 과하다. 배포 전에 한 번 직접 돌려라.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const name = process.env.npm_package_name ?? '(알 수 없음)';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

if (process.env.S2LIFE_PUBLISH !== '1') {
  console.error(`\n✗ ${name} 배포가 막혔습니다.\n`);
  console.error('  사람이 허가해야 나갑니다:');
  console.error('    S2LIFE_PUBLISH=1 npm publish --workspace packages/<이름>\n');
  process.exit(1);
}

// CI 에서는 release.yml 이 이미 pnpm gate 를 돌렸다. 중복으로 또 돌리지 않는다.
if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') {
  console.error(`• ${name}: CI 입니다. 게이트는 워크플로가 이미 통과했습니다.`);
  process.exit(0);
}

console.error(`• ${name}: 로컬 배포입니다. CI 가 돌지 않으므로 여기서 검증합니다…`);
try {
  execFileSync('pnpm', ['-s', 'verify'], { cwd: root, stdio: ['ignore', 'ignore', 'pipe'] });
} catch (error) {
  console.error(`\n✗ ${name}: pnpm verify 실패. 배포를 중단합니다.\n`);
  console.error(String(error.stderr ?? '').slice(-1500));
  console.error('\n  `pnpm verify` 를 직접 돌려 원인을 확인하세요.');
  process.exit(1);
}
console.error(`• ${name}: 검증 통과. 배포를 진행합니다.`);
