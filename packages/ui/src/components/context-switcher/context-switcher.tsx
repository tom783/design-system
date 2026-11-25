import * as React from 'react';
import { Check, ChevronDown, Layers2, LoaderCircle, Search } from 'lucide-react';
import * as Menu from '../../internal/dropdown-menu';
import { cn } from '../../lib/cn';
import { layerCollisionPadding } from '../../lib/layer';
import { useAutomaticRail } from '../app-shell/app-shell';
import { Tooltip } from '../guide';
import type { GuideChild } from '../guide/use-anchored';
import { Skeleton } from '../loading/skeleton';
import { ErrorState } from '../state/empty-state';
import { toast } from '../toast/toast';
import {
  allowSwitch, emptyText, failureDescription, failureTitle, filterChoices, isStatic, needsSearch, runSwitch, searchLabel,
  staticName, switchReducer, switcherChoices, triggerName, typeaheadIndex,
  type ContextSwitchEvent, type ContextSwitcherItem,
} from './switcher';

export type { ContextSwitcherItem, ContextSwitchEvent } from './switcher';

export interface ContextSwitcherProps {
  /** 맥락의 종류(예: "스토어", "제품"). 낭독 이름 "<종류>: <현재 값>", 검색 "<종류> 검색", 결과 없음 "일치하는 <종류>가 없습니다". */
  kind: string;
  /** 고를 항목. `href` 가 있으면 링크 항목(이동), 없으면 선택 항목(`onValueChange`)이다. */
  items: ContextSwitcherItem[];
  /** 지금 맥락 값(제어). */
  value?: string;
  /** 비제어 초기값. value를 주지 않을 때 첫 렌더에만 읽는다. */
  defaultValue?: string;
  /**
   * 선택 항목을 골랐을 때. Promise 를 돌려주면 끝날 때까지 트리거에 스피너 + 새 값을 보이고, 실패(reject)하면 원래 값으로 돌아가며
   * 오류 토스트("<종류>를 바꾸지 못했습니다")를 띄운다. 링크 항목에는 불리지 않는다(주소가 바뀌면 앱이 value 를 바꾼다).
   */
  onValueChange?: (value: string) => void | Promise<unknown>;
  /** 이동·선택 직전 취소 가능 이벤트. `event.preventDefault()` 로 막는다(저장하지 않은 입력 확인, 앱 라우터 이동). */
  onBeforeSwitch?: (event: ContextSwitchEvent) => void;
  /** "전체" 항목 — 목록 맨 위, 아래 구분선. */
  allItem?: ContextSwitcherItem;
  /** 트리거의 선택 아이콘 20px. 생략하면 지금 항목의 아이콘. */
  icon?: React.ReactNode;
  /** 트리거 앞에 종류 이름을 작은 글자로 보인다(선택). 낭독 이름은 보이든 말든 "<종류>: <값>"이다. */
  showKind?: boolean;
  /** 항목이 이 수 이상이면 패널 맨 위에 검색 입력을 둔다("전체" 제외). 기본 8. */
  searchThreshold?: number;
  /** 패널 맨 아래 안내 줄(위 구분선). 링크는 하나까지. */
  guide?: { text: string; link?: { label: string; href: string } };
  /** 목록 상태. loading = 스켈레톤 3줄, error = 오류 + 다시 시도(`onRetry`). */
  state?: 'idle' | 'loading' | 'error';
  /** 목록 실패의 다시 시도. */
  onRetry?: () => void;
  /** 열림(제어). */
  open?: boolean;
  /** 비제어 초기 열림. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

interface SlotState {
  value: string | undefined;
  pending: ContextSwitcherItem | null;
  choose: (item: ContextSwitcherItem) => void;
}
/** 묶음에 등록한 전환기 하나 — 접힌 "맥락" 트리거가 이 값으로 목록을 그리고 고른다. */
interface Registered extends SlotState { props: ContextSwitcherProps; label: string }
interface GroupApi {
  register: (index: number, entry: Registered) => void;
  unregister: (index: number) => void;
  narrow: boolean;
  collapsed: boolean;
}
/**
 * 전환기는 값·진행 상태를 스스로 갖고 묶음에 등록한다. 묶음은 자식 props 를 직접 읽지 않는다 — 앱이 전환기를 자기 컴포넌트로
 * 감싸도(`<StoreSwitcher />`) 접힌 목록이 같은 항목·값·진행 상태를 쓴다. 접힌 동안 전환기는 그리지 않을 뿐 살아 있어 상태가 이어진다.
 */
const GroupContext = React.createContext<GroupApi | null>(null);
const SlotIndex = React.createContext(0);

function notifyFailure(kind: string) {
  toast.error(failureTitle(kind), { description: failureDescription(kind) });
}

/** 전환기의 값·진행 상태(제어 value 우선). */
function useSwitchState({ kind, value, defaultValue, onValueChange, onBeforeSwitch }: ContextSwitcherProps): SlotState {
  const [inner, setInner] = React.useState(defaultValue);
  const [state, dispatch] = React.useReducer(switchReducer, { status: 'idle' });
  const alive = React.useRef(true);
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const current = value ?? inner;
  const choose = (item: ContextSwitcherItem) => {
    void runSwitch({ item, current, onBeforeSwitch, onValueChange,
      dispatch: action => { if (alive.current) dispatch(action); },
      commit: next => { if (alive.current && value === undefined) setInner(next); },
      fail: () => notifyFailure(kind) });
  };
  return { value: current, pending: state.status === 'pending' ? state.item : null, choose };
}

/** 말줄임 여부 — 잘렸을 때만 전체 이름 툴팁을 켠다(다 보이면 같은 말이 두 번 뜬다). */
function useClipped(ref: React.RefObject<HTMLElement | null>, deps: unknown[]) {
  const [clipped, setClipped] = React.useState(false);
  React.useEffect(() => {
    const element = ref.current;
    if (!element) { setClipped(false); return; }
    const measure = () => setClipped(element.scrollWidth > element.clientWidth);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return clipped;
}

const isModifiedClick = (event: React.MouseEvent) => event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

/** 목록 항목 하나. 링크는 `<a>`(새 탭은 브라우저 그대로), 선택은 menuitemradio. 비활성은 초점은 받고 사유를 읽힌다. */
function SwitcherItem({ item, selected, onChoose, onBeforeSwitch }: {
  item: ContextSwitcherItem; selected: boolean; onChoose: (item: ContextSwitcherItem) => void;
  onBeforeSwitch?: (event: ContextSwitchEvent) => void;
}) {
  const content = <>
    {item.icon && <span className="ds-context-switcher-item-icon" aria-hidden="true">{item.icon}</span>}
    <span className="ds-context-switcher-item-label" title={item.label}>{item.label}</span>
    {selected && <Check aria-hidden="true" className="ds-context-switcher-check" />}
  </>;
  const common = {
    'data-switcher-item': '', 'data-label': item.label,
    'data-selected': selected ? '' : undefined, 'aria-disabled': item.disabled ? true : undefined,
    className: 'ds-context-switcher-item', textValue: item.label,
  } as const;
  let row: GuideChild;
  if (item.href) {
    row = <Menu.Item {...common} data-slot="context-switcher-item" asChild onSelect={event => { if (item.disabled) event.preventDefault(); }}>
      <a href={item.disabled ? undefined : item.href} aria-current={selected ? 'true' : undefined}
        onClick={event => {
          if (item.disabled) { event.preventDefault(); return; }
          // ⌘/Ctrl·가운데·Shift 클릭은 새 탭·창이다 — 지금 맥락은 그대로라 이벤트를 보내지 않는다.
          if (isModifiedClick(event)) return;
          // 지금 항목을 다시 누르면 같은 화면을 다시 불러오지 않는다.
          if (selected || !allowSwitch(item, onBeforeSwitch, event.nativeEvent)) event.preventDefault();
        }}>{content}</a>
    </Menu.Item>;
  } else {
    row = <Menu.Item {...common} data-slot="context-switcher-item" role="menuitemradio" aria-checked={selected}
      onSelect={event => { if (item.disabled) { event.preventDefault(); return; } onChoose(item); }}>{content}</Menu.Item>;
  }
  return item.disabled && item.disabledReason ? <Tooltip content={item.disabledReason}>{row}</Tooltip> : row;
}

/** 목록 실패면 열자마자 다시 시도로 간다 — 메뉴 안 Tab 은 막혀 있어(메뉴 규약) 거기까지 갈 다른 길이 없다. */
const focusRetry = (node: HTMLDivElement | null) => {
  if (node) requestAnimationFrame(() => node.querySelector<HTMLElement>('button')?.focus());
};

/** 목록 부분 — 단독 전환기와 접힌 "맥락" 트리거가 같이 쓴다(사용자 메뉴의 조직 전환도 이 모양을 따른다, 규격 7절). */
function SwitcherBody({ props, slot, query }: { props: ContextSwitcherProps; slot: SlotState; query: string }) {
  const { kind, items, allItem, state = 'idle', onRetry, onBeforeSwitch } = props;
  if (state === 'loading') return <div data-slot="context-switcher-loading" className="ds-context-switcher-loading" aria-busy="true">
    {[60, 42, 60].map((width, index) => <div key={index} className="ds-context-switcher-skeleton">
      <Skeleton width="var(--space-12)" height="var(--space-12)" />
      <Skeleton width={`${width}%`} height="calc(var(--space-8) + var(--space-2))" />
    </div>)}
    <span className="sr-only" role="status">목록을 불러오는 중</span>
  </div>;
  if (state === 'error') return <div ref={focusRetry}>
    <ErrorState className="ds-context-switcher-error" title="목록을 불러오지 못했습니다" onRetry={onRetry} />
  </div>;
  const visible = filterChoices(switcherChoices(items, allItem), query);
  if (!visible.length) return <div data-slot="context-switcher-empty" className="ds-context-switcher-empty" role="status">{emptyText(kind)}</div>;
  const showAll = allItem && visible[0] === allItem;
  return <>
    {visible.map(item => <React.Fragment key={item.value}>
      <SwitcherItem item={item} selected={item.value === slot.value} onChoose={slot.choose} onBeforeSwitch={onBeforeSwitch} />
      {showAll && item === allItem && visible.length > 1 && <Menu.Separator className="ds-context-switcher-separator" />}
    </React.Fragment>)}
  </>;
}

/** 첫 글자 이동·검색 입력 ↔ 목록 오가기. Radix 의 기본 첫 글자 검색은 한글 초성("ㅅ" → "스토어")을 모른다. */
function handleListKeys(event: React.KeyboardEvent<HTMLElement>, search: HTMLInputElement | null) {
  const target = event.target as HTMLElement;
  if (target.tagName === 'INPUT') return;
  const nodes = [...event.currentTarget.querySelectorAll<HTMLElement>('[data-switcher-item]')];
  const index = nodes.indexOf(document.activeElement as HTMLElement);
  if (event.key === 'ArrowUp' && search && index === 0) {
    event.preventDefault(); event.stopPropagation(); search.focus(); return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey || [...event.key].length !== 1 || event.key === ' ') return;
  const next = typeaheadIndex(nodes.map(node => node.dataset.label ?? ''), index, event.key);
  event.preventDefault(); event.stopPropagation();
  if (next >= 0) nodes[next]!.focus();
}

const CONTENT = 'ds-context-switcher-content data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 origin-[var(--radix-dropdown-menu-content-transform-origin)]';

/**
 * 맥락 전환기 — 지금 제품·스토어 같은 맥락을 보이고 바꾼다(상단 바 규격 2절 · Figma 223:483 · 223:737).
 * 트리거 38(1024 미만 44) · 최대 폭 240 말줄임 + 툴팁 · 목록 패널 240~360 · 최대 높이 400(목록만 스크롤) · 항목 38/44.
 * 고를 것이 하나면 버튼이 아니라 정적 글자다. 키보드: 화살표 이동 · Enter 선택 · Esc 닫고 트리거로 · 첫 글자 이동(한글 초성 포함).
 */
export function ContextSwitcher(props: ContextSwitcherProps) {
  const { kind, items, allItem, icon, showKind = false, searchThreshold, guide, state = 'idle', open, defaultOpen = false,
    onOpenChange, className } = props;
  const group = React.useContext(GroupContext);
  const index = React.useContext(SlotIndex);
  const slot = useSwitchState(props);
  // 1024 미만 묶음에서는 둘째부터 이름을 숨기고 아이콘 + 툴팁(규격 1절).
  const iconOnly = group !== null && group.narrow && index > 0;
  const [innerOpen, setInnerOpen] = React.useState(defaultOpen);
  const isOpen = open ?? innerOpen;
  const [query, setQuery] = React.useState('');
  const searchRef = React.useRef<HTMLInputElement | null>(null);
  // 검색이 있으면 열자마자 검색 입력으로 간다 — 메뉴가 내용·첫 항목에 초점을 준 뒤(같은 커밋의 효과)에 옮긴다.
  const searchCallback = React.useCallback((node: HTMLInputElement | null) => {
    searchRef.current = node;
    if (node) requestAnimationFrame(() => { if (node.isConnected) node.focus(); });
  }, []);
  const valueRef = React.useRef<HTMLSpanElement>(null);
  const choices = switcherChoices(items, allItem);
  const current = choices.find(item => item.value === slot.value);
  const shown = slot.pending ?? current;
  const label = shown?.label ?? slot.value ?? '';
  const clipped = useClipped(valueRef, [label, iconOnly, group?.collapsed]);
  // 묶음에 등록 — 렌더마다 최신 props·값을 넘긴다(묶음은 값·진행·이름이 바뀔 때만 다시 그린다).
  React.useLayoutEffect(() => { group?.register(index, { ...slot, props, label }); });
  React.useLayoutEffect(() => () => group?.unregister(index), [group, index]);
  const setOpen = (next: boolean) => {
    // 진행 중에는 다시 열지 않는다 — 결과가 나기 전에 또 고르면 어느 값이 남는지 알 수 없다.
    if (next && slot.pending) return;
    if (!next) setQuery('');
    if (open === undefined) setInnerOpen(next);
    onOpenChange?.(next);
  };

  if (group?.collapsed) return null;
  if (state === 'idle' && isStatic(choices)) {
    return <span data-slot="context-switcher" data-static="" className={cn('ds-context-switcher-static', className)}>
      {(icon ?? current?.icon) && <span className="ds-context-switcher-icon" aria-hidden="true">{icon ?? current?.icon}</span>}
      <span className="ds-context-switcher-value" title={label} aria-hidden="true">{label}</span>
      <span className="sr-only">{staticName(kind, label)}</span>
    </span>;
  }

  const search = state === 'idle' && needsSearch(items, searchThreshold);
  const triggerIcon = slot.pending ? <LoaderCircle className="ds-context-switcher-spinner" /> : icon ?? shown?.icon;
  const name = triggerName(kind, label);
  return <Menu.Root open={isOpen} onOpenChange={setOpen}>
    {/* 열린 동안·다 보일 때는 툴팁을 끈다 — 말풍선이 목록을 덮고, 같은 말이 두 번 뜬다. */}
    <Tooltip content={name} disabled={isOpen || !(iconOnly || clipped)}>
      <Menu.Trigger asChild>
        <button type="button" data-slot="context-switcher" className={cn('ds-context-switcher-trigger', className)}
          data-icon-only={iconOnly ? '' : undefined} aria-label={name}
          aria-busy={slot.pending ? true : undefined} aria-disabled={slot.pending ? true : undefined}>
          {showKind && !iconOnly && <span className="ds-context-switcher-kind" aria-hidden="true">{kind}</span>}
          {triggerIcon && <span className="ds-context-switcher-icon" aria-hidden="true">{triggerIcon}</span>}
          {!iconOnly && <span ref={valueRef} className="ds-context-switcher-value">{label}</span>}
          {!iconOnly && <ChevronDown aria-hidden="true" className="ds-context-switcher-chevron" />}
        </button>
      </Menu.Trigger>
    </Tooltip>
    {/* 진행 알림 — 트리거 이름은 이미 새 값이다. 끝나면(성공·실패) 비운다. 실패는 오류 토스트(alert)가 알린다. */}
    <span className="sr-only" role="status">{slot.pending ? '선택한 새 값으로 바꾸는 중' : ''}</span>
    <Menu.Portal>
      <Menu.Content data-slot="context-switcher-content" className={CONTENT} align="start" sideOffset={4}
        collisionPadding={layerCollisionPadding} aria-label={kind}
        onCloseAutoFocus={() => setQuery('')}
        onKeyDownCapture={event => handleListKeys(event, searchRef.current)}>
        {search && <label className="ds-context-switcher-search">
          <Search aria-hidden="true" className="ds-context-switcher-search-icon" />
          <input ref={searchCallback} type="text" data-slot="context-switcher-search" className="ds-context-switcher-search-input"
            placeholder={searchLabel(kind)} aria-label={searchLabel(kind)} value={query} autoComplete="off"
            onChange={event => setQuery(event.currentTarget.value)}
            onKeyDown={event => {
              // 메뉴의 첫 글자 검색·Tab 가두기에 글자를 넘기지 않는다. Esc 는 메뉴가 닫는다. 조합 중에는 아무것도 가로채지 않는다.
              if (event.key === 'Escape') return;
              event.stopPropagation();
              if (event.nativeEvent.isComposing) return;
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                event.currentTarget.closest('[data-slot="context-switcher-content"]')?.querySelector<HTMLElement>('[data-switcher-item]')?.focus();
              }
            }} />
        </label>}
        <div data-slot="context-switcher-list" className="ds-context-switcher-list">
          <SwitcherBody props={props} slot={slot} query={query} />
        </div>
        {guide && state === 'idle' && <div data-slot="context-switcher-guide" className="ds-context-switcher-guide">
          <span>{guide.text}</span>
          {guide.link && <Menu.Item asChild className="ds-context-switcher-guide-link" textValue={guide.link.label}>
            <a href={guide.link.href}>{guide.link.label}</a>
          </Menu.Item>}
        </div>}
      </Menu.Content>
    </Menu.Portal>
  </Menu.Root>;
}

export interface ContextSwitcherGroupProps extends React.ComponentProps<'div'> {
  /** ContextSwitcher 0~2개(권장 최대 2). 사이에 세로 구분선을 둔다. */
  children: React.ReactNode;
}

/**
 * 맥락 전환기 묶음 — header 왼쪽에 전환기를 0~2개 둔다(규격 1절 · Figma 223:740 · 223:1766 · 223:1923).
 * 전환기 사이 세로 구분선 1px 높이 20 · 좌우 8. 1024 미만은 둘째부터 이름을 숨기고 아이콘 + 툴팁, 그래도 넘치면 전체를 한 트리거
 * ("맥락")로 접어 종류별 하위 목록으로 보인다. 전환기가 묶음에 스스로 등록하므로 앱 컴포넌트로 감싸도 된다.
 */
export function ContextSwitcherGroup({ children, className, ref, ...props }: ContextSwitcherGroupProps) {
  const narrow = useAutomaticRail();
  const [collapsed, setCollapsed] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [, setVersion] = React.useState(0);
  const entries = React.useRef(new Map<number, Registered>());
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const innerRef = React.useRef<HTMLDivElement>(null);
  const needed = React.useRef(0);
  const register = React.useCallback((index: number, entry: Registered) => {
    const previous = entries.current.get(index);
    entries.current.set(index, entry);
    if (!previous || previous.value !== entry.value || previous.pending !== entry.pending || previous.label !== entry.label
      || previous.props.kind !== entry.props.kind) setVersion(version => version + 1);
  }, []);
  const unregister = React.useCallback((index: number) => {
    if (entries.current.delete(index)) setVersion(version => version + 1);
  }, []);
  const api = React.useMemo(() => ({ register, unregister, narrow, collapsed }), [register, unregister, narrow, collapsed]);

  // 넘침 재기: 펼친 묶음의 내용 폭이 자리보다 넓으면 접고, 그 폭을 기억했다가 자리가 그만큼 넓어지면 다시 편다(왔다 갔다 하지 않게).
  React.useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      if (!collapsed) {
        const content = innerRef.current;
        if (content && content.scrollWidth > root.clientWidth + 0.5) { needed.current = content.scrollWidth; setCollapsed(true); }
      } else if (root.clientWidth >= needed.current) setCollapsed(false);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    if (innerRef.current) observer.observe(innerRef.current);
    measure();
    return () => observer.disconnect();
  }, [collapsed, narrow]);
  React.useEffect(() => { if (!collapsed) setOpen(false); }, [collapsed]);

