import * as React from 'react';
import { BulkActionBar, Button, FilterBar } from '../../src';

/** 선택 값은 표(DataTable selectedIds·onSelectedIdsChange)가 소유하고, 바는 길이와 선택 해제만 쓴다. */
export function BulkActionBarExample() {
  const [selected, setSelected] = React.useState(['ORD-20480', 'ORD-20479', 'ORD-20477']);
  return <BulkActionBar selectedCount={selected.length} onClear={() => setSelected([])}
    actions={<><Button size="sm">송장 출력</Button><Button size="sm">출고 처리</Button></>}
    dangerAction={<Button size="sm" variant="danger">주문 취소</Button>}>
    <FilterBar searchLabel="주문 검색" searchPlaceholder="주문번호·수취인·상품명 검색" />
  </BulkActionBar>;
}
