// run-all 실행 계획 테스트 — 인자 해석과 샤드 배분.
// 샤드 배분이 틀리면 CI 는 녹색인데 어떤 하네스는 아무 샤드에서도 안 돈다.
// 그래서 "모든 하네스가 정확히 한 번" 을 샤드 수마다 확인한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  BASELINE_FILE, EXCLUSIVE, GROUPS, HARNESSES, NO_STORYBOOK, githubOnly, UsageError, assignShards, harnessName, loadBaseline, median,
  parseArgs, readBaseline, selectHarnesses,
} from './run-plan.mjs';

const NAMES = HARNESSES.map(([f]) => harnessName(f));
const BASE = loadBaseline();
const flat = (shards) => shards.flatMap((s) => s.names);

test('하네스 목록: 이름이 겹치지 않고 파일이 있다', () => {
  assert.equal(new Set(NAMES).size, NAMES.length);
  for (const [file] of HARNESSES) assert.ok(existsSync(new URL(`./${file}`, import.meta.url)), file);
  for (const file of NO_STORYBOOK) assert.ok(HARNESSES.some(([f]) => f === file), file);
});

test('기준선: 45초 수정 뒤 리눅스 CI 실측(ci-734862c, 합계 384.7초)을 숫자 맵으로 읽는다', () => {
  assert.match(BASELINE_FILE.pathname, /ci-734862c\.json$/);
  assert.ok(BASE.size >= 31);
  assert.equal(Math.round([...BASE.values()].reduce((a, b) => a + b, 0) * 10) / 10, 384.7);
  assert.equal(BASE.get('mcp-client-verify'), 0.8);
});

test('기준선: 2샤드는 192.8 / 191.9초(DevOps 2샤드 계획의 전제)', () => {
  assert.deepEqual(assignShards(NAMES, BASE, 2).map((s) => s.seconds), [192.8, 191.9]);
});

test('기준선: --timings 출력 모양({seconds})도 읽고, 이상한 값은 버린다', () => {
  const m = readBaseline({ harnesses: { 'a.mjs': { seconds: 3, status: 'pass' }, b: 5, c: -1, d: 'x', e: null } });
  assert.deepEqual([...m], [['a', 3], ['b', 5]]);
});

test('중간값', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([]), 1);
});

// ── 샤드 배분 ──

test('배분: 샤드 수 1~하네스 수 모두에서 모든 하네스가 정확히 한 번, 빈 샤드 없음', () => {
  for (let n = 1; n <= NAMES.length; n++) {
    const shards = assignShards(NAMES, BASE, n);
    assert.equal(shards.length, n);
    assert.deepEqual([...flat(shards)].sort(), [...NAMES].sort(), `N=${n}`);
    for (const s of shards) assert.ok(s.names.length > 0, `N=${n} 빈 샤드`);
  }
});

test('배분: 결정적이다 — 같은 입력이면 같은 결과, 목록 순서를 섞어도 같은 묶음', () => {
  const a = assignShards(NAMES, BASE, 4);
  assert.deepEqual(assignShards(NAMES, BASE, 4), a);
  const reversed = assignShards([...NAMES].reverse(), new Map([...BASE].reverse()), 4);
  assert.deepEqual(reversed.map((s) => [...s.names].sort()), a.map((s) => [...s.names].sort()));
});

test('배분: 샤드 안 실행 순서는 HARNESSES 순서를 지킨다', () => {
  for (const s of assignShards(NAMES, BASE, 4)) {
    const idx = s.names.map((n) => NAMES.indexOf(n));
    assert.deepEqual(idx, [...idx].sort((x, y) => x - y));
  }
});

test('배분: 고르다 — 가장 무거운 샤드와 가벼운 샤드 차이가 가장 긴 하네스 하나보다 작다', () => {
  const longest = Math.max(...BASE.values());
  for (const n of [2, 3, 4, 6]) {
    const loads = assignShards(NAMES, BASE, n).map((s) => s.seconds);
    const spread = Math.max(...loads) - Math.min(...loads);
    assert.ok(spread <= longest, `N=${n} 차이 ${spread}초 > ${longest}초 (${loads.join(', ')})`);
  }
  // 실측 기준 4샤드는 합계/4 에서 10% 안쪽이어야 한다(15분 상한 계획의 전제).
  const loads = assignShards(NAMES, BASE, 4).map((s) => s.seconds);
  const ideal = loads.reduce((a, b) => a + b, 0) / 4;
  assert.ok(Math.max(...loads) <= ideal * 1.1, `${loads.join(', ')} / 이상값 ${ideal}`);
});

