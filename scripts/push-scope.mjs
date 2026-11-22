// pre-push 가 부른다: origin/main 대비 바뀐 파일이 .github/** 뿐이면 exit 0, 아니면 exit 1.
//
//   node scripts/push-scope.mjs <base> <sha…>
//
// 판정은 docs/qa/run-plan.mjs 의 githubOnly (단위 테스트가 있다). 바뀐 파일 목록은 stderr 로 보인다.
import { spawnSync } from 'node:child_process';
import { githubOnly } from '../docs/qa/run-plan.mjs';

const [base, ...shas] = process.argv.slice(2);
if (!base || !shas.length) process.exit(1);
const files = new Set();
for (const sha of shas) {
  const r = spawnSync('git', ['diff', '--name-only', `${base}...${sha}`], { encoding: 'utf8' });
  if (r.status !== 0) process.exit(1); // 비교 못 하면 건너뛰지 않는다
  for (const f of r.stdout.split('\n').filter(Boolean)) files.add(f);
}
const list = [...files].sort();
if (!githubOnly(list)) process.exit(1);
for (const f of list) console.error(`    ${f}`);
