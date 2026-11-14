import * as React from 'react';
import { flexRender, type Column, type RowData } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, ArrowUpDown, CircleAlert, Download } from 'lucide-react';
import { Button } from '../button';
import { Skeleton } from '../loading/skeleton';
import { cn } from '../../lib/cn';
import { useDataTable, type DataTableFeatures, type UseDataTableOptions } from './use-data-table';
import { SELECTION_COLUMN_ID } from './selection-column';
import { downloadCsv } from './export-csv';
import { shouldLoadMore } from './should-load-more';
import './data-table.css';

export interface DataTableProps<T extends RowData> extends UseDataTableOptions<T> {
  revisitedRowId?: string;
  onRowClick?: (row: T) => void;
  density?: 'compact' | 'default' | 'comfortable';
  state?: 'idle' | 'loading' | 'empty' | 'error';
  emptyMessage?: string;
  errorMessage?: string;
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
}

const INTERACTIVE = 'button, a, input, select, textarea, [role="button"], [role="checkbox"], [contenteditable="true"]';

export function DataTable<T extends RowData>({
  revisitedRowId, onRowClick, density = 'default', state = 'idle',
  emptyMessage = '표시할 데이터가 없습니다', errorMessage = '데이터를 불러오지 못했습니다',
  onRetry, exportFileName, exportValue, align, caption = '데이터 목록', className,
  virtualize = 100, hasMore, onLoadMore, loadingMore = false, ...options
}: DataTableProps<T>) {
  const table = useDataTable(options);
  const rows = table.getRowModel().rows;
  const columns = table.getVisibleLeafColumns();
  const headerGroups = table.getHeaderGroups();
  const colSpan = Math.max(columns.length, 1);
  const effectiveState = state === 'idle' && rows.length === 0 ? 'empty' : state;
  const ready = effectiveState === 'idle';
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const theadRef = React.useRef<HTMLTableSectionElement>(null);
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
  const allLoadedSelected = rows.length > 0 && selectedCount === rows.length;
  const partialSelectionNotice = partiallyLoaded && allLoadedSelected;

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

  function cellClass(column: Column<DataTableFeatures, T>) {
    const pinned = column.getIsPinned();
    return cn(
      'data-table-cell',
      column.id === SELECTION_COLUMN_ID && 'data-table-selection',
      columnAlign.get(column.id) === 'end' && 'data-table-numeric tabular text-right',
      columnAlign.get(column.id) === 'start' && 'text-left',
      columnAlign.get(column.id) === 'center' && 'text-center',
      pinned && 'data-table-pinned',
      pinned === 'start' && column.id === startColumns.at(-1)?.id && 'border-r border-line-strong',
      pinned === 'end' && column.id === endColumns[0]?.id && 'border-l border-line-strong',
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
    if (!container || !(cell instanceof HTMLElement) || cell.classList.contains('data-table-pinned')) return;
    const bounds = container.getBoundingClientRect();
    const target = cell.getBoundingClientRect();
    const left = bounds.left + startWidth + container.clientLeft;
    const right = bounds.left + container.clientWidth - endWidth;
    // 중앙의 포커스 대상이 고정 컬럼 아래에 숨지 않도록 고정 영역을 제외한 범위로 스크롤한다.
    if (target.left < left) container.scrollLeft -= left - target.left;
    else if (target.right > right) container.scrollLeft += Math.min(target.right - right, target.left - left);
  }

  return (
    <div data-slot="data-table" data-density={density} className={cn('min-w-0 max-w-full text-fg', className)}>
      {(exportFileName || partialSelectionNotice) && (
        <div data-slot="data-table-toolbar" className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <span role="status" className="text-[length:var(--text-body-sm)] text-fg-muted">
            {partialSelectionNotice
              ? `로드된 ${rows.length.toLocaleString('ko-KR')}건이 선택됨 · 전체 ${totalCount.toLocaleString('ko-KR')}건`
              : `${selectedCount}개 선택`}
          </span>
          {exportFileName && <Button variant="secondary" size="sm" leadingIcon={<Download aria-hidden="true" />}
            disabled={!ready || rows.length === 0} onClick={exportRows}>
            {selectedCount ? '선택한 행 내보내기' : partiallyLoaded ? `로드된 ${rows.length.toLocaleString('ko-KR')}건만 내보냅니다` : 'CSV 내보내기'}
          </Button>}
        </div>
      )}
      <div ref={scrollRef} data-slot="data-table-scroll" onFocusCapture={keepFocusVisible}
        tabIndex={-1} onScroll={requestLoadMore}
        onBlurCapture={(event) => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) focusedRow.current = null; }}
        className="relative max-w-full overflow-auto border border-line-strong"
        style={{ scrollPaddingLeft: startWidth, scrollPaddingRight: endWidth,
          maxHeight: isVirtual || onLoadMore ? 'var(--data-table-viewport-height, 480px)' : undefined }}>
        <table data-slot="data-table-table" aria-busy={effectiveState === 'loading'}
          aria-rowcount={totalCount}
          className="w-full table-auto border-separate border-spacing-0 bg-surface">
          <caption className="sr-only">{caption}</caption>
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
              <tr><td colSpan={colSpan} className="h-48 px-4 text-center text-fg-muted"><span role="status">{emptyMessage}</span></td></tr>
            ) : effectiveState === 'error' ? (
              <tr><td colSpan={colSpan} className="h-48 bg-danger-tint px-4 text-center text-danger-ink">
                <div className="flex flex-col items-center gap-3">
                  <p role="alert" className="flex items-center gap-2"><CircleAlert className="size-5 shrink-0" aria-hidden="true" />{errorMessage}</p>
                  {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>다시 시도</Button>}
                </div>
              </td></tr>
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
                    <div className={cn('data-table-value', cell.column.id === SELECTION_COLUMN_ID && 'flex items-center justify-center')}
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
        </table>
      </div>
    </div>
  );
}
