import * as React from 'react';
import {
  useTable, tableFeatures, rowSelectionFeature, rowSortingFeature,
  columnPinningFeature, columnVisibilityFeature, createSortedRowModel,
  functionalUpdate, createColumnHelper,
  type ColumnDef, type ColumnHelper, type RowData, type RowSelectionState, type SortingState,
} from '@tanstack/react-table';
import { createSelectionColumn, SELECTION_COLUMN_ID } from './selection-column';

// v9에서는 row model도 feature 슬롯에 등록해야 정렬 파이프라인에 연결된다.
export const dataTableFeatures = tableFeatures({
  rowSelectionFeature,
  rowSortingFeature,
  columnPinningFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
});

export type DataTableFeatures = typeof dataTableFeatures;
// 이종 컬럼의 저장 경계는 unknown이다. ReturnType<helper.columns>의 any를
// 문맥으로 주면 accessor의 TValue까지 any로 추론되어 셀 타입이 사라진다.
export type DataTableColumns<T extends RowData> = Array<ColumnDef<DataTableFeatures, T, unknown>>;

/** DataTable 전용 컬럼 헬퍼. features는 이미 적용돼 있다. */
export function createDataTableColumnHelper<T extends RowData>(): ColumnHelper<DataTableFeatures, T> {
  return createColumnHelper<DataTableFeatures, T>();
}
export type SelectionMode = 'none' | 'single' | 'multi';

export interface UseDataTableOptions<T extends RowData> {
  data: T[];
  /** 서버 전체 건수. 생략하면 로드된 data.length를 전체로 간주한다. */
  totalCount?: number;
  columns: DataTableColumns<T>;
  getRowId: (row: T) => string;
  selectionMode?: SelectionMode;
  selectedIds?: string[];
  /** 비제어 초기값. selectedIds를 주지 않을 때 첫 렌더에만 읽는다. 기본 []. */
  defaultSelectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  pinnedStart?: string[];
  pinnedEnd?: string[];
}

const NO_PINS: string[] = [];

export function useDataTable<T extends RowData>(options: UseDataTableOptions<T>) {
  return useDataTableState(options, 'idle');
}

/** DataTable의 기존 state를 전달하는 비공개 경로. 공개 옵션에는 상태 prop을 추가하지 않는다. */
export function useDataTableState<T extends RowData>({
  data, totalCount, columns, getRowId, selectionMode = 'none', selectedIds, defaultSelectedIds, onSelectedIdsChange,
  pinnedStart = NO_PINS, pinnedEnd = NO_PINS,
}: UseDataTableOptions<T>, state: 'idle' | 'loading' | 'empty' | 'error') {
  const [internalIds, setInternalIds] = React.useState<string[]>(() => defaultSelectedIds ?? []);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const ids = selectedIds ?? internalIds;
  const currentRowIds = React.useMemo(() => new Set(data.map(getRowId)), [data, getRowId]);
  // 재조회 중 빈 data는 확정된 필터 결과가 아니다. empty를 포함한 정상 결과에서만 줄인다.
  const retainedIds = React.useMemo(() => state === 'loading' || state === 'error'
    ? ids : ids.filter(id => currentRowIds.has(id)), [ids, currentRowIds, state]);
  const lastPruned = React.useRef<{ ids: string[]; retained: string[] } | null>(null);
  React.useLayoutEffect(() => {
    if (retainedIds.length === ids.length) { lastPruned.current = null; return; }
    const previous = lastPruned.current;
    // 제어 부모가 같은 선택을 다시 보내거나 StrictMode가 effect를 재실행해도 같은 요청은 한 번만 알린다.
    if (previous && previous.ids.length === ids.length && previous.ids.every((id, i) => id === ids[i]) &&
      previous.retained.length === retainedIds.length && previous.retained.every((id, i) => id === retainedIds[i])) return;
    lastPruned.current = { ids, retained: retainedIds };
    if (selectedIds === undefined) setInternalIds(retainedIds);
    onSelectedIdsChange?.(retainedIds);
  }, [ids, retainedIds, selectedIds, onSelectedIdsChange]);
  const rowSelection = React.useMemo(() => {
    const selection: RowSelectionState = {};
    const effectiveIds = selectionMode === 'none' ? [] : selectionMode === 'single' ? retainedIds.slice(0, 1) : retainedIds;
    for (const id of effectiveIds) selection[id] = true;
    return selection;
  }, [retainedIds, selectionMode]);

  const selectionLabel = totalCount !== undefined && totalCount > data.length
    ? `로드된 ${data.length.toLocaleString('ko-KR')}건 선택` : '전체 선택';
  const tableColumns = React.useMemo(() => selectionMode === 'none'
    ? columns
    : [createSelectionColumn<T>(selectionMode, selectionLabel), ...columns], [columns, selectionMode, selectionLabel]);

  const columnPinning = React.useMemo(() => {
    const start = [...new Set([
      ...(selectionMode === 'none' ? [] : [SELECTION_COLUMN_ID]),
      ...pinnedStart.filter((id) => id !== SELECTION_COLUMN_ID),
    ])];
    // 중복 지정은 start를 우선해 같은 컬럼이 양쪽에 나타나는 것을 막는다.
    const end = [...new Set(pinnedEnd)].filter((id) => id !== SELECTION_COLUMN_ID && !start.includes(id));
    return { start, end };
  }, [pinnedStart, pinnedEnd, selectionMode]);

  return useTable({
    features: dataTableFeatures,
    data,
    columns: tableColumns,
    getRowId,
    state: { rowSelection, sorting, columnPinning },
    onSortingChange: setSorting,
    enableRowSelection: selectionMode !== 'none',
    enableMultiRowSelection: selectionMode === 'multi',
    enableRowRangeSelection: false,
    onRowSelectionChange: (updater) => {
      const next = functionalUpdate(updater, rowSelection);
      const nextIds = selectionMode === 'none' ? [] : Object.keys(next).filter((id) => next[id]);
      const normalizedIds = selectionMode === 'single' ? nextIds.slice(-1) : nextIds;
      if (selectedIds === undefined) setInternalIds(normalizedIds);
      onSelectedIdsChange?.(normalizedIds);
    },
  });
}
