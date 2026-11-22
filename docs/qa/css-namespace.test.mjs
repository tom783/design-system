import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const publicUtilities = new Set(['sr-only', 'tabular']);
function classSelectors(source) {
  // import 경로·속성값·주석의 점은 클래스가 아니다. 중첩 규칙과 :is/:has 안도 검사한다.
  const css = source.replace(/\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '')
    .replace(/\[[^\]]*\]/g, '');
  const selectors = [...css.matchAll(/([^{};]+)\{/g)].map(match => match[1]);
  return [...new Set(selectors.flatMap(selector => [...selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map(match => match[1])))];
}
const unprefixed = source => classSelectors(source).filter(name => !name.startsWith('ds-') && !publicUtilities.has(name));

test('모든 UI CSS의 클래스 선택자는 ds- 접두어를 쓴다(공개 sr-only·tabular 제외)', () => {
  const root = new URL('../../packages/ui/src/', import.meta.url);
  const files = readdirSync(root, { recursive: true }).filter(path => path.endsWith('.css')).sort();
  assert.ok(files.length > 0, 'UI 소스의 CSS 전체를 검사해야 한다');
  const violations = [];
  let count = 0;
  for (const path of files) {
    const css = readFileSync(new URL(path, root), 'utf8');
    count += classSelectors(css).length;
    violations.push(...unprefixed(css).map(name => `${path}: .${name}`));
  }
  assert.ok(count > 0, '빈 선택자 목록으로 통과하지 않아야 한다');
  assert.deepEqual(violations, [], '소비자 클래스와 충돌하는 선택자');
});

test('중첩·복합·가상 클래스의 접두어 누락을 잡고 공개 예외만 허용한다', () => {
  const css = `
    @import "./components.css";
    /* .comment {} */
    @layer components {
      .ds-panel:is(.avatar, [data-file=".image"]) > .state-error { color: red; }
      @media (width < 40rem) { .thumbnail:hover, .sr-only, .tabular { display: block; } }
      .ds-table { &:has(.data-table-cell) { color: red; } }
      .ds-example { content: ".content { ignored }"; background: url("./picture.svg"); }
      .truncate, .ds-panel._private { overflow: hidden; }
    }
  `;
  assert.deepEqual(unprefixed(css), ['avatar', 'state-error', 'thumbnail', 'data-table-cell', 'truncate', '_private']);
});
