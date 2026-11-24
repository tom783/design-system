import * as React from 'react';
import { flexRender, type Column, type RowData } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, ArrowUpDown, Download } from 'lucide-react';
import { Button } from '../button';
import { EmptyState, ErrorState, type EmptyStateProps } from '../state';
import { Skeleton } from '../loading/skeleton';
import { cn } from '../../lib/cn';
import { useDataTableState, type DataTableFeatures, type UseDataTableOptions } from './use-data-table';
import { SELECTION_COLUMN_ID } from './selection-column';
import { downloadCsv } from './export-csv';
import { shouldLoadMore } from './should-load-more';

/**
 * 열 합계 행 하나 — 표 맨 아래 tfoot(DESIGN.md §4.3 · 규칙 표 T-1~T-12).
 * 수량·금액처럼 표의 열을 더한 값만 넣는다. 배송비·할인·결제 금액처럼 열이 아닌 값은 표 밖 DescriptionList 다.
 */
export interface DataTableSummaryRow {
  /** 범위를 함께 쓴다 — 페이지가 하나면 '합계', 이 페이지만 더했으면 '이 페이지 합계', 서버 전체면 '전체 합계 · 128건'. */
  label: string;
  /** 열 id → 합계 값(표시 그대로, 예: '121,300원'). 키가 없는 열은 비운다(합산하지 않는 열). 값이 null·undefined 면 '—'(구하지 못함). */
  values: Record<string, React.ReactNode>;
}

export interface DataTableProps<T extends RowData> extends UseDataTableOptions<T> {
  revisitedRowId?: string;
  onRowClick?: (row: T) => void;
  density?: 'compact' | 'default' | 'comfortable';
  state?: 'idle' | 'loading' | 'empty' | 'error';
  emptyMessage?: string;
  errorMessage?: string;
  emptyAction?: EmptyStateProps['action'];
  onRetry?: () => void;
  exportFileName?: string;
  /** 셀 표시와 원본 값을 분리한다. 금액은 쉼표 없는 문자열을 반환한다. */
  exportValue?: Record<string, (row: T) => string>;
  /** 컬럼별 정렬. 지정하지 않은 컬럼은 데이터로 추론한다(숫자면 'end'). */
  align?: Record<string, 'start' | 'end' | 'center'>;
  /** 생략 시에도 caption을 제공하지만, 실제 업무 대상과 범위를 설명하는 문장을 권장한다. */
  caption?: string;
  className?: string;
  /** 행 수가 임계값을 넘으면 가상화한다. true는 항상 켬, false는 끔. 기본 100. */
  virtualize?: boolean | number;
  /** 더 불러올 데이터가 남았는지 명시한다. */
  hasMore?: boolean;
  /** 같은 로드 길이에서는 한 번만 호출한다. */
  onLoadMore?: () => void;
  /** 전체 로딩과 달리 기존 행 아래에 로딩 표시를 덧붙인다. */
  loadingMore?: boolean;
  /** 열 합계 행(tfoot, 최대 2행). 라벨은 첫 데이터 열에 선다. */
  summary?: DataTableSummaryRow[];
}

const INTERACTIVE = 'button, a, input, select, textarea, [role="button"], [role="checkbox"], [contenteditable="true"]';

