import * as React from 'react';

/** CSS 미디어 쿼리가 지금 맞는지 — 같은 경계의 CSS(home.css·site.css)와 짝을 맞춰 쓴다(보이고 숨기는 것은 CSS, 동작·그릴 모양은 이 값). */
export function useMediaQuery(query: string) {
  const subscribe = React.useCallback((notify: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener('change', notify);
    return () => media.removeEventListener('change', notify);
  }, [query]);
  return React.useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}
