// 맥락 전환기(ContextSwitcher)의 순수 규칙 — 상단 바 규격 2절 · Figma 223:483 · 223:737. React 없이 단위 시험한다(context-switcher.test.mjs).
import type { ReactNode } from 'react';
import { comboboxFilter } from '../combobox/combobox-filter';

export interface ContextSwitcherItem {
  /** 항목 값. `value`·`onValueChange` 가 주고받는다. */
  value: string;
  /** 보이는 이름. 트리거·목록·낭독("<종류>: <이름>")에 쓴다. */
  label: string;
  /** 아이콘·판매처 표식 20px. */
  icon?: ReactNode;
  /**
   * 있으면 링크 항목이다 — 고르면 그 주소로 이동한다(⌘/Ctrl·가운데 클릭은 새 탭, 메뉴 안 로딩 없음).
   * 없으면 선택 항목이다 — 고르면 패널을 닫고 트리거에 진행 표시, `onValueChange` 가 실패하면 원래 값으로 돌아간다.
   */
  href?: string;
  /** 비활성 — 흐린 글자, 고를 수 없다. 초점은 받아 사유를 읽힌다. */
  disabled?: boolean;
  /** 비활성 사유. 툴팁과 낭독 설명으로 보인다(예: "지금은 선택할 수 없습니다"). */
  disabledReason?: string;
}

/** 고르기 직전에 앱이 받는 이벤트. `preventDefault()` 하면 이동·선택을 하지 않는다(저장하지 않은 입력 확인 등). */
export interface ContextSwitchEvent {
  /** 고른 항목 값. */
  value: string;
  /** 고른 항목. */
  item: ContextSwitcherItem;
  /** 링크 항목이면 그 클릭 이벤트 — 앱 라우터로 옮길 때 `preventDefault()` 뒤 직접 이동한다. */
  nativeEvent?: Event;
  preventDefault(): void;
  readonly defaultPrevented: boolean;
}

export function createSwitchEvent(item: ContextSwitcherItem, nativeEvent?: Event): ContextSwitchEvent {
  let prevented = false;
  return {
    value: item.value, item, nativeEvent,
    preventDefault() { prevented = true; },
    get defaultPrevented() { return prevented; },
  };
}

/** 검색 입력을 보이는 기본 항목 수(규격 2절 "기본 8, 앱이 정함"). */
export const SEARCH_THRESHOLD = 8;

/** 받침이 있는 낱말인가 — 조사(을/를·이/가)를 고른다. 한글이 아니면 받침 없음으로 본다. */
export function hasFinalConsonant(word: string): boolean {
  const last = word.trim().at(-1);
  if (!last) return false;
  const code = last.codePointAt(0)! - 0xac00;
  return code >= 0 && code < 11172 && code % 28 !== 0;
}
/** "스토어를" · "제품을" — 오류 토스트 문구. */
export const objectParticle = (word: string) => `${word}${hasFinalConsonant(word) ? '을' : '를'}`;
/** "스토어가" · "제품이" — 검색 결과 없음 문구. */
export const subjectParticle = (word: string) => `${word}${hasFinalConsonant(word) ? '이' : '가'}`;

/** 트리거의 접근 이름 "<종류>: <현재 값>"(규격 2절). 보이는 값이 이름 안에 그대로 있다(WCAG 2.5.3). */
export const triggerName = (kind: string, label: string) => `${kind}: ${label}`;
/** 고를 것이 하나뿐일 때의 정적 글자 낭독 "현재 <종류>: <값>". */
export const staticName = (kind: string, label: string) => `현재 ${kind}: ${label}`;
export const searchLabel = (kind: string) => `${kind} 검색`;
export const emptyText = (kind: string) => `일치하는 ${subjectParticle(kind)} 없습니다`;
export const failureTitle = (kind: string) => `${objectParticle(kind)} 바꾸지 못했습니다`;
export const failureDescription = (kind: string) => `이전 ${objectParticle(kind)} 유지합니다`;

/** 고를 수 있는 전체 목록 — "전체" 항목이 맨 위다. */
export function switcherChoices(items: ContextSwitcherItem[], allItem?: ContextSwitcherItem): ContextSwitcherItem[] {
  return allItem ? [allItem, ...items] : items;
}
/** 고를 것이 하나 이하면 버튼이 아니라 정적 글자다(초점 안 받음, 화살표 없음). */
export const isStatic = (choices: ContextSwitcherItem[]) => choices.length <= 1;
/** 검색 입력을 보이는가. 기준은 "전체"를 뺀 항목 수다. */
export const needsSearch = (items: ContextSwitcherItem[], threshold = SEARCH_THRESHOLD) => items.length >= threshold;
/** 검색어로 거른다(한글 초성·조합 중 글자 포함 — Combobox 와 같은 규칙, DESIGN.md §11.6). */
export function filterChoices(choices: ContextSwitcherItem[], query: string): ContextSwitcherItem[] {
  const needle = query.trim();
  return needle ? choices.filter(item => comboboxFilter(needle, item.label)) : choices;
}

