import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '../components/button';
import { Tooltip, Hint, Tour, useTour, type TourStep } from '../components/guide';

const meta = { title: 'Components/Guide', parameters: { layout: 'padded' },
  decorators: [(Story) => <div style={{ padding: 'var(--space-80) var(--space-40)' }}><Story /></div>],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const bubble = (root: HTMLElement) => root.querySelector<HTMLElement>('[data-slot="guide-bubble"]')!;
const opened = (root: HTMLElement) => expect(bubble(root).matches(':popover-open')).toBe(true);
const closed = (root: HTMLElement) => expect(bubble(root).matches(':popover-open')).toBe(false);
const complete = (root: HTMLElement) => { root.dataset.playComplete = 'true'; };

export const 툴팁_기본: Story = {
  render: () => <Tooltip content="주문이 창고에 접수된 시각"><Button aria-label="설명">?</Button></Tooltip>,
  play: async ({ canvasElement: root }) => {
    const button = within(root).getByRole('button');
    await userEvent.hover(button); await closed(root);
    await sleep(200); await closed(root);
    await waitFor(() => opened(root));
    await expect(document.activeElement).not.toBe(bubble(root));
    await userEvent.unhover(button);
    await waitFor(() => closed(root));
    await userEvent.hover(button); await waitFor(() => opened(root));
    await userEvent.keyboard('{Escape}'); await closed(root);
    await userEvent.unhover(button); complete(root);
  },
};
export const 툴팁_포커스: Story = {
  render: 툴팁_기본.render,
  play: async ({ canvasElement: root }) => {
    const button = within(root).getByRole('button');
    // 한 프레임 뒤 확인하여 400ms 호버 타이머로 포커스를 구현한 회귀를 잡는다.
    button.focus(); await sleep(30); await opened(root);
    await expect(button).toHaveFocus();
    await expect(button.getAttribute('aria-describedby')).toBe(bubble(root).id);
    complete(root);
  },
};
export const 툴팁_테이블안: Story = {
  render: () => <div data-testid="scroll" style={{ overflow: 'auto', height: 'var(--space-64)', width: '100%', border: 'var(--border-width) solid var(--border-subtle)' }}>
    <Tooltip content="스크롤 영역 밖에도 온전히 표시됩니다"><Button>표 안의 설명</Button></Tooltip><div style={{ height: 'var(--space-96)' }} />
  </div>,
  play: async ({ canvasElement: root }) => {
    within(root).getByRole('button').focus(); await waitFor(() => opened(root)); await sleep(180);
    const container = within(root).getByTestId('scroll').getBoundingClientRect();
    const tip = bubble(root).getBoundingClientRect();
    await expect(tip.top < container.top || tip.bottom > container.bottom).toBe(true);
    complete(root);
  },
};
function HintDemo() {
  const [open, setOpen] = React.useState(true);
  return <Hint open={open} title="선택한 행만 내보낼 수 있습니다" body="필요한 주문을 선택하고 내보내세요." onDismiss={() => setOpen(false)} action={{ label: '지금 해보기', onClick: () => setOpen(false) }}><Button>내보내기</Button></Hint>;
}
export const 힌트: Story = {
  render: () => <HintDemo />,
  play: async ({ canvasElement: root }) => {
    await waitFor(() => opened(root));
    await expect(bubble(root)).toHaveFocus();
    const trigger = within(root).getByRole('button', { name: '내보내기' });
    await expect(trigger).toHaveAttribute('data-guide-target', 'active');
    await expect(within(root).getByRole('dialog')).toHaveAccessibleName('선택한 행만 내보낼 수 있습니다');
    await userEvent.click(within(root).getByRole('button', { name: '닫기' }));
    await closed(root); await expect(trigger).toHaveFocus(); await expect(trigger).not.toHaveAttribute('data-guide-target'); complete(root);
  },
};
const steps: TourStep[] = [1, 2, 3].map(n => ({ id: `step-${n}`, target: `#guide-step-${n}`, title: `단계 ${n}`, body: `${n}번째 기능을 직접 사용해 보세요.` }));
function TourDemo({ missing = false, count = 3, center = false }: { missing?: boolean; count?: number; center?: boolean }) {
  const [finished, setFinished] = React.useState(false);
  const [skipped, setSkipped] = React.useState<number | null>(null);
  const currentSteps = count > 3 ? [...steps, ...[4, 5].map(n => ({ ...steps[0]!, id: `step-${n}`, title: `단계 ${n}` }))] : steps;
  const tour = useTour({ steps: currentSteps.map((step, i) => missing && i === 1 ? { ...step, target: '#guide-missing' } : step),
    onFinish: () => setFinished(true), onSkip: setSkipped, onMissingTarget: center ? 'center' : 'skip' });
  return <><Button onClick={tour.start}>둘러보기</Button><div className="mt-8 flex gap-8">
    {[1, 2, 3].map(n => <Button key={n} id={`guide-step-${n}`}>기능 {n}</Button>)}</div>
    <output>{finished ? '완료됨' : skipped !== null ? `건너뜀 ${skipped}` : '시작 전'}</output><Tour {...tour} /></>;
}
export const 투어_3단계: Story = {
  render: () => <TourDemo />,
  play: async ({ canvasElement: root }) => {
    const c = within(root); await closed(root);
    const trigger = c.getByRole('button', { name: '둘러보기' });
    await userEvent.click(trigger); await waitFor(() => opened(root));
    await expect(bubble(root)).toHaveFocus();
    await expect(c.getByLabelText('진행 단계')).toHaveTextContent('1 / 3');
    await userEvent.click(c.getByRole('button', { name: '다음' }));
    await expect(c.getByLabelText('진행 단계')).toHaveTextContent('2 / 3');
    await userEvent.click(c.getByRole('button', { name: '이전' }));
    await expect(c.getByLabelText('진행 단계')).toHaveTextContent('1 / 3');
    await userEvent.click(c.getByRole('button', { name: '다음' }));
    await userEvent.click(c.getByRole('button', { name: '다음' }));
    await userEvent.click(c.getByRole('button', { name: '완료' }));
    await expect(c.getByText('완료됨')).toBeVisible(); await closed(root); await expect(trigger).toHaveFocus(); complete(root);
  },
};
export const 투어_건너뛰기: Story = {
  render: () => <TourDemo />,
  play: async ({ canvasElement: root }) => {
    const c = within(root);
    for (let index = 0; index < 3; index++) {
      await userEvent.click(c.getByRole('button', { name: '둘러보기' }));
      await waitFor(() => opened(root));
      for (let n = 0; n < index; n++) await userEvent.click(c.getByRole('button', { name: '다음' }));
      if (index === 1) await userEvent.keyboard('{Escape}');
      else await userEvent.click(c.getByRole('button', { name: index === 2 ? '닫기' : '건너뛰기' }));
      await closed(root); await expect(c.getByText(`건너뜀 ${index}`)).toBeVisible();
    }
    complete(root);
  },
};
export const 투어_대상없음: Story = {
  render: () => <TourDemo missing />,
  play: async ({ canvasElement: root }) => {
    const c = within(root); await userEvent.click(c.getByRole('button', { name: '둘러보기' }));
    await waitFor(() => opened(root)); await userEvent.click(c.getByRole('button', { name: '다음' }));
    await expect(c.getByLabelText('진행 단계')).toHaveTextContent('3 / 3');
    await expect(c.getByRole('button', { name: '기능 3' })).toHaveAttribute('data-guide-target', 'active');
    await expect(root.querySelectorAll('[data-guide-target="active"]').length).toBe(1); complete(root);
  },
};
export const 투어_단계초과: Story = {
  render: () => {
    const [show, setShow] = React.useState(false);
    return <><Button onClick={() => setShow(true)}>긴 투어 준비</Button>{show && <TourDemo count={5} />}</>;
  },
  play: async ({ canvasElement: root }) => {
    const warnings: string[] = []; const original = console.warn;
    console.warn = (...args: unknown[]) => { warnings.push(args.join(' ')); original(...args); };
    try {
      const c = within(root); await userEvent.click(c.getByRole('button', { name: '긴 투어 준비' }));
      if (import.meta.env.DEV) await expect(warnings.some(text => text.includes('72%') && text.includes('45%'))).toBe(true);
      await closed(root); await userEvent.click(c.getByRole('button', { name: '둘러보기' }));
      await waitFor(() => opened(root)); await expect(c.getByLabelText('진행 단계')).toHaveTextContent('1 / 5');
    } finally { console.warn = original; }
    complete(root);
  },
};
export const 모션_감소: Story = {
  render: 툴팁_기본.render,
  play: async ({ canvasElement: root }) => {
    within(root).getByRole('button').focus(); await waitFor(() => opened(root));
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const style = getComputedStyle(bubble(root));
      await expect(style.transitionDuration).toBe('0s'); await expect(style.translate).toBe('none'); await expect(style.opacity).toBe('1');
    }
    complete(root);
  },
};

