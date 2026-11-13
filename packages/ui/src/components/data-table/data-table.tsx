import * as React from 'react';
import { flexRender, type Column, type RowData } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, CircleAlert, Download } from 'lucide-react';
import { Button } from '../button';
import { cn } from '../../lib/cn';
import { useDataTable, type DataTableFeatures, type UseDataTableOptions } from './use-data-table';
import { SELECTION_COLUMN_ID } from './selection-column';
import { downloadCsv } from './export-csv';
import './data-table.css';

export interface DataTableProps<T extends RowData> extends UseDataTableOptions<T> {
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
}

const INTERACTIVE = 'button, a, input, select, textarea, [role="button"], [role="checkbox"], [contenteditable="true"]';

export function DataTable<T extends RowData>({
  onRowClick, density = 'default', state = 'idle',
  emptyMessage = '표시할 데이터가 없습니다', errorMessage = '데이터를 불러오지 못했습니다',
  onRetry, exportFileName, exportValue, align, caption = '데이터 목록', className, ...options
}: DataTableProps<T>) {
  const table = useDataTable(options);
  const rows = table.getRowModel().rows;
  const columns = table.getVisibleLeafColumns();
  const headerGroups = table.getHeaderGroups();
  const colSpan = Math.max(columns.length, 1);
  const effectiveState = state === 'idle' && rows.length === 0 ? 'empty' : state;
  const ready = effectiveState === 'idle';
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const headerRefs = React.useRef(new Map<string, HTMLTableCellElement>());
  const [widths, setWidths] = React.useState<Record<string, number>>({});
  const mouse = React.useRef<{ x: number; y: number; dragged: boolean } | null>(null);
  const headerKey = columns.map((column) => column.id).join('\u0000');

  React.useLayoutEffect(() => {
    const measure = () => {
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
      {exportFileName && (
        <div data-slot="data-table-toolbar" className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <span role="status" className="text-[length:var(--text-body-sm)] text-fg-muted">
            {rows.filter((row) => row.getIsSelected()).length}개 선택
          </span>
          <Button variant="secondary" size="sm" leadingIcon={<Download aria-hidden="true" />}
            disabled={!ready || rows.length === 0} onClick={exportRows}>
            {rows.some((row) => row.getIsSelected()) ? '선택한 행 내보내기' : 'CSV 내보내기'}
          </Button>
        </div>
      )}
      <div ref={scrollRef} data-slot="data-table-scroll" onFocusCapture={keepFocusVisible}
        className="relative max-w-full overflow-auto border border-line-strong"
        style={{ scrollPaddingLeft: startWidth, scrollPaddingRight: endWidth }}>
        <table data-slot="data-table-table" aria-busy={effectiveState === 'loading'}
          className="w-full table-auto border-separate border-spacing-0 bg-surface">
          <caption className="sr-only">{caption}</caption>
          <thead data-slot="data-table-header" className="sticky top-0 z-20">
            {headerGroups.map((group) => (
              <tr key={group.id}>
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
                        <div data-slot="data-table-skeleton" className="rounded-[var(--radius-sm)] bg-sunken"
                          style={{ width: `${60 + ((index + cellIndex) % 3) * 10}%` }} />
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
            ) : rows.map((row) => (
              <tr key={row.id} data-slot="data-table-row" data-selected={row.getIsSelected() || undefined}
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
