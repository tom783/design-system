import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
  Button, Card, CardBody, CardHeader, CardTitle, DataTable, DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, PageHeader, StatusChip, Toaster,
  createDataTableColumnHelper, toast,
} from '../index';
import { Copy, Ellipsis, Printer } from '../icons';
import { StoreShell, won } from './screens-shell';

/**
 * 주문 상세 — 파괴적 액션 배치 D2(2026-11-22 디자인 검토 확정).
 * 머리 오른쪽: ⋯ 더보기(메뉴) · 수정(secondary) · 주요 버튼(출고 처리).
 * 삭제는 더보기 메뉴 안의 destructive 항목 → AlertDialog(기본 포커스 = 취소, 확정 = 채운 danger).
 * 채운 danger 버튼은 확정 단계에서만 나온다. 화면 머리에 브랜드 채움과 에러 채움이 나란히 서지 않는다.
 * 키-값 묶음 부품은 없어 Card + <dl> 로 조립했다.
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

function KeyValue({ rows }: { rows: [string, React.ReactNode][] }) {
  return <dl className="grid grid-cols-[minmax(5.5rem,auto)_1fr] gap-x-6 gap-y-2 text-[length:var(--text-body-sm)]">
    {rows.map(([key, value]) => <React.Fragment key={key}>
      <dt className="text-fg-muted">{key}</dt><dd className="min-w-0">{value}</dd>
    </React.Fragment>)}
  </dl>;
}

interface Props { menuOpen?: boolean; confirmOpen?: boolean }

function OrderDetailScreen({ menuOpen = false, confirmOpen = false }: Props) {
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
      <div className="grid min-w-0 grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle>주문 정보</CardTitle></CardHeader><CardBody>
          <KeyValue rows={[['주문번호', <span className="tabular">{ORDER_ID}</span>], ['주문 일시', <span className="tabular">2026-11-15 18:59</span>],
            ['판매 채널', '자사몰'], ['주문자', '박서연 (회원)']]} />
        </CardBody></Card>
        <Card><CardHeader><CardTitle>배송</CardTitle></CardHeader><CardBody>
          <KeyValue rows={[['수취인', '박서연'], ['연락처', <span className="tabular">010-****-2841</span>],
            ['주소', '경기도 ○○시 ○○구 가상로 128, 302동 1104호'], ['요청 사항', '부재 시 문 앞에 놓아 주세요']]} />
        </CardBody></Card>
        <Card><CardHeader><CardTitle>결제</CardTitle></CardHeader><CardBody>
          <KeyValue rows={[['결제 수단', '간편결제'], ['상품 금액', <span className="tabular">{won(subtotal)}</span>],
            ['배송비', <span className="tabular">{won(0)}</span>], ['결제 금액', <span className="tabular font-semibold">{won(subtotal)}</span>]]} />
        </CardBody></Card>
      </div>
      <section aria-labelledby="order-items" className="flex min-w-0 flex-col gap-3">
        <h2 id="order-items" className="text-[length:var(--text-title-sm)] leading-[var(--text-title-sm-lh)] font-semibold">주문 상품 <span className="tabular">{items.length}</span>건</h2>
        <DataTable data={items} columns={columns} getRowId={item => item.id} align={{ qty: 'end', price: 'end', sum: 'end' }}
          caption={`${ORDER_ID} 주문 상품`} />
        {/* 합계 행 부품은 없다. 금액 열 끝에 맞춰 표 아래 오른쪽에 둔다. */}
        <dl className="ml-auto grid grid-cols-[auto_minmax(8.75rem,auto)] gap-x-8 gap-y-1 text-[length:var(--text-body-sm)]">
          <dt className="text-fg-muted">상품 합계</dt><dd className="tabular text-right">{won(subtotal)}</dd>
          <dt className="text-fg-muted">배송비</dt><dd className="tabular text-right">{won(0)}</dd>
          <dt className="font-semibold">결제 금액</dt><dd className="tabular text-right font-semibold">{won(subtotal)}</dd>
        </dl>
      </section>
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