test('배분: 가장 긴 것부터 가장 가벼운 샤드에 (LPT)', () => {
  const base = new Map([['a', 5], ['b', 4], ['c', 3], ['d', 3], ['e', 3]]);
  const shards = assignShards(['a', 'b', 'c', 'd', 'e'], base, 2);
  // 5→1번, 4→2번, 3(c)→2번(4<5), 3(d)→1번(5<7), 3(e)→2번(7<8)
  assert.deepEqual(shards.map((s) => s.names), [['a', 'd'], ['b', 'c', 'e']]);
  assert.deepEqual(shards.map((s) => s.seconds), [8, 10]);
});

test('배분: 기준선에 없는 하네스는 중간값으로 친다', () => {
  const base = new Map([['a', 10], ['b', 20], ['c', 30]]);
  const shards = assignShards(['a', 'b', 'c', 'new'], base, 1);
  assert.equal(shards[0].seconds, 80); // 10+20+30+중간값 20
  assert.deepEqual(shards[0].unknown, ['new']);
});

test('배분: 0초짜리가 많아도 빈 샤드를 만들지 않는다', () => {
  const base = new Map([['a', 0], ['b', 0], ['c', 0], ['d', 0]]);
  const shards = assignShards(['a', 'b', 'c', 'd'], base, 3);
  for (const s of shards) assert.ok(s.names.length > 0);
});

test('배분: 샤드 수가 하네스 수보다 많거나 1 미만이면 실패', () => {
  assert.throws(() => assignShards(['a', 'b'], new Map(), 3));
  assert.throws(() => assignShards(['a'], new Map(), 0));
});

// ── 인자 해석 ──

const parse = (s) => parseArgs(s ? s.split(' ') : []);

test('인자: 없으면 전부, --build 는 그대로', () => {
  assert.deepEqual(parse(''), { build: false, only: null, shard: null, timings: null, port: 0, jobs: 1, group: null });
  assert.equal(parse('--build').build, true);
  assert.equal(selectHarnesses(parse('')).harnesses.length, HARNESSES.length);
});

test('인자: --only 는 확장자 있어도 없어도, = 형식도, 실행은 목록 순서', () => {
  const o = parse('--only mcp-client-verify,steps-render-verify.mjs');
  assert.deepEqual(o.only, ['mcp-client-verify', 'steps-render-verify']);
  assert.deepEqual(parse('--only=steps-render-verify').only, ['steps-render-verify']);
  assert.deepEqual(selectHarnesses(o).harnesses.map(([f]) => f), ['steps-render-verify.mjs', 'mcp-client-verify.mjs']);
});

test('인자: --only 에 모르는 이름이면 그 이름을 대며 실패', () => {
  assert.throws(() => parse('--only steps-render-verify,nope'), (e) => e instanceof UsageError && /nope/.test(e.message));
  assert.throws(() => parse('--only list-screen-contract-verify'), UsageError); // 파일은 있지만 run-all 목록 밖
  assert.throws(() => parse('--only a,,b'), UsageError);
  assert.throws(() => parseArgs(['--only=']), UsageError);
});

test('인자: --shard 형식 오류', () => {
  for (const bad of ['0/4', '5/4', '1/0', 'a/b', '1-4', '1/4/2', '-1/4', ' 1/4', '1/99']) {
    assert.throws(() => parseArgs(['--shard', bad]), UsageError, bad);
  }
  assert.throws(() => parse('--shard'), UsageError);
  assert.throws(() => parse('--shard --build'), UsageError);
  assert.deepEqual(parse('--shard 2/4').shard, { index: 2, total: 4 });
  assert.deepEqual(parse('--shard=4/4').shard, { index: 4, total: 4 });
});

test('인자: --shard 와 --only 를 같이 쓰면 실패 (순서 무관)', () => {
  assert.throws(() => parse('--shard 1/4 --only steps-render-verify'), UsageError);
  assert.throws(() => parse('--only steps-render-verify --shard 1/4'), UsageError);
});

test('인자: 모르는 인자·중복·값 없는 --timings 는 실패, -- 는 건너뛴다', () => {
  assert.throws(() => parse('--shards 1/4'), UsageError);
  assert.throws(() => parse('steps-render-verify'), UsageError);
  assert.throws(() => parse('--shard 1/4 --shard 2/4'), UsageError);
  assert.throws(() => parse('--timings'), UsageError);
  assert.throws(() => parseArgs(['--timings=']), UsageError);
  assert.equal(parse('-- --timings out.json').timings, 'out.json');
});