const INITIALS = [...'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'];
/** 낱말 첫 글자가 이 키로 시작하는가. 한글 자음 한 글자는 첫 음절의 초성과 견준다("ㅅ" → "스토어"). */
function startsWith(label: string, key: string) {
  const first = label.trim().normalize('NFC').at(0);
  if (!first) return false;
  if (first.toLocaleLowerCase('ko-KR') === key.toLocaleLowerCase('ko-KR')) return true;
  const code = first.codePointAt(0)! - 0xac00;
  return INITIALS.includes(key) && code >= 0 && code < 11172 && INITIALS[Math.floor(code / 588)] === key;
}

/**
 * 첫 글자 이동(규격 2절 키보드). 지금 위치 다음부터 한 바퀴 돌며 그 글자로 시작하는 항목을 찾는다 —
 * 같은 키를 거듭 누르면 같은 글자의 다음 항목으로 간다. 없으면 -1. 비활성 항목도 초점은 받는다(사유를 읽힌다).
 */
export function typeaheadIndex(labels: string[], current: number, key: string): number {
  if ([...key].length !== 1 || !key.trim()) return -1;
  for (let step = 1; step <= labels.length; step += 1) {
    const index = (current + step + labels.length) % labels.length;
    if (startsWith(labels[index]!, key)) return index;
  }
  return -1;
}

/**
 * select 항목 상태 전이(규격 2절 항목 동작 · Figma 223:522 · 223:527).
 * idle —select→ pending(트리거에 스피너 + 새 값) —resolve→ idle(새 값) / —reject→ idle(원래 값) + 오류 토스트.
 * 진행 중에는 새 선택을 받지 않는다(트리거가 aria-disabled).
 */
export type SwitchState = { status: 'idle' } | { status: 'pending'; item: ContextSwitcherItem };
export type SwitchAction = { type: 'select'; item: ContextSwitcherItem } | { type: 'resolve' } | { type: 'reject' };
export function switchReducer(state: SwitchState, action: SwitchAction): SwitchState {
  if (action.type === 'select') return state.status === 'pending' ? state : { status: 'pending', item: action.item };
  return { status: 'idle' };
}

/**
 * 이동·선택 전 취소 가능 이벤트(규격 2절 "둘 다 이동 전 취소 가능 이벤트"). 동기로 돈다 — 링크는 같은 클릭 안에서
 * 기본 이동을 막아야 하기 때문이다. 비활성 항목은 이벤트 없이 거절한다. 거짓이면 진행하지 않는다.
 */
export function allowSwitch(item: ContextSwitcherItem, onBeforeSwitch?: (event: ContextSwitchEvent) => void, nativeEvent?: Event): boolean {
  if (item.disabled) return false;
  const event = createSwitchEvent(item, nativeEvent);
  onBeforeSwitch?.(event);
  return !event.defaultPrevented;
}

/**
 * select 항목 고르기 한 번. 취소 가능 이벤트를 먼저 보내고 `onValueChange` 결과를 기다린다.
 * Promise 가 아니면 바로 확정, Promise 면 진행 중(트리거 스피너 + 새 값) → 성공 확정 / 실패 복귀 + `fail`(오류 토스트).
 * 돌려주는 값: 'same'(지금 값) · 'cancelled'(앱이 막음·비활성) · 'done' · 'failed'.
 */
export async function runSwitch(options: {
  item: ContextSwitcherItem;
  current: string | undefined;
  onBeforeSwitch?: (event: ContextSwitchEvent) => void;
  onValueChange?: (value: string) => unknown;
  dispatch: (action: SwitchAction) => void;
  commit: (value: string) => void;
  fail: (error: unknown) => void;
}): Promise<'cancelled' | 'done' | 'failed' | 'same'> {
  const { item, current, onBeforeSwitch, onValueChange, dispatch, commit, fail } = options;
  if (!item.disabled && item.value === current) return 'same';
  if (!allowSwitch(item, onBeforeSwitch)) return 'cancelled';
  let result: unknown;
  try { result = onValueChange?.(item.value); }
  catch (error) { fail(error); return 'failed'; }
  if (!(result instanceof Promise)) { commit(item.value); return 'done'; }
  dispatch({ type: 'select', item });
  try {
    await result;
    commit(item.value);
    dispatch({ type: 'resolve' });
    return 'done';
  } catch (error) {
    dispatch({ type: 'reject' });
    fail(error);
    return 'failed';
  }
}

/**
 * 접힌 "맥락" 목록의 2단계(규격 2절 r1.2 "종류를 고르면 그 전환기 패널(검색 포함)로 들어가는 2단계" · 2단계 규격 밖 ⑦).
 * `step` null = 종류 목록, 숫자 = 그 순번 전환기의 패널. `returnTo` = 뒤로 왔을 때 초점을 돌려줄 종류 줄(없으면 null).
 * 열 때마다 첫 단계부터다. Esc·항목 선택은 메뉴가 닫고 트리거로 초점을 돌려준다 — 여기서는 다루지 않는다.
 */
export interface DrillState { step: number | null; returnTo: number | null }
export type DrillAction = { type: 'open' } | { type: 'enter'; index: number } | { type: 'back' };
export const DRILL_START: DrillState = { step: null, returnTo: null };
export function drillReducer(state: DrillState, action: DrillAction): DrillState {
  if (action.type === 'open') return DRILL_START;
  if (action.type === 'enter') return { step: action.index, returnTo: null };
  return state.step === null ? state : { step: null, returnTo: state.step };
}
