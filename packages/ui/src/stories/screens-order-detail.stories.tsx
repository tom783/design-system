import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
  Button, Card, CardBody, CardHeader, CardTitle, DataTable, DescriptionList, DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, PageHeader, Pagination, SectionHeader, StatusChip, Toaster,
  createDataTableColumnHelper, toast, type DataTableSummaryRow,
} from '../index';
import { Copy, Ellipsis, Printer } from '../icons';
import { StoreShell, won } from './screens-shell';

/**
 * 주문 상세 — 파괴적 액션 배치 D2(2026-11-22 디자인 검토 확정).
 * 머리 오른쪽: ⋯ 더보기(메뉴) · 수정(secondary) · 주요 버튼(출고 처리).
 * 삭제는 더보기 메뉴 안의 destructive 항목 → AlertDialog(기본 포커스 = 취소, 확정 = 채운 danger).
 * 채운 danger 버튼은 확정 단계에서만 나온다. 화면 머리에 브랜드 채움과 에러 채움이 나란히 서지 않는다.
 * 키-값 묶음은 DescriptionList(DESIGN.md §16.7)다. 카드 세 장은 가로형이고 폭이 모자라면 줄을 바꾼다(auto-fit, Card 최소 240).
 * 주문 상품 표 — 열 합계(수량·금액)는 DataTable summary(tfoot, §4.3 · 규칙 표 T-1~T-12)이고, 표 열이 아닌 금액 내역
 * (배송비 → 결제 금액)은 표 아래 DescriptionList align=end 다(TD-1 A). 내역 값 끝 = 금액 열 글자 끝(표 오른끝 안쪽 15),
 * 합계 행이 있으므로 내역에 '상품 합계'를 다시 쓰지 않는다. 표가 가로로 스크롤되면 금액 열을 오른쪽에 고정한다(TD-2 A).
 * 주문 상품 섹션 머리는 SectionHeader(DESIGN §24.6) — 동작 없는 제목 + 개수('주문 상품 3', 숫자만 S-4). 셸은 상단 바 64.
 */
