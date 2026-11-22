import test from 'node:test';
import assert from 'node:assert/strict';
import { splitLayoutClassName } from './layout-class.ts';

test('폭·배치 클래스는 바깥, 입력칸 모양은 안쪽으로 나눈다', () => {
  assert.deepEqual(splitLayoutClassName('w-80 max-w-full'), { outer: 'w-80 max-w-full', inner: undefined });
  assert.deepEqual(splitLayoutClassName('w-auto min-w-40 flex-1 tabular text-right'), { outer: 'w-auto min-w-40 flex-1', inner: 'tabular text-right' });
  assert.deepEqual(splitLayoutClassName('basis-64 grow shrink-0 order-2 self-start col-span-2 row-start-1'),
    { outer: 'basis-64 grow shrink-0 order-2 self-start col-span-2 row-start-1', inner: undefined });
  assert.deepEqual(splitLayoutClassName('ml-auto -mt-1 mx-2 ms-4'), { outer: 'ml-auto -mt-1 mx-2 ms-4', inner: undefined });
});
test('변형 접두어·important·임의 값도 유틸리티 이름으로 판별하고 원문을 보존한다', () => {
  assert.deepEqual(splitLayoutClassName('sm:w-96 md:max-w-[24rem] !w-72 w-80! has-[:focus]:w-full'),
    { outer: 'sm:w-96 md:max-w-[24rem] !w-72 w-80! has-[:focus]:w-full', inner: undefined });
  assert.deepEqual(splitLayoutClassName('w-[calc(100%-2rem)] flex-[2_1_0%]'), { outer: 'w-[calc(100%-2rem)] flex-[2_1_0%]', inner: undefined });
});
test('입력칸 자체의 클래스는 안쪽에 남는다', () => {
  // 안쪽 여백·글자·테두리·높이는 입력칸 모양이다. flex(표시 방식)·flex-col 은 항목 배치가 아니다.
  const inner = 'px-3 pe-2 ps-4 text-sm border-danger-ink h-8 flex flex-col tabular max-h-10 mix-blend-normal';
  assert.deepEqual(splitLayoutClassName(inner), { outer: undefined, inner });
  assert.deepEqual(splitLayoutClassName(undefined), {});
  assert.deepEqual(splitLayoutClassName('  w-80   text-right '), { outer: 'w-80', inner: 'text-right' });
});
