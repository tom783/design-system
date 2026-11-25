import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { ContextSwitcher, ContextSwitcherGroup, Toaster, toast } from '../index';
import { Store } from '../icons';
import { ContextSwitcherExample, ProductSwitcher, StoreSwitcher, storeItems } from '../../docs/examples/context-switcher';
import primarySource from '../../docs/examples/context-switcher.tsx?raw';

/**
 * 맥락 전환기(상단 바 규격 2절 · Figma 223:483 10상태 · 223:737 선택 실패 · 223:1766 좁은 폭 · 223:1923 맥락 목록).
 * 상태 표 행마다 스토리 하나(P9): 닫힘 · 열림 · 항목 1개 · 많음(검색) · 검색 결과 없음 · 목록 로딩 · 목록 실패 · 선택 진행 중 ·
 * 선택 실패 · 비활성 항목 + 좁은 폭(둘째 아이콘 · "맥락" 접기). 열린 상태는 문서 페이지에서 닫아 둔다(문서를 덮지 않게).
 */
const meta = { title: 'Components/ContextSwitcher', component: ContextSwitcher, tags: ['autodocs'],
  parameters: { manifest: ['ContextSwitcher', 'ContextSwitcherGroup'] } } satisfies Meta<typeof ContextSwitcher>;
export default meta;
type Story = StoryObj;
type Context = { viewMode?: string };
const opened = (context: Context) => context.viewMode !== 'docs';
/** 상단 바 왼쪽 자리처럼 — 트리거 아래로 패널이 열릴 높이를 둔다(문서에서는 닫혀 있어 높이가 내용대로다). */
const Frame = ({ children, open = false }: { children: React.ReactNode; open?: boolean }) =>
  <div className="flex items-start" style={{ minHeight: open ? '28rem' : undefined }}>{children}</div>;
const many = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map(name => ({ value: name.toLowerCase(), label: `스토어 ${name}`, icon: <Store /> }));
const done = (root: HTMLElement) => { root.dataset.playComplete = 'true'; };