test('선택: --shard i/N 을 1~N 모두 모으면 전체와 같다', () => {
  const all = [];
  for (let i = 1; i <= 4; i++) {
    const { harnesses, shard } = selectHarnesses(parse(`--shard ${i}/4`), { baseline: BASE });
    assert.ok(harnesses.length > 0 && shard.seconds > 0);
    all.push(...harnesses.map(([f]) => f));
  }
  assert.deepEqual(all.sort(), HARNESSES.map(([f]) => f).sort());
});

test('인자: --port 는 0~65535 정수, 기본 0(빈 포트)', () => {
  assert.equal(parse('').port, 0);
  assert.equal(parse('--port 6099').port, 6099);
  assert.equal(parseArgs(['--port=0']).port, 0);
  for (const bad of ['-1', '65536', 'abc', '60.5', '']) assert.throws(() => parseArgs([`--port=${bad}`]), UsageError, bad);
  assert.throws(() => parse('--port'), UsageError);
});

test('인자: --jobs 는 1~16 정수, 기본 1', () => {
  assert.equal(parse('').jobs, 1);
  assert.equal(parse('--jobs 2').jobs, 2);
  assert.equal(parse('--shard 1/4 --jobs 3').jobs, 3);
  for (const bad of ['0', '17', 'x', '']) assert.throws(() => parseArgs([`--jobs=${bad}`]), UsageError, bad);
});

test('단독 하네스(EXCLUSIVE)는 목록에 있는 이름이다', () => {
  for (const file of EXCLUSIVE) assert.ok(HARNESSES.some(([f]) => f === file), file);
});

test('pre-push 예외: 바뀐 파일이 .github/** 뿐일 때만 하네스를 건너뛴다', () => {
  assert.equal(githubOnly(['.github/workflows/verify.yml']), true);
  assert.equal(githubOnly(['.github/workflows/verify.yml', '.github/actions/x/action.yml']), true);
  assert.equal(githubOnly(['.github/workflows/verify.yml', 'docs/qa/run-all.mjs']), false);
  assert.equal(githubOnly(['.githooks/pre-push']), false); // .github 와 이름만 비슷하다
  assert.equal(githubOnly([]), false); // 근거가 없으면 돈다
});

test('--group: storybook 은 정적 서버가 필요한 것, node 는 아닌 것 — 둘을 합치면 전체', () => {
  const sb = selectHarnesses(parse('--group storybook')).harnesses.map(([f]) => f);
  const node = selectHarnesses(parse('--group node')).harnesses.map(([f]) => f);
  assert.deepEqual(node, HARNESSES.map(([f]) => f).filter((f) => NO_STORYBOOK.has(f)));
  assert.equal(sb.length + node.length, HARNESSES.length);
  assert.ok(sb.every((f) => !NO_STORYBOOK.has(f)));
  assert.ok(HARNESSES.every((h) => GROUPS.storybook(h) !== GROUPS.node(h)));
});

test('--group 과 --shard: 그룹 안에서 나눈다(DevOps B = --group storybook --shard i/2)', () => {
  const all = [];
  for (let i = 1; i <= 2; i++) {
    const { harnesses, shard } = selectHarnesses(parse(`--group storybook --shard ${i}/2`), { baseline: BASE });
    assert.ok(harnesses.length > 0 && shard.seconds > 0);
    assert.ok(harnesses.every(([f]) => !NO_STORYBOOK.has(f)));
    all.push(...harnesses.map(([f]) => f));
  }
  assert.deepEqual(all.sort(), HARNESSES.map(([f]) => f).filter((f) => !NO_STORYBOOK.has(f)).sort());
});

test('--group 오류: 모르는 그룹, --only 와 같이, 그룹보다 많은 샤드', () => {
  assert.throws(() => parse('--group web'), UsageError);
  assert.throws(() => parse('--group'), UsageError);
  assert.throws(() => parse('--group node --only mcp-client-verify'), /--only 와 --group/);
  assert.throws(() => parse('--only mcp-client-verify --group node'), /--only 와 --group/);
  assert.throws(() => parse('--group node --shard 1/3'), /하네스 2개\(--group node\)/);
  assert.deepEqual(parse('--group node --shard 2/2').shard, { index: 2, total: 2 });
});
