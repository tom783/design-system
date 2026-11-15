import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Switch, Label } from '../index';

const meta = { title: 'Components/Switch', component: Switch } satisfies Meta<typeof Switch>;
export default meta;
type Story = StoryObj<typeof meta>;
function Setting({ disabled = false }: { disabled?: boolean }) {
  const [checked, setChecked] = React.useState(false);
  return <div className="flex items-center gap-3">
    <Switch id="stock-auto" checked={checked} onCheckedChange={setChecked} disabled={disabled} />
    <Label htmlFor="stock-auto">자동 재고 차감</Label>
    <output aria-live="polite">{checked ? '켜짐 · 즉시 적용됨' : '꺼짐'}</output>
  </div>;
}
export const 켜짐꺼짐: Story = {
  render: () => <Setting />,
  play: async ({ canvasElement: root }) => {
    const canvas = within(root), node = canvas.getByRole('switch');
    await expect(node).not.toBeChecked();
    await userEvent.click(node);
    await expect(node).toBeChecked();
    await userEvent.click(node);
    await expect(node).not.toBeChecked();
    root.dataset.playComplete = 'true';
  },
};
export const 비활성: Story = {
  render: () => <div className="grid gap-4"><Setting disabled />
    <div className="flex items-center gap-3"><Switch id="notice" disabled defaultChecked /><Label htmlFor="notice">주문 알림</Label></div>
  </div>,
  play: async ({ canvasElement: root }) => {
    for (const node of within(root).getAllByRole('switch')) await expect(node).toBeDisabled();
    root.dataset.playComplete = 'true';
  },
};
export const 레이블나란히: Story = {
  render: () => <Setting />,
  play: async ({ canvasElement: root }) => {
    const canvas = within(root), node = canvas.getByRole('switch');
    await userEvent.click(canvas.getByText('자동 재고 차감'));
    await waitFor(() => expect(node).toBeChecked());
    await userEvent.click(canvas.getByText('자동 재고 차감'));
    await waitFor(() => expect(node).not.toBeChecked());
    root.dataset.playComplete = 'true';
  },
};
