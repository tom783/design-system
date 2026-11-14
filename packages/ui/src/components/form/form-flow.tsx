import * as React from 'react';
import { useComposition } from './use-composition';
import { nextFocusable } from './next-focusable';

// 양수 tabindex가 먼저, 나머지는 DOM 순서다. disabled fieldset·숨겨진 조상도 반영한다.
function tabStops(form: HTMLFormElement): HTMLElement[] {
  const nodes = [...form.querySelectorAll<HTMLElement>('input, textarea, select, button, a[href], [tabindex], [contenteditable="true"]')]
    .filter(node => node.closest('form') === form && !node.matches(':disabled, input[type="hidden"]') &&
      !node.closest('[hidden], [inert]') && node.tabIndex >= 0 && node.getClientRects().length > 0 &&
      !['hidden', 'collapse'].includes(getComputedStyle(node).visibility));
  // 라디오 그룹은 선택된 항목(없으면 첫 항목) 하나만 Tab 정지점이다.
  const stops = nodes.filter(node => {
    if (!(node instanceof HTMLInputElement) || node.type !== 'radio' || !node.name) return true;
    const group = nodes.filter((item): item is HTMLInputElement => item instanceof HTMLInputElement && item.type === 'radio' && item.name === node.name);
    return node === (group.find(item => item.checked) ?? group[0]);
  });
  return stops.sort((a, b) => (a.tabIndex > 0 ? a.tabIndex : Infinity) - (b.tabIndex > 0 ? b.tabIndex : Infinity));
}

export interface FormFlowOptions {
  /** false 반환 또는 preventDefault는 실패다. 비동기 저장은 완료될 때 resolve한다. */
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void | boolean | Promise<void | boolean>;
  restartOnSubmit?: boolean;
  onSubmitError?: (error: unknown) => void;
}

export function useFormFlow({ onSubmit, restartOnSubmit = false, onSubmitError }: FormFlowOptions = {}) {
  const composition = useComposition();
  const pending = React.useRef(false);
  const onKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.defaultPrevented || event.key !== 'Enter' || composition.isComposing()) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.matches('select, button, input[type="submit"], input[type="reset"], input[type="button"]')) return;
    if (target.matches('textarea') || target.isContentEditable) {
      if (event.ctrlKey || event.metaKey) { event.preventDefault(); event.currentTarget.requestSubmit(); }
      return;
    }
    if (!target.matches('input') || event.altKey || event.ctrlKey || event.metaKey) return;
    const form = event.currentTarget;
    const stops = tabStops(form);
    const from = stops.indexOf(target);
    if (from < 0) return;
    event.preventDefault();
    const next = nextFocusable(stops.map(node => ({ tabIndex: node.tabIndex })), from, event.shiftKey ? -1 : 1);
    const destination = next === null ? undefined : stops[next];
    if (!event.shiftKey && (!destination || destination.matches('button[type="submit"], button:not([type]), input[type="submit"]'))) {
      form.requestSubmit(destination as HTMLButtonElement | HTMLInputElement | undefined);
    } else destination?.focus();
  };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    const cancelled = event.defaultPrevented;
    if (cancelled || composition.isComposing() || pending.current) { event.preventDefault(); return; }
    const form = event.currentTarget;
    pending.current = true;
    try {
      // 콜백의 동기 취소를 읽은 뒤 기본 탐색을 막는다. 이벤트 메서드를 변형하지 않는다.
      const work = onSubmit?.(event);
      const rejected = event.defaultPrevented;
      event.preventDefault();
      const result = await work;
      // 앱이 제출 검증 오류를 렌더한 뒤에만 포커스를 옮긴다. blur 검증에는 관여하지 않는다.
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      if (!form.isConnected) return;
      const invalid = form.querySelector<HTMLElement>('[aria-invalid="true"], :invalid');
      if (invalid) invalid.focus();
      else if (result !== false && !rejected && restartOnSubmit) tabStops(form)[0]?.focus();
    } catch (error) {
      event.preventDefault();
      onSubmitError?.(error);
    } finally { pending.current = false; }
  };
  return { onKeyDown, onSubmit: submit,
    onCompositionStartCapture: composition.bind.onCompositionStart,
    onCompositionEndCapture: composition.bind.onCompositionEnd };
}

export interface FormFlowProps extends Omit<React.ComponentPropsWithRef<'form'>, 'onSubmit'>, FormFlowOptions {}
export function FormFlow({ onSubmit, restartOnSubmit, onSubmitError, onKeyDown, onCompositionStartCapture, onCompositionEndCapture, ...props }: FormFlowProps) {
  const flow = useFormFlow({ onSubmit, restartOnSubmit, onSubmitError });
  return <form {...props} data-slot="form-flow" onSubmit={flow.onSubmit}
    onKeyDown={event => { onKeyDown?.(event); flow.onKeyDown(event); }}
    onCompositionStartCapture={event => { flow.onCompositionStartCapture(); onCompositionStartCapture?.(event); }}
    onCompositionEndCapture={event => { flow.onCompositionEndCapture(); onCompositionEndCapture?.(event); }} />;
}