export const 사용법: Story = {
  parameters: { docs: { source: { code: primarySource.replace("from '../../src'", "from '@s2life/ui'").replace("from '../../src/icons'", "from '@s2life/ui/icons'"), language: 'tsx', type: 'code' } } },
  render: () => <ContextSwitcherExample />,
};
/** 닫힘 — 트리거 38(1024 미만 44): 아이콘 20 + 현재 값 14 600 + 화살표 16. 낭독 "스토어: 스토어 A". */
export const 닫힘: Story = { render: () => <Frame><StoreSwitcher /></Frame> };
/** 열림 — "전체" 맨 위 + 구분선 · 지금 항목 = 선택 바탕 + 600 + 체크 · 맨 아래 안내 줄. */
export const 열림: Story = { render: (_, context) => <Frame open={opened(context)}><StoreSwitcher defaultOpen={opened(context)} /></Frame> };
/** 고를 것이 하나면 버튼이 아니라 정적 글자다(초점 안 받음, 화살표 없음). 낭독 "현재 스토어: 스토어 A". */
export const 항목1개: Story = { render: () => <Frame>
  <ContextSwitcher kind="스토어" items={[storeItems[0]!]} defaultValue="a" />
</Frame> };
/** 많음 — 항목이 기준(기본 8) 이상이면 패널 맨 위에 검색(sm 32). 목록만 스크롤(최대 높이 400). */
export const 많음_검색: Story = { render: (_, context) => <Frame open={opened(context)}>
  <StoreSwitcher items={many} defaultOpen={opened(context)} />
</Frame> };
/** 검색 결과 없음 — "일치하는 스토어가 없습니다". */
export const 검색결과없음: Story = {
  render: (_, context) => <Frame open={opened(context)}><StoreSwitcher items={many} defaultOpen={opened(context)} /></Frame>,
  play: async ({ canvasElement: root }) => {
    const input = await within(document.body).findByRole('textbox', { name: '스토어 검색' });
    await waitFor(() => expect(document.activeElement).toBe(input));
    await userEvent.type(input, '스토어 Z');
    await within(document.body).findByText('일치하는 스토어가 없습니다');
    done(root);
  },
};
/** 목록 로딩 — 스켈레톤 3줄. */
export const 목록로딩: Story = { render: (_, context) => <Frame open={opened(context)}>
  <StoreSwitcher state="loading" defaultOpen={opened(context)} />
</Frame> };
/** 목록 실패 — ErrorState 작게 + 다시 시도(열면 다시 시도에 초점). */
export const 목록실패: Story = { render: (_, context) => <Frame open={opened(context)}>
  <StoreSwitcher state="error" onRetry={() => {}} defaultOpen={opened(context)} />
</Frame> };
/** 선택 진행 중 — 고르면 패널을 닫고 트리거의 아이콘 자리에 스피너 16 + 새 값. 끝날 때까지 다시 열리지 않는다. */
export const 선택진행중: Story = {
  render: () => <Frame><StoreSwitcher onValueChange={() => new Promise(() => {})} /></Frame>,
  play: async ({ canvasElement: root }) => {
    await userEvent.click(within(root).getByRole('button', { name: '스토어: 스토어 A' }));
    await userEvent.click(await within(document.body).findByRole('menuitemradio', { name: '스토어 B' }));
    await waitFor(() => expect(within(root).getByRole('button', { name: '스토어: 스토어 B' })).toHaveAttribute('aria-busy', 'true'));
    done(root);
  },
};
/** 선택 실패 — 원래 값(스토어 A)으로 돌아오고 오류 토스트 "스토어를 바꾸지 못했습니다"(닫을 때까지). Figma 223:527 · 223:740. */
export const 선택실패: Story = {
  render: () => <><Frame><StoreSwitcher onValueChange={() => new Promise((_, reject) => setTimeout(() => reject(new Error('실패')), 300))} /></Frame><Toaster /></>,
  play: async ({ canvasElement: root }) => {
    toast.dismiss();
    await userEvent.click(within(root).getByRole('button', { name: '스토어: 스토어 A' }));
    await userEvent.click(await within(document.body).findByRole('menuitemradio', { name: '스토어 B' }));
    await waitFor(() => expect([...document.querySelectorAll('[data-sonner-toast][data-mounted="true"]')]
      .some(item => item.textContent?.includes('스토어를 바꾸지 못했습니다'))).toBe(true));
    await expect(within(root).getByRole('button', { name: '스토어: 스토어 A' })).not.toHaveAttribute('aria-busy');
    done(root);
  },
};
/** 비활성 항목 — 흐린 글자(--text-disabled), 고를 수 없다. 초점·호버에 사유 툴팁. */
export const 비활성항목: Story = {
  render: (_, context) => <Frame open={opened(context)}>
    <StoreSwitcher items={storeItems.map(item => item.value === 'b' ? { ...item, disabled: true, disabledReason: '지금은 선택할 수 없습니다' } : item)}
      defaultOpen={opened(context)} />
  </Frame>,
  play: async ({ canvasElement: root }) => {
    const item = await within(document.body).findByRole('menuitemradio', { name: '스토어 B' });
    await waitFor(() => expect(document.querySelector('[data-slot="context-switcher-content"]')?.getAnimations().every(a => a.playState === 'finished')).toBe(true));
    item.focus();
    await waitFor(() => expect(document.querySelector('[role="tooltip"]:popover-open')).toHaveTextContent('지금은 선택할 수 없습니다'));
    done(root);
  },
};
/** 긴 이름 — 트리거 최대 폭 240 에서 말줄임, 초점·호버에 전체 이름 툴팁(P8). 목록 항목도 말줄임 + 전체 이름(title). */
const LONG = '서울 강남 플래그십 스토어 · 온라인 전용 지점';
export const 긴이름: Story = {
  render: () => <Frame><ContextSwitcher kind="스토어" defaultValue="long"
    items={[{ value: 'long', label: LONG, icon: <Store /> }, ...storeItems]} /></Frame>,
  play: async ({ canvasElement: root }) => {
    within(root).getByRole('button', { name: `스토어: ${LONG}` }).focus();
    await waitFor(() => expect(document.querySelector('[role="tooltip"]:popover-open')).toHaveTextContent(`스토어: ${LONG}`));
    done(root);
  },
};
/** 좁은 자리 — 두 전환기가 들어가지 않으면 "맥락" 한 트리거로 접고 종류별 하위 목록(Figma 223:1923). 1024 미만은 둘째가 아이콘만. */
export const 좁은폭: Story = { render: (_, context) => <div style={{ inlineSize: '12rem', minHeight: opened(context) ? '26rem' : undefined }}>
  <ContextSwitcherGroup><ProductSwitcher /><StoreSwitcher /></ContextSwitcherGroup>
</div> };
export const 다크: Story = { globals: { theme: 'dark' }, render: (_, context) => <Frame open={opened(context)}>
  <StoreSwitcher defaultOpen={opened(context)} />
</Frame> };
