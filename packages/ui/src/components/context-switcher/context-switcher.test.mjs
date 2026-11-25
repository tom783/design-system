// 맥락 전환기(상단 바 규격 2절) — 상태 전이 · 취소 이벤트 · 키보드(첫 글자 이동) · 낭독 문구 · 정적 항목.
// 순수 규칙은 바로, 트리거·정적 글자는 Vite SSR 로 실제 모듈을 그린다. 진짜 Tab/Esc·화살표는 브라우저 하네스(top-bar-render-verify)가 잰다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const server = await createServer({ root, configFile: false, logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
// 순수 규칙도 Vite 로 불러온다 — Combobox 거르기를 확장자 없는 상대 경로로 가져와 node 직접 import 로는 풀리지 않는다.
const {
  SEARCH_THRESHOLD, allowSwitch, emptyText, failureDescription, failureTitle, filterChoices, isStatic, needsSearch,
  objectParticle, runSwitch, searchLabel, staticName, subjectParticle, switchReducer, switcherChoices, triggerName, typeaheadIndex,
} = await server.ssrLoadModule('/packages/ui/src/components/context-switcher/switcher.ts');
const { ContextSwitcher, ContextSwitcherGroup } = await server.ssrLoadModule('/packages/ui/src/components/context-switcher/context-switcher.tsx');
test.after(() => server.close());
const h = React.createElement;
const stores = ['A', 'B', 'C'].map(name => ({ value: name.toLowerCase(), label: `스토어 ${name}` }));
const all = { value: 'all', label: '전체 스토어' };

test('낭독 문구 — 규격 2절 그대로 · 조사는 받침으로 고른다', () => {
  assert.equal(triggerName('스토어', '전체 스토어'), '스토어: 전체 스토어');
  assert.equal(staticName('스토어', '스토어 A'), '현재 스토어: 스토어 A');
  assert.equal(searchLabel('스토어'), '스토어 검색');
  assert.equal(emptyText('스토어'), '일치하는 스토어가 없습니다');
  assert.equal(emptyText('제품'), '일치하는 제품이 없습니다', '받침 있으면 "이"');
  assert.equal(failureTitle('스토어'), '스토어를 바꾸지 못했습니다');
  assert.equal(failureDescription('스토어'), '이전 스토어를 유지합니다');
  assert.equal(objectParticle('제품'), '제품을');
  assert.equal(subjectParticle('Store'), 'Store가', '한글이 아니면 받침 없음');
});

test('목록 구성 — "전체" 맨 위 · 하나뿐이면 정적 · 검색은 "전체" 빼고 8개부터 · 초성 거르기', () => {
  assert.deepEqual(switcherChoices(stores, all).map(item => item.value), ['all', 'a', 'b', 'c']);
  assert.equal(isStatic([stores[0]]), true);
  assert.equal(isStatic(switcherChoices([stores[0]], all)), false, '"전체"가 있으면 고를 것이 둘');
  assert.equal(SEARCH_THRESHOLD, 8);
  const many = Array.from({ length: 8 }, (_, index) => ({ value: String(index), label: `스토어 ${index}` }));
  assert.equal(needsSearch(many.slice(0, 7)), false);
  assert.equal(needsSearch(many), true, '기준 8 이상');
  assert.equal(needsSearch(many.slice(0, 5), 5), true, '기준은 앱이 정한다');
  assert.deepEqual(filterChoices(switcherChoices(stores, all), '스토어 B').map(item => item.value), ['b']);
  assert.deepEqual(filterChoices(switcherChoices(stores, all), 'ㅈㅊ').map(item => item.value), ['all'], '초성만 쳐도 찾는다');
  assert.deepEqual(filterChoices(stores, '스토어 Z'), [], '결과 없음');
  assert.equal(filterChoices(stores, '  ').length, 3, '빈 검색어는 전부');
});

test('키보드 첫 글자 이동 — 다음 항목부터 한 바퀴 · 같은 글자 거듭 누르면 다음 · 한글 초성 · 없으면 -1', () => {
  const labels = ['전체 스토어', '스토어 A', '스토어 B', '판매관리', 'Shop'];
  assert.equal(typeaheadIndex(labels, -1, '스'), 1, '처음(초점 없음)이면 맨 앞부터');
  assert.equal(typeaheadIndex(labels, 1, '스'), 2, '같은 글자 다음 항목');
  assert.equal(typeaheadIndex(labels, 2, '스'), 1, '끝나면 처음으로 돈다');
  assert.equal(typeaheadIndex(labels, 0, 'ㅍ'), 3, '초성 ㅍ → 판매관리');
  assert.equal(typeaheadIndex(labels, 0, 'ㅅ'), 1, '초성 ㅅ → 스토어');
  assert.equal(typeaheadIndex(labels, 0, 's'), 4, '라틴 글자는 대소문자 무시');
  assert.equal(typeaheadIndex(labels, 0, 'ㅋ'), -1);
  assert.equal(typeaheadIndex(labels, 0, ' '), -1, '공백은 선택 키(Space)라 첫 글자 이동이 아니다');
  assert.equal(typeaheadIndex(labels, 0, 'Enter'), -1);
});

