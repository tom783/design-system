import * as React from 'react';
import { placeFallback } from './place-fallback';

/** @deprecated 다음 마이너에서 공개 API에서 뺀다. 앵커 배치는 Tooltip·Hint·Tour·Peek이 맡는다. */
export const supportsAnchor = () =>
  typeof CSS !== 'undefined' && CSS.supports('anchor-name', '--x');
const anchorSupported = supportsAnchor();

// chart-frame의 패턴: CSS가 늦게 로드되어도 NaN이 좌표·타이머에 전파되지 않는다.
export function readGuideToken(element: Element, name: string, fallback: number): number {
  const raw = getComputedStyle(element).getPropertyValue(name).trim();
  const value = parseFloat(raw);
  return Number.isFinite(value) && value >= 0 ? value * (raw.endsWith('s') && !raw.endsWith('ms') ? 1000 : 1) : fallback;
}

export type GuideChildProps = React.HTMLAttributes<HTMLElement> & {
  ref?: React.Ref<HTMLElement>;
  disabled?: boolean;
};
export type GuideChild = React.ReactElement<GuideChildProps>;

export function useGuideChild(child: GuideChild) {
  const [target, setTarget] = React.useState<HTMLElement | null>(null);
  const ref = React.useMemo(() => (node: HTMLElement | null) => {
    setTarget(node);
    const original = child.props.ref;
    if (typeof original === 'function') {
      const cleanup = original(node);
      return () => { if (typeof cleanup === 'function') cleanup(); else original(null); setTarget(null); };
    }
    if (original) original.current = node;
    return () => { if (original) original.current = null; setTarget(null); };
  }, [child.props.ref]);
  return { target, ref };
}

/** @deprecated 다음 마이너에서 공개 API에서 뺀다. 앵커 배치는 Tooltip·Hint·Tour·Peek이 맡는다. */
export function useAnchored({ target, open, onClose, dialog = false, ring = false }: {
  target: Element | null;
  open: boolean;
  onClose: () => void;
  dialog?: boolean;
  ring?: boolean;
}) {
  const id = React.useId();
  const anchorName = `--g${id.replace(/[^a-zA-Z0-9]/g, '')}`;
  const bubbleRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef(onClose);
  closeRef.current = onClose;
  const [css, setCss] = React.useState(anchorSupported);
  React.useEffect(() => { setCss(supportsAnchor()); }, []);

  React.useLayoutEffect(() => {
    const bubble = bubbleRef.current;
    if (!open || !bubble) return;
    const style = (target as HTMLElement | null)?.style;
    const originalAnchor = style?.getPropertyValue('anchor-name') ?? '';
    const originalPriority = style?.getPropertyPriority('anchor-name') ?? '';
    const originalRing = target?.getAttribute('data-guide-target');
    if (style && !originalAnchor.split(',').map(name => name.trim()).includes(anchorName)) style.setProperty('anchor-name', originalAnchor && originalAnchor !== 'none' ? `${originalAnchor}, ${anchorName}` : anchorName);
    if (ring) target?.setAttribute('data-guide-target', 'active');
    bubble.dataset.place = target && css ? 'css' : 'js';
    bubble.style.setProperty('--guide-anchor', anchorName);
    bubble.showPopover();
    if (!target || !css) {
      const tip = bubble.getBoundingClientRect();
      const gap = readGuideToken(bubble, '--anchor-gap', 8);
      const pad = readGuideToken(bubble, '--anchor-edge-pad', 8);
      const position = target ? placeFallback(target.getBoundingClientRect(), tip,
        { width: innerWidth, height: innerHeight }, { gap, pad }) : {
        x: Math.max(pad, (innerWidth - tip.width) / 2), y: Math.max(pad, (innerHeight - tip.height) / 2),
      };
      bubble.style.setProperty('--guide-x', `${position.x}px`);
      bubble.style.setProperty('--guide-y', `${position.y}px`);
    }
    if (dialog) bubble.focus({ preventScroll: true });
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
    };
    const close = () => closeRef.current();
    document.addEventListener('keydown', escape);
    if (!css) document.addEventListener('scroll', close, { capture: true, passive: true, once: true });
    // 크기가 바뀌면 최초 측정이 무효이므로 폴백을 닫는다.
    if (!css) window.addEventListener('resize', close, { once: true });
    // 가상화로 열린 대상이 제거되면 빈 좌표를 남기지 않는다.
    const observer = new MutationObserver(() => { if (target && !target.isConnected) close(); });
    if (target) observer.observe(document.body, { subtree: true, childList: true });
    return () => {
      observer.disconnect();
      document.removeEventListener('keydown', escape);
      document.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      if (bubble.matches(':popover-open')) bubble.hidePopover();
      if (style) { if (originalAnchor) style.setProperty('anchor-name', originalAnchor, originalPriority); else style.removeProperty('anchor-name'); }
      if (ring && target) { if (originalRing == null) target.removeAttribute('data-guide-target'); else target.setAttribute('data-guide-target', originalRing); }
    };
  }, [target, open, css, anchorName, dialog, ring]);
  return { bubbleRef, anchorName };
}
