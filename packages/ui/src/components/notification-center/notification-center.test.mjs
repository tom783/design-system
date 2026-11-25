// 알림 센터·벨(상단 바 규격 4·5절) — 벨 이름 · 시간 표기 · 한 줄 낭독 · 패널 상태 8개. 패널 내용은 Vite SSR 로 실제 모듈을 그린다.
// 팝오버·Sheet 열림과 초점(제목 → Tab → Esc 벨 복귀)은 브라우저 하네스(top-bar-render-verify)가 잰다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const server = await createServer({ root, configFile: false, logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
// 순수 규칙도 Vite 로 불러온다 — CountBadge 규칙을 확장자 없는 상대 경로로 가져와 node 직접 import 로는 풀리지 않는다.
const { SOURCE_MAX, bellName, detailText, formatNotificationTime, notificationName, truncateSource } =
  await server.ssrLoadModule('/packages/ui/src/components/notification-center/notification-format.ts');
const { NotificationCenter, NotificationPanel } = await server.ssrLoadModule('/packages/ui/src/components/notification-center/notification-center.tsx');
test.after(() => server.close());
const h = React.createElement;
const text = markup => markup.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const NOW = new Date(2026, 10, 25, 14, 20);
const at = (...args) => new Date(...args);
const urgent = { id: 'u', source: '판매관리 · 스토어 A', title: '취소 요청 2건', time: NOW, href: '#cancel', urgent: true, count: 2,
  deadline: { text: '2시간 초과', level: 'overdue' } };
const fresh = { id: 'n', source: '판매관리 · 스토어 A', title: '신규 주문 37건', time: NOW.getTime() - 12 * 60_000, href: '#orders', count: 37,
  deadline: { text: '4시간 남음' } };

test('벨 이름 — 0·실패 "알림" · 1~99 · 99+ · 급함 덧붙임(규격 4절)', () => {
  assert.equal(bellName(0), '알림');
  assert.equal(bellName(null), '알림', '개수 실패는 숫자를 숨긴다');
  assert.equal(bellName(undefined, true), '알림', '숫자가 없으면 급함도 말하지 않는다');
  assert.equal(bellName(1), '알림, 안 읽음 1개');
  assert.equal(bellName(99), '알림, 안 읽음 99개');
  assert.equal(bellName(100), '알림, 안 읽음 99개 이상');
  assert.equal(bellName(2, true), '알림, 안 읽음 2개, 급한 알림 있음');
});

test('시간 표기 — 방금 · n분 전 · n시간 전 · 어제 HH:MM · MM.DD HH:MM · 다른 해 YYYY.MM.DD · 툴팁 전체 일시', () => {
  const f = time => formatNotificationTime(time, NOW).text;
  assert.equal(f(at(2026, 10, 25, 14, 19, 31)), '방금', '1분 미만');
  assert.equal(f(at(2026, 10, 25, 14, 25)), '방금', '앞선 시각(시계 차이)');
  assert.equal(f(at(2026, 10, 25, 14, 8)), '12분 전');
  assert.equal(f(at(2026, 10, 25, 13, 21)), '59분 전');
  assert.equal(f(at(2026, 10, 25, 13, 20)), '1시간 전');
  assert.equal(f(at(2026, 10, 24, 14, 21)), '23시간 전', '24시간 미만이 어제보다 먼저');
  assert.equal(f(at(2026, 10, 24, 14, 20)), '어제 14:20');
  assert.equal(f(at(2026, 10, 24, 0, 5)), '어제 00:05');
  assert.equal(f(at(2026, 10, 22, 9, 30)), '11.22 09:30');
  assert.equal(f(at(2025, 10, 24, 9, 30)), '2025.11.24');
  assert.equal(formatNotificationTime(at(2026, 10, 22, 9, 30), NOW).full, '2026.11.22 09:30');
  assert.equal(formatNotificationTime('not a date', NOW).text, '', '잘못된 시각은 비운다');
  // 새해 첫날의 "어제"는 지난해 12.31 — 다른 해 규칙보다 어제가 먼저다.
  assert.equal(formatNotificationTime(at(2025, 11, 31, 23, 0), at(2026, 0, 1, 23, 30)).text, '어제 23:00');
});

