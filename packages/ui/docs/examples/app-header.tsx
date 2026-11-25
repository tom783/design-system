import * as React from 'react';
import { AppShell, SideNav, SideNavGroup, SideNavItem, type NotificationCenterProps } from '../../src';
import { Building2, ClipboardList, Megaphone } from '../../src/icons';
import { ContextSwitcherExample } from './context-switcher';
import { NotificationCenterExample } from './notification-center';
import { UserMenuExample } from './user-menu';

/**
 * 상단 바 — AppShell `header`(왼쪽 묶음) · `headerEnd`(오른쪽 묶음). 높이 64 고정, SideNav brand 행과 아래선이 맞는다.
 * 왼쪽: 맥락 전환기 묶음(ContextSwitcherGroup — 제품·스토어, 사이 구분선). 오른쪽: 앱 항목 → 알림 센터(벨) → 사용자 메뉴 순이고
 * 사용자 메뉴가 맨 오른쪽이다. 64 를 넘는 내용(두 줄 검색·안내 문구)은 상단 바가 아니라 본문(PageHeader 등)에 둔다.
 */
export function AppHeaderExample({ children, userName = '김철수', header, notifications }: {
  children: React.ReactNode;
  userName?: string;
  /** 왼쪽 묶음을 바꿔 끼운다(기본: 제품·스토어 전환기). */
  header?: React.ReactNode;
  /** 알림 센터 상태를 바꿔 끼운다(로딩·실패 등). */
  notifications?: Partial<NotificationCenterProps>;
}) {
  return <AppShell
    header={header ?? <ContextSwitcherExample />}
    headerEnd={<>
      <NotificationCenterExample {...notifications} />
      <UserMenuExample name={userName} organization="운영 조직" organizations={['운영 조직', '물류 조직']} />
    </>}
    sidebar={<SideNav brand="마케팅관리" brandIcon={<Megaphone />}>
      <SideNavGroup label="운영">
        <SideNavItem icon={<Megaphone />} label="캠페인" href="#campaigns" current />
        <SideNavItem icon={<ClipboardList />} label="발행 일정" href="#schedule" count={3} />
        <SideNavItem icon={<Building2 />} label="보고서" href="#reports" />
      </SideNavGroup>
    </SideNav>}>
    {children}
  </AppShell>;
}
