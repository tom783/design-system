import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('파일 업로드 CSS의 클래스 선택자는 ds- 접두어로 소비자 클래스와 분리한다', () => {
  const css = readFileSync(new URL('./file-upload.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors = [...css.matchAll(/([^{}]+)\{/g)].map(match => match[1]);
  const classes = selectors.flatMap(selector => [...selector.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map(match => match[1]));
  assert.ok(classes.length > 0, '스타일의 클래스 선택자를 검사해야 한다');
  assert.deepEqual([...new Set(classes.filter(name => !name.startsWith('ds-') && !['sr-only', 'tabular'].includes(name)))], []);
});