const meta = { title: 'Screens/OrderDetail', parameters: { fullBleed: true } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const ORDER_ID = 'ORD-20481';
const items = [
  { id: 'P-1031', name: '무선 블루투스 이어폰', option: '색상: 화이트', qty: 1, price: 59000 },
  { id: 'P-2207', name: '스테인리스 텀블러 500ml', option: '색상: 샌드 베이지 · 각인 없음', qty: 2, price: 18900 },
  { id: 'P-0412', name: '세라믹 머그컵 2개입', option: '단일 옵션', qty: 1, price: 24500 },
];
type Item = typeof items[number];
const helper = createDataTableColumnHelper<Item>();
const columns = helper.columns([
  helper.accessor('id', { header: '상품 코드', cell: cell => <span className="tabular">{cell.getValue()}</span> }),
  helper.accessor('name', { header: '상품명' }),
  helper.accessor('option', { header: '옵션' }),
  helper.accessor('qty', { header: '수량', cell: cell => <span className="tabular">{cell.getValue()}</span> }),
  helper.accessor('price', { header: '단가', cell: cell => <span className="tabular">{won(cell.getValue())}</span> }),
  helper.display({ id: 'sum', header: '금액', cell: cell => <span className="tabular">{won(cell.row.original.price * cell.row.original.qty)}</span> }),
]);
const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
const qtyTotal = items.reduce((sum, item) => sum + item.qty, 0);

// 페이지네이션 변형(검수 매트릭스) — 주문 상품 128건을 3건씩. 결정적 가상 데이터다.
const manyItems: Item[] = Array.from({ length: 128 }, (_, i) => {
  const base = items[i % items.length]!;
  return { ...base, id: `P-${String(1000 + i * 7).padStart(4, '0')}`, qty: 1 + (i % 3) % 2 + (i % 5 === 0 ? 1 : 0), price: base.price + (i % 4) * 1000 };
});
const sumOf = (list: Item[]) => ({ qty: list.reduce((s, item) => s + item.qty, 0), amount: list.reduce((s, item) => s + item.qty * item.price, 0) });
const manyTotal = sumOf(manyItems);

type Variant = 'default' | 'paged' | 'selection' | 'empty' | 'loading';
interface Props { menuOpen?: boolean; confirmOpen?: boolean; variant?: Variant }

function OrderItems({ variant = 'default' }: { variant?: Variant }) {
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<string[]>(['P-1031']);
  const pageSize = 3;
  const data = variant === 'empty' ? [] : variant === 'paged' ? manyItems.slice((page - 1) * pageSize, page * pageSize) : items;
  const pageTotal = sumOf(data);
  // 범위를 라벨에 쓴다(T-7): 페이지가 하나면 '합계', 이 페이지만 더했으면 '이 페이지 합계', 서버 전체는 건수와 함께.
  const summary: DataTableSummaryRow[] = variant === 'paged' ? [
    { label: '이 페이지 합계', values: { qty: String(pageTotal.qty), sum: won(pageTotal.amount) } },
    { label: `전체 합계 · ${manyItems.length.toLocaleString('ko-KR')}건`, values: { qty: manyTotal.qty.toLocaleString('ko-KR'), sum: won(manyTotal.amount) } },
  ] : [{ label: '합계', values: { qty: String(qtyTotal), sum: won(subtotal) } }];
  const count = variant === 'paged' ? manyItems.length : data.length;
  return <SectionHeader title="주문 상품" count={count} data-screen="order-items">
    {/* 금액 열은 늘 고정한다(TD-2 A). 고정선은 표가 가로로 넘칠 때만 보인다 — 넘치지 않는 1440 에는 세로선이 없다. */}
    <div className="min-w-0">
      <DataTable data={data} columns={columns} getRowId={item => item.id} align={{ qty: 'end', price: 'end', sum: 'end' }}
        caption={`${ORDER_ID} 주문 상품`} summary={summary} pinnedEnd={['sum']}
        state={variant === 'loading' ? 'loading' : 'idle'} totalCount={variant === 'paged' ? manyItems.length : undefined}
        emptyMessage="주문 상품이 없습니다"
        {...(variant === 'selection' ? { selectionMode: 'multi' as const, selectedIds: selected, onSelectedIdsChange: setSelected } : {})} />
    </div>
    {variant === 'paged' && <Pagination page={page} pageSize={pageSize} totalCount={manyItems.length} onPageChange={setPage} />}
    {/* 표 열이 아닌 금액 내역(TD-1 A). 값 끝 = 금액 열 글자 끝 = 표 오른끝 안쪽 셀 여백 14 + 테두리 1. '상품 합계'는 합계 행이 맡는다. */}
    {(variant === 'default' || variant === 'selection') && <DescriptionList align="end" data-screen="totals"
      className="ml-auto mr-[calc(var(--cell-px)+var(--border-width))]" items={[
        { label: '배송비', value: won(0) }, { label: '결제 금액', value: won(subtotal), emphasis: true }]} />}
  </SectionHeader>;
}

function OrderDetailScreen({ menuOpen = false, confirmOpen = false, variant = 'default' }: Props) {
  const [confirm, setConfirm] = React.useState(confirmOpen);
  const more = React.useRef<HTMLButtonElement>(null);
  return <StoreShell current="orders">
    <Toaster />
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        breadcrumb={<Breadcrumb><BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="#orders">주문 관리</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="#orders">주문 목록</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{ORDER_ID}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList></Breadcrumb>}
        title={ORDER_ID}
        status={<StatusChip tone="warning">출고 대기</StatusChip>}
        description="2026-11-15 18:59 결제 · 간편결제 · 박서연"
        actions={<>
          <DropdownMenu defaultOpen={menuOpen}>
            <DropdownMenuTrigger asChild>
              <Button ref={more} iconOnly aria-label="주문 작업 더보기"><Ellipsis aria-hidden="true" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem><Printer aria-hidden="true" />주문서 인쇄</DropdownMenuItem>
              <DropdownMenuItem><Copy aria-hidden="true" />송장 번호 복사</DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* destructive 는 삭제 아이콘을 내장한다. 색만으로 파괴적 동작을 구분하지 않는다(§2.3). */}
              <DropdownMenuItem destructive onSelect={() => setConfirm(true)}>삭제</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button>수정</Button>
          <Button variant="primary">출고 처리</Button>
        </>} />
      {/* 트리거 없이 상태로 여는 확인창이다. 메뉴 항목은 닫히며 사라지므로 닫힌 뒤 ⋯ 로 돌려보낸다. */}
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent onCloseAutoFocus={event => { if (more.current?.isConnected) { event.preventDefault(); more.current.focus(); } }}>
          <AlertDialogHeader>
            <AlertDialogTitle>주문을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>{ORDER_ID} 주문과 배송 정보를 영구 삭제합니다. 결제 취소는 따로 처리해야 하며, 삭제한 주문은 되돌릴 수 없습니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction variant="danger" onClick={() => toast.success(`${ORDER_ID} 주문을 삭제했습니다`)}>주문 삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* 카드 세 장은 폭이 모자라면 줄을 바꾼다 — Card 최소 240 × 3 + 간격 32 = 752 가 1024 본문(약 720)보다 커서
          grid-cols-3 에서는 카드끼리 겹쳤다(목표 57 2c). Card 공개 API 는 그대로다. */}
      <div data-screen="cards" className="grid min-w-0 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, var(--card-min-w)), 1fr))' }}>
        <Card><CardHeader><CardTitle>주문 정보</CardTitle></CardHeader><CardBody>
          <DescriptionList items={[{ label: '주문번호', value: <span className="tabular">{ORDER_ID}</span> },
            { label: '주문 일시', value: <span className="tabular">2026-11-15 18:59</span> },
            { label: '판매 채널', value: '자사몰' }, { label: '주문자', value: '박서연 (회원)' }]} />
        </CardBody></Card>
        <Card><CardHeader><CardTitle>배송</CardTitle></CardHeader><CardBody>
          <DescriptionList items={[{ label: '수취인', value: '박서연' }, { label: '연락처', value: <span className="tabular">010-****-2841</span> },
            { label: '주소', value: '경기도 ○○시 ○○구 가상로 128, 302동 1104호' }, { label: '요청 사항', value: '부재 시 문 앞에 놓아 주세요' }]} />
        </CardBody></Card>
        <Card><CardHeader><CardTitle>결제</CardTitle></CardHeader><CardBody>
          <DescriptionList items={[{ label: '결제 수단', value: '간편결제' }, { label: '상품 금액', value: <span className="tabular">{won(subtotal)}</span> },
            { label: '배송비', value: <span className="tabular">{won(0)}</span> },
            { label: '결제 금액', value: <span className="tabular">{won(subtotal)}</span>, emphasis: true }]} />
        </CardBody></Card>
      </div>
      <OrderItems variant={variant} />
    </div>
  </StoreShell>;
}

