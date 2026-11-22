// run-all 실행 계획 테스트 — 인자 해석.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { HARNESSES, UsageError, harnessName, parseArgs } from './run-plan.mjs';

const NAMES = HARNESSES.map(([f]) => harnessName(f));

test('하네스 목록: 이름이 겹치지 않고 파일이 있다', () => {
  assert.equal(new Set(NAMES).size, NAMES.length);
  for (const [file] of HARNESSES) assert.ok(existsSync(new URL(`./${file}`, import.meta.url)), file);
});

const parse = (s) => parseArgs(s ? s.split(' ') : []);

test('인자: 없으면 기본값, --build·--timings', () => {
  assert.deepEqual(parse(''), { build: false, timings: null });
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
