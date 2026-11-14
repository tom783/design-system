import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { createColumnHelper } from '@tanstack/react-table';
import { Peek, useReturnContext, type ReturnStorage } from '../components/peek';
import { Button } from '../components/button';
import { StatusChip } from '../components/status-chip';
import { DataTable, dataTableFeatures } from '../components/data-table';

const meta = { title: 'Components/Peek', parameters: { layout: 'padded' },
  decorators: [(Story) => <div style={{ paddingBlockStart: 'var(--space-80)' }}><Story /></div>],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const complete = (root: HTMLElement) => { root.dataset.playComplete = 'true'; };
const bubble = (root: HTMLElement) => root.querySelector<HTMLElement>('[data-peek]')!;
const items = [{ label: '수취인', value: '김철수' }, { label: '금액', value: '142,000원', numeric: true },
  { label: '상태', value: <StatusChip tone="info">배송중</StatusChip> }];
function Demo({ overflow = false }: { overflow?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [detail, setDetail] = React.useState(false);
  return <><Peek open={open} onOpenChange={setOpen} title="주문 20260114-0012"
    items={overflow ? Array.from({ length: 7 }, (_, i) => ({ label: `항목 ${i + 1}`, value: `값 ${i + 1}` })) : items}
    action={{ label: '상세 보기', onClick: () => { setOpen(false); setDetail(true); } }}>
    <Button aria-label="주문 요약 보기">⋯</Button>
  </Peek><Button className="ml-4">다음 컨트롤</Button>{detail && <p>주문 상세 화면</p>}</>;
}
export const 기본: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement: root }) => {
    const c = within(root), trigger = c.getByRole('button', { name: '주문 요약 보기' });
    await userEvent.hover(trigger); await expect(bubble(root).matches(':popover-open')).toBe(false);
    trigger.focus(); await expect(bubble(root).matches(':popover-open')).toBe(false);
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(bubble(root)).toHaveFocus());
    await expect(c.getByRole('dialog')).toHaveAccessibleName('주문 20260114-0012');
    await expect(bubble(root).querySelectorAll('dl dt')).toHaveLength(3);
    await expect(bubble(root).querySelectorAll('dl dd')).toHaveLength(3);
    const amount = c.getByText('142,000원');
    await expect(amount).toHaveClass('tabular'); await expect(getComputedStyle(amount).textAlign).toBe('right');
    await userEvent.keyboard('{Escape}'); await expect(trigger).toHaveFocus();
    await expect(bubble(root).matches(':popover-open')).toBe(false);
    await userEvent.click(trigger); await userEvent.click(c.getByRole('button', { name: '닫기' }));
    await expect(trigger).toHaveFocus();
    await userEvent.click(trigger);
    // 비모달: 실제 Tab 이동으로 요약 밖의 컨트롤까지 도달할 수 있다.
    await userEvent.tab(); await userEvent.tab(); await userEvent.tab();
    await expect(c.getByRole('button', { name: '다음 컨트롤' })).toHaveFocus();
    await userEvent.click(c.getByRole('button', { name: '상세 보기' }));
    await expect(c.getByText('주문 상세 화면')).toBeVisible(); complete(root);
  },
};
export const 줄수초과: Story = {
  render: () => { const [show, setShow] = React.useState(false); return <><Button onClick={() => setShow(true)}>7줄 준비</Button>{show && <Demo overflow />}</>; },
  play: async ({ canvasElement: root }) => {
    const warnings: string[] = [], original = console.warn;
    console.warn = (...args: unknown[]) => { warnings.push(args.join(' ')); original(...args); };
    try {
      const c = within(root); await userEvent.click(c.getByRole('button', { name: '7줄 준비' }));
      if (import.meta.env.DEV) await waitFor(() => expect(warnings.some(w => w.includes('[Peek]') && w.includes('6줄'))).toBe(true));
      await userEvent.click(c.getByRole('button', { name: '주문 요약 보기' }));
      await expect(bubble(root).querySelectorAll('dd')).toHaveLength(7);
      await expect(c.getByRole('dialog')).toBeVisible();
    } finally { console.warn = original; }
    complete(root);
  },
};
type Order = { id: string; recipient: string; amount: number };
const data: Order[] = Array.from({ length: 500 }, (_, i) => ({ id: `order-${i + 1}`, recipient: `수취인 ${i + 1}`, amount: 142000 + i }));
const helper = createColumnHelper<typeof dataTableFeatures, Order>();
const baseColumns = helper.columns([helper.accessor('id', { header: '주문번호' }), helper.accessor('recipient', { header: '수취인' }), helper.accessor('amount', { header: '금액' })]);
function TablePeek() {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const columns = helper.columns([...baseColumns, helper.display({ id: 'peek', header: '요약', cell: ({ row }) =>
    <Peek open={openId === row.id} onOpenChange={open => setOpenId(open ? row.id : null)} title={`주문 ${row.id}`} items={items}>
      <Button size="sm" variant="ghost" aria-label={`${row.id} 요약`}>⋯</Button>
    </Peek> })]);
  return <div style={{ '--data-table-viewport-height': '120px' } as React.CSSProperties}>
    <DataTable data={data} columns={columns} getRowId={row => row.id} virtualize />
  </div>;
}
export const 표에서_요약: Story = {
  name: '표에서-요약', render: () => <TablePeek />,
  play: async ({ canvasElement: root }) => {
    await userEvent.click(within(root).getByRole('button', { name: 'order-1 요약' }));
    const dialog = root.querySelector<HTMLElement>('[data-peek]:popover-open')!;
    await waitFor(() => expect(dialog).toHaveFocus());
    // 진입 translate 전환이 끝난 뒤 최상위 레이어의 실제 hit-test까지 확인한다.
    await new Promise(resolve => setTimeout(resolve, 250));
    const bounds = root.querySelector('[data-slot="data-table-scroll"]')!.getBoundingClientRect();
    const rect = dialog.getBoundingClientRect();
    await expect(rect.top < bounds.top || rect.bottom > bounds.bottom).toBe(true);
    await expect(rect.top).toBeGreaterThanOrEqual(0); await expect(rect.bottom).toBeLessThanOrEqual(innerHeight);
    const x = rect.left + rect.width / 2;
    const y = rect.top < bounds.top ? rect.top + 4 : rect.bottom - 4;
    await expect(dialog.contains(document.elementFromPoint(x, y))).toBe(true); complete(root);
  },
};
function MarkerDemo({ selected = false }: { selected?: boolean }) {
  const [marked, setMarked] = React.useState(false);
  return <><Button onClick={() => setMarked(v => !v)}>마커 전환</Button>
    <DataTable data={data.slice(0, 3)} columns={baseColumns} getRowId={row => row.id} pinnedStart={['id']}
      revisitedRowId={marked ? 'order-2' : undefined} selectionMode={selected ? 'multi' : 'none'} selectedIds={selected ? ['order-2'] : []} />
  </>;
}
async function markerPlay(root: HTMLElement, selected: boolean) {
  const row = root.querySelector<HTMLElement>('[data-row-id="order-2"]')!;
  const coords = () => [...row.querySelectorAll('td')].map(cell => {
    const a = cell.getBoundingClientRect(), b = cell.firstElementChild!.getBoundingClientRect();
    return { x: a.x, y: a.y, width: a.width, contentX: b.x, contentY: b.y };
  });
  const before = coords(); const bg = getComputedStyle(row.querySelector('td')!).backgroundColor;
  await userEvent.click(within(root).getByRole('button', { name: '마커 전환' }));
  await expect(row).toHaveAttribute('data-revisited');
  await expect(coords()).toEqual(before);
  await expect(getComputedStyle(row).boxShadow).toContain('inset');
  await expect(getComputedStyle(row.querySelector('td')!).boxShadow).toContain('3px');
  if (selected) { await expect(row).toHaveAttribute('aria-selected', 'true'); await expect(getComputedStyle(row.querySelector('td')!).backgroundColor).toBe(bg); }
  root.dataset.markerCoordinates = JSON.stringify({ before, after: coords() }); complete(root);
}
export const 다녀온행: Story = { render: () => <MarkerDemo />, play: ({ canvasElement }) => markerPlay(canvasElement, false) };
export const 다녀온행_선택됨: Story = { name: '다녀온행-선택됨', render: () => <MarkerDemo selected />, play: ({ canvasElement }) => markerPlay(canvasElement, true) };
function memoryStorage(): ReturnStorage {
  const values = new Map<string, string>();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: key => { values.delete(key); } };
}
function ReturnList({ storage, now, leave }: { storage: ReturnStorage; now: () => number; leave: () => void }) {
  const ret = useReturnContext({ key: 'orders', storage, now, ttlMs: 600_000 });
  const ref = React.useRef<HTMLDivElement>(null);
  const restoredOnce = React.useRef(false);
  const [backId, setBackId] = React.useState<string>();
  const [second, setSecond] = React.useState('대기');
  React.useLayoutEffect(() => {
    // StrictMode의 effect 재실행도 이미 소비한 복원을 덮어쓰지 않는다.
    if (restoredOnce.current) return; restoredOnce.current = true;
    const back = ret.consume();
    if (back) { ref.current!.querySelector('[data-slot="data-table-scroll"]')!.scrollTop = back.scrollTop; setBackId(back.itemKey); }
  }, [ret]);
  return <div ref={ref} style={{ '--data-table-viewport-height': '240px' } as React.CSSProperties}>
    <Button onClick={() => {
      const scroll = ref.current!.querySelector('[data-slot="data-table-scroll"]')!;
      ret.capture({ itemKey: 'order-300', scrollTop: scroll.scrollTop }); leave();
    }}>300번째 상세 보기</Button>
    <Button onClick={() => setSecond(String(ret.consume()))}>다시 consume</Button><output>{second}</output>
    <output data-testid="back-id">{backId ?? '복원 없음'}</output>
    <DataTable data={data} columns={baseColumns} getRowId={row => row.id} revisitedRowId={backId} virtualize />
  </div>;
}
function ReturnDemo({ expired = false }: { expired?: boolean }) {
  const [storage] = React.useState(memoryStorage);
  const time = React.useRef(1_000_000); const now = React.useCallback(() => time.current, []);
  const [detail, setDetail] = React.useState(false);
  return detail ? <><h2>주문 order-300 상세</h2><Button onClick={() => { if (expired) time.current += 600_001; setDetail(false); }}>목록으로 돌아가기</Button></>
    : <ReturnList storage={storage} now={now} leave={() => setDetail(true)} />;
}
async function returnPlay(root: HTMLElement, expired: boolean) {
  const c = within(root), scroll = root.querySelector<HTMLElement>('[data-slot="data-table-scroll"]')!;
  scroll.scrollTop = 299 * 40;
  await waitFor(() => expect(root.querySelector('[data-row-id="order-300"]')).not.toBeNull());
  const before = scroll.scrollTop;
  await userEvent.click(c.getByRole('button', { name: '300번째 상세 보기' }));
  await expect(scroll.isConnected).toBe(false);
  await userEvent.click(c.getByRole('button', { name: '목록으로 돌아가기' }));
  await waitFor(() => expect(root.querySelector<HTMLElement>('[data-slot="data-table-scroll"]')!.scrollTop).toBe(expired ? 0 : before));
  await expect(c.getByTestId('back-id')).toHaveTextContent(expired ? '복원 없음' : 'order-300');
  if (!expired) await waitFor(() => expect(root.querySelector('[data-row-id="order-300"]')).toHaveAttribute('data-revisited'));
  await userEvent.click(c.getByRole('button', { name: '다시 consume' })); await expect(c.getByText('null')).toBeVisible(); complete(root);
}
export const 돌아오기: Story = { render: () => <ReturnDemo />, play: ({ canvasElement }) => returnPlay(canvasElement, false) };
export const 만료: Story = { render: () => <ReturnDemo expired />, play: ({ canvasElement }) => returnPlay(canvasElement, true) };
