// 권한 없음·찾을 수 없음 State 변형(상단 바 규격 8절). 실제 모듈을 Vite SSR 로 렌더해 역할·제목·행동·낭독 문구를 본다.
// 치수(위 96·최대 폭 480·아이콘 40)와 키보드는 브라우저 하네스(state-render-verify)가 잰다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const server = await createServer({ root, configFile: false, logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
const { EmptyState, ErrorState } = await server.ssrLoadModule('/packages/ui/src/components/state/empty-state.tsx');
const { LockKeyhole, SearchX } = await import('lucide-react');
test.after(() => server.close());
const h = React.createElement;
const text = markup => markup.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

test('권한 없음: status(alert 아님)·제목 h1·대상 굵게·주 primary + 보조 링크', () => {
  const markup = renderToStaticMarkup(h(EmptyState, { size: 'page', graphic: h(LockKeyhole), title: '이 화면을 볼 권한이 없습니다',
    description: h(React.Fragment, null, h('strong', null, '스토어 B'), '에 접근할 권한이 없습니다.'),
    action: { label: '이전 화면으로', onClick() {} }, secondaryAction: { label: '조직 관리자에게 요청 방법', href: '/help/permission' } }));
  assert.match(markup, /^<div data-slot="empty-state" data-size="page" role="status"/);
  assert.doesNotMatch(markup, /role="alert"/);
  assert.match(markup, /<h1 data-slot="state-title">이 화면을 볼 권한이 없습니다<\/h1>/);
  assert.match(markup, /<p data-slot="state-description"><strong>스토어 B<\/strong>에 접근할 권한이 없습니다.<\/p>/);
  assert.match(markup, /<svg[^>]*lucide-lock-keyhole/);
  const actions = markup.match(/<div class="ds-state-actions">(.*)<\/div><\/div>$/)?.[1] ?? '';
  assert.match(actions, /^<button type="button"[^>]*bg-action[^>]*>.*이전 화면으로.*<\/button><a [^>]*href="\/help\/permission"[^>]*>.*조직 관리자에게 요청 방법.*<\/a>$/);
  assert.equal(text(markup), '이 화면을 볼 권한이 없습니다 스토어 B 에 접근할 권한이 없습니다. 이전 화면으로 조직 관리자에게 요청 방법');
});

test('찾을 수 없음: 아이콘·제목이 권한 없음과 다르다', () => {
  const markup = renderToStaticMarkup(h(EmptyState, { size: 'page', graphic: h(SearchX), title: '찾을 수 없습니다',
    description: '대상이 삭제되었거나 주소가 변경되었습니다.', action: { label: '이전 화면으로', onClick() {} },
    secondaryAction: { label: '목록으로', href: '/orders' } }));
  assert.match(markup, /role="status"/);
  assert.match(markup, /<svg[^>]*lucide-search-x/);
  assert.match(markup, /<h1 data-slot="state-title">찾을 수 없습니다<\/h1>/);
  assert.equal(text(markup), '찾을 수 없습니다 대상이 삭제되었거나 주소가 변경되었습니다. 이전 화면으로 목록으로');
});

test('기본 크기는 그대로다 — p 제목·secondary sm 하나·state-actions 없음', () => {
  const markup = renderToStaticMarkup(h(EmptyState, { title: '표시할 주문이 없습니다', action: { label: '필터 초기화', onClick() {} } }));
  assert.match(markup, /data-size="default" role="status"/);
  assert.match(markup, /<p data-slot="state-title">/);
  assert.doesNotMatch(markup, /ds-state-actions|<h1/);
  assert.match(markup, /h-\[var\(--control-h-sm\)\]/);
});

test('ErrorState page: alert 유지·h1·다시 시도 primary + 보조', () => {
  const markup = renderToStaticMarkup(h(ErrorState, { size: 'page', title: '화면을 불러오지 못했습니다', onRetry() {},
    secondaryAction: { label: '목록으로', href: '/orders' } }));
  assert.match(markup, /data-slot="error-state" data-size="page" role="alert"/);
  assert.match(markup, /<h1 data-slot="state-title">/);
  assert.equal(text(markup), '화면을 불러오지 못했습니다 다시 시도 목록으로');
});
