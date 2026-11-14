import * as React from 'react';

/** 조합 중 리렌더 없이 읽는다. nativeEvent.isComposing과 혼용하지 않는다. */
export function useComposition() {
  const composing = React.useRef(false);
  return React.useMemo(() => ({
    isComposing: () => composing.current,
    bind: {
      onCompositionStart: () => { composing.current = true; },
      onCompositionEnd: () => { composing.current = false; },
    },
  }), []);
}