test('상태 전이 — idle →select→ pending →resolve/reject→ idle · 진행 중 새 선택은 받지 않는다', () => {
  let state = { status: 'idle' };
  state = switchReducer(state, { type: 'select', item: stores[1] });
  assert.deepEqual(state, { status: 'pending', item: stores[1] });
  assert.equal(switchReducer(state, { type: 'select', item: stores[2] }), state, '진행 중 새 선택 무시');
  assert.deepEqual(switchReducer(state, { type: 'resolve' }), { status: 'idle' });
  assert.deepEqual(switchReducer(state, { type: 'reject' }), { status: 'idle' });
});

function harness(onValueChange, onBeforeSwitch) {
  const log = [];
  return { log, run: item => runSwitch({ item, current: 'a', onValueChange, onBeforeSwitch,
    dispatch: action => log.push(action.type), commit: value => log.push(`commit:${value}`), fail: () => log.push('fail') }) };
}

test('select 성공 — Promise 동안 진행(pending), 끝나면 새 값 확정', async () => {
  const { log, run } = harness(() => new Promise(resolve => setTimeout(resolve, 5)));
  assert.equal(await run(stores[1]), 'done');
  assert.deepEqual(log, ['select', 'commit:b', 'resolve']);
});

test('select 실패 — 원래 값으로 돌아가고(확정 없음) 오류 알림(fail = 오류 토스트)', async () => {
  const { log, run } = harness(() => Promise.reject(new Error('서버 오류')));
  assert.equal(await run(stores[1]), 'failed');
  assert.deepEqual(log, ['select', 'reject', 'fail']);
  const thrown = harness(() => { throw new Error('바로 실패'); });
  assert.equal(await thrown.run(stores[2]), 'failed');
  assert.deepEqual(thrown.log, ['fail'], '동기 예외도 실패로 알린다');
});

test('Promise 가 아니면 진행 표시 없이 바로 확정 · 지금 값은 아무것도 하지 않는다', async () => {
  const { log, run } = harness(() => undefined);
  assert.equal(await run(stores[2]), 'done');
  assert.deepEqual(log, ['commit:c']);
  assert.equal(await run(stores[0]), 'same');
  assert.deepEqual(log, ['commit:c'], '지금 값(a)은 이벤트도 값 바꿈도 없다');
});

test('취소 가능 이벤트 — preventDefault 면 onValueChange 를 부르지 않는다 · 비활성은 이벤트 없이 거절', async () => {
  const seen = [];
  let called = 0;
  const cancel = harness(() => { called += 1; }, event => { seen.push([event.value, event.item.label]); event.preventDefault(); });
  assert.equal(await cancel.run(stores[1]), 'cancelled');
  assert.equal(called, 0);
  assert.deepEqual(cancel.log, []);
  assert.deepEqual(seen, [['b', '스토어 B']]);
  const disabled = { ...stores[2], disabled: true };
  assert.equal(allowSwitch(disabled, () => seen.push('불림')), false);
  assert.equal(seen.length, 1, '비활성 항목은 이벤트를 보내지 않는다');
  // 링크 항목도 같은 이벤트 — 클릭 이벤트를 실어 앱 라우터가 막고 직접 옮길 수 있다.
  const native = { type: 'click' };
  let received;
  assert.equal(allowSwitch({ value: 'sales', label: '판매관리', href: '#sales' }, event => { received = event; }, native), true);
  assert.equal(received.nativeEvent, native);
  assert.equal(received.defaultPrevented, false);
});

test('렌더 — 트리거 이름 "<종류>: <값>" · 보이는 앞말 · 하나뿐이면 버튼 없는 정적 글자 "현재 <종류>: <값>"', () => {
  const trigger = renderToStaticMarkup(h(ContextSwitcher, { kind: '스토어', items: stores, allItem: all, defaultValue: 'all', showKind: true }));
  const button = trigger.match(/^<button [^>]*>/)?.[0] ?? '';
  for (const attribute of ['type="button"', 'data-slot="context-switcher"', 'aria-label="스토어: 전체 스토어"', 'aria-haspopup="menu"', 'aria-expanded="false"'])
    assert.ok(button.includes(attribute), `트리거 ${attribute} — ${button}`);
  assert.match(trigger, /<span class="ds-context-switcher-kind" aria-hidden="true">스토어<\/span>/);
  assert.match(trigger, /<span class="ds-context-switcher-value">전체 스토어<\/span>/);
  assert.match(trigger, /<span class="sr-only" role="status"><\/span>/, '진행 알림 자리(비어 있음)');
  const single = renderToStaticMarkup(h(ContextSwitcher, { kind: '스토어', items: [stores[0]], defaultValue: 'a' }));
  assert.doesNotMatch(single, /<button|tabindex/, '버튼이 아니고 초점을 받지 않는다');
  assert.match(single, /<span class="sr-only">현재 스토어: 스토어 A<\/span>/);
  assert.doesNotMatch(single, /chevron/, '화살표 없음');
});

test('묶음 — 전환기 사이 구분선(낭독 제외) · 서버 첫 그림은 펼친 모양', () => {
  const markup = renderToStaticMarkup(h(ContextSwitcherGroup, null,
    h(ContextSwitcher, { kind: '제품', items: [{ value: 'm', label: '마케팅관리', href: '#m' }, { value: 's', label: '판매관리', href: '#s' }], defaultValue: 'm' }),
    h(ContextSwitcher, { kind: '스토어', items: stores, defaultValue: 'b' })));
  assert.match(markup, /aria-label="제품: 마케팅관리".*<span class="ds-context-switcher-divider" aria-hidden="true"><\/span>.*aria-label="스토어: 스토어 B"/s);
  assert.doesNotMatch(markup, /data-collapsed/);
});
