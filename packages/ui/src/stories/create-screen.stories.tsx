import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Combobox, Field, Label, RadioGroup, RadioGroupItem, Switch, Toaster } from '../index';
import { CreatedOrdersList, OrderCreateScreen, type CreatedOrder } from './create-screen-example';

const meta = { title: 'Screens/CreateScreen' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
function CreateScreen({ restart = false }: { restart?: boolean }) {
  const [creating, setCreating] = React.useState(true);
  const [orders, setOrders] = React.useState<CreatedOrder[]>([]);
  const [filter, setFilter] = React.useState('');
  const [notifications, setNotifications] = React.useState(false);
  const [outside, setOutside] = React.useState('');
  const [outsideSwitch, setOutsideSwitch] = React.useState(false);
  const outsideNormal = React.useId(), outsideExpress = React.useId();
  return <main className="mx-auto min-w-0 max-w-6xl space-y-4"><Toaster />
    {creating ? <OrderCreateScreen restart={restart} notifications={notifications} setNotifications={setNotifications}
      onBack={() => setCreating(false)} onSave={draft => {
        setOrders(previous => [{ ...draft, id: `ORD-NEW-${previous.length + 1}` }, ...previous]);
        if (!restart) setCreating(false);
      }} /> : <CreatedOrdersList orders={orders} filter={filter} setFilter={setFilter} onCreate={() => setCreating(true)} />}
    <section data-probe="outside-form" className="space-y-2 border-t border-line pt-4" aria-label="폼 밖 선택 예제">
      <p>폼 밖 사업장 선택 — 선택 후 이 버튼에 머뭅니다.</p>
      <Combobox aria-label="폼 밖 사업장" options={[{ value: 'seoul', label: '서울 본사' }, { value: 'busan', label: '부산 지점' }]} value={outside} onValueChange={setOutside} />
      <Field label="폼 밖 알림"><Switch data-probe="outside-switch" checked={outsideSwitch} onCheckedChange={setOutsideSwitch} /></Field>
      <RadioGroup aria-label="폼 밖 배송" defaultValue="normal">
        <div className="flex items-center gap-2"><RadioGroupItem id={outsideNormal} data-probe="outside-normal" value="normal" /><Label htmlFor={outsideNormal}>일반 배송</Label></div>
        <div className="flex items-center gap-2"><RadioGroupItem id={outsideExpress} data-probe="outside-express" value="express" /><Label htmlFor={outsideExpress}>빠른 배송</Label></div>
      </RadioGroup>
    </section>
  </main>;
}
const ready: Story['play'] = async ({ canvasElement: root }) => {
  await expect(within(root).getByRole('heading', { name: '주문 등록' })).toBeInTheDocument();
  await expect(root.querySelector('[data-probe="qty"]')).toHaveAttribute('type', 'text');
  root.dataset.playComplete = 'true';
};
export const 등록화면: Story = { render: () => <CreateScreen />, play: ready };
export const 연속등록: Story = { render: () => <CreateScreen restart />, play: ready };
