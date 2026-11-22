import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { createColumnHelper } from '@tanstack/react-table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
  Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
  Button, DataTable, dataTableFeatures, Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Field, Input, Select, SelectContent,
  SelectItem, SelectTrigger, SelectValue, Skeleton, StatusChip, Tabs, TabsContent, TabsList, TabsTrigger,
  Toaster, toast, useReturnContext, type ReturnRecord, type ReturnStorage,
} from '../index';

const meta = { title: 'Screens/DetailScreen' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const orderId = 'ORD-20481';
const orders = Array.from({ length: 36 }, (_, i) => ({
  id: `ORD-${20465 + i}`, recipient: ['김민수', '박서연', '이도윤'][i % 3]!,
  amount: (i + 1) * 12500, status: i % 2 ? 'done' : 'ready', delivery: 'normal',
}));
type Order = typeof orders[number];
const helper = createColumnHelper<typeof dataTableFeatures, Order>();
function memoryStorage(): ReturnStorage {
  const values = new Map<string, string>();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: key => { values.delete(key); } };
}

function OrderList({ orders, status, setStatus, restored, open }: {
  orders: Order[];
  status: string; setStatus: (status: string) => void; restored: ReturnRecord | null;
  open: (order: Order, scrollTop: number) => void;
}) {
  const root = React.useRef<HTMLDivElement>(null);
  const columns = React.useMemo(() => helper.columns([
    helper.accessor('id', { header: '주문번호', cell: cell => <a className="text-fg-link underline" href={`#${cell.getValue()}`}
      onClick={event => { event.preventDefault(); open(cell.row.original, root.current!.querySelector('[data-slot="data-table-scroll"]')!.scrollTop); }}>{cell.getValue()}</a> }),
    helper.accessor('recipient', { header: '수취인' }),
    helper.accessor('amount', { header: '주문 금액', cell: cell => `${cell.getValue().toLocaleString('ko-KR')}원` }),
  ]), [open]);
  React.useLayoutEffect(() => {
    const scroll = root.current?.querySelector('[data-slot="data-table-scroll"]');
    if (scroll && restored) scroll.scrollTop = restored.scrollTop;
  }, [restored]);
  return <div ref={root} className="space-y-4" style={{ '--data-table-viewport-height': '240px' } as React.CSSProperties}>
    <h1 className="text-title font-semibold">주문 목록</h1>
    <Field label="주문 상태"><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-auto min-w-40"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="all">전체</SelectItem><SelectItem value="ready">준비 중</SelectItem><SelectItem value="done">배송 완료</SelectItem></SelectContent>
    </Select></Field>
    <DataTable data={orders.filter(order => status === 'all' || order.status === status)} columns={columns}
      getRowId={order => order.id} revisitedRowId={restored?.itemKey} caption="돌아온 필터·스크롤·행을 복원한 주문 목록" />
  </div>;
}

