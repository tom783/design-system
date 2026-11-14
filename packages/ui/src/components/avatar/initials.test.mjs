import test from 'node:test';
import assert from 'node:assert/strict';
import { initials } from './initials.ts';
for (const [input, expected] of [
  ['John Doe', 'JD'], ['Jane', 'J'], ['John Doe Smith', 'JD'], ['John   Doe', 'JD'], ['  John Doe  ', 'JD'],
  ['김연', '김연'], ['김철수', '철수'], ['남궁민수', '민수'], ['王小明', '小明'], ['やまだ', 'まだ'], ['ヤマダ', 'マダ'],
  ['John 김철수', '철수'], ['', ''], ['   ', ''], ['😀', '😀'], ['😀 😎', '😀😎'], ['👨‍👩‍👧‍👦', '👨‍👩‍👧‍👦'],
]) test(`이니셜 ${JSON.stringify(input)}`, () => assert.equal(initials(input), expected));
