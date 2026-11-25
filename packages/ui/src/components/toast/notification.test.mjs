// 알림 토스트 등급·묶음 키·한 번에 하나(상단 바 규격 6절). 순수 규칙은 바로, toast.notify 배선은 Vite SSR 로 실제 모듈을 불러 본다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { renderToStaticMarkup } from 'react-dom/server';
import { NOTIFICATION_DURATION, nextNotification, notificationDuration } from './notification.ts';

const ids = () => { let n = 0; return () => `n${++n}`; };

test('등급: 일반은 기본 8초·앱이 준 시간, 고정은 닫을 때까지(Infinity)', () => {
  assert.equal(NOTIFICATION_DURATION, 8000);
  assert.equal(notificationDuration(undefined), 8000);
  assert.equal(notificationDuration('normal'), 8000);
  assert.equal(notificationDuration('normal', 3000), 3000);
  assert.equal(notificationDuration('pinned'), Infinity);
  assert.equal(notificationDuration('pinned', 3000), Infinity, '고정은 짧은 시간을 넘겨도 남는다(오류 토스트와 같은 방식)');
});

test('묶음 키: 같은 키가 떠 있으면 새 토스트 대신 건수만 더한다(같은 id)', () => {
  const next = ids();
  const first = nextNotification(null, false, { groupKey: 'cancel:A' }, next);
  assert.deepEqual(first, { id: 'n1', groupKey: 'cancel:A', count: 1, level: 'normal' });
  const second = nextNotification(first, true, { groupKey: 'cancel:A', count: 2 }, next);
  assert.deepEqual(second, { id: 'n1', groupKey: 'cancel:A', count: 3, level: 'normal' }, '1건 → 3건(Figma 216:1628)');
});

test('한 번에 하나: 다른 키·키 없음은 같은 자리를 바꾸고 건수를 새로 센다', () => {
  const next = ids();
  const a = nextNotification(null, false, { groupKey: 'cancel:A', count: 4 }, next);
  const b = nextNotification(a, true, { groupKey: 'refund:A' }, next);
  assert.deepEqual(b, { id: 'n1', groupKey: 'refund:A', count: 1, level: 'normal' }, '두 번째 토스트를 쌓지 않는다');
  const c = nextNotification(b, true, {}, next);
  assert.deepEqual(c, { id: 'n1', groupKey: undefined, count: 1, level: 'normal' });
  const d = nextNotification(c, true, {}, next);
  assert.equal(d.count, 1, '키가 없으면 합치지 않는다');
});

test('사라진 뒤 오는 알림은 새 id — 닫히는 중인 토스트를 되살리지 않는다', () => {
  const next = ids();
  const a = nextNotification(null, false, { groupKey: 'k' }, next);
  const b = nextNotification(a, false, { groupKey: 'k' }, next);
  assert.deepEqual(b, { id: 'n2', groupKey: 'k', count: 1, level: 'normal' });
});

test('고정이 떠 있으면 일반은 띄우지 않는다(null) — 고정은 그대로, 묶음 키가 같아도 건수를 더하지 않는다(규격 6절 · 답 ⑩)', () => {
  const next = ids();
  const pinned = nextNotification(null, false, { groupKey: 'refund:A', level: 'pinned' }, next);
  assert.deepEqual(pinned, { id: 'n1', groupKey: 'refund:A', count: 1, level: 'pinned' });
  assert.equal(nextNotification(pinned, true, { groupKey: 'cancel:A' }, next), null, '다른 키의 일반');
  assert.equal(nextNotification(pinned, true, { groupKey: 'refund:A', count: 2 }, next), null, '같은 키의 일반도 고정에 합치지 않는다');
  assert.equal(nextNotification(pinned, true, {}, next), null, '등급을 주지 않으면 일반');
  assert.equal(nextNotification(pinned, true, { level: 'normal' }, next), null);
  // 띄우지 않은 일반은 id 를 쓰지 않는다 — 다음 고정도 같은 자리를 이어 쓴다.
  const again = nextNotification(pinned, true, { groupKey: 'refund:A', level: 'pinned' }, next);
  assert.deepEqual(again, { id: 'n1', groupKey: 'refund:A', count: 2, level: 'pinned' }, '고정 → 고정은 같은 키면 건수를 더한다');
  const other = nextNotification(again, true, { groupKey: 'stock:A', level: 'pinned' }, next);
  assert.deepEqual(other, { id: 'n1', groupKey: 'stock:A', count: 1, level: 'pinned' }, '고정 → 다른 고정은 자리를 바꾼다(한 번에 하나)');
});

test('일반 → 고정은 자리를 바꾸고, 고정이 사라진 뒤 오는 일반은 새 id 로 뜬다', () => {
  const next = ids();
  const normal = nextNotification(null, false, { groupKey: 'cancel:A' }, next);
  const pinned = nextNotification(normal, true, { groupKey: 'refund:A', level: 'pinned' }, next);
  assert.deepEqual(pinned, { id: 'n1', groupKey: 'refund:A', count: 1, level: 'pinned' }, '고정이 일반 자리를 차지한다');
  const merged = nextNotification(normal, true, { groupKey: 'cancel:A', level: 'pinned' }, next);
  assert.deepEqual(merged, { id: 'n1', groupKey: 'cancel:A', count: 2, level: 'pinned' }, '같은 키면 건수를 더하고 고정이 된다');
  const after = nextNotification(pinned, false, { groupKey: 'cancel:A' }, next);
  assert.deepEqual(after, { id: 'n2', groupKey: 'cancel:A', count: 1, level: 'normal' }, '닫힌 고정 뒤에는 일반이 뜬다');
});

