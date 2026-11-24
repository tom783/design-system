export type FocusCandidate = { disabled?: boolean; hidden?: boolean; tabIndex?: number };

/**
 * items는 호출자가 Tab 순서로 정렬한다. readOnly도 Tab 정지점이다.
 * 내부 — FormFlow 가 쓴다. 0.6.0 에서 공개 API 에서 뺐다(0.4.0 예고).
 */
export function nextFocusable(items: FocusCandidate[], from: number, dir: 1 | -1): number | null {
  for (let i = from + dir; i >= 0 && i < items.length; i += dir) {
    const item = items[i]!;
    if (!item.disabled && !item.hidden && (item.tabIndex ?? 0) >= 0) return i;
  }
  return null;
}
