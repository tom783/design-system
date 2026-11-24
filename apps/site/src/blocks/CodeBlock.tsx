import * as React from 'react';
import { Button } from '@s2life/ui';
import { Check, Copy } from '@s2life/ui/icons';

/**
 * 코드 블록 + 복사 버튼 — 사이트 전용(디자인 시스템 부품 후보로 올리지 않는다 — 개발 총괄 결정).
 * - 복사 결과는 버튼 글자(복사 → 복사됨)와 화면에 안 보이는 알림(role=status)으로 함께 알린다 — 색만으로 알리지 않는다.
 * - 가로로 넘치면 코드 칸에 Tab 으로 닿게 한다(DESIGN.md 4.5 넘치는 스크롤 영역). 넘치지 않으면 Tab 길을 늘리지 않는다.
 * - 클립보드 API 를 못 쓰는 환경(권한 거부 등)이면 숨긴 textarea 로 한 번 더 시도하고, 그래도 안 되면 그렇다고 알린다.
 */
const RESET_MS = 2000;

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    area.remove();
    return ok;
  }
}

function useOverflowX<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [overflow, setOverflow] = React.useState(false);
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setOverflow(element.scrollWidth > element.clientWidth + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, overflow] as const;
}

export function CodeBlock({ code, label }: { code: string; /** 머리줄 이름(예: 'sh', 'src/main.tsx'). 복사 버튼 이름에도 붙는다. */ label: string }) {
  const [state, setState] = React.useState<'idle' | 'copied' | 'failed'>('idle');
  const [preRef, overflow] = useOverflowX<HTMLPreElement>();
  React.useEffect(() => {
    if (state === 'idle') return;
    const timer = window.setTimeout(() => setState('idle'), RESET_MS);
    return () => window.clearTimeout(timer);
  }, [state]);
  const message = state === 'copied' ? `${label} 코드를 복사했다` : state === 'failed' ? '복사하지 못했다 — 코드를 직접 선택해 복사한다' : '';
  return <div className="site-codeblock">
    <div className="site-codeblock-head">
      <span className="site-codeblock-label">{label}</span>
      {/* 접근성 이름 = 보이는 글자 + 어느 코드인지(여러 블록이 한 페이지에 있다). */}
      <Button type="button" size="sm" variant="ghost"
        leadingIcon={state === 'copied' ? <Check /> : <Copy />}
        onClick={async () => setState(await copyText(code) ? 'copied' : 'failed')}>
        {state === 'copied' ? '복사됨' : state === 'failed' ? '복사 실패' : '복사'}
        <span className="sr-only"> — {label}</span>
      </Button>
    </div>
    <pre ref={preRef} className="site-codeblock-pre" tabIndex={overflow ? 0 : undefined}
      aria-label={overflow ? `${label} 코드` : undefined}><code>{code}</code></pre>
    <span className="sr-only" role="status">{message}</span>
  </div>;
}
