// 브라우저 없이 확인 가능한 실제 React 배선·Sonner 정책 검사. 높이·키보드·포커스 검증을 대체하지 않는다.
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
try {
  const { Select, SelectTrigger, SelectValue } = await server.ssrLoadModule('/packages/ui/src/components/select/select.tsx');
  const { Field } = await server.ssrLoadModule('/packages/ui/src/components/form/field.tsx');
  const { toast } = await server.ssrLoadModule('/packages/ui/src/components/toast/toast.tsx');
  const markup = renderToStaticMarkup(React.createElement(Field, { label: '상태', description: '처리 단계', error: '선택하세요', required: true },
    React.createElement(Select, { id: 'order-state' }, React.createElement(SelectTrigger, null, React.createElement(SelectValue, { placeholder: '선택' })))));
  const trigger = markup.match(/<button[^>]+>/)?.[0];
  assert.ok(trigger, 'Radix 트리거가 실제 button으로 렌더되어야 한다');
  assert.match(trigger, /id="order-state"/);
  assert.match(trigger, /aria-invalid="true"/);
  assert.match(trigger, /aria-required="true"/);
  assert.match(trigger, /aria-describedby="[^"]+-error [^"]+-description"/);
  assert.match(markup, /for="order-state"/);
  console.log('✓ Field → Select Root → 실제 Radix button: id·오류·설명·필수 배선');
  toast.error('실패', { id: 'r13-error', duration: 1 });
  let notification = toast.getHistory().find(t => t.id === 'r13-error');
  assert.equal(notification.duration, Infinity); assert.equal(notification.closeButton, true);
  assert.equal(notification.title.props.role, 'alert');
  console.log('✓ 오류 토스트: 짧은 duration을 넘겨도 무한 유지·닫기·alert');
  toast.success('저장', { id: 'r13-success', duration: 50 });
  notification = toast.getHistory().find(t => t.id === 'r13-success');
  assert.equal(notification.duration, 50); assert.equal(notification.title.props.role, 'status');
  console.log('✓ 성공 토스트: 자동 사라짐 설정·status');
  toast.promise(Promise.reject(new Error('네트워크 실패')), { id: 'r13-promise', loading: '저장 중', error: '저장 실패', duration: 1 });
  await new Promise(resolve => setTimeout(resolve, 20));
  notification = toast.getHistory().find(t => t.id === 'r13-promise');
  assert.equal(notification.type, 'error'); assert.equal(notification.duration, Infinity); assert.equal(notification.title.props.role, 'alert');
  console.log('✓ 비동기 오류 토스트에도 동일한 영구 유지 정책 적용');
  toast.dismiss();
} finally { await server.close(); }
