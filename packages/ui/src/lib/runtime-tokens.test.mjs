import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runtimeTokens } from './runtime-tokens.ts';
import { renderUiRuntimeTokens, UI_RUNTIME_TOKENS_PATH } from '../../../../docs/research/ui-runtime-tokens.mjs';

const root = new URL('../../../../', import.meta.url);
const tokens = JSON.parse(readFileSync(new URL('docs/research/tokens.json', root), 'utf8'));

// CI checks 는 tokens.json 의 동기만 git diff 로 본다. 이 시험이 생성 상수를 그 tokens.json 에 잇는다.
test('runtime-tokens.ts 는 tokens.json 에서 다시 만든 것과 바이트가 같다', () => {
  assert.equal(readFileSync(new URL(UI_RUNTIME_TOKENS_PATH, root), 'utf8'), renderUiRuntimeTokens(tokens),
    '생성 상수가 tokens.json 과 어긋났다 — pnpm tokens 로 다시 만들고 함께 커밋해라');
});

// 목표 57 은 값을 옮기기만 했다 — tokens.json 을 직접 읽던 0.4.0 과 부품이 보는 수치가 같아야 한다.
test('부품이 읽는 값은 0.4.0 과 같다 — 레이어 가장자리 8px · 로더 지연 200ms · 최소 표시 400ms', () => {
  assert.deepEqual(runtimeTokens, {
    sizing: { 'anchor-edge-pad': tokens.sizing['anchor-edge-pad'] },
    loading: { 'loading-delay': tokens.loading['loading-delay'], 'loading-min-visible': tokens.loading['loading-min-visible'] },
  });
  assert.equal(parseFloat(runtimeTokens.sizing['anchor-edge-pad']), 8, 'layerCollisionPadding');
  assert.equal(Number.parseFloat(runtimeTokens.loading['loading-delay']), 200, 'useDelayedLoading 기본 delay');
  assert.equal(Number.parseFloat(runtimeTokens.loading['loading-min-visible']), 400, 'useDelayedLoading 기본 minVisible');
});

test('목록에 없는 토큰을 고르면 생성이 실패한다', () => {
  assert.throws(() => renderUiRuntimeTokens({ sizing: {}, loading: {} }), /anchor-edge-pad/);
});
