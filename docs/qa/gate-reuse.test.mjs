// pre-push 의 원격 gate 재사용 판정 — scripts/gate-reuse.mjs.
// 이 판정이 틀리면 검증 안 된 sha 의 하네스를 건너뛴다. 그래서 "건너뛰는" 경우는 하나로 좁고
// (보낸 sha 전부가 headSha 일치 + 끝남 + 녹색), 나머지는 전부 "평소대로 돈다" 쪽인지 본다.
// gh 는 흉내 낸 조회 결과로 바꿔 끼운다 — 네트워크·인증에 기대지 않는다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACTIONS_APP_ID, checkGateReuse, githubRepo, judgeGate, runUrl } from '../../scripts/gate-reuse.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const SHA = 'a'.repeat(40);
const SHA2 = 'b'.repeat(40);
const REMOTE = 'git@github.com:tom783/design-system.git';

/** 실제 응답(GET commits/<sha>/check-runs?check_name=gate)과 같은 모양의 check run 하나 */
const gate = ({ sha = SHA, run = 45116864622, job = 137503135088, ...rest } = {}) => ({
  name: 'gate',
  head_sha: sha,
  status: 'completed',
  conclusion: 'success',
  app: { id: ACTIONS_APP_ID, slug: 'github-actions' },
  html_url: `https://github.com/tom783/design-system/actions/runs/${run}/job/${job}`,
  completed_at: '2026-11-23T05:22:32Z',
  ...rest,
});
const body = (...runs) => ({ total_count: runs.length, check_runs: runs });
/** sha → 응답을 돌려주는 가짜 gh. 받은 인자를 calls 에 남긴다. */
const fakeGh = (bySha) => {
  const calls = [];
  const gh = (args) => {
    calls.push(args);
    const sha = args[1].match(/commits\/([0-9a-f]+)\//)[1];
    const r = bySha[sha];
    return typeof r === 'function' ? r() : { status: 0, stdout: JSON.stringify(r ?? body()), stderr: '' };
  };
  return { gh, calls };
};

// ── 원격 주소 ──

test('원격 주소: ssh·https·토큰 포함·.git 유무를 owner/repo 로 읽는다', () => {
  for (const url of [
    'git@github.com:tom783/design-system.git',
    'git@github.com:tom783/design-system',
    'ssh://git@github.com/tom783/design-system.git',
    'ssh://git@github.com:22/tom783/design-system.git',
    'https://github.com/tom783/design-system.git',
    'https://github.com/tom783/design-system',
    'https://x-access-token:abc@github.com/tom783/design-system.git',
  ]) assert.equal(githubRepo(url), 'tom783/design-system', url);
});

test('원격 주소: github.com 이 아니거나 모르는 형식이면 null — 건너뛰지 않는다', () => {
  for (const url of [undefined, '', 'origin', '/tmp/repo.git', 'git@gitlab.com:a/b.git', 'git@github-work:a/b.git',
    'https://github.com.evil.example/a/b', 'https://github.com/a/b/c'])
    assert.equal(githubRepo(url), null, String(url));
});

test('run URL: job 주소에서 run 주소를 꺼낸다', () => {
  assert.equal(runUrl(gate()), 'https://github.com/tom783/design-system/actions/runs/45116864622');
  assert.equal(runUrl({ html_url: 'https://example.com/x' }), 'https://example.com/x');
});

// ── 판정 (조회 결과 하나) ──

test('판정: headSha 일치 + 끝남 + 녹색이면 건너뛰고 run URL 을 근거로 남긴다', () => {
  assert.deepEqual(judgeGate(SHA, body(gate())), { reuse: true, url: 'https://github.com/tom783/design-system/actions/runs/45116864622' });
});

test('판정: 진행 중·대기·실패·취소·건너뜀·시간 초과는 건너뛰지 않는다', () => {
  for (const [status, conclusion] of [
    ['in_progress', null], ['queued', null], ['completed', 'failure'], ['completed', 'cancelled'],
    ['completed', 'skipped'], ['completed', 'timed_out'], ['completed', 'neutral'], ['completed', 'action_required'],
  ]) {
    const j = judgeGate(SHA, body(gate({ status, conclusion })));
    assert.equal(j.reuse, false, `${status}/${conclusion}`);
    assert.match(j.url, /actions\/runs\/45116864622$/, '실패 쪽에서도 어느 run 인지 보인다');
  }
});

test('판정: headSha 가 보낸 sha 와 다르면 건너뛰지 않는다', () => {
  const j = judgeGate(SHA, body(gate({ sha: SHA2 })));
  assert.equal(j.reuse, false);
  assert.match(j.reason, /headSha 불일치 \(bbbbbbb\)/);
});

test('판정: gate 기록이 없거나, 응답 모양이 다르거나, 목록이 잘렸으면 건너뛰지 않는다', () => {
  assert.equal(judgeGate(SHA, body()).reuse, false);
  assert.equal(judgeGate(SHA, {}).reuse, false);
  assert.equal(judgeGate(SHA, null).reuse, false);
  assert.equal(judgeGate(SHA, { total_count: 101, check_runs: [gate()] }).reuse, false);
});

test('판정: 이름이 정확히 gate 이고 GitHub Actions 앱인 체크만 근거가 된다 (브랜치 보호와 같은 기준)', () => {
  const samePr = gate({ name: 'gate (same-repo PR — push run decides)' });
  const otherApp = gate({ app: { id: 1, slug: 'someone-else' } });
  assert.equal(judgeGate(SHA, body(samePr)).reuse, false);
  assert.equal(judgeGate(SHA, body(otherApp)).reuse, false);
  // 근거가 못 되는 체크는 판정을 바꾸지도 않는다
  assert.equal(judgeGate(SHA, body(gate(), { ...otherApp, conclusion: 'failure' })).reuse, true);
});

test('판정: 같은 sha 의 gate 가 여럿이면 전부 녹색이어야 하고, 근거는 가장 최근에 끝난 run', () => {
  const older = gate({ run: 1, completed_at: '2026-11-23T05:16:04Z' });
  const newer = gate({ run: 2, completed_at: '2026-11-23T05:22:32Z' });
  assert.deepEqual(judgeGate(SHA, body(older, newer)), { reuse: true, url: 'https://github.com/tom783/design-system/actions/runs/2' });
  assert.equal(judgeGate(SHA, body(newer, gate({ run: 3, status: 'in_progress', conclusion: null }))).reuse, false);
  assert.equal(judgeGate(SHA, body(newer, gate({ run: 3, conclusion: 'failure' }))).reuse, false);
});

// ── 조회 (gh 를 흉내 낸다) ──

test('조회: 원격 주소의 저장소와 보낸 sha 로 gate 체크만 묻는다', () => {
  const { gh, calls } = fakeGh({ [SHA]: body(gate()) });
  const r = checkGateReuse({ remoteUrl: REMOTE, shas: [SHA], gh });
  assert.deepEqual(r, { reuse: true, evidence: [{ sha: SHA, url: 'https://github.com/tom783/design-system/actions/runs/45116864622' }] });
  assert.deepEqual(calls, [['api', `repos/tom783/design-system/commits/${SHA}/check-runs?check_name=gate&filter=latest&per_page=100`]]);
});

test('조회: 보낸 sha 가 여럿이면 전부 녹색이어야 건너뛴다', () => {
  const both = fakeGh({ [SHA]: body(gate()), [SHA2]: body(gate({ sha: SHA2, run: 7 })) });
  const ok = checkGateReuse({ remoteUrl: REMOTE, shas: [SHA, SHA2], gh: both.gh });
  assert.equal(ok.reuse, true);
  assert.deepEqual(ok.evidence.map((e) => e.url.split('/').pop()), ['45116864622', '7']);
  const one = fakeGh({ [SHA]: body(gate()), [SHA2]: body() });
  const no = checkGateReuse({ remoteUrl: REMOTE, shas: [SHA, SHA2], gh: one.gh });
  assert.equal(no.reuse, false);
  assert.match(no.reason, /^bbbbbbb 원격 gate 기록이 없다/);
});

test('조회: gh 가 없음·시간 초과·실패 종료·JSON 아님이면 건너뛰지 않는다', () => {
  const cases = {
    'gh 가 없다': () => ({ error: Object.assign(new Error('spawnSync gh ENOENT'), { code: 'ENOENT' }) }),
    'ETIMEDOUT': () => ({ error: Object.assign(new Error('spawnSync gh ETIMEDOUT'), { code: 'ETIMEDOUT' }), status: null }),
    'exit 4': () => ({ status: 4, stdout: '', stderr: 'To get started with GitHub CLI, please run:  gh auth login' }),
    'JSON 이 아니다': () => ({ status: 0, stdout: '<html>', stderr: '' }),
  };
  for (const [why, reply] of Object.entries(cases)) {
    const r = checkGateReuse({ remoteUrl: REMOTE, shas: [SHA], gh: fakeGh({ [SHA]: reply }).gh });
    assert.equal(r.reuse, false, why);
    assert.ok(r.reason.includes(why), `${why} ← ${r.reason}`);
  }
});

test('조회: GitHub 주소가 아니거나, sha 가 없거나 40자리가 아니면 gh 를 부르지도 않는다', () => {
  const { gh, calls } = fakeGh({});
  for (const [remoteUrl, shas] of [['/tmp/x.git', [SHA]], [REMOTE, []], [REMOTE, ['abc1234']], [REMOTE, ['0'.repeat(39)]]])
    assert.equal(checkGateReuse({ remoteUrl, shas, gh }).reuse, false);
  assert.deepEqual(calls, []);
});

// ── 명령줄: pre-push 가 보는 종료 코드와 출력 ──

/** PATH 에 가짜 gh 하나만 둔 채 실제로 띄운다. stdout 을 gh 응답으로 쓴다. */
function cli(shas, gh) {
  const dir = mkdtempSync(join(tmpdir(), 'gate-reuse-'));
  try {
    if (gh) {
      writeFileSync(join(dir, 'gh'), `#!/bin/sh\nprintf '%s' "$FAKE_GH_STDOUT"\nprintf '%s' "$FAKE_GH_STDERR" >&2\nexit "\${FAKE_GH_EXIT:-0}"\n`);
      chmodSync(join(dir, 'gh'), 0o755);
    }
    return spawnSync(process.execPath, [join(root, 'scripts/gate-reuse.mjs'), REMOTE, ...shas], {
      encoding: 'utf8',
      env: { PATH: dir, FAKE_GH_STDOUT: gh?.stdout ?? '', FAKE_GH_STDERR: gh?.stderr ?? '', FAKE_GH_EXIT: String(gh?.exit ?? 0) },
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('명령줄: 녹색이면 exit 0 과 run URL, 아니면 exit 1 과 이유', () => {
  const green = cli([SHA], { stdout: JSON.stringify(body(gate())) });
  assert.equal(green.status, 0, green.stderr);
  assert.equal(green.stdout, '    aaaaaaa gate 녹색 — https://github.com/tom783/design-system/actions/runs/45116864622\n');

  const running = cli([SHA], { stdout: JSON.stringify(body(gate({ status: 'in_progress', conclusion: null }))) });
  assert.equal(running.status, 1);
  assert.equal(running.stdout, '');
  assert.match(running.stderr, /gate 진행 중 \(in_progress\) · https:\/\/github\.com\/.+\/runs\/45116864622/);

  const failed = cli([SHA], { stdout: '', stderr: 'gh: Not Found (HTTP 404)', exit: 1 });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /gh 조회 실패 \(exit 1: gh: Not Found \(HTTP 404\)\)/);

  const missing = cli([SHA], null);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /gh 가 없다/);
});

// ── 훅 연결 ──

test('pre-push: verify 는 늘 돌고, SKIP_QA·.github 전용·원격 gate 녹색만 브라우저 하네스를 건너뛴다', () => {
  const hook = readFileSync(join(root, '.githooks/pre-push'), 'utf8').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  const at = (re) => { const m = hook.match(re); assert.ok(m, `pre-push 에 ${re} 가 없다`); return m.index; };
  const verify = at(/pnpm -s verify/);
  const skipQa = at(/"\$SKIP_QA" = "1"/);
  const scope = at(/scripts\/push-scope\.mjs/);
  const reuse = at(/scripts\/gate-reuse\.mjs "\$remote_url" \$shas/);
  const qa = at(/pnpm -s qa/);
  assert.ok(verify < skipQa && verify < scope && verify < reuse, 'verify 보다 먼저 빠져나가면 안 된다');
  assert.ok(skipQa < qa && scope < qa && reuse < qa, '건너뛰기 판정은 하네스보다 앞이다');
  assert.match(hook, /remote_url="\$2"/, 'git 이 넘기는 원격 주소($2)로 저장소를 정한다');
});
