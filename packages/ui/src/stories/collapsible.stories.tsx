import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Collapsible, CollapsibleTrigger, CollapsibleContent, Input } from '../index';

const meta = {
  parameters: { manifest: ['Collapsible', 'CollapsibleTrigger', 'CollapsibleContent'], },
  tags: ['autodocs'], title: 'Components/Collapsible', component: Collapsible,
  decorators: [(Story) => <div style={{ maxWidth: 480 }}><Story /></div>],
} satisfies Meta<typeof Collapsible>;
export default meta;
type Story = StoryObj<typeof meta>;
const done = (root: HTMLElement) => { root.dataset.playComplete = 'true'; };

export const 기본: Story = {
  render: () => <Collapsible><CollapsibleTrigger>고급 설정</CollapsibleTrigger>
    <CollapsibleContent><p>자동 출고 시 사용할 창고와 포장 방식을 설정합니다.</p></CollapsibleContent></Collapsible>,
  play: async ({ canvasElement: root }) => {
    const trigger = within(root).getByRole('button', { name: '고급 설정' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(trigger);
    await waitFor(() => expect(root.querySelector('[data-slot="collapsible-content"]')?.textContent).toBeFalsy());
    done(root);
  },
};
export const 기본열림: Story = {
  render: () => <Collapsible defaultOpen><CollapsibleTrigger>배송 정책</CollapsibleTrigger>
    <CollapsibleContent><p>평일 오후 두 시 이전 주문은 당일 출고합니다.</p></CollapsibleContent></Collapsible>,
  play: async ({ canvasElement: root }) => {
    await expect(within(root).getByRole('button')).toHaveAttribute('aria-expanded', 'true'); done(root);
  },
};
function FormDemo() {
  const [open, setOpen] = React.useState(true);
  return <Collapsible open={open} onOpenChange={setOpen}>
    <CollapsibleTrigger>{open ? '창고 설정 접기' : '창고 설정 펼치기'}</CollapsibleTrigger>
    <CollapsibleContent forceMount><label>기본 창고<Input defaultValue="서울 창고" /></label></CollapsibleContent>
  </Collapsible>;
}
export const 폼유지: Story = {
  render: () => <FormDemo />,
  play: async ({ canvasElement: root }) => {
    const canvas = within(root), input = canvas.getByRole('textbox');
    await userEvent.clear(input); await userEvent.type(input, '부산 창고');
    await userEvent.click(canvas.getByRole('button'));
    await waitFor(() => expect(input).not.toBeVisible());
    await userEvent.click(canvas.getByRole('button'));
    // 숨은 입력은 포커스가 안 되어 clear 가 실패한다. 보일 때까지 기다린다.
    await waitFor(() => expect(input).toBeVisible());
    await expect(input).toHaveValue('부산 창고');
    await userEvent.clear(input); await userEvent.type(input, '서울 창고'); done(root);
  },
};
export const 모션줄이기: Story = {
  ...기본열림,
  parameters: { docs: { description: { story: 'OS의 모션 줄이기 설정을 따릅니다. 하네스에서 reduce를 에뮬레이션해 지속시간 0을 확인합니다.' } } },
};