const ready: Story['play'] = async ({ canvasElement: root }) => {
  // 메뉴·확인창이 열린 상태는 나머지 화면이 aria-hidden 이다(모달). 숨은 요소까지 찾는다.
  await expect(within(root).getByRole('heading', { level: 1, name: ORDER_ID, hidden: true })).toBeInTheDocument();
  root.dataset.playComplete = 'true';
};

/** 사후 상태는 닫힌 화면이다. 열린 상태는 아래 두 스토리가 처음부터 보여준다. */
export const 기본: Story = {
  render: () => <OrderDetailScreen />,
  play: async ({ canvasElement: root }) => {
    const c = within(root), body = within(root.ownerDocument.body);
    const trigger = c.getByRole('button', { name: '주문 작업 더보기' });
    await userEvent.click(trigger);
    await userEvent.click(await body.findByRole('menuitem', { name: '삭제' }));
    const dialog = await body.findByRole('alertdialog', { name: '주문을 삭제하시겠습니까?' });
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '취소' })).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('alertdialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    await expect(c.getByRole('heading', { level: 1, name: ORDER_ID })).toBeInTheDocument();
    root.dataset.playComplete = 'true';
  },
};
export const 더보기메뉴열림: Story = { name: '더보기 메뉴 열림', render: () => <OrderDetailScreen menuOpen />, play: ready };
export const 삭제확인: Story = { name: '삭제 확인', render: () => <OrderDetailScreen confirmOpen />, play: ready };
/** 서버 페이지네이션 — '이 페이지 합계'(위)와 서버가 준 '전체 합계 · 128건'(아래) 두 행(T-7). */
export const 합계페이지네이션: Story = { name: '합계 — 페이지네이션 2행', render: () => <OrderDetailScreen variant="paged" />, play: ready };
/** 선택 열이 있으면 선택 칸은 비우고 라벨은 다음 열. 선택해도 합계는 그대로다(T-3·T-10). */
export const 합계선택열: Story = { name: '합계 — 선택 열', render: () => <OrderDetailScreen variant="selection" />, play: ready };
/** 행이 없으면 합계 행을 숨긴다(T-9). */
export const 합계빈표: Story = { name: '합계 — 빈 표', render: () => <OrderDetailScreen variant="empty" />, play: ready };
/** 로딩 중 합계 값 자리는 숫자 폭 스켈레톤(T-9). */
export const 합계로딩: Story = { name: '합계 — 로딩', render: () => <OrderDetailScreen variant="loading" />, play: ready };
