import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Toaster, useReturnContext, type ReturnRecord, type ReturnStorage } from '../index';
import { CreatedOrdersList, OrderCreateScreen, type CreatedOrder } from './create-screen-example';

const meta = { title: 'Screens/Flow' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const initialOrders: CreatedOrder[] = Array.from({ length: 36 }, (_, index) => ({
  id: `ORD-${20465 + index}`, name: `기존 상품 ${index + 1}`, site: 'site-0', qty: '10', delivery: 'normal', memo: '', owner: '김민수',
}));
function memoryStorage(): ReturnStorage {
  const values = new Map<string, string>();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: key => { values.delete(key); } };
}
function OrderFlow() {
  const [storage] = React.useState(memoryStorage);
  const ret = useReturnContext({ key: 'create-flow-orders', storage });
  const [orders, setOrders] = React.useState(initialOrders);
  const [creating, setCreating] = React.useState(false);
  const [filter, setFilter] = React.useState('');
  const savedFilter = React.useRef('');
  const [notifications, setNotifications] = React.useState(false);
  const [restored, setRestored] = React.useState<ReturnRecord | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const returnToList = (created?: CreatedOrder) => {
    const record = ret.consume();
    if (created) {
      setOrders(previous => [created, ...previous]);
      // 기존 필터는 보존한다. 새 행은 목록에서 별도로 포함하고, 결과를 바로 확인하도록 맨 위로 간다.
      setFilter(savedFilter.current);
      setRestored({ ...record, itemKey: created.id, scrollTop: 0, at: Date.now() });
    } else { setFilter(savedFilter.current); setRestored(record); }
    setCreating(false);
  };
  return <main className="mx-auto min-w-0 max-w-6xl space-y-4"><Toaster />
    {creating ? <OrderCreateScreen notifications={notifications} setNotifications={setNotifications}
      onBack={() => returnToList()} onSave={draft => returnToList({ ...draft, id: `ORD-NEW-${orders.length - initialOrders.length + 1}` })} />
      : <CreatedOrdersList orders={orders} restored={restored} filter={filter} setFilter={setFilter} scrollRef={listRef}
        onCreate={() => {
          const scroll = listRef.current?.querySelector('[data-slot="data-table-scroll"]');
          const rows = [...(scroll?.querySelectorAll<HTMLElement>('[data-slot="data-table-row"]') ?? [])];
          const top = scroll?.getBoundingClientRect().top ?? 0;
          const firstVisible = rows.find(row => row.getBoundingClientRect().bottom > top);
          savedFilter.current = filter;
          ret.capture({ itemKey: firstVisible?.dataset.rowId ?? '', scrollTop: scroll?.scrollTop ?? 0 });
          setCreating(true);
        }} />}
  </main>;
}
export const 목록등록왕복: Story = { name: '목록 등록 왕복', render: () => <OrderFlow />, play: async ({ canvasElement: root }) => {
  await expect(within(root).getByRole('heading', { name: '주문 목록' })).toBeInTheDocument();
  root.dataset.playComplete = 'true';
} };
