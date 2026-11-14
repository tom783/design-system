import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Thumbnail } from '../components/thumbnail';
import { Button } from '../components/button';
const meta = { title: 'Components/Thumbnail', component: Thumbnail, args: { alt: '상품 사진' } } satisfies Meta<typeof Thumbnail>;
export default meta;
type Story = StoryObj<typeof meta>;
function FailureExample() {
  const [src, setSrc] = React.useState<string>();
  return <div className="max-w-48"><Thumbnail src={src} alt="상품 사진" ratio="1/1" /><p data-slot="after-thumbnail">상품명</p><Button onClick={() => setSrc('data:image/png;base64,broken')}>이미지 요청</Button></div>;
}
export const 썸네일_실패: Story = {
  render: () => <FailureExample />,
  play: async ({ canvasElement }) => {
    const thumb = canvasElement.querySelector('[data-slot="thumbnail"]')!;
    const before = thumb.getBoundingClientRect().height;
    const afterY = canvasElement.querySelector('[data-slot="after-thumbnail"]')!.getBoundingClientRect().top;
    // MutationObserver는 이미지 이벤트보다 먼저 로딩 커밋을 관찰한다. 전환 중 치수도 복사한다.
    const snapshots: { state: string | undefined; height: number; afterY: number; skeleton: boolean }[] = [];
    const observer = new MutationObserver(() => snapshots.push({
      state: (thumb as HTMLElement).dataset.state,
      height: thumb.getBoundingClientRect().height,
      afterY: canvasElement.querySelector('[data-slot="after-thumbnail"]')!.getBoundingClientRect().top,
      skeleton: Boolean(thumb.querySelector('[data-slot="skeleton"]')),
    }));
    observer.observe(thumb, { attributes: true, childList: true, subtree: true });
    await userEvent.click(within(canvasElement).getByRole('button', { name: '이미지 요청' }));
    await waitFor(() => expect(canvasElement.querySelector('[data-slot="thumbnail-fallback"]')).toBeVisible());
    await expect(within(canvasElement).getByRole('img', { name: '상품 사진' })).toBeVisible();
    await expect(thumb.getBoundingClientRect().height).toBe(before);
    await expect(canvasElement.querySelector('[data-slot="after-thumbnail"]')!.getBoundingClientRect().top).toBe(afterY);
    observer.disconnect();
    await expect(snapshots.some(s => s.state === 'loading' && s.skeleton)).toBe(true);
    await expect(snapshots.every(s => s.height === before && s.afterY === afterY)).toBe(true);
    await expect(canvasElement.querySelector('img')).toBeNull();
    canvasElement.dataset.playComplete = 'true';
  },
};
export const 썸네일_빈src: Story = {
  render: () => <div className="max-w-48"><Thumbnail src="" alt="상품 사진 없음" /></div>,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('img', { name: '상품 사진 없음' })).toBeVisible();
    await expect(canvasElement.querySelector('img')).toBeNull();
    await expect(canvasElement.querySelector('[data-slot="skeleton"]')).toBeNull();
    await expect(canvasElement.querySelector('[data-slot="thumbnail"]')).toHaveAttribute('aria-busy', 'false');
    canvasElement.dataset.playComplete = 'true';
  },
};
export const 썸네일_성공: Story = {
  render: () => <div className="max-w-48"><Thumbnail src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="상품 사진" ratio="4/3" /></div>,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('[data-slot="thumbnail"]')).toHaveAttribute('data-state', 'loaded'));
    await expect(within(canvasElement).getByRole('img', { name: '상품 사진' })).toBeVisible();
    await expect(canvasElement.querySelector('[data-slot="skeleton"]')).toBeNull();
    canvasElement.dataset.playComplete = 'true';
  },
};
