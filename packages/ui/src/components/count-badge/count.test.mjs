// 개수 표식 경계값(상단 바 규격 3절) — 0/1/99/100/실패. 순수 규칙은 바로, 렌더·SideNav·Tabs 배선은 Vite SSR 로 실제 모듈을 그린다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { COUNT_MAX, countDisplay, countSpoken } from './count.ts';

const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const server = await createServer({ root, configFile: false, logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
const { CountBadge } = await server.ssrLoadModule('/packages/ui/src/components/count-badge/count-badge.tsx');
const { SideNav, SideNavItem } = await server.ssrLoadModule('/packages/ui/src/components/app-shell/side-nav.tsx');
const { Tabs, TabsList, TabsTrigger } = await server.ssrLoadModule('/packages/ui/src/components/tabs/tabs.tsx');
test.after(() => server.close());
const h = React.createElement;

test('경계값: 0·음수 숨김 · 1 · 99 · 100 → "99+"(낭독 "99개 이상")', () => {
  assert.equal(COUNT_MAX, 99);
  assert.equal(countDisplay(0), null, '0 = 숨김');
  assert.equal(countDisplay(-3), null);
  assert.deepEqual(countDisplay(1), { text: '1', spoken: '1개' });
  assert.deepEqual(countDisplay(99), { text: '99', spoken: '99개' });
  assert.deepEqual(countDisplay(100), { text: '99+', spoken: '99개 이상' });
  assert.deepEqual(countDisplay(12_000), { text: '99+', spoken: '99개 이상' });
});

test('불러오기 실패(null·undefined·NaN·무한)는 숨김 — 0 으로 보이지 않는다', () => {
  for (const value of [null, undefined, Number.NaN, Infinity, -Infinity]) assert.equal(countDisplay(value), null, String(value));
});

test('소수는 내림 · 단위는 앱이 바꾼다(레코드는 "건") · 급함은 낭독에 ", 급함"', () => {
  assert.deepEqual(countDisplay(2.7), { text: '2', spoken: '2개' });
  assert.equal(countDisplay(0.4), null, '내림해서 0 이면 숨김');
  assert.deepEqual(countDisplay(5, '건'), { text: '5', spoken: '5건' });
  assert.equal(countSpoken(3, true), '3개, 급함');
  assert.equal(countSpoken(120, true, '건'), '99건 이상, 급함');
  assert.equal(countSpoken(0, true), null, '숨김이면 급함도 읽지 않는다');
});

test('CountBadge 렌더: 보이는 숫자(알약)는 낭독에서 숨기고 낭독 글자를 따로 · 급함 = 알약 왼쪽 점 · 점 표식', () => {
  assert.equal(renderToStaticMarkup(h(CountBadge, { count: 0 })), '');
  assert.equal(renderToStaticMarkup(h(CountBadge, { count: null })), '');
  const normal = renderToStaticMarkup(h(CountBadge, { count: 37 }));
  assert.match(normal, /^<span data-slot="count-badge" data-variant="count" class="ds-count-badge">/);
  assert.match(normal, /<span class="ds-count-badge-pill" aria-hidden="true">37<\/span><span class="sr-only">37개<\/span>/);
  assert.doesNotMatch(normal, /ds-count-badge-dot/, '일반은 점 없음');
  const capped = renderToStaticMarkup(h(CountBadge, { count: 100, urgent: true }));
  assert.match(capped, /data-urgent=""/);
  assert.match(capped, /<span class="ds-count-badge-dot" aria-hidden="true"><\/span><span class="ds-count-badge-pill" aria-hidden="true">99\+<\/span><span class="sr-only">99개 이상, 급함<\/span>/,
    '급함 = 점 6 이 알약 왼쪽(알약 밖) — 알약 크기는 일반과 같다');
  const dot = renderToStaticMarkup(h(CountBadge, { count: 12, dot: true }));
  assert.match(dot, /data-variant="dot"/);
  assert.doesNotMatch(dot, />12</, '점 표식은 숫자를 그리지 않는다');
  assert.match(dot, /<span class="sr-only">12개<\/span>/);
});

test('SideNavItem count: 펼친 메뉴는 알약(낭독 "라벨 12개"), 레일 점은 아이콘 안(aria-hidden) · 출시 예정은 개수 없음 · badge 그대로', () => {
  const markup = renderToStaticMarkup(h(SideNav, { brand: '판매관리', brandIcon: h('svg') },
    h(SideNavItem, { icon: h('svg'), label: '검토할 상품', href: '#review', count: 12 }),
    h(SideNavItem, { icon: h('svg'), label: '확인할 알림', href: '#alerts', count: 2, countUrgent: true }),
    h(SideNavItem, { icon: h('svg'), label: '정산', href: '#settle', count: 4, disabled: true }),
    h(SideNavItem, { icon: h('svg'), label: '문의', href: '#qna', badge: 'N' })));
  // 아이콘 칸(aria-hidden) 안에 레일 점, 라벨 뒤에 알약.
  assert.match(markup, /<span class="ds-side-nav-icon" aria-hidden="true"><svg><\/svg><span data-slot="count-badge" data-variant="dot" class="ds-count-badge ds-side-nav-count-dot">/);
  assert.match(markup, /검토할 상품<\/span><span data-slot="count-badge" data-variant="count" class="ds-count-badge ds-side-nav-count">.*?<span class="sr-only">12개<\/span>/);
  assert.match(markup, /<span class="sr-only">2개, 급함<\/span>/);
  assert.doesNotMatch(markup.match(/aria-label="정산 \(출시 예정\)".*?<\/span><\/span>/s)?.[0] ?? '', /count-badge/, '출시 예정 항목은 개수를 그리지 않는다');
  assert.match(markup, /data-slot="side-nav-badge" class="ds-side-nav-meta ds-side-nav-badge tabular">N<\/span>/, '기존 badge 는 그대로');
});

test('TabsTrigger count: 라벨 뒤 알약 · 0·실패는 없음(지금 모양 그대로)', () => {
  const markup = renderToStaticMarkup(h(Tabs, { defaultValue: 'todo' }, h(TabsList, null,
    h(TabsTrigger, { value: 'todo', count: 3, countUrgent: true }, '처리 필요'),
    h(TabsTrigger, { value: 'all', count: 0 }, '전체'),
    h(TabsTrigger, { value: 'done', count: null }, '완료'))));
  assert.match(markup, /처리 필요<span data-slot="count-badge" data-variant="count" data-urgent="" class="ds-count-badge ds-tabs-count">/);
  assert.match(markup, />전체<\/button>/, '0 이면 탭 글자만');
  assert.match(markup, />완료<\/button>/, '실패면 탭 글자만');
});

test('급함 = 위험 채움 알약(위험 버튼 채움 · 브랜드 채움 위 글자) · 알약 크기 일반과 같음 · 레일 급함 점 바탕색 링 2px — 새 토큰 없음', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('./count-badge.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = selector => css.match(new RegExp(`${selector.replace(/[[\]().*+?^$|\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
  const urgentPill = rule('.ds-count-badge[data-urgent] .ds-count-badge-pill');
  assert.match(urgentPill, /background: var\(--action-danger-bg\)/, 'Button danger 와 같은 채움');
  assert.match(urgentPill, /color: var\(--text-on-brand\)/, 'Button danger 와 같은 글자색(fg-on-brand)');
  assert.doesNotMatch(urgentPill, /block-size|padding|min-inline-size/, '크기는 일반 알약 규칙 그대로');
  assert.doesNotMatch(css, /--status-danger-bg/, '연한 위험 바탕은 쓰지 않는다(11-25 구현 검수 A)');
  assert.match(rule('.ds-count-badge-dot'), /background: var\(--status-danger-fg\)/, '알약 왼쪽 점 = 위험색');
  const railUrgent = rule('.ds-count-badge[data-variant="dot"][data-urgent]');
  assert.match(railUrgent, /box-shadow: 0 0 0 var\(--space-2\) var\(--count-badge-ring, var\(--bg-surface\)\)/, '레일 급함 점 = 바탕색 링 2px');
  assert.doesNotMatch(rule('.ds-count-badge[data-variant="dot"]'), /box-shadow/, '일반 점은 링 없음 — 모양이 다르다(P5)');
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgb\(|oklch\(/i, '직접 쓴 색 없음');
});
