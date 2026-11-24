export type ReturnRecord = { itemKey: string; scrollTop: number; at: number };
/** 내부 — useReturnContext 의 저장 형식. 0.6.0 에서 공개 API 에서 뺐다(0.5.0 예고). */
export function encodeRecord(record: ReturnRecord): string { return JSON.stringify(record); }

// 저장소는 외부 입력이다. 반올림 없이 유한수·시간 범위를 검증한다.
/** 내부 — useReturnContext 의 복원. 0.6.0 에서 공개 API 에서 뺐다(0.5.0 예고). */
export function decodeRecord(raw: string | null, now: number, ttlMs: number): ReturnRecord | null {
  try {
    if (!raw || !Number.isFinite(now) || !Number.isFinite(ttlMs) || ttlMs < 0) return null;
    const r: unknown = JSON.parse(raw);
    if (!r || typeof r !== 'object') return null;
    const { itemKey, scrollTop, at } = r as ReturnRecord;
    if (typeof itemKey !== 'string' || typeof scrollTop !== 'number' || !Number.isFinite(scrollTop) || scrollTop < 0 ||
      typeof at !== 'number' || !Number.isFinite(at) || at > now || at < now - ttlMs) return null;
    return { itemKey, scrollTop, at };
  } catch { return null; }
}