export function DataTable<T extends RowData>({
  revisitedRowId, onRowClick, density = 'default', state = 'idle',
  emptyMessage = '표시할 데이터가 없습니다', errorMessage = '데이터를 불러오지 못했습니다',
  onRetry, emptyAction, exportFileName, exportValue, align, caption = '데이터 목록', className,
  virtualize = 100, hasMore, onLoadMore, loadingMore = false, summary, ...options
}: DataTableProps<T>) {
  const table = useDataTableState(options, state);
  const rows = table.getRowModel().rows;
  const columns = table.getVisibleLeafColumns();
  const headerGroups = table.getHeaderGroups();
  const colSpan = Math.max(columns.length, 1);
  const effectiveState = state === 'idle' && rows.length === 0 ? 'empty' : state;
  const ready = effectiveState === 'idle';
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const theadRef = React.useRef<HTMLTableSectionElement>(null);
  // 넘치는 스크롤 영역의 이름 — 표 caption 을 그대로 쓴다(DESIGN.md §4.5).
  const captionId = React.useId();
  // 첫 레이아웃 이전의 값도 DESIGN.md 4절의 고정 밀도와 일치시킨다. 이후 CSS 토큰을 읽는다.
  const [rowHeight, setRowHeight] = React.useState({ compact: 36, default: 40, comfortable: 48 }[density]);
  const [headerHeight, setHeaderHeight] = React.useState(rowHeight);
  const isVirtual = ready && (virtualize === true || (typeof virtualize === 'number' && rows.length > virtualize));
  // 스크롤마다 키 함수를 새로 만들어 1만 행의 위치 캐시를 재계산하지 않는다.
  // 밀도가 바뀌면 고정 높이도 달라지므로 같은 행 목록이라도 캐시를 갱신한다.
  const getVirtualRowKey = React.useCallback((index: number) => rows[index]!.id, [rows, rowHeight]);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
    getItemKey: getVirtualRowKey,
    enabled: isVirtual,
    // 추가 로드로 임계값을 넘는 순간에도 기존 스크롤 위치에서 가상화를 시작한다.
    initialOffset: () => scrollRef.current?.scrollTop ?? 0,
    // tbody의 시작점은 스크롤 원점에서 헤더 높이만큼 떨어져 있다.
    scrollMargin: headerHeight,
  });
  const items = virtualizer.getVirtualItems();
  const lastVirtualIndex = items.at(-1)?.index ?? -1;
  const padTop = items.length ? items[0]!.start - headerHeight : 0;
  // 관찰자가 첫 범위를 계산하기 전에도 전체 높이를 보존해야 스크롤이 맨 위로 강제 보정되지 않는다.
  const padBottom = isVirtual ? virtualizer.getTotalSize() - ((items.at(-1)?.end ?? headerHeight) - headerHeight) : 0;
  const renderedRows = isVirtual ? items.map((item) => ({ row: rows[item.index]!, index: item.index }))
    : rows.map((row, index) => ({ row, index }));
  const lastRequestedLength = React.useRef<number | null>(null);
  const focusedRow = React.useRef<{ id: string; element: HTMLTableRowElement } | null>(null);
  const selectedCount = rows.filter((row) => row.getIsSelected()).length;
  const totalCount = options.totalCount ?? options.data.length;
  const partiallyLoaded = totalCount > rows.length;
  const selectable = options.selectionMode != null && options.selectionMode !== 'none';
  const allLoadedSelected = rows.length > 0 && selectedCount === rows.length;
  const partialSelectionNotice = partiallyLoaded && allLoadedSelected;
  // 합계 행(T-2·T-9): 최대 2행. 행이 있는 표와 로딩 중에만 보인다 — 빈 표·오류에는 더할 행이 없다.
  const summaryRows = summary?.slice(0, 2) ?? [];
  const showSummary = summaryRows.length > 0 && (ready || effectiveState === 'loading');
  // 라벨은 첫 데이터 열(T-3). 선택 열은 빈 칸으로 둔다.
  const summaryLabelId = columns.find((column) => column.id !== SELECTION_COLUMN_ID)?.id;

  const requestLoadMore = React.useCallback(() => {
    const container = scrollRef.current;
    if (!onLoadMore || !container || (effectiveState !== 'idle' && effectiveState !== 'empty')) return;
    const nearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 120;
    if (shouldLoadMore({
      lastIndex: isVirtual ? lastVirtualIndex : nearBottom ? rows.length - 1 : -Infinity,
      rowCount: rows.length, hasMore, loadingMore, lastRequestedLength: lastRequestedLength.current,
    })) {
      // 부모의 loadingMore 갱신보다 먼저 기록해 같은 프레임의 스크롤도 중복시키지 않는다.
      lastRequestedLength.current = rows.length;
      onLoadMore();
    }
  }, [onLoadMore, effectiveState, isVirtual, lastVirtualIndex, rows.length, hasMore, loadingMore]);

  React.useEffect(() => { requestLoadMore(); }, [requestLoadMore]);

  React.useLayoutEffect(() => {
    const focused = focusedRow.current;
    if (!focused || focused.element.isConnected) return;
    // 행 안의 체크박스도 포함해 사라진 포커스를 다음 페인트 전에 스크롤 영역으로 돌린다.
    if (document.activeElement === document.body) scrollRef.current?.focus({ preventScroll: true });
    focusedRow.current = null;
  });
  const headerRefs = React.useRef(new Map<string, HTMLTableCellElement>());
  const [widths, setWidths] = React.useState<Record<string, number>>({});
  const mouse = React.useRef<{ x: number; y: number; dragged: boolean } | null>(null);
  const headerKey = columns.map((column) => column.id).join('\u0000');

  React.useLayoutEffect(() => {
    const measure = () => {
      if (scrollRef.current) {
        const height = parseFloat(getComputedStyle(scrollRef.current).getPropertyValue(`--row-h-${density}`));
        if (Number.isFinite(height) && height > 0) setRowHeight(height);
      }
      if (theadRef.current) setHeaderHeight(theadRef.current.getBoundingClientRect().height);
      const next: Record<string, number> = {};
      headerRefs.current.forEach((element, id) => { next[id] = element.getBoundingClientRect().width; });
      setWidths((previous) => Object.keys(next).length === Object.keys(previous).length &&
        Object.keys(next).every((id) => next[id] === previous[id]) ? previous : next);
    };
    measure();
    // 자동 레이아웃의 실측 너비를 써야 값·서체·밀도가 바뀌어도 고정 영역이 겹치지 않는다.
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    headerRefs.current.forEach((element) => observer?.observe(element));
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [headerKey, density]);

  // 넘침 — 고정 경계선은 표가 실제로 가로 스크롤될 때만 보인다(data-table.css · DESIGN.md §4.3 TD-2 A).
  // 가로든 세로든 넘치면 스크롤 영역이 키보드로 닿는 이름 있는 영역이 된다(DESIGN.md §4.5).
  // 스크롤 영역(폭·높이)과 표(내용 크기)를 함께 관찰한다. 선은 색만, 영역은 속성만 바뀌어 크기가 그대로라 관찰이 되먹임되지 않는다.
  const [overflow, setOverflow] = React.useState({ x: false, y: false });
  const overflowX = overflow.x;
  const scrollable = overflow.x || overflow.y;
  React.useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    // 1px 여유: 소수점 열 폭이 반올림돼 scrollWidth 가 clientWidth 보다 1 큰 것은 넘침이 아니다(Screens/OrderDetail 실측과 같은 기준).
    const measure = () => {
      const x = container.scrollWidth - container.clientWidth > 1;
      const y = container.scrollHeight - container.clientHeight > 1;
      setOverflow((previous) => previous.x === x && previous.y === y ? previous : { x, y });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    if (container.firstElementChild) observer.observe(container.firstElementChild);
    return () => observer.disconnect();
  }, []);

  const startColumns = table.getPinnedVisibleLeafColumns('start');
  const endColumns = table.getPinnedVisibleLeafColumns('end');
  const widthOf = (column: Column<DataTableFeatures, T>) => widths[column.id] ?? 0;
  const startWidth = React.useMemo(() => startColumns.reduce((sum, column) => sum + (widths[column.id] ?? 0), 0), [startColumns, widths]);
  const endWidth = React.useMemo(() => endColumns.reduce((sum, column) => sum + (widths[column.id] ?? 0), 0), [endColumns, widths]);
  const coreRows = table.getCoreRowModel().rows;
  const columnAlign = React.useMemo(() => {
    // 20행으로도 값을 찾지 못하면 작성자의 명시적 정렬을 사용하도록 추론 비용을 제한한다.
    const sample = coreRows.slice(0, 20);
    return new Map(headerKey.split('\u0000').map((id) => {
      if (id === SELECTION_COLUMN_ID) return [id, 'center'] as const;
      if (align?.[id]) return [id, align[id]] as const;
      let value: unknown;
      sample.find((row) => {
        value = row.getValue(id);
        return value !== null && value !== undefined;
      });
      return [id, typeof value === 'number' ? 'end' : 'start'] as const;
    }));
  }, [headerKey, align, coreRows]);

  function cellStyle(column: Column<DataTableFeatures, T>): React.CSSProperties {
    const pinned = column.getIsPinned();
    if (!pinned) return {};
    const region = pinned === 'start' ? startColumns : endColumns;
    const index = region.findIndex((item) => item.id === column.id);
    const preceding = pinned === 'start' ? region.slice(0, index) : region.slice(index + 1);
    return {
      position: 'sticky',
      [pinned === 'start' ? 'left' : 'right']: preceding.reduce((sum, item) => sum + widthOf(item), 0),
    };
  }

  // label: 합계 행의 라벨 칸 — 열이 숫자라도 라벨은 시작 정렬이다.
  function cellClass(column: Column<DataTableFeatures, T>, label = false) {
    const pinned = column.getIsPinned();
    const alignment = label ? 'start' : columnAlign.get(column.id);
    return cn(
      'ds-data-table-cell',
      column.id === SELECTION_COLUMN_ID && 'ds-data-table-selection',
      alignment === 'end' && 'ds-data-table-numeric tabular text-right',
      alignment === 'start' && 'text-left',
      alignment === 'center' && 'text-center',
      pinned && 'ds-data-table-pinned',
      // 고정 경계선 칸. 선 굵기는 늘 두고 색만 넘침에 따라 바꾼다(data-table.css) — 굵기를 뺐다 넣으면 열 폭이 1px 흔들린다.
      pinned === 'start' && column.id === startColumns.at(-1)?.id && 'ds-data-table-pin-edge-start border-r border-line-strong',
      pinned === 'end' && column.id === endColumns[0]?.id && 'ds-data-table-pin-edge-end border-l border-line-strong',
    );
  }

  function exportRows() {
    if (!exportFileName) return;
    // 액션·선택 컬럼은 제외하고 accessor 원본을 읽어 렌더된 금액의 쉼표가 CSV에 섞이지 않게 한다.
    const exportColumns = columns.filter((column) => column.id !== SELECTION_COLUMN_ID &&
      (column.accessorFn || exportValue?.[column.id]));
    const selected = rows.filter((row) => row.getIsSelected());
    const exportData = selected.length ? selected : rows;
    downloadCsv(exportFileName, [
      exportColumns.map((column) => typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id),
      ...exportData.map((row) => exportColumns.map((column) =>
        exportValue?.[column.id]?.(row.original) ?? String(row.getValue(column.id) ?? ''),
      )),
    ]);
  }

  function keepFocusVisible(event: React.FocusEvent<HTMLDivElement>) {
    const row = event.target.closest<HTMLTableRowElement>('[data-slot="data-table-row"]');
    focusedRow.current = row?.dataset.rowId ? { id: row.dataset.rowId, element: row } : null;
    const container = scrollRef.current;
    const cell = event.target.closest('td, th');
    if (!container || !(cell instanceof HTMLElement) || cell.classList.contains('ds-data-table-pinned')) return;
    const bounds = container.getBoundingClientRect();
    const target = cell.getBoundingClientRect();
    const left = bounds.left + startWidth + container.clientLeft;
    const right = bounds.left + container.clientWidth - endWidth;
    // 중앙의 포커스 대상이 고정 컬럼 아래에 숨지 않도록 고정 영역을 제외한 범위로 스크롤한다.
    if (target.left < left) container.scrollLeft -= left - target.left;
    else if (target.right > right) container.scrollLeft += Math.min(target.right - right, target.left - left);
  }

  return (
    <div data-slot="data-table" data-density={density} data-summary={showSummary || undefined} data-overflow-x={overflowX || undefined} className={cn('min-w-0 max-w-full text-fg', className)}>
      {(exportFileName || partialSelectionNotice) && (
        <div data-slot="data-table-toolbar" className="flex flex-wrap items-center justify-between gap-3 pb-3">
          {/* 선택 수('N건 선택')는 그리지 않는다 — 한 곳, 일괄 작업 바(BulkActionBar)가 맡는다(§4.2). 표 도구 줄에도
              그리면 바와 두 번 보였고, 선택이 없을 때도 '0건 선택'이 남았다(도그푸딩 6 D1). 여기서는 범위 안내만 한다:
              로드된 행을 모두 골랐는데 전체가 더 많을 때. live region 은 늘 두고 글자만 바꾼다(새로 끼운 영역은 안 읽힐 수 있다). */}
          {selectable && <span role="status" className="text-[length:var(--text-body-sm)] text-fg-muted">
            {partialSelectionNotice
              // 행은 '건'으로 센다 — Pagination(1–20 / 1,284건)·일괄 작업 바와 같은 단위.
              ? `로드된 ${rows.length.toLocaleString('ko-KR')}건이 선택됨 · 전체 ${totalCount.toLocaleString('ko-KR')}건`
              : ''}
          </span>}
          {exportFileName && partiallyLoaded && !selectedCount && <span role="status" className="text-[length:var(--text-body-sm)] text-fg-muted">
            {`전체 ${totalCount.toLocaleString('ko-KR')}건 중 ${rows.length.toLocaleString('ko-KR')}건`}
          </span>}
          {exportFileName && <Button variant="secondary" size="sm" className="ml-auto" leadingIcon={<Download aria-hidden="true" />}
            disabled={!ready || rows.length === 0} onClick={exportRows}>
            {selectedCount ? '선택한 행 내보내기' : partiallyLoaded ? `${rows.length.toLocaleString('ko-KR')}건 내보내기` : 'CSV 내보내기'}
          </Button>}
        </div>
      )}
      <div ref={scrollRef} data-slot="data-table-scroll" onFocusCapture={keepFocusVisible}
        // 넘칠 때만 Tab 정지점이 되는 이름 있는 영역이다(DESIGN.md §4.5 · axe scrollable-region-focusable). 정렬 버튼·링크가 없는
        // 표는 넘쳐도 키보드로 닿을 곳이 없어 가로로 밀 수 없었다. 포커스되면 화살표·PageUp/Down·Home/End 는 브라우저 기본 스크롤이다.
        // 넘치지 않으면 -1 — Tab 순서에 끼지 않고, 포커스된 행이 사라질 때 포커스를 받는 자리(위 useLayoutEffect)로만 남는다.
        // 링은 전역 :focus-visible(2px border-focus, 바깥 2px) 그대로다.
        tabIndex={scrollable ? 0 : -1} role={scrollable ? 'region' : undefined} aria-labelledby={scrollable ? captionId : undefined}
        onScroll={requestLoadMore}
        onBlurCapture={(event) => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) focusedRow.current = null; }}
        // isolate: 머리·합계(z 20)·고정 열 층을 표 안에 가둔다. 그러지 않으면 표 머리가 표 밖 sticky 줄(FormActionBar z 5)
        // 위로 올라온다 — 폼 안 표가 줄 밑으로 지나갈 때 머리만 줄을 뚫고 보였다.
        className="relative isolate max-w-full overflow-auto border border-line-strong"
        style={{ scrollPaddingLeft: startWidth, scrollPaddingRight: endWidth,
          maxHeight: isVirtual || onLoadMore ? 'var(--data-table-viewport-height, 480px)' : undefined }}>
        <table data-slot="data-table-table" aria-busy={effectiveState === 'loading'}
          aria-rowcount={totalCount}
          className="w-full table-auto border-separate border-spacing-0 bg-surface">
          <caption id={captionId} className="sr-only">{caption}</caption>
          <thead ref={theadRef} data-slot="data-table-header" className="sticky top-0 z-20">
            {headerGroups.map((group) => (
              <tr key={group.id} aria-rowindex={1}>
                {group.headers.map((header) => {
                  const column = header.column;
                  const sorted = column.getIsSorted();
                  const SortIcon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown;
                  return (
                    <th key={header.id} scope="col" colSpan={header.colSpan}
                      ref={(element) => { if (element) headerRefs.current.set(column.id, element); else headerRefs.current.delete(column.id); }}
                      data-slot="data-table-head" data-column-id={column.id}
                      className={cn(cellClass(column), 'border-b border-line-strong bg-canvas font-semibold text-fg-muted')}
                      style={cellStyle(column)}
                      onClick={column.id === SELECTION_COLUMN_ID ? (event) => {
                        event.stopPropagation();
                        if (ready && options.selectionMode === 'multi' && !(event.target instanceof Element && event.target.closest('input'))) table.toggleAllRowsSelected();
                      } : undefined}
                      aria-sort={column.getCanSort() ? sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none' : undefined}>
                      {header.isPlaceholder ? null : column.getCanSort() ? (
                        <button type="button" data-slot="data-table-sort" className={cn('flex w-full min-w-0 cursor-pointer items-center gap-2 py-1', columnAlign.get(column.id) === 'center' && 'justify-center')}
                          onClick={column.getToggleSortingHandler()}>
                          <span className={cn('truncate', columnAlign.get(column.id) === 'end' && 'ml-auto')}>
                            {flexRender(column.columnDef.header, header.getContext())}
                          </span>
                          <SortIcon aria-hidden="true" className={cn('size-4 shrink-0', !sorted && 'opacity-35')} />
                        </button>
                      ) : column.id === SELECTION_COLUMN_ID && !ready ? <span className="sr-only">선택</span>
                        : flexRender(column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody data-slot="data-table-body">
            {effectiveState === 'loading' ? Array.from({ length: 5 }, (_, index) => (
              <tr key={index} data-slot="data-table-skeleton-row">
                <td colSpan={colSpan} className="border-b border-line p-0">
                  {index === 0 && <span className="sr-only" role="status">데이터를 불러오는 중입니다</span>}
                  <div className="flex" aria-hidden="true">
                    {columns.map((column, cellIndex) => (
                      <div key={column.id} className={cellClass(column)} style={{ width: widths[column.id], flex: widths[column.id] ? 'none' : 1 }}>
                        <Skeleton variant="text" textStyle="body-sm"
                          width={`${60 + ((index + cellIndex) % 3) * 10}%`} />
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            )) : effectiveState === 'empty' ? (
              <tr><td colSpan={colSpan} className="p-0"><EmptyState title={emptyMessage} action={emptyAction} /></td></tr>
            ) : effectiveState === 'error' ? (
              <tr><td colSpan={colSpan} className="p-0"><ErrorState title={errorMessage} onRetry={onRetry} /></td></tr>
            ) : <>
              {padTop > 0 && <tr data-slot="data-table-spacer" aria-hidden="true" style={{ height: padTop }}><td colSpan={colSpan} /></tr>}
              {renderedRows.map(({ row, index }) => (
              <tr key={row.id} data-slot="data-table-row" data-row-id={row.id} data-revisited={row.id === revisitedRowId || undefined} data-selected={row.getIsSelected() || undefined}
                aria-rowindex={index + 2}
                aria-selected={options.selectionMode && options.selectionMode !== 'none' ? row.getIsSelected() : undefined}
                tabIndex={onRowClick ? 0 : undefined} className={cn(onRowClick && 'cursor-pointer')}
                onMouseDown={(event) => { mouse.current = { x: event.clientX, y: event.clientY, dragged: false }; }}
                onMouseMove={(event) => {
                  if (mouse.current && event.buttons === 1 && Math.hypot(event.clientX - mouse.current.x, event.clientY - mouse.current.y) >= 4) mouse.current.dragged = true;
                }}
                onMouseUp={(event) => {
                  if (mouse.current && Math.hypot(event.clientX - mouse.current.x, event.clientY - mouse.current.y) >= 4) mouse.current.dragged = true;
                }}
                onClick={(event) => {
                  const dragged = mouse.current?.dragged;
                  mouse.current = null;
                  if (!dragged && event.button === 0 && !(event.target instanceof Element && event.target.closest(INTERACTIVE))) onRowClick?.(row.original);
                }}
                onKeyDown={(event) => {
                  if (event.target === event.currentTarget && onRowClick && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    if (!event.repeat) onRowClick(row.original);
                  }
                }}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} data-slot="data-table-cell" data-column-id={cell.column.id}
                    className={cn(cellClass(cell.column), 'border-b border-line')}
                    style={cellStyle(cell.column)}
                    onClick={cell.column.id === SELECTION_COLUMN_ID ? (event) => {
                      event.stopPropagation();
                      if (!(event.target instanceof Element && event.target.closest('input'))) row.toggleSelected();
                    } : undefined}>
                    <div className={cn('ds-data-table-value', cell.column.id === SELECTION_COLUMN_ID && 'flex items-center justify-center')}
                      title={cell.column.accessorFn ? String(cell.getValue() ?? '') : undefined}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  </td>
                ))}
              </tr>
              ))}
              {padBottom > 0 && <tr data-slot="data-table-spacer" aria-hidden="true" style={{ height: padBottom }}><td colSpan={colSpan} /></tr>}
            </>}
            {(ready || effectiveState === 'empty') && loadingMore && (
              <tr data-slot="data-table-loading-more"><td colSpan={colSpan} className="px-4 py-3">
                <div role="status" className="flex items-center gap-3 text-fg-muted">
                  <Skeleton variant="text" textStyle="body-sm" width="auto" className="min-w-16" />
                  불러오는 중
                </div>
              </td></tr>
            )}
            {(ready || effectiveState === 'empty') && !loadingMore && hasMore === false && (
              <tr data-slot="data-table-end"><td colSpan={colSpan} className="px-4 py-3 text-center text-fg-muted">
                <span role="status">전체 {totalCount.toLocaleString('ko-KR')}건을 모두 불러왔습니다</span>
              </td></tr>
            )}
          </tbody>
          {showSummary && (
            // 표 자체 세로 스크롤(높이 제한·가상화)에서는 바닥에 붙는다(T-8). 페이지 흐름 표는 스크롤 영역이 내용 높이라
            // 제자리다. 층은 머리(z 20)와 같다. 고정 열 칸은 본문과 같은 sticky 오프셋·같은 바탕으로 붙는다(TD-2 A).
            <tfoot data-slot="data-table-summary" className="sticky bottom-0 z-20">
              {summaryRows.map((row, rowIndex) => (
                <tr key={rowIndex} data-slot="data-table-summary-row" aria-rowindex={totalCount + 2 + rowIndex}>
                  {columns.map((column) => {
                    const label = column.id === summaryLabelId;
                    const summed = Object.prototype.hasOwnProperty.call(row.values, column.id);
                    const value = row.values[column.id];
                    const alignment = columnAlign.get(column.id);
                    const content = label ? row.label
                      : !summed ? null
                      // 숫자 폭 스켈레톤 — 값을 아직 모르면 금액 한 자리 폭(약 9자)을 쓴다.
                      : effectiveState === 'loading' ? <Skeleton variant="text" textStyle="body-sm"
                        width={`${Math.min(12, Math.max(3, typeof value === 'string' || typeof value === 'number' ? String(value).length : 9))}ch`}
                        className={cn(alignment === 'end' && 'ml-auto', alignment === 'center' && 'mx-auto')} />
                      // 합산 열인데 값을 못 구함(권한·실패) — 설명 목록 빈 값과 같은 '—', 화면 낭독기는 "없음"(T-6).
                      : value === null || value === undefined ? <><span aria-hidden="true">—</span><span className="sr-only">없음</span></>
                      : value;
                    const Cell = label ? 'th' : 'td';
                    return (
                      <Cell key={column.id} scope={label ? 'row' : undefined} data-slot="data-table-summary-cell" data-column-id={column.id}
                        className={cn(cellClass(column, label), 'ds-data-table-summary-cell')} style={cellStyle(column)}>
                        {content !== null && <div className="ds-data-table-value">{content}</div>}
                      </Cell>
                    );
                  })}
                </tr>
              ))}
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
