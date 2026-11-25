import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { NotificationCenter, type NotificationItem } from '../index';
import { NotificationCenterExample } from '../../docs/examples/notification-center';
import primarySource from '../../docs/examples/notification-center.tsx?raw';

/**
 * 알림 센터 + 알림 진입(벨)(상단 바 규격 4·5절 · Figma 223:977 패널 · 223:1139 8상태 · 223:1579 상태 보정 · 223:2044 좁은 폭 Sheet).
 * 상태 표 행마다 스토리 하나(P9). 벨: 0 · 1~99 · 99+ · 급함 · 개수 실패 · 열림. 패널: 로딩 · 비어 있음 · 실패 · 더 불러오기 ·
 * 다음 목록 로딩 · 목록 끝 · 새 알림 도착 · 모두 읽음 뒤. 1024 이상은 팝오버, 미만은 Sheet 로 열린다. 문서 페이지에서는 닫아 둔다.
 */
const meta = { title: 'Components/NotificationCenter', component: NotificationCenter, tags: ['autodocs'],
  parameters: { manifest: ['NotificationCenter'] } } satisfies Meta<typeof NotificationCenter>;
export default meta;
type Story = StoryObj;
type Context = { viewMode?: string };
const opened = (context: Context) => context.viewMode !== 'docs';
/** 상단 바 오른쪽 끝처럼 — 벨을 오른쪽에 두고 아래로 패널이 열릴 높이를 둔다. */
const Bar = ({ children, open = false }: { children: React.ReactNode; open?: boolean }) =>
  <div className="flex items-start justify-end" style={{ minHeight: open ? '34rem' : undefined }}>{children}</div>;

/** 기준 시각 2026-11-25 14:20 — 상대 시각("방금"·"12분 전"·"어제"·"11.22"·"2025.11.24")이 매번 같게. */
const NOW = new Date(2026, 10, 25, 14, 20).getTime();
const minute = 60_000;
const urgentCancel: NotificationItem = { id: 'cancel', source: '판매관리 · 스토어 A', title: '취소 요청 2건', time: NOW, href: '#cancel',
  urgent: true, count: 2, deadline: { text: '2시간 초과', level: 'overdue' } };
const newOrders: NotificationItem = { id: 'orders', source: '판매관리 · 스토어 A', title: '신규 주문 37건', time: NOW - 12 * minute, href: '#orders',
  count: 37, deadline: { text: '4시간 남음' } };
const panel = (props: Partial<React.ComponentProps<typeof NotificationCenterExample>>, context: Context) =>
  <Bar open={opened(context)}><NotificationCenterExample now={NOW} defaultOpen={opened(context)} {...props} /></Bar>;

export const 사용법: Story = {
  parameters: { docs: { source: { code: primarySource.replace("from '../../src'", "from '@s2life/ui'"), language: 'tsx', type: 'code' } } },
  render: () => <Bar><NotificationCenterExample /></Bar>,
};

// 벨(알림 진입) — ghost iconOnly 38(1024 미만 44) · 아이콘 20 · 표식 중심 = 아이콘 오른쪽 위 모서리 (+6, −6).
/** 0 — 표식 없음, 낭독 "알림". */
export const 벨_0: Story = { render: () => <Bar><NotificationCenter count={0} /></Bar> };
/** 1~99 — 낭독 "알림, 안 읽음 3개". */
export const 벨_숫자: Story = { render: () => <Bar><NotificationCenter count={3} /></Bar> };
/** 99+ — 낭독 "알림, 안 읽음 99개 이상". */
export const 벨_상한: Story = { render: () => <Bar><NotificationCenter count={128} /></Bar> };
/** 급함 — 위험 알약 + 점, 낭독 끝에 ", 급한 알림 있음". */
export const 벨_급함: Story = { render: () => <Bar><NotificationCenter count={2} urgent /></Bar> };
/** 개수 실패 — 숫자를 숨긴다(0 으로 보이지 않는다). 낭독 "알림". */
export const 벨_개수실패: Story = { render: () => <Bar><NotificationCenter count={null} /></Bar> };
/** 열림 — aria-expanded · 선택 바탕. 패널은 대화상자 "알림", 제목에 초점. */
export const 벨_열림: Story = { render: (_, context) => panel({ items: [urgentCancel, newOrders] }, context) };

/** 로딩 — 스켈레톤 4줄. */
export const 로딩: Story = { render: (_, context) => panel({ state: 'loading' }, context) };
/** 비어 있음 — EmptyState, 탭별 문구는 앱이 준다. */
export const 비어있음: Story = { render: (_, context) => panel({ items: [] }, context) };
/** 실패 — ErrorState + 다시 시도. */
export const 실패: Story = { render: (_, context) => panel({ state: 'error', onRetry: () => {} }, context) };
/** 더 불러오기 — 맨 아래 버튼. */
export const 더불러오기: Story = { render: (_, context) => panel({
  items: [{ ...newOrders, time: NOW - 24 * 60 * minute }], hasMore: true, onLoadMore: () => {} }, context) };
/** 다음 목록 로딩 — 버튼 자리에 스피너 + "불러오는 중". */
export const 다음목록로딩: Story = { render: (_, context) => panel({
  items: [{ ...newOrders, read: true, time: new Date(2026, 10, 22, 9, 30).getTime() }], hasMore: true, loadingMore: true }, context) };
/** 목록 끝 — 마지막 알림 바로 아래 "더 이상 알림이 없습니다". */
export const 목록끝: Story = { render: (_, context) => panel({
  items: [{ ...newOrders, read: true, time: new Date(2025, 10, 24, 9, 30).getTime() }] }, context) };
/** 새 알림 도착 — 목록 맨 위 고정 줄 "새 알림 2개 · 보기". 목록은 저절로 밀리지 않는다. */
export const 새알림도착: Story = { render: (_, context) => panel({ items: [newOrders], pendingCount: 2, onShowPending: () => {} }, context) };
/** 모두 읽음 뒤 — 점·굵기는 빠지고, 급함 아이콘과 초과 기한은 남는다(미처리 유지). */
export const 모두읽음뒤: Story = { render: (_, context) => panel({ count: 0,
  items: [{ ...urgentCancel, read: true }, { ...newOrders, read: true }] }, context) };
export const 다크: Story = { globals: { theme: 'dark' }, render: (_, context) => panel({ items: [urgentCancel, newOrders] }, context) };
