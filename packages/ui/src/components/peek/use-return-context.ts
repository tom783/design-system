import * as React from 'react';
import { decodeRecord, encodeRecord, type ReturnRecord } from './return-record';

export type ReturnStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export interface ReturnContextOptions {
  key: string;
  ttlMs?: number;
  /** null은 저장하지 않는다. 생략 시 브라우저 세션 저장소를 사용한다. */
  storage?: ReturnStorage | null;
  now?: () => number;
}
export function useReturnContext({ key, ttlMs = 600_000, storage, now = Date.now }: ReturnContextOptions) {
  const storageKey = `commerce-ds:return:${key}`;
  // 접근자 자체가 throw할 수 있으므로 호출자의 try 안에서만 해소한다. SSR은 무저장이다.
  const resolveStorage = React.useCallback(() => storage === undefined
    ? typeof window === 'undefined' ? null : window.sessionStorage
    : storage, [storage]);
  const capture = React.useCallback((record: Omit<ReturnRecord, 'at'>) => {
    try { resolveStorage()?.setItem(storageKey, encodeRecord({ ...record, at: now() })); } catch { /* 저장 실패는 이동을 막지 않는다. */ }
  }, [resolveStorage, storageKey, now]);
  const consume = React.useCallback((): ReturnRecord | null => {
    try {
      const store = resolveStorage();
      if (!store) return null;
      const raw = store.getItem(storageKey);
      // 삭제가 실패하면 반환하지 않는다. 같은 기록의 반복 복원을 방지한다.
      store.removeItem(storageKey);
      return decodeRecord(raw, now(), ttlMs);
    } catch { return null; }
  }, [resolveStorage, storageKey, now, ttlMs]);
  return React.useMemo(() => ({ capture, consume }), [capture, consume]);
}
