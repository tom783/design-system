import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fireEvent, waitFor } from 'storybook/test';
import { DatePicker, type DateRange } from '../components/date-picker';
import { formatValue } from '../components/date-picker/date-value';
const meta = {
  parameters: { manifest: ['DatePicker'], },
  tags: ['autodocs'], title: 'Components/DatePicker' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const today = new Date(2026, 10, 15);
async function pickDay(date: string) {
  // DayPicker의 td도 data-day를 가진다. 선택 핸들러는 내부 button에만 있으므로
  // 셀을 클릭하면 상태가 바뀌지 않는다. 포털이 마운트된 뒤 실제 조작 대상을 누른다.
  const button = await waitFor(() => {
    const day = document.querySelector<HTMLButtonElement>(`button[data-slot="calendar-day"][data-day="${date}"]`);
    expect(day).toBeVisible();
    return day!;
  });
  await userEvent.click(button);
}
function Demo({ single = false }: { single?: boolean }) {
  const [range, setRange] = React.useState<DateRange>(); const [date, setDate] = React.useState<Date>();
  return <><DatePicker today={today} defaultMonth={today} aria-label="주문 기간"
    {...(single ? { mode: 'single' as const, value: date, onChange: setDate } : { mode: 'range' as const, value: range, onChange: setRange })} />
    <output>{formatValue(single ? date : range)}</output></>;
}
export const 기간선택: Story = { name: '날짜-기간선택', render: () => <Demo />, play: async ({ canvasElement: root }) => {
  await userEvent.click(within(root).getByRole('button', { name: '달력 열기' }));
  await pickDay('2026-11-10');
  await pickDay('2026-11-15');
  await expect(root.querySelector('output')).toHaveTextContent('2026-11-10 ~ 2026-11-15');
  await userEvent.click(within(document.body).getByRole('button', { name: '완료' }));
  await waitFor(() => expect(document.querySelector('[data-slot="calendar"]')).toBeNull());
  await expect(within(root).getByRole('textbox', { name: '주문 기간' })).toHaveValue('2026-11-10 ~ 2026-11-15');
  root.dataset.playComplete = 'true';
} };
export const 빠른선택: Story = { name: '날짜-빠른선택', render: () => <Demo />, play: async ({ canvasElement: root }) => {
  await userEvent.click(within(root).getByRole('button', { name: '달력 열기' }));
  await userEvent.click(within(document.body).getByRole('button', { name: '최근 7일' }));
  await expect(root.querySelector('output')).toHaveTextContent('2026-11-09 ~ 2026-11-15'); root.dataset.playComplete = 'true';
} };
export const 한국어: Story = { name: '날짜-한국어', render: () => <Demo />, play: async ({ canvasElement: root }) => {
  await userEvent.click(within(root).getByRole('button', { name: '달력 열기' }));
  const calendar = document.querySelector('[data-slot="calendar"]')!;
  await expect(calendar).toHaveTextContent('2026년 11월');
  await expect([...calendar.querySelectorAll('th')].map(el => el.textContent)).toEqual(['일', '월', '화', '수', '목', '금', '토']);
  await userEvent.keyboard('{Escape}'); root.dataset.playComplete = 'true';
} };
export const 직접입력: Story = { name: '날짜-직접입력-IME', render: () => <Demo />, play: async ({ canvasElement: root }) => {
  const input = within(root).getByRole('textbox'); input.focus();
  await fireEvent.compositionStart(input); await fireEvent.input(input, { target: { value: '2026-11-01 ~ 2026-11-15' } });
  await fireEvent.keyDown(input, { key: 'Enter' }); await expect(root.querySelector('output')).toBeEmptyDOMElement();
  await fireEvent.compositionEnd(input); await userEvent.keyboard('{Enter}');
  await expect(root.querySelector('output')).toHaveTextContent('2026-11-01 ~ 2026-11-15');
  await userEvent.clear(input); await userEvent.type(input, '2026-02-30 ~ 2026-03-01'); await userEvent.tab();
  await expect(input).toHaveAttribute('aria-invalid', 'true'); root.dataset.playComplete = 'true';
} };
export const 단일날짜: Story = { name: '날짜-단일', render: () => <Demo single />, play: async ({ canvasElement: root }) => {
  await userEvent.click(within(root).getByRole('button', { name: '달력 열기' }));
  await pickDay('2026-11-12');
  await expect(root.querySelector('output')).toHaveTextContent('2026-11-12');
  await waitFor(() => expect(document.querySelector('[data-slot="calendar"]')).toBeNull());
  await expect(within(root).getByRole('textbox', { name: '주문 기간' })).toHaveValue('2026-11-12');
  root.dataset.playComplete = 'true';
} };
