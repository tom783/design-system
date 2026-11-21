import { MultiSelectExample } from '../../docs/examples/multi-select';
import primarySource from '../../docs/examples/multi-select.tsx?raw';
import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor } from 'storybook/test';
import { MultiSelect, Field, FormFlow, Input, type MultiSelectProps } from '../index';

const options = ['서울본사', '부산지점', '대구창고', '수원창고', '성남지점', '서산물류']
  .map((label, index) => ({ value: `location-${index}`, label, disabled: index === 5 }));
const meta = {
  tags: ['autodocs'],
  parameters: { manifest: ['MultiSelect'] }, title: 'Components/MultiSelect', component: MultiSelect, args: { options },
  decorators: [(Story) => <div style={{ maxWidth: 480 }}><Story /></div>],
} satisfies Meta<typeof MultiSelect>;
export default meta;
type Story = StoryObj<typeof meta>;
function Demo(props: MultiSelectProps) {
  const [value, setValue] = React.useState<string[]>([]);
  return <><MultiSelect {...props} value={value} onValueChange={setValue} />
    <output data-slot="multi-select-demo-value">{JSON.stringify(value)}</output></>;
}
const done: NonNullable<Story['play']> = async ({ canvasElement }) => { canvasElement.dataset.playComplete = 'true'; };
export const 사용법: Story = {
  parameters: { docs: { source: {
    code: primarySource.replace("from '../../src'", "from '@s2life/ui'"),
    language: 'tsx', type: 'code',
  } } },
  render: () => <MultiSelectExample />,
};

export const 기본: Story = {
  render: args => <Demo {...args} aria-label="사업장" />,
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector<HTMLButtonElement>('[data-slot="multi-select-trigger"]')!;
    await userEvent.click(button);
    await waitFor(() => expect(document.querySelector('[data-slot="multi-select-list"]')).toHaveFocus());
    await userEvent.keyboard('{Enter}');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(button).toHaveFocus());
    canvasElement.dataset.playComplete = 'true';
  },
};
export const 많은옵션: Story = {
  args: { options: Array.from({ length: 60 }, (_, index) => ({ value: `site-${index}`, label: `사업장 ${index + 1}` })) },
  render: args => <Demo {...args} aria-label="전체 사업장" />, play: done,
};
export const 비활성: Story = { args: { disabled: true, value: ['location-0'] }, play: done };
export const 오류: Story = {
  render: args => <Field label="대상 사업장" error="대상 사업장을 선택하세요" required><MultiSelect {...args} invalid /></Field>, play: done,
};
export const 필드: Story = {
  render: function FieldDemo(args) {
    const [value, setValue] = React.useState<string[]>([]);
    return <FormFlow onSubmit={event => event.preventDefault()}>
      <Field label="대상 사업장" description="복수 선택할 수 있습니다" required><MultiSelect {...args} value={value} onValueChange={setValue} /></Field>
      <Input aria-label="다음 입력" /><button type="submit">저장</button>
    </FormFlow>;
  }, play: done,
};
export const 툴바필터: Story = {
  render: args => <div role="toolbar" aria-label="주문 필터" style={{ width: 320 }}><Demo {...args} placeholder="전체 사업장" />
    <p>필터를 바꿔도 아래 주문 표가 밀리지 않습니다.</p></div>, play: done,
};
