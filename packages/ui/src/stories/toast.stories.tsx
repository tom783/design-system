import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, waitFor } from 'storybook/test';
import { Toaster, toast } from '../components/toast';
import { Button } from '../components/button';
const meta = {
  parameters: { manifest: ['Toaster'], },
  tags: ['autodocs'], title: 'Components/Toast' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
function Demo() { return <><Toaster /><Button onClick={() => toast.success('저장했습니다', { duration: 400 })}>성공</Button><Button onClick={() => toast.error('저장 실패', { duration: 50 })}>오류</Button></>; }
export const 성공오류: Story = { name: '토스트-성공오류', render: () => <Demo />, play: async ({ canvasElement: root }) => {
  toast.dismiss(); await userEvent.click(within(root).getByRole('button', { name: '성공' }));
  await userEvent.click(within(root).getByRole('button', { name: '오류' }));
  await expect(await within(document.body).findByRole('alert')).toHaveTextContent('저장 실패');
  await new Promise(resolve => setTimeout(resolve, 4600));
  await expect(within(document.body).getByRole('alert')).toHaveTextContent('저장 실패');
  await expect(document.querySelector('[data-type="success"]')).toBeNull();
  await userEvent.click(document.querySelector<HTMLButtonElement>('[data-type="error"] [data-close-button]')!);
  root.dataset.playComplete = 'true';
} };
export const 다크: Story = { name: '토스트-다크', render: () => <Demo />, play: async ({ canvasElement: root }) => {
  const html = document.documentElement; const previous = html.getAttribute('data-theme');
  toast.dismiss();
  toast.success('성공 테마 검증', { duration: Infinity });
  toast.error('오류 테마 검증');
  toast.info('정보 테마 검증', { duration: Infinity });
  await within(document.body).findByRole('alert');
  try {
    for (const theme of ['dark', 'light', 'system']) {
      if (theme === 'system') html.removeAttribute('data-theme'); else html.dataset.theme = theme;
      const expected = theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
      await waitFor(() => expect(document.querySelector('[data-sonner-toaster]')).toHaveAttribute('data-sonner-theme', expected));
      for (const [type, tone] of [['success', 'success'], ['error', 'danger'], ['info', 'info']]) {
        const probe = document.createElement('span');
        document.body.append(probe);
        try {
          for (const [property, token] of [['color', `--status-${tone}-fg`], ['backgroundColor', `--status-${tone}-bg`], ['borderTopColor', `--status-${tone}-fg`]] as const) {
            probe.style[property] = `var(${token})`;
            await waitFor(() => {
              const notification = document.querySelector(`[data-sonner-toast][data-type="${type}"]`);
              expect(notification).not.toBeNull();
              expect(getComputedStyle(notification!)[property]).toBe(getComputedStyle(probe)[property]);
            });
          }
        } finally { probe.remove(); }
      }
    }
  } finally { if (previous === null) html.removeAttribute('data-theme'); else html.setAttribute('data-theme', previous); toast.dismiss(); }
  root.dataset.playComplete = 'true';
} };
