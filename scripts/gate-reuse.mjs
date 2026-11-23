// pre-push 가 부른다: 보내는 sha 마다 원격 gate 가 이미 녹색이면 exit 0, 아니면 exit 1.
//
//   node scripts/gate-reuse.mjs <remote-url> <sha…>
//
// 왜: main 통합은 작업 브랜치에서 gate 를 통과한 **바로 그 sha** 로 main 을 빨리 감는다
// (`git push origin <sha>:main`, AGENTS.md "main 통합"). 그 sha 의 브라우저 하네스를 로컬에서
// 다시 돌리면 약 6분이 중복이다. 같은 sha 면 내용이 같으니 원격 gate 판정을 그대로 쓴다.
//
// 판정은 안전한 쪽으로 기운다 — 아래 중 하나라도 해당하면 exit 1(하네스를 평소대로 돈다):
// gh 가 없다 · 조회가 실패하거나 시간 초과 · GitHub 주소가 아니다 · gate 기록이 없다 ·
// 진행 중이다 · 녹색이 아니다(실패·취소·건너뜀) · headSha 가 보낸 sha 와 다르다 · 목록이 잘렸다.
// 근거로 쓴 run URL 은 stdout, 건너뛰지 않는 이유는 stderr 로 보인다.
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// 브랜치 보호가 요구하는 체크와 똑같이 본다: 이름 `gate` + GitHub Actions 앱(15368).
// (gh api repos/<repo>/branches/main/protection → required_status_checks.checks)
// 같은 저장소 PR 의 `gate (same-repo PR — push run decides)` 는 이름이 달라 근거가 되지 못한다.
export const GATE_CHECK = 'gate';
export const ACTIONS_APP_ID = 15368;
const GH_TIMEOUT_MS = 20_000;

/** 원격 주소 → "owner/repo". github.com 이 아니거나 모르는 형식이면 null. */
export function githubRepo(url) {
  const m = String(url ?? '').trim().match(
    /^(?:git@github\.com:|ssh:\/\/git@github\.com(?::\d+)?\/|https:\/\/(?:[^@/]+@)?github\.com\/)([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/,
  );
  return m ? `${m[1]}/${m[2]}` : null;
}

/** check run 의 html_url(…/actions/runs/<id>/job/<id>) → run URL. 형식이 다르면 그대로. */
export function runUrl(check) {
  const url = String(check?.html_url ?? check?.details_url ?? '');
  return url.replace(/(\/actions\/runs\/\d+)\/job\/\d+$/, '$1');
}

/**
 * GET repos/<repo>/commits/<sha>/check-runs?check_name=gate 응답으로 판정한다.
 * gate 가 여럿이면(같은 sha 를 여러 브랜치에 push) **전부** 끝나고 녹색이어야 한다 — 하나라도
 * 진행 중이거나 실패면 건너뛰지 않는다. 같은 run 의 재실행은 filter=latest 가 마지막 시도만 준다.
 * @returns {{ reuse: true, url: string } | { reuse: false, reason: string, url?: string }}
 */
export function judgeGate(sha, body) {
  const all = Array.isArray(body?.check_runs) ? body.check_runs : null;
  if (!all) return { reuse: false, reason: 'gh 응답에 check_runs 가 없다' };
  if (Number(body.total_count) > all.length) return { reuse: false, reason: `목록이 잘렸다 (${all.length}/${body.total_count})` };
  const gates = all.filter((c) => c?.name === GATE_CHECK && c?.app?.id === ACTIONS_APP_ID);
  if (!gates.length) return { reuse: false, reason: '원격 gate 기록이 없다' };
  for (const c of gates) {
    const url = runUrl(c);
    if (c.head_sha !== sha) return { reuse: false, reason: `headSha 불일치 (${String(c.head_sha).slice(0, 7)})`, url };
    if (c.status !== 'completed') return { reuse: false, reason: `gate 진행 중 (${c.status})`, url };
    if (c.conclusion !== 'success') return { reuse: false, reason: `gate 가 녹색이 아니다 (${c.conclusion})`, url };
  }
  const latest = [...gates].sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)))[0];
  return { reuse: true, url: runUrl(latest) };
}

/** 실제 gh 호출. 묻지 않고(GH_PROMPT_DISABLED) 시간 안에 끝나지 않으면 실패로 본다. */
export function runGh(args) {
  return spawnSync('gh', args, {
    encoding: 'utf8',
    timeout: GH_TIMEOUT_MS,
    env: { ...process.env, GH_PROMPT_DISABLED: '1', NO_COLOR: '1' },
  });
}

const firstLine = (s) => String(s ?? '').trim().split('\n')[0].slice(0, 160);

/**
 * 보내는 sha 전부가 원격 gate 녹색인지. gh 는 주입할 수 있다(단위 시험이 조회 결과를 흉내 낸다).
 * @returns {{ reuse: true, evidence: {sha: string, url: string}[] } | { reuse: false, reason: string, url?: string }}
 */
export function checkGateReuse({ remoteUrl, shas, gh = runGh }) {
  const repo = githubRepo(remoteUrl);
  if (!repo) return { reuse: false, reason: `GitHub 저장소 주소가 아니다 (${remoteUrl ?? '없음'})` };
  if (!shas?.length) return { reuse: false, reason: '보낼 sha 가 없다' };
  const evidence = [];
  for (const sha of shas) {
    if (!/^[0-9a-f]{40}$/.test(sha)) return { reuse: false, reason: `40자리 sha 가 아니다 (${sha})` };
    const r = gh(['api', `repos/${repo}/commits/${sha}/check-runs?check_name=${GATE_CHECK}&filter=latest&per_page=100`]);
    if (r.error?.code === 'ENOENT') return { reuse: false, reason: 'gh 가 없다' };
    if (r.error) return { reuse: false, reason: `gh 조회 실패 (${r.error.code ?? r.error.message})` };
    if (r.status !== 0) return { reuse: false, reason: `gh 조회 실패 (exit ${r.status ?? r.signal}: ${firstLine(r.stderr)})` };
    let body;
    try { body = JSON.parse(r.stdout); } catch { return { reuse: false, reason: 'gh 응답이 JSON 이 아니다' }; }
    const j = judgeGate(sha, body);
    if (!j.reuse) return { ...j, reason: `${sha.slice(0, 7)} ${j.reason}` };
    evidence.push({ sha, url: j.url });
  }
  return { reuse: true, evidence };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [remoteUrl, ...shas] = process.argv.slice(2);
  const result = checkGateReuse({ remoteUrl, shas });
  if (result.reuse) {
    for (const { sha, url } of result.evidence) console.log(`    ${sha.slice(0, 7)} gate 녹색 — ${url}`);
    process.exit(0);
  }
  console.error(`    원격 gate 를 근거로 쓰지 않는다 — ${result.reason}${result.url ? ` · ${result.url}` : ''}`);
  process.exit(1);
}
