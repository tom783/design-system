// 깨끗한 체크아웃에서 typecheck — 빌드 산출물(dist) 없이도 타입이 맞는가.
//
//   node scripts/typecheck-clean.mjs [커밋]   (기본 HEAD)
//
// 왜: 로컬에는 오래된 packages/ui/dist 가 남아 있어서, dist 로 해석되는 import
// (`@s2life/ui/icons` 자기 참조 등)가 pre-commit·pre-push 를 통과했다. CI 는 깨끗한
// 체크아웃이라 TS2307 로 깨졌고, R31 63573f3 ~ R43b cbf86e0 까지 11회 연속 빨간 줄을 놓쳤다.
// 자기 참조 같은 알려진 모양은 check-boundaries.mjs 가 1초 안에 잡지만, 그 밖의 경로로
// .gitignore 산출물에 기대는 것은 실제로 깨끗한 트리를 만들어 봐야 안다.
//
// 임시 git worktree(추적 파일만) → pnpm install --offline(전역 저장소에서 하드링크, 수 초)
// → pnpm typecheck. 원래 작업 트리는 건드리지 않는다. pre-push 가 부른다.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).stdout.trim();
const rev = process.argv[2] ?? 'HEAD';
const sha = spawnSync('git', ['rev-parse', '--verify', `${rev}^{commit}`], { cwd: root, encoding: 'utf8' }).stdout.trim();
if (!sha) { console.error(`커밋을 찾지 못했습니다: ${rev}`); process.exit(2); }

const started = Date.now();
const dir = mkdtempSync(join(tmpdir(), 's2-typecheck-clean-'));
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { cwd: dir, encoding: 'utf8', ...opts });

function cleanup() {
  spawnSync('git', ['worktree', 'remove', '--force', dir], { cwd: root });
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  spawnSync('git', ['worktree', 'prune'], { cwd: root });
}
process.on('SIGINT', () => { cleanup(); process.exit(130); });

let status = 1;
try {
  const add = spawnSync('git', ['worktree', 'add', '--detach', '--quiet', dir, sha], { cwd: root, encoding: 'utf8' });
  if (add.status !== 0) throw new Error(`임시 worktree 생성 실패:\n${add.stderr}`);

  // 전역 저장소에서 하드링크만 한다. 저장소에 없으면(새 의존성) 네트워크로 받는다.
  // --ignore-scripts: prepare(core.hooksPath 설정) 등 부수효과를 내지 않는다.
  const base = ['install', '--frozen-lockfile', '--ignore-scripts', '--reporter=silent'];
  let install = run('pnpm', [...base, '--offline']);
  if (install.status !== 0) install = run('pnpm', [...base, '--prefer-offline']);
  if (install.status !== 0) throw new Error(`pnpm install 실패:\n${install.stdout}${install.stderr}`);

  // 전제 확인 — 산출물이 하나라도 있으면 이 검사는 의미가 없다.
  const leaked = ['packages/ui/dist', 'packages/tokens/dist', 'packages/mcp/dist', 'storybook-static']
    .filter((p) => existsSync(join(dir, p)));
  if (leaked.length) throw new Error(`깨끗한 트리에 빌드 산출물이 있습니다: ${leaked.join(', ')}`);

  const tc = run('pnpm', ['-s', 'typecheck']);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (tc.status !== 0) {
    process.stdout.write(tc.stdout);
    process.stderr.write(tc.stderr);
    console.error(`\n✗ 깨끗한 체크아웃(${sha.slice(0, 7)}, dist 없음)에서 typecheck 실패 — ${seconds}s`);
    console.error('  로컬 typecheck 가 통과했다면 빌드 산출물(dist 등)에 기대는 import 가 있는 것이다.');
  } else {
    console.log(`✓ 깨끗한 체크아웃(${sha.slice(0, 7)}, dist 없음)에서 typecheck 통과 — ${seconds}s`);
    status = 0;
  }
} catch (e) {
  console.error(`✗ ${e.message}`);
} finally {
  cleanup();
}
process.exit(status);
