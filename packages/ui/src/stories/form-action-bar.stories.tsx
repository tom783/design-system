import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Field, FormActionBar, Input, Toaster } from '../index';
import { FormActionBarExample } from '../../docs/examples/form-action-bar';
import primarySource from '../../docs/examples/form-action-bar.tsx?raw';

/**
 * 폼 하단 고정 액션 줄 — 규칙 표 F-1~F-13(DESIGN.md §19.5, Figma 198:3939 r2).
 * AppShell 안의 실제 배치(본문 바닥 고정·네 폭·저장 중·오류)는 Screens/ProductCreate 에 있다. 여기서는 AppShell 밖이라
 * 좌우 여백이 0 이다(--app-shell-gutter 없음).
 */
const meta = { title: 'Components/FormActionBar', component: FormActionBar, tags: ['autodocs'],
  parameters: { manifest: ['FormActionBar'] } } satisfies Meta<typeof FormActionBar>;
export default meta;
type Story = StoryObj;

const done = (root: HTMLElement) => { root.dataset.playComplete = 'true'; };
// 문서 페이지는 스토리를 여럿 쌓는다. 포커스를 옮기거나 확인창을 여는 play 가 서로 포커스를 빼앗지 않게 문서에서는 건너뛴다.
const outsideDocs = (play: (root: HTMLElement) => Promise<void>) =>
  async ({ canvasElement, viewMode }: { canvasElement: HTMLElement; viewMode?: string }) => {
    if (viewMode !== 'docs') await play(canvasElement);
    done(canvasElement);
  };
function Frame({ children }: { children: React.ReactNode }) {
  return <form noValidate aria-label="상품 등록" className="flex max-w-3xl flex-col gap-6" onSubmit={event => event.preventDefault()}>
    <Toaster />{children}
  </form>;
}

export const 사용법: Story = {
  parameters: { docs: { source: { code: primarySource.replace("from '../../src'", "from '@s2life/ui'"), language: 'tsx', type: 'code' } } },
  render: () => <><Toaster /><FormActionBarExample /></>,
};
/** 등록 — 삭제 없음. 변경이 생기면 상태 자리에 '저장하지 않은 변경 있음'. */
export const 등록: Story = {
  render: () => <Frame><Field label="상품명" required><Input /></Field><FormActionBar dirty onCancel={() => {}} /></Frame>,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('status')).toHaveTextContent('저장하지 않은 변경 있음');
    await expect(c.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
    done(canvasElement);
  },
};
/** 저장 중 — 주요색 그대로 스피너·'저장 중…', 취소·삭제 비활성. 저장 버튼은 포커스를 잃지 않게 aria-disabled 다. */
export const 저장중: Story = {
  name: '저장 중',
  render: () => <Frame><Field label="상품명" required><Input defaultValue="경량 캠핑 의자" /></Field>
    <FormActionBar saving dirty onCancel={() => {}} onDelete={() => {}} /></Frame>,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('button', { name: '저장 중…' })).toHaveAttribute('aria-disabled', 'true');
    await expect(c.getByRole('button', { name: '취소' })).toBeDisabled();
    done(canvasElement);
  },
};
/** 저장 실패 — '오류 N개'를 누르면 첫 오류 칸으로 포커스가 간다. */
export const 오류: Story = {
  render: () => <Frame>
    <Field label="상품명" required error="상품명을 입력하세요"><Input /></Field>
    <Field label="판매가" required error="판매가를 1원 이상으로 입력하세요"><Input numeric inputMode="numeric" unit="원" defaultValue="0" /></Field>
    <FormActionBar errorCount={2} dirty onCancel={() => {}} />
  </Frame>,
  play: outsideDocs(async canvasElement => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: /^오류 2개/ }));
    await waitFor(() => expect(c.getByRole('textbox', { name: /상품명/ })).toHaveFocus());
  }),
};
/** 수정 — 삭제는 왼쪽 끝 danger 글자 버튼, 확인창(기본 포커스 '계속 편집')을 거친다. 480px 미만은 '더 보기' 메뉴로 간다. */
export const 수정: Story = {
  render: () => <Frame><Field label="상품명" required><Input defaultValue="경량 캠핑 의자" /></Field>
    <FormActionBar dirty onCancel={() => {}} onDelete={() => {}} deleteDescription="상품과 옵션·재고 정보를 삭제합니다. 삭제한 상품은 되돌릴 수 없습니다." /></Frame>,
  play: outsideDocs(async canvasElement => {
    const c = within(canvasElement), body = within(canvasElement.ownerDocument.body);
    const remove = c.getByRole('button', { name: '삭제' });
    if (remove.offsetParent !== null) {
      await userEvent.click(remove);
      const dialog = await body.findByRole('alertdialog', { name: '삭제하시겠습니까?' });
      await waitFor(() => expect(within(dialog).getByRole('button', { name: '계속 편집' })).toHaveFocus());
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(remove).toHaveFocus());
      remove.blur();
    }
  }),
};
