import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Textarea, Field, Input, FormFlow, Button } from '../index';

const meta = { title: 'Components/Textarea', component: Textarea,
  decorators: [(Story) => <div style={{ maxWidth: 480 }}><Story /></div>],
} satisfies Meta<typeof Textarea>;
export default meta;
type Story = StoryObj<typeof meta>;
const done = (root: HTMLElement) => { root.dataset.playComplete = 'true'; };

export const 고정행: Story = {
  render: () => <Field label="배송 비고"><Textarea placeholder="배송 시 참고할 내용을 입력하세요" /></Field>,
  play: async ({ canvasElement: root }) => {
    const node = within(root).getByRole('textbox');
    await expect(node).toHaveAttribute('rows', '3');
    await expect(getComputedStyle(node).resize).toBe('vertical');
    done(root);
  },
};
export const 자동높이: Story = {
  render: () => <Field label="상담 메모"><Textarea autoGrow rows={1} /></Field>,
  play: async ({ canvasElement: root }) => {
    const node = within(root).getByRole('textbox');
    const before = node.getBoundingClientRect().height;
    await userEvent.type(node, '첫 줄{Enter}둘째 줄{Enter}셋째 줄');
    await waitFor(() => expect(node.getBoundingClientRect().height).toBeGreaterThan(before));
    await userEvent.clear(node);
    await waitFor(() => expect(node.getBoundingClientRect().height).toBe(before));
    done(root);
  },
};
export const 높이상한: Story = {
  render: () => <Field label="긴 메모"><Textarea autoGrow rows={1} maxHeight={120} /></Field>,
  play: async ({ canvasElement: root }) => {
    const node = within(root).getByRole('textbox') as HTMLTextAreaElement;
    await userEvent.type(node, Array(12).fill('긴 메모').join('{Enter}'));
    await waitFor(() => expect(node.scrollHeight).toBeGreaterThan(node.clientHeight));
    await expect(node.getBoundingClientRect().height).toBeLessThanOrEqual(120);
    await expect(getComputedStyle(node).overflowY).toBe('auto');
    await userEvent.clear(node);
    done(root);
  },
};
function FlowDemo() {
  const [count, setCount] = React.useState(0);
  return <FormFlow noValidate onSubmit={() => { setCount(value => value + 1); }} className="grid gap-3">
    <Field label="수취인"><Input /></Field>
    <Field label="메모"><Textarea autoGrow /></Field>
    <Field label="연락처"><Input type="tel" /></Field>
    <Button type="submit">저장</Button><output aria-label="제출 횟수">{count}</output>
  </FormFlow>;
}
export const 폼흐름: Story = {
  render: () => <FlowDemo />,
  play: async ({ canvasElement: root }) => {
    const canvas = within(root), node = canvas.getByLabelText('메모');
    await userEvent.type(node, '첫 줄{Enter}둘째 줄');
    await expect(node).toHaveValue('첫 줄\n둘째 줄');
    await expect(node).toHaveFocus();
    await expect(canvas.getByLabelText('제출 횟수')).toHaveTextContent('0');
    // §11.5 — textarea 에서 Shift+Enter 는 줄바꿈이다. 칸을 넘기지 않는다.
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
    await expect(node).toHaveValue('첫 줄\n둘째 줄\n');
    await expect(node).toHaveFocus();
    await userEvent.clear(node);
    done(root);
  },
};