test('건수는 1 이상 정수로 센다', () => {
  const next = ids();
  for (const [count, expected] of [[undefined, 1], [0, 1], [-3, 1], [2.7, 2], [Number.NaN, 1]]) {
    assert.equal(nextNotification(null, false, { count }, next)?.count, expected, String(count));
  }
});

test('toast.notify 배선: 알림 Toaster·등급·제목 함수·status 낭독·기존 API 유지', async () => {
  const root = fileURLToPath(new URL('../../../../../', import.meta.url));
  const server = await createServer({ root, configFile: false, logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
  // sonner 의 dismiss(id) 는 rAF 로 알린다 — Node 에는 없어 타이머로 대신한다(닫힌 표시는 그 전에 동기로 붙는다).
  globalThis.requestAnimationFrame ??= callback => setTimeout(callback, 0);
  globalThis.cancelAnimationFrame ??= clearTimeout;
  try {
    const { toast } = await server.ssrLoadModule('/packages/ui/src/components/toast/toast.tsx');
    const history = () => toast.getHistory();
    const find = (id) => history().filter(item => item.id === id).at(-1);
    const title = n => `취소 요청 ${n}건 · 스토어 A`;
    const id = toast.notify({ source: '판매관리 · 스토어 A', title, href: '/orders?status=cancel', groupKey: 'cancel:A' });
    let item = find(id);
    assert.equal(item.toasterId, 'ds-notification', '행동 결과 토스트와 다른 묶음');
    assert.equal(item.duration, 8000);
    assert.equal(item.closeButton, true);
    assert.equal(item.className, 'ds-toast-notice');
    const body = item.title.props;
    assert.equal(body.title, '취소 요청 1건 · 스토어 A');
    assert.equal(body.source, '판매관리 · 스토어 A');
    assert.equal(body.href, '/orders?status=cancel');
    assert.equal(body.linkLabel, '이동');
    // 낭독: 출처·제목이 한 status 영역 안, 이동은 그 밖의 링크(제목으로 설명된다).
    const markup = renderToStaticMarkup(item.title);
    assert.match(markup, /<span[^>]*role="status"[^>]*>.*판매관리 · 스토어 A.*취소 요청 1건 · 스토어 A.*<\/span><\/span><a /);
    assert.match(markup, /<a [^>]*href="\/orders\?status=cancel"[^>]*aria-describedby="ds-notification-\d+-title"[^>]*>이동<\/a>/);
    // 같은 묶음: 같은 id, 건수만 3 으로.
    assert.equal(toast.notify({ source: '판매관리 · 스토어 A', title, groupKey: 'cancel:A', count: 2 }), id);
    assert.equal(toast.getToasts().filter(t => t.toasterId === 'ds-notification').length, 1, '알림 토스트는 하나');
    assert.equal(find(id).title.props.title, '취소 요청 3건 · 스토어 A');
    // 고정: 같은 자리, 닫을 때까지, 위험 톤 클래스.
    assert.equal(toast.notify({ source: '판매관리 · 스토어 A', title: '환불 실패 1건', level: 'pinned' }), id);
    item = find(id);
    assert.equal(item.duration, Infinity);
    assert.equal(item.className, 'ds-toast-notice ds-toast-pinned');
    // 고정이 떠 있으면 일반은 띄우지 않는다(답 ⑩): 고정은 그대로 남고, 돌려준 id 는 화면에 없어 dismiss 해도 고정이 닫히지 않는다.
    const historyBefore = history().length;
    const skipped = toast.notify({ source: '판매관리 · 스토어 A', title, groupKey: 'cancel:A' });
    assert.notEqual(skipped, id);
    assert.equal(history().length, historyBefore, 'sonner 에 아무것도 보내지 않는다');
    const notices = () => toast.getToasts().filter(t => t.toasterId === 'ds-notification');
    assert.deepEqual(notices().map(t => [t.id, t.className]), [[id, 'ds-toast-notice ds-toast-pinned']]);
    assert.equal(find(id).title.props.title, '환불 실패 1건', '고정 토스트 글자 그대로');
    toast.dismiss(skipped);
    assert.deepEqual(notices().map(t => t.id), [id], '띄우지 않은 id 를 닫아도 고정은 남는다');
    // 고정을 닫으면 다음 일반은 새 id 로 뜨고 앞 값(시간·톤)이 남지 않는다.
    toast.dismiss(id);
    const fresh = toast.notify({ title: '새 문의 1건' });
    assert.notEqual(fresh, id);
    item = find(fresh);
    assert.equal(item.duration, 8000);
    assert.equal(item.className, 'ds-toast-notice');
    // 기존 API 는 그대로(추가만): 오류 무한·alert, 성공 status.
    const error = toast.error('저장 실패', { id: 'legacy-error', duration: 1 });
    assert.equal(find(error).duration, Infinity);
    assert.equal(find(error).title.props.role, 'alert');
    assert.equal(find(error).toasterId, undefined, '기존 토스트는 기본 묶음');
    const success = toast.success('저장했습니다', { id: 'legacy-success' });
    assert.equal(find(success).title.props.role, 'status');
  } finally { await server.close(); }
});
