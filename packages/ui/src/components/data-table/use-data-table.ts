import * as React from 'react';
import {
  useTable, tableFeatures, rowSelectionFeature, rowSortingFeature,
  columnPinningFeature, columnVisibilityFeature, createSortedRowModel,
  functionalUpdate,
  type ColumnHelper, type RowData, type RowSelectionState, type SortingState,
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
// helper.columns의 반환 타입을 그대로 사용해 서로 다른 셀 값 타입을 보존한다.
export type DataTableColumns<T extends RowData> = ReturnType<ColumnHelper<DataTableFeatures, T>['columns']>;
export type SelectionMode = 'none' | 'single' | 'multi';

export interface UseDataTableOptions<T extends RowData> {
  data: T[];
  columns: DataTableColumns<T>;
  getRowId: (row: T) => string;
  selectionMode?: SelectionMode;
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  pinnedStart?: string[];
  pinnedEnd?: string[];
}

const NO_PINS: string[] = [];

export function useDataTable<T extends RowData>({
  data, columns, getRowId, selectionMode = 'none', selectedIds, onSelectedIdsChange,
  pinnedStart = NO_PINS, pinnedEnd = NO_PINS,
}: UseDataTableOptions<T>) {
  const [internalIds, setInternalIds] = React.useState<string[]>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const ids = selectedIds ?? internalIds;
  const rowSelection = React.useMemo(() => {
    const selection: RowSelectionState = {};
    const effectiveIds = selectionMode === 'none' ? [] : selectionMode === 'single' ? ids.slice(0, 1) : ids;
    for (const id of effectiveIds) selection[id] = true;
    return selection;
  }, [ids, selectionMode]);

  const tableColumns = React.useMemo(() => selectionMode === 'none'
    ? columns
    : [createSelectionColumn<T>(selectionMode), ...columns], [columns, selectionMode]);

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
