import * as React from 'react';
import { AppShell, Button, SideNav, SideNavGroup, SideNavItem } from '../../src';
import { Bell, Building2, ClipboardList, Megaphone } from '../../src/icons';
import { UserMenuExample } from './user-menu';

/**
 * 상단 바 — AppShell `header`(왼쪽 묶음) · `headerEnd`(오른쪽 묶음). 높이 64 고정, SideNav brand 행과 아래선이 맞는다.
 * 오른쪽 묶음은 앱 항목 → 알림 → 사용자 메뉴 순이고 사용자 메뉴가 맨 오른쪽이다. 64 를 넘는 내용(두 줄 검색·안내 문구)은
 * 상단 바가 아니라 본문(PageHeader 등)에 둔다. 왼쪽의 맥락 전환기는 아직 부품이 없어 여기서는 지금 맥락을 글자로만 보인다.
 */
export function AppHeaderExample({ children, userName = '김철수' }: { children: React.ReactNode; userName?: string }) {
  return <AppShell
    header={<span className="truncate text-[length:var(--text-body-sm)] font-semibold">마케팅관리 · 스토어 A</span>}
    headerEnd={<>
      {/* 알림 진입: ghost iconOnly 38(1024 미만 44), 아이콘 20, 0건이면 낭독 "알림". */}
      <Button variant="ghost" iconOnly aria-label="알림" className="[&_svg]:size-5 max-lg:size-[var(--tap-min)]">
        <Bell aria-hidden="true" />
      </Button>
      <UserMenuExample name={userName} organization="운영 조직" organizations={['운영 조직', '물류 조직']} />
    </>}
    sidebar={<SideNav brand="마케팅관리" brandIcon={<Megaphone />}>
      <SideNavGroup label="운영">
        <SideNavItem icon={<Megaphone />} label="캠페인" href="#campaigns" current />
        <SideNavItem icon={<ClipboardList />} label="발행 일정" href="#schedule" />
        <SideNavItem icon={<Building2 />} label="보고서" href="#reports" />
      </SideNavGroup>
    </SideNav>}>
    {children}
  </AppShell>;
}
