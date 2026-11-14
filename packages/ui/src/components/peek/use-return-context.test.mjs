import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';

// 앱의 bundler와 달리 Node는 확장자 없는 TS import를 해소하지 않는다.
const resolver = registerHooks({ resolve(specifier, context, next) {
  return next(specifier === './return-record' && context.parentURL?.endsWith('/peek/use-return-context.ts')
    ? './return-record.ts' : specifier, context);
} });
const { useReturnContext } = await import('./use-return-context.ts');
resolver.deregister();
function setup(options) {
  let ret;
  function Probe() { ret = useReturnContext(options); return null; }
  renderToString(createElement(Probe));
  return ret;
}
function memory() {
  const records = new Map();
  return { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value), removeItem: key => records.delete(key) };
}
const record = { itemKey: 'order-300', scrollTop: 11960 };
test('언마운트에 독립적인 저장과 재마운트 일회성 소비', () => {
  const storage = memory(), options = { key: 'orders', storage, now: () => 1000 };
  setup(options).capture(record);
  const ret = setup(options);
  assert.deepEqual(ret.consume(), { ...record, at: 1000 });
  assert.equal(ret.consume(), null);
  assert.equal(setup(options).consume(), null);
});
test('키마다 독립적으로 보존한다', () => {
  const storage = memory();
  const orders = setup({ key: 'orders', storage }), products = setup({ key: 'products', storage });
  orders.capture(record); products.capture({ itemKey: 'product-1', scrollTop: 0 });
  assert.equal(orders.consume().itemKey, 'order-300');
  assert.equal(products.consume().itemKey, 'product-1');
});
test('주입한 시계로 만료를 검증하고 만료 기록도 삭제한다', () => {
  const storage = memory(); let time = 1000;
  const ret = setup({ key: 'orders', storage, now: () => time, ttlMs: 10 });
  ret.capture(record); time += 11;
  assert.equal(ret.consume(), null); time -= 11;
  assert.equal(ret.consume(), null);
});
test('기본 TTL은 10분이다', () => {
  const storage = memory(); let time = 1000;
  const ret = setup({ key: 'orders', storage, now: () => time });
  ret.capture(record); time += 600_001;
  assert.equal(ret.consume(), null);
});
test('각 저장 연산 실패는 throw 없이 null로 처리한다', () => {
  for (const failing of ['getItem', 'setItem', 'removeItem']) {
    const storage = memory();
    const ret = setup({ key: 'orders', storage });
    ret.capture(record);
    storage[failing] = () => { throw new Error('저장소 차단'); };
    assert.doesNotThrow(() => ret.capture(record));
    // setItem 실패 이전 기록은 여전히 읽을 수 있고, 읽기/삭제 실패는 null이다.
    if (failing === 'setItem') assert.equal(ret.consume().itemKey, record.itemKey);
    else assert.equal(ret.consume(), null);
  }
});
test('SSR·명시적 무저장에서도 안전하다', () => {
  assert.equal(typeof window, 'undefined');
  for (const storage of [undefined, null]) {
    const ret = setup({ key: 'orders', storage });
    assert.doesNotThrow(() => ret.capture(record)); assert.equal(ret.consume(), null);
  }
});
test('기본 sessionStorage와 접근자 자체의 실패를 처리한다', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  try {
    const storage = memory();
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { sessionStorage: storage } });
    const ret = setup({ key: 'orders' });
    ret.capture(record); assert.equal(ret.consume().itemKey, record.itemKey); assert.equal(ret.consume(), null);
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { get sessionStorage() { throw new Error('접근 차단'); } } });
    assert.doesNotThrow(() => ret.capture(record)); assert.equal(ret.consume(), null);
  } finally {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else delete globalThis.window;
  }
});
