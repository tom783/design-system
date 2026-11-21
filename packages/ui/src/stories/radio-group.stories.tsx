import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { RadioGroup, RadioGroupItem, Label, Field } from '../index';

const meta = {
  parameters: { manifest: ['RadioGroup', 'RadioGroupItem'], },
  tags: ['autodocs'], title: 'Components/RadioGroup', component: RadioGroup } satisfies Meta<typeof RadioGroup>;
export default meta;
type Story = StoryObj<typeof meta>;
function Options({ disabled = false }: { disabled?: boolean }) {
  return <RadioGroup defaultValue="normal" aria-label="배송 방식" orientation="horizontal">
    {(['일반 배송', '당일 배송', '방문 수령'] as const).map((label, index) =>
      <div className="flex items-center gap-2" key={label}>
        <RadioGroupItem id={`delivery-${index}`} value={['normal', 'today', 'visit'][index]!} disabled={disabled && index === 1} />
        <Label htmlFor={`delivery-${index}`}>{label}</Label>
      </div>)}
  </RadioGroup>;
}
export const 기본: Story = {
  render: () => <Options />,
  play: async ({ canvasElement: root }) => {
    const canvas = within(root);
    await expect(canvas.getByRole('radiogroup')).toHaveAccessibleName('배송 방식');
    await expect(canvas.getByRole('radio', { name: '일반 배송' })).toBeChecked();
    root.dataset.playComplete = 'true';
  },
};
export const 레이블클릭: Story = {
  render: () => <Options />,
  play: async ({ canvasElement: root }) => {
    const canvas = within(root);
    await userEvent.click(canvas.getByText('당일 배송'));
    await waitFor(() => expect(canvas.getByRole('radio', { name: '당일 배송' })).toBeChecked());
    await userEvent.click(canvas.getByText('일반 배송'));
    await waitFor(() => expect(canvas.getByRole('radio', { name: '일반 배송' })).toBeChecked());
    root.dataset.playComplete = 'true';
  },
};
export const 비활성항목: Story = {
  render: () => <Options disabled />,
  play: async ({ canvasElement: root }) => {
    const canvas = within(root);
    await expect(canvas.getByRole('radio', { name: '당일 배송' })).toBeDisabled();
    await userEvent.click(canvas.getByText('당일 배송'));
    await expect(canvas.getByRole('radio', { name: '일반 배송' })).toBeChecked();
    root.dataset.playComplete = 'true';
  },
};

/** Field의 이름·설명·오류 연결과 소비자가 지정한 이름 우선순위를 함께 검증한다. */
function FieldGroups() {
  const id = React.useId();
  const options = (prefix: string) => <><RadioGroupItem id={`${id}-${prefix}`} value="normal" />
    <Label htmlFor={`${id}-${prefix}`}>일반 배송</Label></>;
  return <div className="space-y-4">
    <p id={`${id}-extra`}>소비자 설명</p><p id={`${id}-name`}>소비자 제목</p>
    <Field label="배송" description="배송 방식을 선택하세요" error="배송 방식을 확인하세요" required>
      <RadioGroup data-probe="field-group" aria-describedby={`${id}-extra`}>{options('field')}</RadioGroup>
    </Field>
    <Field label="기본 제목"><RadioGroup data-probe="label-override" aria-label="소비자 이름">{options('label')}</RadioGroup></Field>
    <Field label="기본 제목"><RadioGroup data-probe="labelledby-override" aria-labelledby={`${id}-name`}>{options('labelledby')}</RadioGroup></Field>
    <Field label="기본 제목"><RadioGroup data-probe="both-override" aria-label="소비자 이름" aria-labelledby={`${id}-name`}>{options('both')}</RadioGroup></Field>
  </div>;
}
export const Field연결: Story = {
  render: () => <FieldGroups />,
  play: async ({ canvasElement: root }) => {
    await expect(within(root).getByRole('radiogroup', { name: /^배송/ })).toHaveAccessibleName(/^배송/);
    root.dataset.playComplete = 'true';
  },
};
