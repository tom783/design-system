import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldValidate } from './should-validate.ts';
// 세 트리거 × 오류 이력 × 조합 여부: 요구된 9가지보다 넓은 전체 12조합.
for (const trigger of ['change', 'blur', 'submit']) {
  for (const hasErrored of [false, true]) for (const isComposing of [false, true]) {
    test(`${trigger} 오류이력=${hasErrored} 조합=${isComposing}`, () => {
      const expected = isComposing ? false : trigger === 'change' ? hasErrored : true;
      assert.equal(shouldValidate({ trigger, hasErrored, isComposing }), expected);
    });
  }
}
