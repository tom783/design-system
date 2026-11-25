// 토스트 누름 면적(상단 바 규격 P4 · 6절 '버튼 크기', 11-25 디자인 총괄 답 ①②): 닫기 버튼은 모든 토스트(행동 결과 포함) 1024 이상 38 ·
// 미만 44, 알림 토스트 [이동] 링크는 1024 미만 44. 실제 픽셀은 top-bar-render-verify(네 폭 × 두 테마)와 list-screen-render-verify
// (행동 결과 토스트 한 줄·여러 줄)가 잰다 — 여기서는 CSS 가 같은 토큰을 같은 경계에서 쓰는지 본다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('./toast.css', import.meta.url), 'utf8');
const tokens = await readFile(new URL('../../../../tokens/tokens.css', import.meta.url), 'utf8');
const TOAST = '.ds-toaster[data-sonner-toaster] [data-sonner-toast][data-styled="true"]';
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** 줄 맨 앞에서 시작하는 그 선택자 규칙들의 본문(같은 선택자 규칙이 여럿이면 이어 붙인다). */
const rule = selector => [...css.matchAll(new RegExp(`^${escape(selector)} \\{([^}]*)\\}`, 'gm'))].map(m => m[1]).join('');
const narrow = css.match(/@media \(width < 1024px\) \{ ([^\n]*) \}\n/g)?.join('\n') ?? '';

test('토큰: 38 = --control-h-md · 44 = --tap-min', () => {
  assert.match(tokens, /--control-h-md\s*:\s*38px;/);
  assert.match(tokens, /--tap-min\s*:\s*44px;/);
});

test('닫기 버튼: 1024 이상 38 · 미만 44 — 모든 토스트 공통(행동 결과 토스트 포함)', () => {
  // 크기 변수는 토스트 상자에 둔다 — 알림 토스트만이 아니라 [data-styled] 토스트 전부다.
  assert.match(rule(TOAST), / --ds-toast-close: var\(--control-h-md\); /);
  assert.match(narrow, new RegExp(`${escape(TOAST)} \\{ --ds-toast-close: var\\(--tap-min\\); \\}`));
  const close = rule(`${TOAST} [data-close-button]`);
  assert.match(close, /width: var\(--ds-toast-close\); height: var\(--ds-toast-close\);/);
  assert.doesNotMatch(close, /--control-h-sm/, '예전 32(ghost sm)가 남지 않는다');
  // 중심 = 첫 줄 글자 중심(위 패딩 16 + 1.5em / 2). em 이 상자 글자(13px)를 따르게 글자 크기를 물려받는다.
  assert.match(close, /top: calc\(var\(--space-16\) \+ 0\.75em - var\(--ds-toast-close\) \/ 2\);/);
  assert.match(close, /font-size: inherit;/);
  assert.match(close, /transform: none;/);
  // 본문 오른쪽 비움 = 오른쪽 8 + 버튼 + 간격 8 — 버튼 크기를 따라간다(54 · 1024 미만 60).
  assert.match(rule(`${TOAST}:has(> [data-close-button])`),
    /padding-inline-end: calc\(var\(--space-8\) \+ var\(--ds-toast-close\) \+ var\(--space-8\) - var\(--border-width\)\);/);
});

test('알림 토스트 [이동]: 1024 미만 44(높이만 — 글자·여백은 Button md 그대로)', () => {
  assert.match(narrow, /\.ds-toast-notification-link \{ min-block-size: var\(--tap-min\); \}/);
  assert.doesNotMatch(rule('.ds-toast-notification-link'), /block-size|height/, '1024 이상은 ghost md 38 그대로');
});
