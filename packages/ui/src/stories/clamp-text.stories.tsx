import { ClampTextExample } from '../../docs/examples/clamp-text';
import primarySource from '../../docs/examples/clamp-text.tsx?raw';
import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { ClampText } from '../index';

const shortText = '당일 출고 상품입니다.';
const longText = '주문하신 상품은 결제 확인 후 순서대로 출고됩니다. 재고와 포장 상태를 확인하고 배송 준비가 끝나면 운송장 번호를 알려드립니다. 도서 산간 지역은 배송에 시간이 더 필요하며 자세한 일정은 담당자에게 문의해 주세요. '.repeat(3);
const meta = {
  tags: ['autodocs'],
  parameters: { manifest: ['ClampText'] }, title: 'Components/ClampText', component: ClampText,
  decorators: [(Story) => <div style={{ width: 360, maxWidth: '100%' }}><Story /></div>],
} satisfies Meta<typeof ClampText>;
export default meta;
type Story = StoryObj<typeof meta>;
const done = (root: HTMLElement) => { root.dataset.playComplete = 'true'; };
const ready = async (root: HTMLElement) => {
  await waitFor(() => expect(root.querySelector('[data-slot="clamp-text-trigger"]')).not.toBeNull()); done(root);
};
export const 사용법: Story = {
  parameters: { docs: { source: {
    code: primarySource.replace("from '../../src'", "from '@s2life/ui'"),
    language: 'tsx', type: 'code',
  } } },
  render: () => <ClampTextExample />,
};

export const 짧은글: Story = {
  render: () => <ClampText>{shortText}</ClampText>,
  play: async ({ canvasElement: root }) => {
    await document.fonts.ready;
    await expect(root.querySelector('[data-slot="clamp-text-trigger"]')).toBeNull(); done(root);
  },
};
export const 긴글: Story = {
  render: () => <ClampText>{longText}</ClampText>,
  play: async ({ canvasElement: root }) => {
    await waitFor(() => expect(root.querySelector('[data-slot="clamp-text-trigger"]')).not.toBeNull());
    await userEvent.click(within(root).getByRole('button', { name: '더보기' }));
    await expect(within(root).getByRole('button', { name: '간략히' })).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(within(root).getByRole('button', { name: '간략히' })); done(root);
  },
};
export const 세줄: Story = { render: () => <ClampText lines={3}>{longText}</ClampText>, play: async ({ canvasElement }) => ready(canvasElement) };
export const 좁은폭: Story = { render: () => <div style={{ width: 240 }}><ClampText>{longText}</ClampText></div>, play: async ({ canvasElement }) => ready(canvasElement) };
// 42개 한글 글자는 360px 두 줄·240px 세 줄·640px 한 줄로 폭 변화의 경계를 재현한다.
export const 폭변화: Story = {
  render: () => <div data-probe="width" style={{ width: 360 }}><ClampText>{'상품배송안내'.repeat(7)}</ClampText></div>,
  play: async ({ canvasElement: root }) => { await document.fonts.ready; done(root); },
};
function LaterText({ ref }: { ref: React.Ref<{ toggle: () => void }> }) {
  const [longer, setLonger] = React.useState(false);
  React.useImperativeHandle(ref, () => ({ toggle: () => setLonger(value => !value) }), []);
  return <span>{longer ? longText : '결제 확인 후 출고합니다.\n배송 일정은 별도 안내합니다.'}</span>;
}
function LaterDemo() {
  const text = React.useRef<{ toggle: () => void }>(null);
  // 자식만 렌더하므로 ClampText의 효과 재실행 없이 MutationObserver를 검증한다.
  return <><button data-probe="replace" type="button" onClick={() => text.current?.toggle()}>내용 길이 바꾸기</button>
    <ClampText style={{ whiteSpace: 'pre-line' }}><LaterText ref={text} /></ClampText></>;
}
export const 나중에긴글: Story = {
  render: () => <LaterDemo />,
  play: async ({ canvasElement: root }) => {
    await document.fonts.ready;
    await expect(root.querySelector('[data-slot="clamp-text-trigger"]')).toBeNull(); done(root);
  },
};
function ControlledDemo() {
  const [expanded, setExpanded] = React.useState(false);
  return <ClampText expanded={expanded} onExpandedChange={setExpanded} moreLabel="설명 펼치기" lessLabel="설명 접기">{longText}</ClampText>;
}
export const 제어: Story = { render: () => <ControlledDemo />, play: async ({ canvasElement }) => ready(canvasElement) };
export const 여러글: Story = {
  render: () => <div style={{ display: 'grid', gap: 16 }}>
    <ClampText>상품 설명: {longText}</ClampText><ClampText>배송 비고: {longText}</ClampText></div>,
  play: async ({ canvasElement: root }) => {
    await waitFor(() => expect(root.querySelectorAll('[data-slot="clamp-text-trigger"]')).toHaveLength(2)); done(root);
  },
};

export const Nowrap조상: Story = {
  name: 'nowrap 조상',
  render: () => <div style={{ whiteSpace: 'nowrap', overflowWrap: 'normal', width: '20rem' }}>
    <ClampText lines={1}>{longText} https://example.com/{'unbroken-url-segment'.repeat(30)}</ClampText>
  </div>,
  play: async ({ canvasElement }) => ready(canvasElement),
};
