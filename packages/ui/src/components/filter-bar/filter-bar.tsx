import * as React from 'react';
import { X } from 'lucide-react';
import * as Popover from '../../internal/popover';
import { Button } from '../button';
import { Input } from '../input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';
import { chipVariants } from '../status-chip';
import { cn } from '../../lib/cn';
import { layerCollisionPadding } from '../../lib/layer';
import { fitChipCount } from './fit-chips';

/**
 * 필터 바 — 목록 위 툴바(DESIGN.md §4.2, 0.5.0 디자인 총괄 확정 규격 · Figma 174:2).
 *
 * 설계 근거
 * - 순서는 저장된 보기 Select → 검색 → 필터 트리거 → (보기가 바뀌었으면) 보기 저장. '변경됨'은 보기 Select
 *   바로 뒤에 붙인다 — 보기에 대한 설명이라서다(시안 187:79). 접근성 설명(aria-describedby)도 Select 에 잇는다.
 * - 둘째 줄은 적용 필터 칩 → `+N` → 초기화. **칩 줄은 언제나 한 줄**이고 0개일 때도 높이를 남겨 표가 시작하는
 *   자리를 고정한다. 넘치는 칩은 개수가 아니라 실제 폭으로 `+N` 에 보낸다(fit-chips.ts).
 * - 칩 해제 뒤 포커스는 다음 칩 해제 버튼, 없으면 필터 트리거로 간다. 다음 칩이 `+N` 안에 있으면 `+N` 이다.
 *   초기화 뒤에는 필터 트리거. 포커스가 사라진 버튼과 함께 body 로 떨어지지 않게 한다.
 * - 좁은 폭(바 자체 폭 720px 미만, 컨테이너 쿼리)에서는 1줄 보기·필터, 2줄 검색 전체 폭, 3줄 칩이다.
 *   뷰포트가 아니라 바 폭으로 정한다 — 같은 1024 화면도 사이드 메뉴가 펼쳐졌는지에 따라 바 폭이 다르다.
 */
export interface FilterBarView { value: string; label: string }
/** 적용된 필터 하나. label 은 '상태: 출고 대기'처럼 조건 이름과 값을 함께 쓴다. */
export interface FilterBarFilter { id: string; label: string }

export interface FilterBarProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** 저장된 보기. 주면 툴바 맨 앞에 Select 로 놓인다. */
  views?: readonly FilterBarView[];
  view?: string;
  defaultView?: string;
  onViewChange?: (view: string) => void;
  /** 고른 보기의 저장된 조건과 지금 조건이 다른지. 앱이 비교해 준다. true 면 '변경됨'과 보기 저장을 보인다. */
  viewChanged?: boolean;
  /** 보기 저장 버튼을 눌렀다. viewChanged 일 때만 버튼이 보인다. */
  onSaveView?: () => void;
  query?: string;
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  /** 검색 입력의 접근 이름. 기본 '검색'. */
  searchLabel?: string;
  searchPlaceholder?: string;
  /** 적용된 필터 — 칩 하나가 조건 하나다. 칩 해제·초기화는 onFiltersChange 로 남은 목록을 알린다. */
  filters?: readonly FilterBarFilter[];
  defaultFilters?: readonly FilterBarFilter[];
  onFiltersChange?: (filters: FilterBarFilter[]) => void;
  /** 필터 트리거가 여는 패널의 내용(조건 편집). 없으면 트리거는 filterOpen 만 바꾸고 앱이 Sheet 등을 연다. */
  filterContent?: React.ReactNode;
  filterOpen?: boolean;
  defaultFilterOpen?: boolean;
  onFilterOpenChange?: (open: boolean) => void;
}

const NO_FILTERS: readonly FilterBarFilter[] = [];

