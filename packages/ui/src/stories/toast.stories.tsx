import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, waitFor } from 'storybook/test';
import { Toaster, toast } from '../components/toast';
import { Button } from '../components/button';
import { Input } from '../components/input';
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
// 닫은 뒤 포커스 복귀도 여기서 잰다: 입력 → 알림 → 닫기면 입력으로, 직전 요소가 사라졌으면 main으로 간다.
// Toaster는 main 밖에 둔다 — 복귀 대상이 알림 영역이 아니라 본문이어야 한다.
function CloseDemo() {
  return <><Toaster />
    <main aria-label="알림 닫기 검사">
      <Input aria-label="메모" defaultValue="입력 중" />
      <Button onClick={() => { toast.dismiss(); toast.error('저장 실패'); }}>한 줄 오류</Button>
      <Button onClick={() => { toast.dismiss(); toast.error(LONG_ERROR); }}>여러 줄 오류</Button>
      <Button onClick={() => { toast.dismiss(); toast.success('저장했습니다', { closeButton: false, duration: Infinity }); }}>닫기 없는 알림</Button>
    </main>
  </>;
}
export const 닫기위치: Story = { name: '토스트-닫기위치', render: () => <CloseDemo />, play: async ({ canvasElement: root }) => {
  toast.dismiss();
  await userEvent.click(within(root).getByRole('button', { name: '한 줄 오류' }));
  await expect(await within(document.body).findByRole('alert')).toHaveTextContent('저장 실패');
  // Escape는 포커스가 알림 안에 있을 때 그 알림을 닫는다(sonner 기본은 접기만 한다).
  // 포커스는 알림에 들어오기 직전 요소(방금 누른 버튼)로 돌아온다.
  const trigger = within(root).getByRole('button', { name: '한 줄 오류' });
  await expect(trigger).toHaveFocus();
  within(document.body).getByRole('button', { name: '알림 닫기' }).focus();
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(document.querySelector('[data-sonner-toast][data-removed="false"]')).toBeNull());
  await expect(trigger).toHaveFocus();
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

// 알림 토스트(toast.notify · 상단 바 규격 6절). 행동 결과 토스트와 다른 묶음(.ds-toaster-notification)이고 한 번에 하나다.
// 같은 묶음 키는 건수만 갱신하고, 출처·제목은 status 영역으로 읽힌다. 고정이 떠 있으면 일반은 띄우지 않는다.
// 셸 안 자리(폼 하단 고정 줄 위)는 Screens/AppHeader.
function NotifyDemo() {
  return <><Toaster />
    <main aria-label="알림 토스트 검사">
      <Button onClick={() => toast.notify({ source: '판매관리 · 스토어 A', title: n => `취소 요청 ${n}건 · 스토어 A`, href: '#orders', groupKey: 'cancel:A' })}>취소 요청 알림</Button>
      <Button onClick={() => toast.notify({ source: '판매관리 · 스토어 A', title: '환불 실패 1건', href: '#refunds', level: 'pinned' })}>환불 실패 알림</Button>
    </main>
  </>;
}
const notices = () => document.querySelector<HTMLElement>('.ds-toaster-notification');
export const 알림: Story = { name: '토스트-알림', render: () => <NotifyDemo />, play: async ({ canvasElement: root }) => {
  toast.dismiss();
  const trigger = within(root).getByRole('button', { name: '취소 요청 알림' });
  await userEvent.click(trigger);
  await waitFor(() => expect(notices()?.querySelector('[role="status"]')).toHaveTextContent(/판매관리 · 스토어 A\s*취소 요청 1건 · 스토어 A/));
  await expect(notices()!.closest('section')).toHaveAttribute('aria-live', 'polite');
  await userEvent.click(trigger); await userEvent.click(trigger);
  await waitFor(() => expect(notices()!.querySelector('[data-slot="toast-title"]')).toHaveTextContent('취소 요청 3건 · 스토어 A'));
  await expect(notices()!.querySelectorAll('[data-sonner-toast]')).toHaveLength(1);
  await expect(within(notices()!).getByRole('link', { name: '이동' })).toHaveAttribute('href', '#orders');
  // 다른 알림은 같은 자리를 바꾼다(한 번에 하나). 고정은 위험 톤이고 닫을 때까지 남는다.
  await userEvent.click(within(root).getByRole('button', { name: '환불 실패 알림' }));
  await waitFor(() => expect(notices()!.querySelector('[data-slot="toast-title"]')).toHaveTextContent('환불 실패 1건'));
  await expect(notices()!.querySelectorAll('[data-sonner-toast]')).toHaveLength(1);
  await expect(notices()!.querySelector('[data-sonner-toast]')).toHaveClass('ds-toast-pinned');
  // 고정이 떠 있으면 일반 알림은 띄우지 않는다(규격 6절 · 답 ⑩) — 고정이 그대로 남는다. 기록·벨 건수는 앱 몫이다.
  // 버튼을 누르지 않고 직접 부른다 — 아래 Esc 초점 복귀 검사가 '환불 실패 알림' 버튼에 초점이 있어야 한다.
  toast.notify({ source: '판매관리 · 스토어 A', title: '새 문의 1건', href: '#inquiries' });
  await new Promise(resolve => setTimeout(resolve, 200));
  await expect(notices()!.querySelectorAll('[data-sonner-toast]')).toHaveLength(1);
  await expect(notices()!.querySelector('[data-slot="toast-title"]')).toHaveTextContent('환불 실패 1건');
  await expect(notices()!.querySelector('[data-sonner-toast]')).toHaveClass('ds-toast-pinned');
  // Esc 로 닫으면 알림에 들어오기 직전 요소로 돌아온다(기존 토스트와 같다).
  const opener = within(root).getByRole('button', { name: '환불 실패 알림' });
  await expect(opener).toHaveFocus();
  within(notices()!).getByRole('button', { name: '알림 닫기' }).focus();
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(document.querySelector('.ds-toaster-notification [data-sonner-toast][data-removed="false"]')).toBeNull());
  await expect(opener).toHaveFocus();
  root.dataset.playComplete = 'true';
} };
