import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Card, CardBody, ContextSwitcherGroup, EmptyState, Field, FormActionBar, Input, PageHeader, Toaster, toast } from '../index';
import { LockKeyhole, SearchX } from '../icons';
import { AppHeaderExample } from '../../docs/examples/app-header';
import { ProductSwitcher, StoreSwitcher } from '../../docs/examples/context-switcher';

/**
 * 상단 바(목표 75) — AppShell header 64px 고정 + 맥락 전환기 2개(ContextSwitcherGroup) + 알림 센터(벨 · CountBadge) + 사용자 메뉴 조합 +
 * 알림 토스트 + 권한 없음·찾을 수 없음.
 * 규격: 상단 바 규칙 표 r1 1~8절 · Figma 03 확정 223:740(1024 헤더 · 선택 실패) · 223:1766(768·390) · 223:1923(390 맥락 목록) ·
 * 211:10253(토스트) · 211:10254(사용자 메뉴) · 211:10255(State page). 검수 매트릭스: 라이트·다크 × 1440·1024·768·390.
 */
const meta = { title: 'Screens/AppHeader', parameters: { fullBleed: true } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const TopBarShell = AppHeaderExample;

/** 캠페인 편집 — 폼 하단 고정 액션 줄(63)까지 있는 화면. 토스트가 줄 위 16 에 서는지 본다. */
function CampaignEdit({ bar = false }: { bar?: boolean }) {
  return <div className="flex min-w-0 flex-col gap-6">
    <PageHeader title="캠페인 편집" />
    <form noValidate aria-label="캠페인 편집" className="flex min-w-0 max-w-3xl flex-col gap-6" onSubmit={event => event.preventDefault()}>
      <Card><CardBody>
        <Field label="캠페인 이름"><Input defaultValue="겨울 캠페인" /></Field>
      </CardBody></Card>
      {bar && <FormActionBar dirty onCancel={() => {}} />}
    </form>
  </div>;
}

/** 아래선이 같은 y 인지(규격 1절) — 상단 바 높이와 SideNav brand 행 아래끝을 잰다. 레일(1024 미만)에서도 같다. */
async function expectAlignedHeader(root: HTMLElement) {
  const header = root.querySelector<HTMLElement>('[data-slot="app-shell-header"]')!;
  const brand = root.querySelector<HTMLElement>('[data-slot="side-nav-brand"]')!;
  await expect(header.getBoundingClientRect().height).toBe(64);
  await expect(brand.getBoundingClientRect().bottom - header.getBoundingClientRect().bottom).toBe(0);
}

export const 헤더: Story = {
  render: () => <TopBarShell><CampaignEdit /></TopBarShell>,
  play: async ({ canvasElement: root }) => {
    await expectAlignedHeader(root);
    // 사용자 메뉴가 늘 맨 오른쪽(규격 1절) — 오른쪽 묶음에서 가장 오른쪽 버튼이다(툴팁 말풍선은 형제지만 화면 밖 층이다).
    const buttons = [...root.querySelectorAll<HTMLElement>('[data-slot="app-shell-header-end"] button')];
    const rightmost = buttons.reduce((a, b) => b.getBoundingClientRect().right > a.getBoundingClientRect().right ? b : a);
    await expect(rightmost).toHaveAttribute('aria-label', '김철수, 사용자 메뉴');
    root.dataset.playComplete = 'true';
  },
};

/** 스토어 전환 실패(Figma 223:740) — 스토어 B 로 바꾸지 못해 이전 값인 스토어 A 로 돌아오고, 오류 토스트는 닫을 때까지 남는다. */
export const 헤더_선택실패: Story = {
  render: () => <><TopBarShell header={<ContextSwitcherGroup>
    <ProductSwitcher />
    <StoreSwitcher onValueChange={() => new Promise((_, reject) => setTimeout(() => reject(new Error('실패')), 300))} />
  </ContextSwitcherGroup>}><CampaignEdit bar /></TopBarShell><Toaster /></>,
  play: async ({ canvasElement: root }) => {
    toast.dismiss();
    const trigger = () => root.querySelector<HTMLElement>('[data-slot="context-switcher"][aria-label^="스토어"], [data-slot="context-switcher-group"][data-collapsed] [data-slot="context-switcher"]')!;
    await userEvent.click(trigger());
    // 390 처럼 "맥락"으로 접혔으면 2단계 — 종류(스토어)를 고르면 그 전환기 패널로 들어간다(규격 2절 r1.2).
    if (root.querySelector('[data-slot="context-switcher-group"][data-collapsed]'))
      await userEvent.click(await within(document.body).findByRole('menuitem', { name: '스토어: 스토어 A' }));
    await userEvent.click(await within(document.body).findByRole('menuitemradio', { name: '스토어 B' }));
    await shown('스토어를 바꾸지 못했습니다');
    await waitFor(() => expect(trigger()).not.toHaveAttribute('aria-busy'));
    root.dataset.playComplete = 'true';
  },
};

/**
 * 벨 99+ · 급함 — 넓은 표식(점 6 + 간격 2 + "99+" 알약)도 오른쪽 끝이 벨 오른쪽 −6 에 고정되고 왼쪽(벨 안쪽)으로 자라
 * 사용자 메뉴와 겹치지 않는다(규격 3절 r1.2 · 2단계 규격 밖 ④). 낭독 "알림, 안 읽음 99개 이상, 급한 알림 있음".
 */
export const 헤더_벨상한급함: Story = {
  render: () => <TopBarShell notifications={{ count: 128, urgent: true }}><CampaignEdit /></TopBarShell>,
  play: async ({ canvasElement: root }) => {
    const bell = root.querySelector<HTMLElement>('[data-slot="notification-bell"]')!;
    await expect(bell).toHaveAccessibleName('알림, 안 읽음 99개 이상, 급한 알림 있음');
    const badge = bell.querySelector<HTMLElement>('[data-slot="count-badge"]')!.getBoundingClientRect();
    const user = root.querySelector<HTMLElement>('button[aria-label="김철수, 사용자 메뉴"]')!.getBoundingClientRect();
    await expect(badge.right).toBeLessThanOrEqual(user.left);
    root.dataset.playComplete = 'true';
  },
};

export const 사용자메뉴: Story = {
  render: () => <TopBarShell><CampaignEdit /></TopBarShell>,
  play: async ({ canvasElement: root }) => {
    const trigger = within(root).getByRole('button', { name: '김철수, 사용자 메뉴' });
    await userEvent.click(trigger);
    const menu = await within(document.body).findByRole('menu');
    await expect(within(menu).getByRole('menuitem', { name: '로그아웃' })).toBeInTheDocument();
    await waitFor(() => expect(menu.contains(document.activeElement)).toBe(true));
    root.dataset.playComplete = 'true';
  },
};

/** 긴 이름(Figma 217:1870): 트리거는 160 에서 말줄임, 초점·호버에 전체 이름 툴팁. 다 보이는 이름이면 툴팁을 띄우지 않는다. */
const LONG_NAME = '김철수 · 통합 운영 관리 담당자 · 야간 운영팀';
export const 사용자메뉴_긴이름: Story = {
  render: () => <TopBarShell userName={LONG_NAME}><CampaignEdit /></TopBarShell>,
  play: async ({ canvasElement: root }) => {
    const trigger = within(root).getByRole('button', { name: `${LONG_NAME}, 사용자 메뉴` });
    const label = trigger.querySelector<HTMLElement>('.max-w-40')!;
    // 1024 이상은 160 말줄임, 미만은 아바타만 — 어느 쪽이든 이름이 다 보이지 않는다.
    await expect(label.offsetParent === null || label.scrollWidth > label.clientWidth).toBe(true);
    trigger.focus();
    await waitFor(() => expect(document.querySelector('[role="tooltip"]:popover-open')).toHaveTextContent(LONG_NAME));
    root.dataset.playComplete = 'true';
  },
};

const cancel = (count: number) => `취소 요청 ${count}건 · 스토어 A`;
function ToastScreen({ bar = false }: { bar?: boolean }) {
  return <><TopBarShell><CampaignEdit bar={bar} /></TopBarShell><Toaster /></>;
}
async function shown(text: string) {
  await waitFor(() => expect([...document.querySelectorAll('[data-sonner-toast][data-mounted="true"]')]
    .some(item => item.textContent?.includes(text))).toBe(true));
}

export const 알림토스트_일반: Story = {
  render: () => <ToastScreen bar />,
  play: async ({ canvasElement: root }) => {
    toast.dismiss();
    toast.notify({ source: '판매관리 · 스토어 A', title: cancel, href: '#orders', groupKey: 'cancel:A' });
    await shown('취소 요청 1건');
    root.dataset.playComplete = 'true';
  },
};
export const 알림토스트_고정: Story = {
  render: () => <ToastScreen bar />,
  play: async ({ canvasElement: root }) => {
    toast.dismiss();
    toast.notify({ source: '판매관리 · 스토어 A', title: '환불 실패 1건', href: '#refunds', level: 'pinned' });
    await shown('환불 실패 1건');
    root.dataset.playComplete = 'true';
  },
};
export const 알림토스트_묶음: Story = {
  render: () => <ToastScreen bar />,
  play: async ({ canvasElement: root }) => {
    toast.dismiss();
    toast.notify({ source: '판매관리 · 스토어 A', title: cancel, href: '#orders', groupKey: 'cancel:A' });
    await shown('취소 요청 1건');
    toast.notify({ source: '판매관리 · 스토어 A', title: cancel, href: '#orders', groupKey: 'cancel:A', count: 2 });
    await shown('취소 요청 3건');
    await expect(document.querySelectorAll('.ds-toaster-notification [data-sonner-toast]').length).toBe(1);
    root.dataset.playComplete = 'true';
  },
};
/** 행동 결과 토스트(저장됨 등) — 닫기 버튼 1024 이상 38 · 미만 44 는 알림 토스트와 같다(규격 6절 '버튼 크기' · 답 ①). */
export const 행동결과토스트: Story = {
  render: () => <ToastScreen bar />,
  play: async ({ canvasElement: root }) => {
    toast.dismiss();
    toast.success('변경 사항을 저장했습니다', { duration: Infinity });
    await shown('변경 사항을 저장했습니다');
    root.dataset.playComplete = 'true';
  },
};
/** 저장 결과와 업무 알림이 겹치면 알림이 위다(Figma 217:1836). 둘 다 폼 하단 고정 줄 위로 올라간다. */
export const 알림토스트_겹침: Story = {
  render: () => <ToastScreen bar />,
  play: async ({ canvasElement: root }) => {
    toast.dismiss();
    toast.success('변경 사항을 저장했습니다', { duration: Infinity });
    await shown('변경 사항을 저장했습니다');
    toast.notify({ source: '판매관리 · 스토어 A', title: cancel, href: '#orders', groupKey: 'cancel:A' });
    await shown('취소 요청 1건');
    root.dataset.playComplete = 'true';
  },
};

export const 권한없음: Story = {
  render: () => <TopBarShell>
    <EmptyState size="page" graphic={<LockKeyhole />} title="이 화면을 볼 권한이 없습니다"
      description={<><strong>스토어 B</strong>에 접근할 권한이 없습니다.</>}
      action={{ label: '이전 화면으로', onClick: () => {} }}
      secondaryAction={{ label: '조직 관리자에게 요청 방법', href: '#help-permission' }} />
  </TopBarShell>,
  play: async ({ canvasElement: root }) => {
    await expectAlignedHeader(root);
    const status = root.querySelector<HTMLElement>('[data-slot="empty-state"]')!;
    await expect(status).toHaveAttribute('role', 'status');
    await expect(within(status).getByRole('heading', { level: 1 })).toHaveTextContent('이 화면을 볼 권한이 없습니다');
    root.dataset.playComplete = 'true';
  },
};
export const 찾을수없음: Story = {
  render: () => <TopBarShell>
    <EmptyState size="page" graphic={<SearchX />} title="찾을 수 없습니다" description="대상이 삭제되었거나 주소가 변경되었습니다."
      action={{ label: '이전 화면으로', onClick: () => {} }} secondaryAction={{ label: '목록으로', href: '#campaigns' }} />
  </TopBarShell>,
  play: async ({ canvasElement: root }) => {
    const status = root.querySelector<HTMLElement>('[data-slot="empty-state"]')!;
    await expect(status).toHaveAttribute('role', 'status');
    await expect(within(status).getByRole('heading', { level: 1 })).toHaveTextContent('찾을 수 없습니다');
    root.dataset.playComplete = 'true';
  },
};