/** X · defaultX · onXChange (DESIGN.md §6.3 규칙 1). value 가 undefined 면 비제어다. */
function useControllable<T>(value: T | undefined, initial: T, onChange?: (next: T) => void) {
  const [inner, setInner] = React.useState(initial);
  const controlled = value !== undefined;
  const current = controlled ? value : inner;
  const set = React.useCallback((next: T) => {
    if (!controlled) setInner(next);
    onChange?.(next);
  }, [controlled, onChange]);
  return [current, set] as const;
}

type PendingFocus = { from: string } & ({ kind: 'chip'; id: string } | { kind: 'trigger' });

export function FilterBar({
  views, view: viewProp, defaultView, onViewChange, viewChanged = false, onSaveView,
  query: queryProp, defaultQuery = '', onQueryChange, searchLabel = '검색', searchPlaceholder,
  filters: filtersProp, defaultFilters = NO_FILTERS, onFiltersChange,
  filterContent, filterOpen: filterOpenProp, defaultFilterOpen = false, onFilterOpenChange,
  className, 'aria-label': ariaLabel = '목록 검색과 필터', ...props
}: FilterBarProps) {
  const id = React.useId();
  const [view, setView] = useControllable(viewProp, defaultView ?? views?.[0]?.value ?? '', onViewChange);
  const [query, setQuery] = useControllable(queryProp, defaultQuery, onQueryChange);
  const [filters, setFilters] = useControllable<readonly FilterBarFilter[]>(filtersProp, defaultFilters,
    onFiltersChange as ((next: readonly FilterBarFilter[]) => void) | undefined);
  const [filterOpen, setFilterOpen] = useControllable(filterOpenProp, defaultFilterOpen, onFilterOpenChange);
  const [moreOpen, setMoreOpen] = React.useState(false);

  const rowRef = React.useRef<HTMLDivElement>(null);
  const measureRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const moreRef = React.useRef<HTMLButtonElement>(null);
  const moreListRef = React.useRef<HTMLUListElement>(null);
  const pending = React.useRef<PendingFocus | null>(null);
  // 포커스를 직접 옮길 때는 팝오버가 닫히며 `+N` 으로 포커스를 돌려주는 기본 동작을 막는다.
  const keepFocus = React.useRef(false);

  const count = filters.length;
  const filtersKey = filters.map(filter => filter.id).join('\u0000');
  // 측정 전(첫 렌더·SSR)에는 전부 보인다. 줄은 overflow:hidden 이라 한 프레임도 두 줄이 되지 않는다.
  const [fit, setFit] = React.useState({ key: filtersKey, visible: count });
  const visible = Math.min(fit.visible, count);
  const hidden = filters.slice(visible);

  const measure = React.useCallback(() => {
    const row = rowRef.current, layer = measureRef.current;
    if (!row) return;
    // 칩이 0개면 측정 사본이 없다. 그래도 "이 목록으로 쟀다"는 표식은 남겨야 초기화 뒤 포커스가 옮겨 간다.
    if (!layer) { setFit(previous => previous.key === filtersKey && previous.visible === 0 ? previous : { key: filtersKey, visible: 0 }); return; }
    const width = (el: Element | null) => el ? el.getBoundingClientRect().width : 0;
    const chips = [...layer.querySelectorAll('[data-measure="chip"]')].map(width);
    const style = getComputedStyle(row);
    const gap = parseFloat(style.columnGap) || 0;
    // clientWidth 는 정수로 반올림된다. 칩 폭(소수)과 같은 단위로 잰다.
    const available = row.getBoundingClientRect().width - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
    const next = fitChipCount({ available, chips, gap,
      more: width(layer.querySelector('[data-measure="more"]')), reset: width(layer.querySelector('[data-measure="reset"]')) });
    setFit(previous => previous.key === filtersKey && previous.visible === next ? previous : { key: filtersKey, visible: next });
  }, [filtersKey]);

  React.useLayoutEffect(() => {
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    // 줄 폭(창·사이드 메뉴)과 측정 칩 폭(웹폰트 로드) 어느 쪽이 바뀌어도 다시 잰다.
    const observer = new ResizeObserver(() => measure());
    if (rowRef.current) observer.observe(rowRef.current);
    // 측정 사본의 바깥 상자는 0×0 클리퍼라 안쪽 목록(칩 폭 합)을 본다.
    const list = measureRef.current?.firstElementChild;
    if (list) observer.observe(list);
    return () => observer.disconnect();
  }, [measure, count > 0]);

  // 숨은 칩이 없어지면 팝오버를 닫는다(`+N` 자체가 사라진다).
  React.useEffect(() => { if (hidden.length === 0 && moreOpen) setMoreOpen(false); }, [hidden.length, moreOpen]);

  // 해제 뒤 포커스: 측정이 끝난 렌더(fit.key === filtersKey)에서 목적지를 고른다. 측정 전에 고르면
  // 바뀐 보이는 개수를 모른 채 칩이 줄에 있는지 `+N` 안에 있는지를 틀린다.
  React.useLayoutEffect(() => {
    const target = pending.current;
    if (!target || target.from === filtersKey || fit.key !== filtersKey) return;
    pending.current = null;
    const focus = (element: HTMLElement | null | undefined) => element?.focus();
    if (target.kind === 'trigger') { keepFocus.current = true; setMoreOpen(false); focus(triggerRef.current); return; }
    const index = filters.findIndex(filter => filter.id === target.id);
    const selector = `[data-filter-id="${CSS.escape(target.id)}"] [data-slot="filter-bar-chip-remove"]`;
    if (index < 0) { keepFocus.current = true; setMoreOpen(false); focus(triggerRef.current); }
    else if (index < visible) { keepFocus.current = true; setMoreOpen(false); focus(rowRef.current?.querySelector<HTMLElement>(selector)); }
    else if (moreOpen) focus(moreListRef.current?.querySelector<HTMLElement>(selector));
    else focus(moreRef.current);
  });

  const remove = (filterId: string) => {
    const index = filters.findIndex(filter => filter.id === filterId);
    const next = filters.filter(filter => filter.id !== filterId);
    const after = next[index];
    pending.current = after ? { kind: 'chip', id: after.id, from: filtersKey } : { kind: 'trigger', from: filtersKey };
    setFilters(next);
  };
  const clear = () => { pending.current = { kind: 'trigger', from: filtersKey }; setFilters([]); };

  const chip = (filter: FilterBarFilter, measuring = false) => <li key={filter.id} data-slot="filter-bar-chip"
    data-filter-id={measuring ? undefined : filter.id} data-measure={measuring ? 'chip' : undefined}
    className={cn(chipVariants({ tone: 'neutral' }), 'ds-filter-bar-chip')}>
    <span data-slot="filter-bar-chip-label" title={filter.label}>{filter.label}</span>
    <button type="button" data-slot="filter-bar-chip-remove" aria-label={`${filter.label} 필터 해제`}
      tabIndex={measuring ? -1 : undefined} onClick={measuring ? undefined : () => remove(filter.id)}>
      <X aria-hidden="true" />
    </button>
  </li>;

  const changedId = `${id}-changed`;
  const trigger = <Button ref={triggerRef} data-slot="filter-bar-trigger" className="ds-filter-bar-trigger"
    aria-haspopup="dialog" aria-expanded={filterOpen} aria-label={count > 0 ? `필터 ${count}개 적용` : undefined}
    onClick={filterContent === undefined ? () => setFilterOpen(!filterOpen) : undefined}>
    {/* 0개면 숫자 없이 '필터'(review-r2 2). 접근 이름은 보이는 글자를 앞에 둔다('필터 3' ⊂ '필터 3개 적용'). */}
    {count > 0 ? `필터 ${count}` : '필터'}
  </Button>;

  return <div role="search" aria-label={ariaLabel} {...props} data-slot="filter-bar" className={cn('ds-filter-bar', className)}>
    <div data-slot="filter-bar-controls" className="ds-filter-bar-controls">
      {views && views.length > 0 && <div data-slot="filter-bar-view" className="ds-filter-bar-view">
        <Select value={view} onValueChange={setView}>
          <SelectTrigger aria-label="저장된 보기" aria-describedby={viewChanged ? changedId : undefined} className="w-auto min-w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>{views.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
        </Select>
        {viewChanged && <><span aria-hidden="true" className="ds-filter-bar-dot">·</span>
          <span id={changedId} data-slot="filter-bar-view-changed" className={chipVariants({ tone: 'neutral' })}>변경됨</span></>}
      </div>}
      {/* 폭은 바깥 칸이 정한다(넓으면 240~320px, 좁은 바에서는 한 줄 전체). Input 의 래퍼 규칙과 섞지 않는다. */}
      <div data-slot="filter-bar-search" className="ds-filter-bar-search">
        <Input type="search" className="w-full" aria-label={searchLabel}
          placeholder={searchPlaceholder} value={query} onChange={event => setQuery(event.target.value)} />
      </div>
      {filterContent === undefined ? trigger : <Popover.Root open={filterOpen} onOpenChange={setFilterOpen}>
        <Popover.Trigger asChild>{trigger}</Popover.Trigger>
        <Popover.Portal>
          <Popover.Content data-slot="filter-bar-panel" className="ds-filter-bar-panel" aria-label="필터"
            align="start" side="bottom" sideOffset={4} collisionPadding={layerCollisionPadding}>
            {filterContent}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>}
      {viewChanged && onSaveView && <Button data-slot="filter-bar-save-view" onClick={onSaveView}>보기 저장</Button>}
    </div>
    <div ref={rowRef} data-slot="filter-bar-chips" className="ds-filter-bar-chips">
      {count === 0 ? <span data-slot="filter-bar-empty" className="ds-filter-bar-empty">적용된 필터 없음</span> : <>
        {/* 보이는 칩이 0개면 목록을 그리지 않는다 — 빈 목록도 flex 항목이라 간격 하나를 더 먹는다. */}
        {visible > 0 && <ul aria-label="적용된 필터" className="ds-filter-bar-list">{filters.slice(0, visible).map(item => chip(item))}</ul>}
        {hidden.length > 0 && <Popover.Root open={moreOpen} onOpenChange={setMoreOpen}>
          <Popover.Trigger asChild>
            <button ref={moreRef} type="button" data-slot="filter-bar-more" className="ds-filter-bar-more"
              aria-label={`숨은 필터 +${hidden.length}`}><span className="tabular">+{hidden.length}</span></button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content data-slot="filter-bar-more-content" className="ds-filter-bar-more-content"
              aria-labelledby={`${id}-more-title`} align="start" side="bottom" sideOffset={4} collisionPadding={layerCollisionPadding}
              onCloseAutoFocus={event => { if (keepFocus.current) { event.preventDefault(); keepFocus.current = false; } }}>
              <p id={`${id}-more-title`} data-slot="filter-bar-more-title" className="ds-filter-bar-more-title">숨은 필터 {hidden.length}개</p>
              <ul ref={moreListRef} className="ds-filter-bar-more-list">{hidden.map(item => chip(item))}</ul>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>}
        <Button variant="ghost" size="sm" data-slot="filter-bar-reset" aria-label="필터 초기화" onClick={clear}>초기화</Button>
      </>}
      {/* 폭 측정용 사본. 보이지 않고 포커스·낭독에서 빠진다(inert). 줄과 같은 글꼴·간격 규칙을 받는다. */}
      {count > 0 && <div ref={measureRef} data-slot="filter-bar-measure" className="ds-filter-bar-measure" aria-hidden="true" inert>
        <ul className="ds-filter-bar-list">{filters.map(item => chip(item, true))}</ul>
        <span data-measure="more" className="ds-filter-bar-more"><span className="tabular">+{count}</span></span>
        <Button variant="ghost" size="sm" data-measure="reset" tabIndex={-1}>초기화</Button>
      </div>}
    </div>
  </div>;
}
