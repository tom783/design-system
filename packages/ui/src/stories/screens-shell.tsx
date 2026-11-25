/**
 * Screens 스토리 공통 — 셸과 가상 주문 데이터.
 *
 * 정식 부품(AppShell·SideNav)과 상단 바 예시(docs/examples/app-header.tsx)만 조립한다. 스토리 전용 CSS·덮어쓰기는 두지 않는다 —
 * 화면이 부품 기본값 그대로 어떻게 보이는지가 이 스토리의 목적이다.
 * 기준: 2026-11-22 화면 시안(목록 T34·상세 D2·대시보드) 디자인 검토 확정안 · 상단 바 64(0.7.0, DESIGN.md §24.7).
 * 데이터는 한국어 쇼핑몰 관리자 가상 데이터다(실제 회사·인물 아님).
 */
import * as React from 'react';
import { AppShell, SideNav, SideNavGroup, SideNavItem } from '../index';
import {
  ChartColumn, ClipboardList, MessageSquare, Package, RotateCcw, Settings, Store, Users,
} from '../icons';
import { appHeader } from '../../docs/examples/app-header';

export type NavKey = 'dashboard' | 'orders' | 'products';

/**
 * 상단 바 64(Screens/AppHeader 와 같은 묶음 — 제품·스토어 전환기 · 알림 벨 · 사용자 메뉴) + SideNav 240px + 본문(AppShell 기본 여백 24px).
 * 스토어 관리 화면이라 지금 제품은 판매관리다. 1440×900 기준으로 검토했다.
 */
export function StoreShell({ current, children }: { current: NavKey; children: React.ReactNode }) {
  return <AppShell {...appHeader({ product: 'sales' })} sidebar={
    <SideNav brand="스토어 관리" brandIcon={<Store />}>
      <SideNavGroup label="판매">
        <SideNavItem icon={<ChartColumn />} label="대시보드" href="#dashboard" current={current === 'dashboard'} />
        <SideNavItem icon={<ClipboardList />} label="주문 관리" href="#orders" current={current === 'orders'} badge={86} />
        <SideNavItem icon={<Package />} label="상품 관리" href="#products" current={current === 'products'} />
        <SideNavItem icon={<RotateCcw />} label="반품·교환" href="#returns" badge={7} />
      </SideNavGroup>
      <SideNavGroup label="고객">
        <SideNavItem icon={<Users />} label="고객 목록" href="#customers" />
        <SideNavItem icon={<MessageSquare />} label="상품 문의" href="#inquiries" badge={12} />
      </SideNavGroup>
      <SideNavGroup label="설정">
        <SideNavItem icon={<Settings />} label="스토어 설정" href="#settings" />
      </SideNavGroup>
    </SideNav>
  }>{children}</AppShell>;
}

export type OrderStatus = 'paid' | 'ready' | 'shipping' | 'done' | 'cancel';
export const STATUS: Record<OrderStatus, { label: string; tone: 'info' | 'warning' | 'success' | 'danger' | 'neutral' }> = {
  paid: { label: '결제 완료', tone: 'info' },
  ready: { label: '출고 대기', tone: 'warning' },
  shipping: { label: '배송 중', tone: 'neutral' },
  done: { label: '배송 완료', tone: 'success' },
  cancel: { label: '취소 요청', tone: 'danger' },
};

export interface Order {
  id: string; orderedAt: Date; recipient: string; product: string; amount: number; payment: string; status: OrderStatus;
}

const recipients = ['김민수', '박서연', '이도윤', '최지우', '정하은', '강서준', '윤지아', '한도현', '오세린', '임태오'];
const products = [
  '무선 블루투스 이어폰', '면 100% 라운드 티셔츠', '스테인리스 텀블러 500ml', '유기농 그래놀라 1kg',
  '소가죽 카드 지갑', '3단 자동 우산', '충전식 LED 무드등', '경량 캠핑 의자', '극세사 담요 대형', '세라믹 머그컵 2개입',
];
const payments = ['신용카드', '간편결제', '계좌이체', '간편결제', '신용카드'];
const statusCycle: OrderStatus[] = ['ready', 'paid', 'ready', 'shipping', 'done', 'ready', 'cancel', 'paid', 'done', 'shipping'];
const amounts = [38900, 12900, 64500, 21800, 129000, 45600, 8900, 247300, 33000, 1284500];

/** 기준 시각. 결정적 데이터를 위해 고정한다(2026-11-15 18:59). */
export const NOW = new Date(2026, 10, 15, 18, 59);

/** 최근 30일 주문 1,284건. 최신순이며 id 는 ORD-20481 부터 내려간다. */
export const orders: Order[] = Array.from({ length: 1284 }, (_, i) => {
  const extra = (i * 7) % 4;
  return {
    id: `ORD-${20481 - i}`,
    // 30일 동안 고르게 퍼뜨린다. 한 건마다 약 33분 앞선다.
    orderedAt: new Date(NOW.getTime() - i * 33 * 60_000 - ((i * 13) % 17) * 60_000),
    recipient: recipients[i % recipients.length]!,
    product: extra ? `${products[i % products.length]} 외 ${extra}건` : products[i % products.length]!,
    amount: amounts[i % amounts.length]! + (Math.floor(i / 10) % 5) * 1000,
    payment: payments[i % payments.length]!,
    status: statusCycle[i % statusCycle.length]!,
  };
});

export const won = (value: number) => `${value.toLocaleString('ko-KR')}원`;
const pad = (value: number) => String(value).padStart(2, '0');
/** 2026-11-15 18:59 — 표의 일시 열은 고정폭 숫자로 정렬한다. */
export const dateTime = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