test('한 줄 낭독 "<출처>, 급함, <제목>, <건수>, <기한>, <시각>, 안 읽음/읽음"(급할 때만 급함) · 3줄 글자 · 출처 20자', () => {
  assert.equal(notificationName(urgent, NOW), '판매관리 · 스토어 A, 급함, 취소 요청 2건, 2건, 2시간 초과, 방금, 안 읽음', '급함은 출처 바로 뒤(규격 5절 r1.2)');
  assert.equal(notificationName({ ...urgent, read: true }, NOW), '판매관리 · 스토어 A, 급함, 취소 요청 2건, 2건, 2시간 초과, 방금, 읽음', '읽어도 급함은 남는다(미처리)');
  assert.doesNotMatch(notificationName(fresh, NOW), /급함/, '급하지 않으면 말하지 않는다');
  assert.equal(notificationName({ ...fresh, read: true }, NOW), '판매관리 · 스토어 A, 신규 주문 37건, 37건, 4시간 남음, 12분 전, 읽음');
  assert.equal(notificationName({ id: 'x', source: '물류', title: '입고 완료', time: NOW, href: '#' }, NOW), '물류, 입고 완료, 방금, 안 읽음', '없는 칸은 건너뛴다');
  assert.equal(detailText(fresh), '37건 · 4시간 남음');
  assert.equal(detailText({ count: 0 }), null);
  assert.equal(SOURCE_MAX, 20);
  assert.equal(truncateSource('가'.repeat(20)), '가'.repeat(20));
  assert.equal(truncateSource('가'.repeat(21)), `${'가'.repeat(20)}…`);
});

const panel = props => renderToStaticMarkup(h(NotificationPanel, { titleId: 't', sheet: false, onClose() {}, now: NOW,
  onMarkAllRead() {}, settingsHref: '#settings', ...props }));

test('패널 머리 — 제목 "알림"(h2, 대화상자 이름 · 초점 받지 않음) · 모두 읽음 · 설정 링크 · 탭·도구 슬롯', () => {
  const markup = panel({ items: [fresh], tabs: h('div', { id: 'tabs' }), toolbar: h('div', { id: 'filter' }) });
  assert.match(markup, /<h2 id="t" data-slot="notification-center-title" class="ds-notification-center-title">알림<\/h2>/,
    '제목은 tabindex 가 없다 — 열면 초점은 패널 자체(11-25 구현 검수 B)');
  assert.ok(markup.indexOf('모두 읽음') < markup.indexOf('aria-label="알림 설정"') && markup.indexOf('aria-label="알림 설정"') < markup.indexOf('id="tabs"'),
    '패널 안 첫 누를 것이 모두 읽음 — 패널에서 Tab 한 번이면 모두 읽음');
  assert.match(markup, />모두 읽음</);
  assert.match(markup, /<a [^>]*href="#settings" aria-label="알림 설정"/);
  assert.match(markup, /data-slot="notification-center-tabs"[^>]*><div id="tabs">/);
  assert.match(markup, /data-slot="notification-center-toolbar"[^>]*><div id="filter">/);
  assert.doesNotMatch(markup, /aria-label="닫기"/, '팝오버는 닫기 버튼이 없다(Esc·바깥)');
});

test('알림 한 줄 — 안 읽음 점 + 600 · 급함 아이콘 · 기한 등급 · 링크 이름 · 시각 툴팁', () => {
  const markup = panel({ items: [urgent, { ...fresh, read: true }] });
  const rows = markup.match(/<a href="[^"]*" data-slot="notification-row".*?<\/a>/g);
  assert.equal(rows.length, 2);
  assert.match(rows[0], /aria-label="판매관리 · 스토어 A, 급함, 취소 요청 2건, 2건, 2시간 초과, 방금, 안 읽음"/);
  assert.match(rows[0], /data-urgent=""/);
  assert.match(rows[0], /ds-notification-row-dot/);
  assert.match(rows[0], /lucide-circle-alert/);
  assert.match(rows[0], /data-level="overdue">2건 · 2시간 초과</);
  assert.match(rows[0], /<time class="ds-notification-row-time" dateTime="[^"]+" title="2026.11.25 14:20">방금<\/time>/);
  assert.match(rows[1], /data-read=""/);
  assert.doesNotMatch(rows[1], /ds-notification-row-dot/, '읽음은 점 없음');
  assert.match(rows[1], /data-level="normal">37건 · 4시간 남음</);
});

