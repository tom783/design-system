import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

export function useElementWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setWidth(Math.max(0, element.getBoundingClientRect().width));
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(element);
    // 구형 브라우저도 최초 측정과 창 크기 변경에 대응한다. 미측정 폭을 임의로 가정하지 않는다.
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  return [ref, width];
}
