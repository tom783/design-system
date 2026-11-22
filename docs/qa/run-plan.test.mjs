// run-all 실행 계획 테스트 — 인자 해석.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { HARNESSES, UsageError, harnessName, parseArgs, selectHarnesses } from './run-plan.mjs';

const NAMES = HARNESSES.map(([f]) => harnessName(f));

test('하네스 목록: 이름이 겹치지 않고 파일이 있다', () => {
  assert.equal(new Set(NAMES).size, NAMES.length);
  for (const [file] of HARNESSES) assert.ok(existsSync(new URL(`./${file}`, import.meta.url)), file);
});

const parse = (s) => parseArgs(s ? s.split(' ') : []);

test('인자: 없으면 기본값, --build·--timings', () => {
  assert.deepEqual(parse(''), { build: false, only: null, timings: null });
  assert.equal(selectHarnesses(parse('')).harnesses.length, HARNESSES.length);
  assert.equal(parse('--build').build, true);
  assert.equal(parse('--timings out.json').timings, 'out.json');
  assert.equal(parseArgs(['--timings=a/b.json']).timings, 'a/b.json');
});

test('인자: 모르는 인자·중복·값 없는 --timings 는 실패, -- 는 건너뛴다', () => {
  assert.throws(() => parse('--timing out.json'), UsageError);
  assert.throws(() => parse('steps-render-verify'), UsageError);
  assert.throws(() => parse('--timings a.json --timings b.json'), UsageError);
  assert.throws(() => parse('--timings'), UsageError);
  assert.throws(() => parse('--timings --build'), UsageError);
  assert.throws(() => parseArgs(['--timings=']), UsageError);
  assert.equal(parse('-- --timings out.json').timings, 'out.json');
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
  assert.throws(() => parse('--only'), UsageError);
  assert.throws(() => parse('--only a --only b'), UsageError);
});
