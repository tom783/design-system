import {
  Button, DataTable, Pagination, type PaginationProps, createDataTableColumnHelper,
  type DataTableColumns, type RowData, type CellContext, type HeaderContext, type DataTableFeatures,
} from '@s2life/ui';

type Order = { id: string; status: 'paid' | 'pending'; amount: number };
type IsAny<T> = 0 extends (1 & T) ? true : false;
const tone = { paid: '결제 완료', pending: '결제 대기' };
const h = createDataTableColumnHelper<Order>();

export const inferred = h.columns([
  h.accessor('status', { cell: i => {
    const v: 'paid' | 'pending' = i.getValue();
    // 양의 대입만으로는 any를 잡을 수 없으므로 any 판별과 음의 대입도 검사한다.
    const notAny: IsAny<ReturnType<typeof i.getValue>> = false;
    // @ts-expect-error 상태 값은 숫자가 아니다. any로 넓어지면 지시문이 미사용 오류가 된다.
    const wrong: number = i.getValue();
    void notAny; void wrong;
    return tone[v];
  } }),
  h.accessor('amount', { cell: i => {
    const v: number = i.getValue();
    // @ts-expect-error 금액은 문자열이 아니다.
    const wrong: string = i.getValue();
    void wrong;
    return v.toLocaleString('ko-KR');
  } }),
]);

export const annotated: DataTableColumns<Order> = h.columns([
  h.accessor('status', { cell: i => {
    const v: 'paid' | 'pending' = i.getValue();
    const notAny: IsAny<ReturnType<typeof i.getValue>> = false;
    // @ts-expect-error 명시적 컬럼 주석도 셀 값을 any로 넓히면 안 된다.
    const wrong: number = i.getValue();
    void notAny; void wrong;
    return tone[i.getValue()];
  } }),
  h.accessor(row => row.amount, { id: 'amount', cell: i => {
    const v: number = i.getValue();
    // @ts-expect-error 함수 accessor의 값도 정확해야 한다.
    const wrong: string = i.getValue();
    void wrong;
    return v.toFixed(0);
  } }),
]);

export function genericHelper<T extends RowData>() { return createDataTableColumnHelper<T>(); }
export const renderStatus = (i: CellContext<DataTableFeatures, Order, Order['status']>) => tone[i.getValue()];
export const renderHeader = (i: HeaderContext<DataTableFeatures, Order, number>) => i.column.id;
export const table = <DataTable data={[]} columns={annotated} getRowId={row => row.id} caption="소비자 타입 검사" />;
export const link = <Button asChild><a href="/orders">주문 목록</a></Button>;
export const iconLink = <Button asChild leadingIcon={<svg aria-hidden="true" />} trailingIcon={<svg aria-hidden="true" />}>
  <a href="/orders">주문 목록</a>
</Button>;

const paginationProps: PaginationProps = {
  page: 1, pageSize: 50, totalCount: 1234, onPageChange: page => { void page; },
  pageSizeOptions: [20, 50, 100], onPageSizeChange: size => { void size; }, disabled: false,
};
export const pagination = <Pagination {...paginationProps} />;
