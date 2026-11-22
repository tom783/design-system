// 하네스가 검사하는 스토리북이 **이 작업 폴더의, 이 커밋의 빌드**인지 확인한다.
//
// 같은 머신에서 작업 폴더 여러 개가 6099 를 번갈아 쓰다가, 남의 서버를 검사하고 "통과" 한 적이 있다
// (2026-11-22). 포트를 비우는 것만으로는 부족하다 — 무엇을 봤는지 서버에게 물어서 확인한다.
//
//  DS_SB_URL    검사할 서버. 없으면 http://localhost:6099 (단독 실행용 기본값)
//  DS_SB_NONCE  run-all 이 빌드 폴더에 쓴 무작위 값. 없으면 이 작업 폴더의 storybook-static/__qa-nonce.txt
//  CI=true · DS_QA_STRICT=1   엄격 모드 — 빌드가 dirty 면 거부(로컬 단독은 경고만)
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const STATIC_DIR = join(REPO_ROOT, 'storybook-static');
export const DEFAULT_SB_URL = 'http://localhost:6099';
export const NONCE_FILE = '__qa-nonce.txt';
export const BUILD_INFO_FILE = 'build-info.json';

export const sbUrl = (env = process.env) => (env.DS_SB_URL || DEFAULT_SB_URL).replace(/\/+$/, '');
export const strictMode = (env = process.env) => env.CI === 'true' || env.DS_QA_STRICT === '1';

/** { sha, dirty } — git 이 없거나 저장소가 아니면 sha:null. untracked 파일도 dirty 로 친다(빌드에 들어갈 수 있다). */
export function gitState(cwd = REPO_ROOT) {
  const git = (...args) => spawnSync('git', args, { cwd, encoding: 'utf8' });
  const head = git('rev-parse', 'HEAD');
  if (head.status !== 0) return { sha: null, dirty: null };
  const st = git('status', '--porcelain');
  return { sha: head.stdout.trim(), dirty: st.status === 0 ? st.stdout.trim().length > 0 : null };
}

/** build-storybook 이 끝난 폴더에 출처를 남긴다. */
export function writeBuildInfo(dir, state = gitState(), now = new Date()) {
  const info = { sha: state.sha, dirty: state.dirty, builtAt: now.toISOString() };
  writeFileSync(join(dir, BUILD_INFO_FILE), `${JSON.stringify(info, null, 2)}\n`);
  return info;
}

/** 빌드 폴더에 새 nonce 를 쓴다. */
export function writeNonce(dir = STATIC_DIR) {
  const nonce = randomBytes(16).toString('hex');
  writeFileSync(join(dir, NONCE_FILE), nonce);
  return nonce;
}

/**
 * build-info 판정(순수 함수). 반환: { ok, message } — ok 이고 message 가 있으면 경고.
 *  - 없거나 sha 가 HEAD 와 다르면 거부: 오래된 빌드를 검사하고 "통과" 하는 것을 막는다.
 *  - dirty: 엄격 모드(CI·pre-push)는 거부, 로컬은 경고.
 */
export function judgeBuildInfo(info, head, { strict = false } = {}) {
  const short = (s) => (s ? String(s).slice(0, 7) : '없음');
  if (!info || typeof info !== 'object') {
    return { ok: false, message: `build-info.json 이 없습니다 — 출처를 모르는 빌드입니다. pnpm build-storybook 으로 다시 빌드하세요.` };
  }
  if (!head?.sha) return { ok: false, message: 'HEAD 를 읽지 못했습니다(git 저장소가 아닌가?) — 빌드 출처를 대조할 수 없습니다.' };
  if (info.sha !== head.sha) {
    return { ok: false, message: `빌드(${short(info.sha)})가 HEAD(${short(head.sha)})와 다릅니다 — pnpm build-storybook(또는 run-all --build)으로 다시 빌드하세요.` };
  }
  if (info.dirty) {
    const message = `빌드가 커밋되지 않은 변경을 포함합니다(dirty, ${short(info.sha)}).`;
    return strict ? { ok: false, message: `${message} CI·pre-push 에서는 커밋된 것만 검사합니다.` } : { ok: true, message: `경고: ${message}` };
  }
  return { ok: true, message: null };
}

const fetchText = async (url) => {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return r.text();
};

/**
 * 서버가 이 작업 폴더의 HEAD 빌드를 서빙하는지 확인한다. 아니면 던진다.
 * 반환: { base, buildInfo, warning }
 */
export async function checkStorybook({ base = sbUrl(), env = process.env, staticDir = STATIC_DIR, head = gitState() } = {}) {
  let expected = env.DS_SB_NONCE;
  if (!expected) {
    // 단독 실행: 이 작업 폴더의 빌드에 nonce 가 없으면 새로 쓴다. 남의 폴더에는 같은 값이 있을 수 없다.
    const file = join(staticDir, NONCE_FILE);
    if (!existsSync(join(staticDir, 'index.json'))) {
      throw new Error(`이 작업 폴더에 스토리북 빌드가 없습니다(${staticDir}) — pnpm build-storybook`);
    }
    expected = existsSync(file) ? readFileSync(file, 'utf8').trim() : writeNonce(staticDir);
  }
  let served;
  try { served = (await fetchText(`${base}/${NONCE_FILE}`)).trim(); } catch (e) {
    throw new Error(`스토리북 서버 확인 실패: ${base} 에서 ${NONCE_FILE} 를 읽지 못했습니다 (${e.cause?.code ?? e.message}).\n` +
      `  이 작업 폴더의 빌드를 서빙하는 서버가 아닙니다. pnpm qa --only <하네스> 로 돌리면 run-all 이 서버를 띄웁니다.`);
  }
  if (served !== expected) {
    throw new Error(`스토리북 서버 확인 실패: ${base} 는 이 작업 폴더(${REPO_ROOT})의 빌드를 서빙하지 않습니다 ` +
      `(nonce 불일치). 다른 작업 폴더의 서버일 수 있습니다 — 검사를 멈춥니다.`);
  }
  let buildInfo = null;
  try { buildInfo = JSON.parse(await fetchText(`${base}/${BUILD_INFO_FILE}`)); } catch { /* 판정에서 거부 */ }
  const verdict = judgeBuildInfo(buildInfo, head, { strict: strictMode(env) });
  if (!verdict.ok) throw new Error(`스토리북 빌드 확인 실패: ${verdict.message}`);
  return { base, buildInfo, warning: verdict.message };
}
