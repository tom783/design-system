// storybook build 를 돌리고 산출물에 출처(build-info.json: sha·dirty·builtAt)를 남긴다.
//
//   pnpm build-storybook [storybook build 인자…]     (예: --quiet, -o <폴더>)
//
// 하네스·run-all 은 서버가 주는 build-info 의 sha 가 HEAD 와 다르면 거부한다
// (docs/qa/storybook-target.mjs). 오래된 빌드를 검사하고 "통과" 라고 보고하던 사고를 막는다.
// package.json 에 `storybook build && node …` 로 이으면 pnpm 이 붙이는 인자(--quiet)가
// 뒤 명령으로 가서, 인자를 그대로 넘기는 이 래퍼를 둔다.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gitState, writeBuildInfo } from '../docs/qa/storybook-target.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);

// 출처는 빌드 **전에** 읽는다. 빌드 도중에 누가 커밋하면 산출물과 sha 가 어긋날 수 있어서다.
const state = gitState(root);
const bin = join(root, 'node_modules/.bin/storybook');
const r = spawnSync(existsSync(bin) ? bin : 'storybook', ['build', ...args], { cwd: root, stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status ?? 1);

const oi = args.findIndex((a) => a === '-o' || a === '--output-dir' || a.startsWith('--output-dir='));
const out = oi < 0 ? 'storybook-static' : args[oi].includes('=') ? args[oi].split('=')[1] : args[oi + 1];
const info = writeBuildInfo(resolve(root, out), state);
console.log(`build-info: ${info.sha?.slice(0, 7) ?? '?'}${info.dirty ? ' (dirty)' : ''} → ${out}/build-info.json`);
