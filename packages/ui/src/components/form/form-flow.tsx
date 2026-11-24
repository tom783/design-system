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

function destinationFrom(stops: HTMLElement[], from: HTMLElement, direction: 1 | -1) {
  // roving 그룹의 실제 항목이 -1이면 Tab 정지점인 조상에서 이어 간다.
  const index = stops.indexOf(from);
  const origin = index >= 0 ? index : stops.findIndex(stop => stop.contains(from));
  if (origin < 0) return undefined;
  const next = nextFocusable(stops.map(node => ({ tabIndex: node.tabIndex })), origin, direction);
  return next === null ? undefined : stops[next];
}

/**
 * 폼 안의 다음 Tab 정지점으로 포커스를 옮긴다. FormFlow 폼이 아니면 아무것도 하지 않는다.
 * 내부 — Combobox 가 선택 뒤 다음 칸으로 옮길 때 쓴다. 0.6.0 에서 공개 API 에서 뺐다(0.4.0 예고).
 */
export function focusNextFormStop(from: HTMLElement): boolean {
  const form = from.closest<HTMLFormElement>('form[data-form-flow]');
  if (!form) return false;
  const next = destinationFrom(tabStops(form), from, 1);
  if (!next) return false;
  next.focus();
  return next.ownerDocument.activeElement === next || next.contains(next.ownerDocument.activeElement);
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
  const onKeyDownCapture = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.defaultPrevented || event.key !== 'Enter' || composition.isComposing() ||
      event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches('[data-form-control="advance"]') ||
      target.matches('textarea') || target.isContentEditable) return;
    // RadioGroupItem은 내부 keydown에서 Enter를 취소한다. capture에서 먼저 계약을 적용하고
    // Switch의 네이티브 Enter 클릭도 막아, 이동이 값 변경으로 바뀌지 않게 한다 (§11.5).
    event.preventDefault();
    destinationFrom(tabStops(event.currentTarget), target, event.shiftKey ? -1 : 1)?.focus();
  };
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
    const destination = destinationFrom(stops, target, event.shiftKey ? -1 : 1);
    // 하단 고정 액션 줄(FormActionBar)은 [삭제] [오류 링크] [취소] [저장] 순서라 마지막 칸 다음 정지점이 저장이 아니다.
    // 줄에 닿으면 폼 끝으로 보고 제출한다 — 마지막 칸 Enter = 저장(§11.5·§19.5 F-11). 제출자는 줄의 저장 버튼이다.
    const bar = destination?.closest('[data-slot="form-action-bar"]');
    if (!event.shiftKey && bar) {
      const submitter = bar.querySelector<HTMLButtonElement>('button[type="submit"]');
      form.requestSubmit(submitter?.form === form ? submitter : undefined);
    } else if (!event.shiftKey && (!destination || destination.matches('button[type="submit"], button:not([type]), input[type="submit"]'))) {
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
  return { onKeyDown, onKeyDownCapture, onSubmit: submit,
    onCompositionStartCapture: composition.bind.onCompositionStart,
    onCompositionEndCapture: composition.bind.onCompositionEnd };
}

export interface FormFlowProps extends Omit<React.ComponentPropsWithRef<'form'>, 'onSubmit'>, FormFlowOptions {}
export function FormFlow({ onSubmit, restartOnSubmit, onSubmitError, onKeyDown, onKeyDownCapture, onCompositionStartCapture, onCompositionEndCapture, ...props }: FormFlowProps) {
  const flow = useFormFlow({ onSubmit, restartOnSubmit, onSubmitError });
  return <form {...props} data-slot="form-flow" data-form-flow="" onSubmit={flow.onSubmit}
    onKeyDownCapture={event => { onKeyDownCapture?.(event); flow.onKeyDownCapture(event); }}
    onKeyDown={event => { onKeyDown?.(event); flow.onKeyDown(event); }}
    onCompositionStartCapture={event => { flow.onCompositionStartCapture(); onCompositionStartCapture?.(event); }}
    onCompositionEndCapture={event => { flow.onCompositionEndCapture(); onCompositionEndCapture?.(event); }} />;
}