  const setRef = (node: HTMLDivElement | null) => {
    rootRef.current = node;
    if (typeof ref === 'function') ref(node); else if (ref) ref.current = node;
  };
  const elements = React.Children.toArray(children).filter(React.isValidElement);
  const slots = elements.map((child, index) => <SlotIndex.Provider key={child.key ?? index} value={index}>
    {!collapsed && index > 0 && <span className="ds-context-switcher-divider" aria-hidden="true" />}
    {child}
  </SlotIndex.Provider>);
  const list = [...entries.current.entries()].sort(([a], [b]) => a - b).map(([, entry]) => entry);
  const busy = list.some(entry => entry.pending);
  return <GroupContext.Provider value={api}>
    <div {...props} ref={setRef} data-slot="context-switcher-group" data-collapsed={collapsed ? '' : undefined}
      className={cn('ds-context-switcher-group', className)}>
      {collapsed ? <>
        {/* 접힌 동안에도 전환기는 살아 있어(그리지 않을 뿐) 값·진행 상태를 묶음에 알린다. */}
        {slots}
        {list.length > 0 && <Menu.Root open={open} onOpenChange={next => { if (!(next && busy)) setOpen(next); }}>
          <Menu.Trigger asChild>
            <button type="button" data-slot="context-switcher" className="ds-context-switcher-trigger"
              aria-label={`맥락: ${list.map(entry => entry.label).filter(Boolean).join(', ')}`}
              aria-busy={busy || undefined} aria-disabled={busy || undefined}>
              <span className="ds-context-switcher-icon" aria-hidden="true">
                {busy ? <LoaderCircle className="ds-context-switcher-spinner" /> : list[0]!.props.icon ?? <Layers2 />}
              </span>
              <span className="ds-context-switcher-value">맥락</span>
              <ChevronDown aria-hidden="true" className="ds-context-switcher-chevron" />
            </button>
          </Menu.Trigger>
          <span className="sr-only" role="status">{busy ? '선택한 새 값으로 바꾸는 중' : ''}</span>
          <Menu.Portal>
            <Menu.Content data-slot="context-switcher-content" className={CONTENT} align="start" sideOffset={4}
              collisionPadding={layerCollisionPadding} aria-label="맥락" onKeyDownCapture={event => handleListKeys(event, null)}>
              <div data-slot="context-switcher-list" className="ds-context-switcher-list">
                {list.map((entry, index) => <Menu.Group key={index} className="ds-context-switcher-section" aria-label={entry.props.kind}>
                  <Menu.Label className="ds-context-switcher-section-label" aria-hidden="true">{entry.props.kind}</Menu.Label>
                  <SwitcherBody props={entry.props} slot={entry} query="" />
                </Menu.Group>)}
              </div>
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>}
      </> : <div ref={innerRef} className="ds-context-switcher-group-inner">{slots}</div>}
    </div>
  </GroupContext.Provider>;
}