test('상태 8개 — 로딩 · 비어 있음 · 실패 · 더 불러오기 · 다음 목록 로딩 · 목록 끝 · 새 알림 도착 · 모두 읽음 뒤', () => {
  const loading = panel({ state: 'loading' });
  assert.equal((loading.match(/ds-notification-center-skeleton/g) ?? []).length, 4, '스켈레톤 4줄');
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /role="status">알림을 불러오는 중</);

  const empty = panel({ items: [], emptyTitle: '처리할 알림이 없습니다', emptyDescription: '새로 처리할 일이 생기면 여기에 표시됩니다.' });
  assert.match(empty, /data-slot="empty-state"[^>]*role="status"/);
  assert.match(text(empty), /처리할 알림이 없습니다 새로 처리할 일이 생기면 여기에 표시됩니다\.$/);

  const failed = panel({ state: 'error', onRetry() {} });
  assert.match(failed, /data-slot="error-state"[^>]*role="alert"/);
  assert.match(text(failed), /알림을 불러오지 못했습니다 다시 시도$/);

  assert.match(panel({ items: [fresh], hasMore: true }), /<button[^>]*>.*더 불러오기.*<\/button>/);
  const more = panel({ items: [fresh], hasMore: true, loadingMore: true });
  assert.match(more, /role="status">.*불러오는 중<\/div>/);
  assert.doesNotMatch(more, /더 불러오기/);

  const end = panel({ items: [fresh] });
  assert.match(end, /data-slot="notification-center-end"[^>]*>더 이상 알림이 없습니다</);

  const pending = panel({ items: [fresh], pendingCount: 2 });
  assert.match(pending, /data-slot="notification-center-body"[^>]*><button type="button" data-slot="notification-center-pending"[^>]*>새 알림 2개 · 보기<\/button>/, '목록 맨 위 고정 줄');
  assert.doesNotMatch(panel({ items: [], pendingCount: 2 }), /notification-center-pending/, '목록이 없으면 고정 줄 없이 비어 있음');

  const allRead = panel({ items: [{ ...urgent, read: true }, { ...fresh, read: true }] });
  assert.doesNotMatch(allRead, /ds-notification-row-dot/, '점이 모두 빠진다');
  assert.match(allRead, /lucide-circle-alert/, '급함 아이콘은 남는다(미처리)');
  assert.match(allRead, /data-level="overdue"/, '초과 기한도 남는다');
});

test('NotificationCenter 서버 첫 그림 — 벨만(닫힘) · 이름 · 표식 · aria-expanded', () => {
  const markup = renderToStaticMarkup(h(NotificationCenter, { count: 128, urgent: true }));
  const button = markup.match(/^<button [^>]*>/)?.[0] ?? '';
  for (const attribute of ['data-slot="notification-bell"', 'aria-haspopup="dialog"', 'aria-expanded="false"', 'aria-label="알림, 안 읽음 99개 이상, 급한 알림 있음"'])
    assert.ok(button.includes(attribute), `벨 ${attribute}`);
  assert.match(markup, /<span aria-hidden="true" data-slot="count-badge" data-variant="count" data-urgent=""/, '표식은 낭독에서 숨김 — 벨 이름이 대신한다');
  assert.match(markup, />99\+</);
  assert.doesNotMatch(markup, /role="dialog"/, '패널은 열 때 그린다');
  assert.match(renderToStaticMarkup(h(NotificationCenter, { count: null })), /aria-label="알림"/);
  assert.doesNotMatch(renderToStaticMarkup(h(NotificationCenter, { count: 0 })), /count-badge/);
});
