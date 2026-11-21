import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, waitFor } from 'storybook/test';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../components/dropdown-menu';
import { Button } from '../components/button';
import { DataTable, dataTableFeatures } from '../components/data-table';
import { createColumnHelper } from '@tanstack/react-table';
const meta = {
  parameters: { manifest: ['DropdownMenu', 'DropdownMenuTrigger', 'DropdownMenuContent', 'DropdownMenuItem', 'DropdownMenuCheckboxItem', 'DropdownMenuRadioItem', 'DropdownMenuLabel', 'DropdownMenuSeparator', 'DropdownMenuShortcut', 'DropdownMenuGroup', 'DropdownMenuPortal', 'DropdownMenuSub', 'DropdownMenuSubContent', 'DropdownMenuSubTrigger', 'DropdownMenuRadioGroup'], },
  tags: ['autodocs'], title: 'Components/DropdownMenu' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
function RowMenu({ onDelete, onSave }: { onDelete?: () => void; onSave?: () => void }) {
  return <DropdownMenu><DropdownMenuTrigger asChild><Button aria-label="주문 액션" size="sm">⋯</Button></DropdownMenuTrigger>
    <DropdownMenuContent><DropdownMenuItem onSelect={onSave}>저장</DropdownMenuItem><DropdownMenuItem destructive onSelect={onDelete}>삭제</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}
function Demo() { const [result, setResult] = React.useState(''); return <><table><tbody><tr><td>주문 001</td><td><RowMenu onSave={() => setResult('저장 완료')} /></td></tr></tbody></table><output>{result}</output></>; }
export const 행액션: Story = { name: '메뉴-행액션', render: () => <Demo />, play: async ({ canvasElement: root }) => {
  await userEvent.click(within(root).getByRole('button')); await userEvent.click(within(document.body).getByRole('menuitem', { name: '저장' }));
  await expect(root.querySelector('output')).toHaveTextContent('저장 완료'); root.dataset.playComplete = 'true';
} };
export const 파괴적항목: Story = { name: '메뉴-파괴적항목', render: () => <RowMenu />, play: async ({ canvasElement: root }) => {
  await userEvent.click(within(root).getByRole('button')); const item = within(document.body).getByRole('menuitem', { name: '삭제' });
  await expect(item.querySelector('[data-slot="dropdown-menu-destructive-icon"]')).toBeInTheDocument();
  await userEvent.keyboard('{Escape}'); root.dataset.playComplete = 'true';
} };
const rows = Array.from({ length: 500 }, (_, i) => ({ id: String(i), name: `주문 ${i}` }));
const helper = createColumnHelper<typeof dataTableFeatures, typeof rows[number]>();
const columns = helper.columns([helper.accessor('name', { header: '주문' }), helper.display({ id: 'actions', header: '액션', cell: () => <RowMenu /> })]);
export const 가상화_언마운트: Story = { name: '메뉴-가상화-언마운트', render: () => <DataTable data={rows} columns={columns} getRowId={r => r.id} virtualize caption="가상화 행 액션" />, play: async ({ canvasElement: root }) => {
  const trigger = within(root).getAllByRole('button', { name: '주문 액션' })[0]!;
  trigger.focus(); await userEvent.keyboard('{Enter}'); await expect(within(document.body).getByRole('menu')).toBeInTheDocument();
  const scroll = root.querySelector<HTMLElement>('[data-slot="data-table-scroll"]')!;
  scroll.scrollTop = 12000; scroll.dispatchEvent(new Event('scroll'));
  await waitFor(() => expect(trigger.isConnected).toBe(false));
  await waitFor(() => expect(document.querySelector('[role="menu"]')).toBeNull());
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  root.dataset.focusAfterUnmount = document.activeElement?.getAttribute('data-slot') ?? document.activeElement?.tagName;
  root.dataset.playComplete = 'true';
} };
