import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, waitFor } from 'storybook/test';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/select';
import { Field, FormFlow } from '../components/form';
import { Input } from '../components/input';
import { Button } from '../components/button';
const meta = { title: 'Components/Select' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const 툴바필터: Story = {
  name: '툴바 필터',
  parameters: { docs: { description: { story: 'Field 안에서는 w-full이 기본이다. 툴바에서는 w-auto와 최소 폭으로 필터가 남은 행 너비를 독차지하지 않게 한다.' } } },
  render: () => <div className="flex flex-wrap items-center gap-2">
    <Input aria-label="주문 검색" placeholder="주문번호 검색" className="w-auto min-w-40 flex-1" />
    <Select defaultValue="all"><SelectTrigger aria-label="주문 상태" className="w-auto min-w-40"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="all">전체 상태</SelectItem><SelectItem value="ready">준비 중</SelectItem><SelectItem value="done">배송 완료</SelectItem></SelectContent>
    </Select>
    <Button>내보내기</Button>
  </div>,
  // 이 파일의 스토리는 전부 완료 표식을 세운다. list-screen 하네스가 그걸 요구한다.
  play: async ({ canvasElement: root }) => {
    const canvas = within(root);
    const trigger = canvas.getByRole('combobox', { name: '주문 상태' });
    const box = trigger.getBoundingClientRect(), row = root.firstElementChild!.getBoundingClientRect();
    // 툴바에서는 필터가 남은 폭을 독차지하지 않는다. 그게 이 스토리의 요지다.
    await expect(box.width).toBeLessThan(row.width / 2);
    await expect(Math.round(box.height)).toBe(38);
    root.dataset.playComplete = 'true';
  },
};
function StatusSelect(props: React.ComponentProps<typeof Select>) {
  return <Select {...props}><SelectTrigger aria-label="주문 상태"><SelectValue placeholder="상태 선택" /></SelectTrigger>
    <SelectContent><SelectItem value="all">전체</SelectItem><SelectItem value="ready">준비 중</SelectItem><SelectItem value="done">배송 완료</SelectItem></SelectContent></Select>;
}
export const 기본: Story = { name: '셀렉트-기본', render: () => <StatusSelect />, play: async ({ canvasElement: root }) => {
  const trigger = within(root).getByRole('combobox');
  await userEvent.click(trigger); await expect(within(document.body).getByRole('listbox')).toHaveAttribute('data-slot', 'select-content');
  await userEvent.click(within(document.body).getByRole('option', { name: '준비 중' })); await expect(trigger).toHaveTextContent('준비 중');
  trigger.focus(); await userEvent.keyboard('{Enter}'); await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await userEvent.keyboard('{Escape}'); await expect(trigger).toHaveFocus(); root.dataset.playComplete = 'true';
} };
export const 필드: Story = { name: '셀렉트-Field', render: () => <Field label="상태" description="주문 처리 단계" error="상태를 선택하세요" required><StatusSelect /></Field>, play: async ({ canvasElement: root }) => {
  const trigger = within(root).getByRole('combobox'); const label = root.querySelector('label')!;
  await expect(trigger.id).toBe(label.htmlFor); await expect(trigger).toHaveAttribute('aria-invalid', 'true');
  await expect(trigger).toHaveAttribute('aria-describedby', `${root.querySelector('[data-slot="field-error"]')!.id} ${root.querySelector('[data-slot="field-description"]')!.id}`);
  await userEvent.click(label);
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(within(document.body).getByRole('listbox')).toBeVisible();
  // Radix는 열린 모달 밖의 트리거를 aria-hidden 처리하고 목록으로 포커스를 옮긴다.
  // Escape로 닫은 뒤 라벨에 연결된 원래 트리거로 포커스가 복귀하는지 검사한다.
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
  await waitFor(() => expect(trigger).toHaveFocus()); root.dataset.playComplete = 'true';
} };
export const 폼흐름: Story = { name: '셀렉트-폼흐름', render: () => <FormFlow><StatusSelect /><Input aria-label="다음 칸" /></FormFlow>, play: async ({ canvasElement: root }) => {
  const trigger = within(root).getByRole('combobox');
  const next = within(root).getByRole('textbox', { name: '다음 칸' });
  trigger.focus(); await expect(trigger).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const listbox = within(document.body).getByRole('listbox');
  await waitFor(() => expect(listbox.contains(document.activeElement)).toBe(true));
  await expect(next).not.toHaveFocus();
  // 열린 동안 캔버스는 aria-hidden이다. 닫은 뒤 접근 가능한 역할과 복귀 포커스도 확인한다.
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
  await waitFor(() => expect(trigger).toHaveFocus());
  await expect(within(root).getByRole('textbox', { name: '다음 칸' })).toBe(next);
  root.dataset.playComplete = 'true';
} };
export const 높이일치: Story = { name: '셀렉트-높이일치', render: () => <div className="flex items-start gap-2"><Input aria-label="검색" /><StatusSelect /></div>, play: async ({ canvasElement: root }) => {
  const input = within(root).getByRole('textbox').getBoundingClientRect().height;
  const select = within(root).getByRole('combobox').getBoundingClientRect().height;
  await expect(select).toBe(input); await expect(select).toBe(38); root.dataset.heights = `${input}/${select}`; root.dataset.playComplete = 'true';
} };