function OrderDetail({ order, back, onSave, onDelete }: {
  order: Order; back: () => void; onSave: (order: Order) => void; onDelete: () => void;
}) {
  const id = order.id;
  const [edit, setEdit] = React.useState(false);
  const [discard, setDiscard] = React.useState(false);
  const [deleted, setDeleted] = React.useState(false);
  const [recipient, setRecipient] = React.useState(order.recipient);
  const [delivery, setDelivery] = React.useState(order.delivery);
  // 저장하지 않은 변경이 있을 때만 닫기를 가로챈다. 이미 저장한 창을 닫을 때
  // "작성 중인 내용이 사라집니다"를 묻는 건 거짓말이다. dismissible 을 더티에 묶는다.
  const [dirty, setDirty] = React.useState(false);
  const dismissOrigin = React.useRef<HTMLElement | null>(null);
  return <>
    <Breadcrumb><BreadcrumbList>
      <BreadcrumbItem><BreadcrumbLink href="#orders" onClick={event => { event.preventDefault(); back(); }}>주문 관리</BreadcrumbLink></BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem><BreadcrumbLink asChild><a href="#orders" onClick={event => { event.preventDefault(); back(); }}>주문 목록</a></BreadcrumbLink></BreadcrumbItem>
      <BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>{id}</BreadcrumbPage></BreadcrumbItem>
    </BreadcrumbList></Breadcrumb>
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-title font-semibold tabular">{id}</h1><p className="text-fg-muted">주문 상세</p></div>
      <div className="flex gap-2">
        <Dialog open={edit} onOpenChange={setEdit}>
          <DialogTrigger asChild><Button disabled={deleted} onClick={() => { setRecipient(order.recipient); setDelivery(order.delivery); setDirty(false); }}>수정</Button></DialogTrigger>
          <DialogContent dismissible={!dirty} onDismissAttempt={() => {
            dismissOrigin.current = document.activeElement as HTMLElement | null;
            setDiscard(true);
          }}>
            <DialogHeader><DialogTitle>주문 수정</DialogTitle><DialogDescription>수취인과 배송 방법을 수정합니다. 저장한 뒤에도 이 창에서 결과를 확인할 수 있습니다.</DialogDescription></DialogHeader>
            <form className="space-y-4" onSubmit={event => {
              event.preventDefault(); onSave({ ...order, recipient, delivery }); setDirty(false);
              // Dialog를 연 채 성공을 알린다. 지연 마운트한 sonner live region이 바깥 aria-hidden을 피한다.
              toast.success('주문을 저장했습니다');
            }}>
              <Field label="수취인" required><Input value={recipient} onChange={event => { setRecipient(event.target.value); setDirty(true); }} /></Field>
              <Field label="배송 방법"><Select value={delivery} onValueChange={value => { setDelivery(value); setDirty(true); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="normal">일반 배송</SelectItem><SelectItem value="express">빠른 배송</SelectItem>
              </SelectContent></Select></Field>
              {/* 닫기는 내장 X 가 맡는다. 푸터에 또 두면 접근명이 겹쳐 보조기기가 구분하지 못한다.
                  푸터의 취소는 "버린다"는 명시적 의사이므로 확인 없이 닫는다. */}
              <DialogFooter><DialogClose asChild><Button>취소</Button></DialogClose><Button type="submit" variant="primary">저장</Button></DialogFooter>
            </form>
            <AlertDialog open={discard} onOpenChange={setDiscard}>
              <AlertDialogContent onCloseAutoFocus={event => {
                // 이 확인창에는 별도 트리거가 없다. 계속 작성하면 시도 직전 입력 위치로 돌아간다.
                if (dismissOrigin.current?.isConnected) { event.preventDefault(); dismissOrigin.current.focus(); }
              }}>
                <AlertDialogHeader><AlertDialogTitle>수정을 그만두시겠습니까?</AlertDialogTitle><AlertDialogDescription>작성 중인 내용이 사라집니다. 저장하지 않은 변경은 되돌릴 수 없습니다.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>계속 작성</AlertDialogCancel><AlertDialogAction variant="danger" onClick={() => setEdit(false)}>작성 취소</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DialogContent>
        </Dialog>
        <AlertDialog><AlertDialogTrigger asChild><Button variant="danger" disabled={deleted}>삭제</Button></AlertDialogTrigger>
          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>주문을 삭제하시겠습니까?</AlertDialogTitle><AlertDialogDescription>{id} 주문을 영구 삭제합니다. 이 작업은 되돌릴 수 없습니다.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction variant="danger" onClick={() => { setDeleted(true); onDelete(); toast.success('주문을 삭제했습니다'); }}>주문 삭제</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </header>
    {deleted ? <p role="status">주문이 삭제되었습니다. 주문 목록으로 돌아가세요.</p> : <>
      <StatusChip tone="warning">배송 준비 중</StatusChip>
      {/* 패널을 서버에서 조회하는 화면의 예제이므로 화살표만으로 요청하지 않는다. */}
      <Tabs defaultValue="basic" activationMode="manual">
        <TabsList aria-label="주문 상세 분류"><TabsTrigger value="basic">기본정보</TabsTrigger><TabsTrigger value="shipping">배송</TabsTrigger><TabsTrigger value="payment">결제</TabsTrigger><TabsTrigger value="history">이력</TabsTrigger></TabsList>
        <TabsContent value="basic"><dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 border-b border-line py-4">
          <dt>수취인</dt><dd>{order.recipient}</dd><dt>주문 금액</dt><dd className="tabular">{order.amount.toLocaleString('ko-KR')}원</dd><dt>배송 방법</dt><dd>{order.delivery === 'normal' ? '일반 배송' : '빠른 배송'}</dd>
        </dl></TabsContent>
        <TabsContent value="shipping"><p>서울특별시 중구 세종대로 110</p><p>택배사 인계 준비 중입니다.</p></TabsContent>
        <TabsContent value="payment"><dl className="grid grid-cols-[auto_1fr] gap-4"><dt>결제 수단</dt><dd>법인 카드</dd><dt>결제 금액</dt><dd className="tabular">{order.amount.toLocaleString('ko-KR')}원</dd></dl></TabsContent>
        <TabsContent value="history"><section aria-busy="true" aria-label="주문 이력 조회" className="space-y-4"><p role="status">주문 이력을 불러오는 중입니다.</p>
          {/* 이력 행의 치수를 아는 서버 대기 상태를 고정해 로딩을 검토한다. */}
          {[0, 1, 2].map(row => <Skeleton key={row} width="100%" height={40} />)}
        </section></TabsContent>
      </Tabs>
    </>}
  </>;
}

function DetailScreen() {
  const [storage] = React.useState(memoryStorage);
  const ret = useReturnContext({ key: 'detail-screen-orders', storage });
  const [records, setRecords] = React.useState(orders);
  const [current, setCurrent] = React.useState<Order | null>(orders.find(order => order.id === orderId)!);
  const [status, setStatus] = React.useState('all');
  const savedFilters = React.useRef({ status: 'all' });
  const [restored, setRestored] = React.useState<ReturnRecord | null>(null);
  const open = React.useCallback((order: Order, scrollTop: number) => {
    savedFilters.current = { status };
    ret.capture({ itemKey: order.id, scrollTop });
    setStatus('all'); setCurrent(order);
  }, [ret, status]);
  return <main className="mx-auto min-w-0 max-w-6xl space-y-4"><Toaster />
    {current ? <OrderDetail key={current.id} order={current} onSave={updated => {
      setRecords(previous => previous.map(order => order.id === updated.id ? updated : order)); setCurrent(updated);
    }} onDelete={() => setRecords(previous => previous.filter(order => order.id !== current.id))} back={() => {
      // Breadcrumb은 표현만 한다. 라우터·필터·DOM 스크롤 배선은 이 앱 예제가 소유한다.
      const record = ret.consume();
      setRestored(record); setStatus(record ? savedFilters.current.status : 'all'); setCurrent(null);
    }} /> : <OrderList orders={records} status={status} setStatus={setStatus} restored={restored} open={open} />}
  </main>;
}

export const 상세화면: Story = { render: () => <DetailScreen />, play: async ({ canvasElement: root }) => {
  const c = within(root), body = within(root.ownerDocument.body);
  await expect(c.getByText(orderId, { selector: '[aria-current="page"]' })).toBeInTheDocument();
  const basic = c.getByRole('tab', { name: '기본정보' }); basic.focus();
  await userEvent.keyboard('{ArrowRight}');
  await waitFor(() => expect(c.getByRole('tab', { name: '배송' })).toHaveFocus());
  await expect(basic).toHaveAttribute('aria-selected', 'true');
  await userEvent.keyboard('{Enter}'); await expect(c.getByRole('tab', { name: '배송' })).toHaveAttribute('aria-selected', 'true');
  await userEvent.click(c.getByRole('tab', { name: '이력' })); await expect(c.getByRole('status')).toHaveTextContent('주문 이력을 불러오는 중');
  await userEvent.click(c.getByRole('tab', { name: '기본정보' }));
  await userEvent.click(c.getByRole('button', { name: '수정' }));
  const dialog = await body.findByRole('dialog', { name: '주문 수정' });
  await waitFor(() => expect(within(dialog).getByRole('textbox', { name: /수취인/ })).toHaveFocus());
  await userEvent.clear(within(dialog).getByRole('textbox', { name: /수취인/ }));
  await userEvent.type(within(dialog).getByRole('textbox', { name: /수취인/ }), '김민수 수정');
  await userEvent.keyboard('{Escape}');
  const discard = await body.findByRole('alertdialog');
  await waitFor(() => expect(within(discard).getByRole('button', { name: '계속 작성' })).toHaveFocus());
  await userEvent.click(within(discard).getByRole('button', { name: '계속 작성' }));
  await expect(dialog).toBeInTheDocument();
  await expect(within(dialog).getByRole('textbox', { name: /수취인/ })).toHaveValue('김민수 수정');
  await userEvent.click(within(dialog).getByRole('combobox'));
  await userEvent.click(await body.findByRole('option', { name: '빠른 배송' }));
  await userEvent.click(within(dialog).getByRole('button', { name: '저장' }));
  await expect(await body.findByText('주문을 저장했습니다')).toBeInTheDocument();
  await expect(dialog).toBeInTheDocument(); toast.dismiss();
  await userEvent.click(within(dialog).getByRole('button', { name: '닫기' }));
  await waitFor(() => expect(body.queryByRole('dialog')).not.toBeInTheDocument());
  await expect(c.getByText('김민수 수정')).toBeInTheDocument();
  await userEvent.click(c.getByRole('button', { name: '수정' }));
  const secondEdit = await body.findByRole('dialog', { name: '주문 수정' });
  await userEvent.clear(within(secondEdit).getByRole('textbox', { name: /수취인/ }));
  await userEvent.type(within(secondEdit).getByRole('textbox', { name: /수취인/ }), '저장하지 않은 초안');
  await userEvent.keyboard('{Escape}');
  const confirmDiscard = await body.findByRole('alertdialog');
  await userEvent.click(within(confirmDiscard).getByRole('button', { name: '작성 취소' }));
  await waitFor(() => {
    expect(body.queryByRole('dialog')).not.toBeInTheDocument();
    expect(body.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
  await expect(c.getByText('김민수 수정')).toBeInTheDocument();
  await userEvent.click(c.getByRole('button', { name: '삭제' }));
  const remove = await body.findByRole('alertdialog');
  await waitFor(() => expect(within(remove).getByRole('button', { name: '취소' })).toHaveFocus());
  await userEvent.keyboard('{Escape}'); await waitFor(() => expect(body.queryByRole('alertdialog')).not.toBeInTheDocument());
  await userEvent.click(c.getByRole('link', { name: '주문 목록' }));
  await userEvent.click(c.getByRole('combobox'));
  await userEvent.click(await body.findByRole('option', { name: '준비 중' }));
  const scroll = root.querySelector<HTMLElement>('[data-slot="data-table-scroll"]')!;
  scroll.scrollTop = 240; const before = scroll.scrollTop;
  await userEvent.click(c.getByRole('link', { name: orderId }));
  await userEvent.click(c.getByRole('link', { name: '주문 목록' }));
  await expect(c.getByRole('combobox')).toHaveTextContent('준비 중');
  await waitFor(() => expect(root.querySelector<HTMLElement>('[data-slot="data-table-scroll"]')!.scrollTop).toBe(before));
  await expect(root.querySelector(`[data-row-id="${orderId}"]`)).toHaveAttribute('data-revisited');
  // 사후 상태는 상세 화면이며 모든 다이얼로그·선택 목록은 닫혀 있다. 하네스는 다시 열어 검사한다.
  await userEvent.click(c.getByRole('link', { name: orderId })); root.dataset.playComplete = 'true';
} };

/** 제어 탭. 포커스 없이 값만 바뀌는 경로가 있어야 끌어오기 코드가 실제로 일한다 —
 *  포커스가 움직이는 클릭·화살표 경로는 브라우저가 가로 스크롤을 알아서 한다(실측). */
function 넘치는탭() {
  const [value, setValue] = React.useState('1');
  return <div className="max-w-80 min-w-0">
    <Button size="sm" data-testid="jump" onClick={() => setValue('8')}>마지막 탭으로</Button>
    <Tabs value={value} onValueChange={setValue}><TabsList aria-label="좁은 화면의 상세 탭">
      {Array.from({ length: 8 }, (_, index) => <TabsTrigger key={index} value={String(index + 1)}>상세 탭 {index + 1}</TabsTrigger>)}
    </TabsList>{Array.from({ length: 8 }, (_, index) => <TabsContent key={index} value={String(index + 1)}>상세 내용 {index + 1}</TabsContent>)}</Tabs>
  </div>;
}
export const 탭넘침: Story = { render: () => <넘치는탭 />, play: async ({ canvasElement: root }) => {
  const c = within(root), tabs = c.getAllByRole('tab'); tabs[0]!.focus();
  await userEvent.keyboard('{End}'); await waitFor(() => expect(tabs[7]).toHaveFocus());
  await expect(tabs[7]).toHaveAttribute('aria-selected', 'true');
  const list = c.getByRole('tablist');
  await waitFor(() => { const last = tabs[7]!.getBoundingClientRect(), box = list.getBoundingClientRect();
    expect(last.left).toBeGreaterThanOrEqual(box.left - 1); expect(last.right).toBeLessThanOrEqual(box.right + 1); });
  root.dataset.playComplete = 'true';
} };

export const 긴경로: Story = { render: () => <Breadcrumb><BreadcrumbList>
  <BreadcrumbItem><BreadcrumbLink href="#management">주문 관리</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator />
  <BreadcrumbItem><BreadcrumbEllipsis count={3} /></BreadcrumbItem><BreadcrumbSeparator />
  <BreadcrumbItem><BreadcrumbLink href="#orders">주문 목록</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator />
  <BreadcrumbItem><BreadcrumbPage>{orderId}</BreadcrumbPage></BreadcrumbItem>
</BreadcrumbList></Breadcrumb>, play: async ({ canvasElement: root }) => {
  await expect(within(root).getByText('생략된 경로 3개')).toBeInTheDocument(); root.dataset.playComplete = 'true';
} };
