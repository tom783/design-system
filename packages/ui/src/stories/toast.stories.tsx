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
// 닫기 버튼 위치·여백 검사용(docs/qa/list-screen-render-verify.mjs). 알림을 하나씩만 띄운다 —
// 쌓이면 sonner가 뒤 알림을 접어 앞 알림만 재게 되므로 매번 먼저 비운다.
const LONG_ERROR = '저장 실패: 네트워크 연결이 끊겨 주문 3건의 배송지 변경을 저장하지 못했습니다. 연결을 확인한 뒤 다시 시도하세요.';
function CloseDemo() {
  return <><Toaster />
    <Button onClick={() => { toast.dismiss(); toast.error('저장 실패'); }}>한 줄 오류</Button>
    <Button onClick={() => { toast.dismiss(); toast.error(LONG_ERROR); }}>여러 줄 오류</Button>
    <Button onClick={() => { toast.dismiss(); toast.success('저장했습니다', { closeButton: false, duration: Infinity }); }}>닫기 없는 알림</Button>
  </>;
}
export const 닫기위치: Story = { name: '토스트-닫기위치', render: () => <CloseDemo />, play: async ({ canvasElement: root }) => {
  toast.dismiss();
  await userEvent.click(within(root).getByRole('button', { name: '한 줄 오류' }));
  await expect(await within(document.body).findByRole('alert')).toHaveTextContent('저장 실패');
  // Escape는 포커스가 알림 안에 있을 때 그 알림을 닫는다(sonner 기본은 접기만 한다).
  within(document.body).getByRole('button', { name: '알림 닫기' }).focus();
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(document.querySelector('[data-sonner-toast][data-removed="false"]')).toBeNull());
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