export const 투어_중앙대체: Story = {
  render: () => <TourDemo missing center />,
  play: async ({ canvasElement: root }) => {
    const c = within(root); await userEvent.click(c.getByRole('button', { name: '둘러보기' }));
    await waitFor(() => opened(root)); await userEvent.click(c.getByRole('button', { name: '다음' }));
    await expect(c.getByLabelText('진행 단계')).toHaveTextContent('2 / 3');
    await expect(root.querySelector('[data-guide-target="active"]')).toBeNull();
    const rect = bubble(root).getBoundingClientRect();
    await expect(Math.abs(rect.x + rect.width / 2 - innerWidth / 2)).toBeLessThan(2);
    complete(root);
  },
};
function RefDemo() {
  const target = React.useRef<HTMLButtonElement>(null);
  const [events, setEvents] = React.useState(0);
  const [validRef, setValidRef] = React.useState(false);
  return <><Tooltip content="기존 참조와 설명을 보존합니다"><Button ref={target} aria-describedby="guide-existing-description"
    onFocus={() => { setEvents(n => n + 1); setValidRef(target.current === document.activeElement); }}>참조 확인</Button></Tooltip>
    <p id="guide-existing-description">원래 설명</p><output>{events} / {String(validRef)}</output></>;
}
export const 툴팁_참조병합: Story = {
  render: () => <RefDemo />,
  play: async ({ canvasElement: root }) => {
    const c = within(root); const button = c.getByRole('button');
    button.focus(); await waitFor(() => opened(root));
    await expect(c.getByText('1 / true')).toBeVisible();
    await expect(button.getAttribute('aria-describedby')?.split(' ')).toEqual(['guide-existing-description', bubble(root).id]);
    complete(root);
  },
};
function ScrollTourDemo() {
  const tour = useTour({ steps: [{ id: 'distant', target: () => document.querySelector('#guide-distant'), title: '화면 밖 기능', body: '스크롤이 끝난 뒤 표시됩니다.' }] });
  return <><Button onClick={tour.start}>먼 대상 보기</Button><div style={{ height: '200vh' }} />
    <Button id="guide-distant">먼 기능</Button><Tour {...tour} /><div style={{ height: '100vh' }} /></>;
}
export const 투어_스크롤후표시: Story = {
  render: () => <ScrollTourDemo />,
  play: async ({ canvasElement: root }) => {
    const c = within(root); await userEvent.click(c.getByRole('button', { name: '먼 대상 보기' }));
    await closed(root);
    await waitFor(() => opened(root), { timeout: 5000 });
    const target = c.getByRole('button', { name: '먼 기능' });
    const rect = target.getBoundingClientRect();
    await expect(rect.top).toBeGreaterThanOrEqual(0); await expect(rect.bottom).toBeLessThanOrEqual(innerHeight);
    await expect(target).toHaveAttribute('data-guide-target', 'active');
    complete(root);
  },
};
