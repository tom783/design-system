import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';
import { Avatar } from '../components/avatar';
const meta = { title: 'Components/Avatar', component: Avatar, args: { name: '김철수' } } satisfies Meta<typeof Avatar>;
export default meta;
type Story = StoryObj<typeof meta>;
export const 아바타_이니셜: Story = {
  render: () => <div className="flex gap-4">{['김철수', '김연', 'John Doe', 'Jane', '😀', ''].map((name) => <Avatar name={name} key={name} />)}</div>,
  play: async ({ canvasElement }) => {
    const expected = ['철수', '김연', 'JD', 'J', '😀', ''];
    const fallbacks = canvasElement.querySelectorAll('[data-slot="avatar-fallback"]');
    await expect(fallbacks).toHaveLength(expected.length);
    for (const [i, node] of Array.from(fallbacks).entries()) await expect(node.textContent).toBe(expected[i]);
    await expect(within(canvasElement).getByRole('img', { name: '김철수' })).toBeVisible();
    canvasElement.dataset.playComplete = 'true';
  },
};
export const 아바타_이미지실패: Story = {
  args: { name: '김철수', src: "data:image/png;base64,broken" },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('[data-slot="avatar-fallback"]')).toHaveTextContent('철수'));
    await expect(within(canvasElement).getByRole('img', { name: '김철수' })).toBeVisible();
    await expect(canvasElement.querySelector('img')).toBeNull();
    canvasElement.dataset.playComplete = 'true';
  },
};
export const 크기와_장식: Story = {
  render: () => <div className="flex items-center gap-4">{(['sm', 'md', 'lg'] as const).map((size) => <Avatar key={size} name="김철수" size={size} />)}<Avatar name="김철수" decorative /><span>김철수</span></div>,
  play: async ({ canvasElement }) => {
    const nodes = canvasElement.querySelectorAll('[data-slot="avatar"]');
    for (const [i, height] of [32, 38, 44].entries()) await expect(nodes[i]!.getBoundingClientRect().height).toBe(height);
    await expect(nodes[3]).toHaveAttribute('aria-hidden', 'true');
    canvasElement.dataset.playComplete = 'true';
  },
};
