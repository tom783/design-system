import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { RadioGroup, RadioGroupItem, Label } from '../index';

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
