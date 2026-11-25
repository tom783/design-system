// AppShell 상단 바 높이 64 고정(2026-11-25 오너 결정 · 상단 바 규격 1절). 실제 픽셀은 app-shell-render-verify 가 네 폭에서 잰다 —
// 여기서는 CSS 가 같은 토큰(--space-64 = 64px)을 쓰는지와 슬롯 구성을 본다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const css = await readFile(new URL('./app-shell.css', import.meta.url), 'utf8');
const tokens = await readFile(new URL('../../../../tokens/tokens.css', import.meta.url), 'utf8');
const rule = selector => css.match(new RegExp(`^${selector.replace(/[.]/g, '\\.')} \\{([^}]*)\\}`, 'm'))?.[1] ?? '';

test('header 높이 = SideNav brand 행 최소 높이 = --space-64 = 64px', () => {
  assert.match(tokens, /--space-64\s*:\s*64px;/);
  assert.match(rule('.ds-app-shell-header'), /block-size: var\(--space-64\);/);
  assert.match(rule('.ds-app-shell-header'), /box-sizing: border-box;/, '경계 1px 가 64 안에 든다');
  assert.match(rule('.ds-app-shell-header'), /align-items: center;/);
  assert.match(rule('.ds-app-shell-header'), /padding: 0 var\(--space-24\);/);
  assert.match(rule('.ds-side-nav-brand'), /min-height: var\(--space-64\);/);
  // 1024 미만은 좌우만 16 — 세로 패딩이 다시 생기면 64 를 넘는다.
  assert.match(css, /@media \(width < 1024px\) \{[\s\S]*?\.ds-app-shell-header \{ padding-inline: var\(--space-16\); \}/);
  assert.doesNotMatch(css, /\.ds-app-shell-header \{ padding: var\(--space-16\)/);
});

test('슬롯: 왼쪽 묶음 · 오른쪽 묶음, header 없이도 지금처럼', async () => {
  const root = fileURLToPath(new URL('../../../../../', import.meta.url));
  const server = await createServer({ root, configFile: false, logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { AppShell } = await server.ssrLoadModule('/packages/ui/src/components/app-shell/app-shell.tsx');
    const h = React.createElement;
    const both = renderToStaticMarkup(h(AppShell, { sidebar: h('nav'), header: h('span', null, '맥락'), headerEnd: h('button', null, '사용자') }, h('p')));
    assert.match(both, /<header data-slot="app-shell-header" class="ds-app-shell-header"><div data-slot="app-shell-header-start" class="ds-app-shell-header-start"><span>맥락<\/span><\/div><div data-slot="app-shell-header-end" class="ds-app-shell-header-end"><button>사용자<\/button><\/div><\/header>/);
    const endOnly = renderToStaticMarkup(h(AppShell, { sidebar: h('nav'), headerEnd: h('button', null, '사용자') }, h('p')));
    assert.match(endOnly, /<header [^>]*><div data-slot="app-shell-header-start" class="ds-app-shell-header-start"><\/div><div data-slot="app-shell-header-end"/);
    const startOnly = renderToStaticMarkup(h(AppShell, { sidebar: h('nav'), header: h('span', null, '맥락') }, h('p')));
    assert.doesNotMatch(startOnly, /app-shell-header-end/);
    const none = renderToStaticMarkup(h(AppShell, { sidebar: h('nav') }, h('p')));
    assert.doesNotMatch(none, /<header/);
  } finally { await server.close(); }
});
