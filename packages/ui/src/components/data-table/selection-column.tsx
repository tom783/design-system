import { createColumnHelper, type RowData } from '@tanstack/react-table';
import { Checkbox } from '../checkbox';
import type { DataTableFeatures } from './use-data-table';

/** 선택 컬럼 전용 예약 id. 내보내기에서는 제외한다. */
export const SELECTION_COLUMN_ID = '__selection';

export function createSelectionColumn<T extends RowData>(mode: 'single' | 'multi') {
  const helper = createColumnHelper<DataTableFeatures, T>();
  return helper.display({
    id: SELECTION_COLUMN_ID,
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => mode === 'multi' ? (
      <Checkbox
        aria-label="전체 선택"
        checked={table.getIsAllRowsSelected()}
        indeterminate={!table.getIsAllRowsSelected() && table.getIsSomeRowsSelected()}
        disabled={table.getRowModel().rows.length === 0}
        onChange={table.getToggleAllRowsSelectedHandler()}
      />
    ) : <span className="sr-only">선택</span>,
    cell: ({ row }) => (
      <Checkbox
        aria-label={`${row.id} 선택`}
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
      />
    ),
  });
}
