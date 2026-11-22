import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fireEvent, waitFor } from 'storybook/test';
import { DatePicker, type DateRange } from '../components/date-picker';
import { formatValue } from '../components/date-picker/date-value';
import { Field } from '../components/form';
import { Input } from '../components/input';
import { Button } from '../components/button';
import { ScheduledPublishExample } from '../../docs/examples/date-picker';
import primarySource from '../../docs/examples/date-picker.tsx?raw';
import { MultiSelect } from '../components/multi-select';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/select';
const meta = {
  parameters: { manifest: ['DatePicker'], },
  tags: ['autodocs'], title: 'Components/DatePicker' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const today = new Date(2026, 10, 15);

export const 사용법: Story = {
  parameters: { docs: { source: { code: primarySource.replace("from '../../src'", "from '@s2life/ui'"), language: 'tsx', type: 'code' } } },
  render: () => <ScheduledPublishExample />,
  play: ({ canvasElement }) => { canvasElement.dataset.playComplete = 'true'; },
};

function TimeExample({ step, field = false, empty = false }: { step?: 1 | 5 | 10 | 15 | 30; field?: boolean; empty?: boolean }) {
  const [date, setDate] = React.useState<Date | undefined>(empty ? undefined : new Date(2026, 10, 15, 13, 30));
  const picker = <DatePicker mode="single" time={step ? { step } : true} today={today} defaultMonth={today}
    value={date} onChange={setDate} aria-label="예약 발행일시" />;
  return <section className="flex w-fit flex-col gap-8">
    {field ? <Field label="예약 발행일시" description="브라우저 지역 시간으로 입력하세요.">{picker}</Field> : picker}
    <output data-probe="date-time-value">{formatValue(date, true)}</output>
    <Button onClick={() => setDate(new Date(2026, 10, 15, 13, 30))}>시각 초기화</Button>
  </section>;
}
const timeReady = ({ canvasElement }: { canvasElement: HTMLElement }) => { canvasElement.dataset.playComplete = 'true'; };
export const 단일시각: Story = { render: () => <TimeExample />, play: timeReady };
export const 삼십분간격: Story = { name: '시각-step 30', render: () => <TimeExample step={30} />, play: timeReady };
export const 시각첫선택: Story = { render: () => <TimeExample empty />, play: timeReady };
export const 시각필드: Story = { render: () => <TimeExample field />, play: timeReady };
export const 시각다크: Story = { globals: { theme: 'dark' }, render: () => <TimeExample field />, play: timeReady };
export const 시각오류: Story = { render: () => <TimeExample field />, play: async ({ canvasElement }) => {
  const input = within(canvasElement).getByRole('textbox');
  await userEvent.clear(input); await userEvent.type(input, '2026-11-15 25:00'); await userEvent.tab();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  // 형식은 맞고 시각이 범위를 벗어났다 — 형식 문구가 아니라 고칠 범위를 말한다.
  await expect(canvasElement).toHaveTextContent('시각은 00:00~23:59로 입력하세요.');
  canvasElement.dataset.playComplete = 'true';
} };

function ToolbarExample() {
  const [range, setRange] = React.useState<DateRange>();
  return <section className="flex flex-col gap-8">
    <div data-probe="date-toolbar" className="flex flex-wrap items-center gap-3">
      <MultiSelect aria-label="센터" className="w-auto min-w-40" options={[{ value: '이천', label: '이천센터' }, { value: '부산', label: '부산센터' }]} />
      <Select defaultValue="waiting"><SelectTrigger aria-label="출고 상태" className="w-auto min-w-40"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="waiting">대기</SelectItem><SelectItem value="shipped">출고 완료</SelectItem></SelectContent></Select>
      <DatePicker today={today} value={range} onChange={setRange} aria-label="출고 기간" />
      <Button data-probe="toolbar-button">조회</Button>
    </div>
    <output data-probe="range-value">{formatValue(range)}</output>
    <div data-probe="single-width" className="w-fit"><Demo single /></div>
  </section>;
}
function FieldExample() {
  const [range, setRange] = React.useState<DateRange>();
  const [externalError, setExternalError] = React.useState(false);
  return <section data-probe="date-fields" className="flex w-fit flex-col gap-4">
    <Field label="출고 기간" description="시작일과 종료일을 순서대로 입력하세요."
      error={externalError ? '출고 가능한 기간을 선택하세요.' : undefined}>
      <DatePicker today={today} value={range} onChange={setRange} />
    </Field>
    <Field label="담당자"><Input data-probe="after-date-field" /></Field>
    <Button data-probe="external-error" onClick={() => setExternalError(value => !value)}>업무 오류 전환</Button>
    <Button data-probe="clear-date" onClick={() => setRange({ from: today, to: today })}>정상 값으로 교체</Button>
  </section>;
}
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

// 검증용 스토리는 맨 뒤에 둔다 — 첫 스토리가 문서의 대표 예시가 된다.
export const 툴바정렬: Story = { render: () => <ToolbarExample />, play: ({ canvasElement }) => { canvasElement.dataset.playComplete = 'true'; } };
export const 필드오류공유: Story = { render: () => <FieldExample />, play: ({ canvasElement }) => { canvasElement.dataset.playComplete = 'true'; } };
