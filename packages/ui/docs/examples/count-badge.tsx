import * as React from 'react';
import { CountBadge, SideNav, SideNavGroup, SideNavItem, Tabs, TabsList, TabsTrigger } from '../../src';
import { ClipboardList, Megaphone, ShoppingCart } from '../../src/icons';

/**
 * 개수 표식 — 벨·SideNav 항목·Tabs 가 같은 부품을 쓴다. 0 과 불러오기 실패(null)는 숨기고, 100 이상은 "99+"(낭독 "99개 이상").
 * 급함은 위험 색 + 점(색만으로 알리지 않는다). SideNav·Tabs 는 `count`·`countUrgent` 로 넘긴다 — 접힌 레일에서는 점 8 이다.
 */
export function CountBadgeExample() {
  return <div className="flex flex-wrap items-start gap-8">
    <div className="flex items-center gap-4">
      <CountBadge count={7} />
      <CountBadge count={37} />
      <CountBadge count={120} />
      <CountBadge count={2} urgent />
    </div>
    <Tabs defaultValue="todo">
      <TabsList aria-label="알림 분류">
        <TabsTrigger value="todo" count={3} countUrgent>처리 필요</TabsTrigger>
        <TabsTrigger value="all" count={42}>전체</TabsTrigger>
      </TabsList>
    </Tabs>
    <div className="h-56 w-60">
      <SideNav brand="판매관리" brandIcon={<ShoppingCart />}>
        <SideNavGroup label="할 일">
          <SideNavItem icon={<ClipboardList />} label="검토할 상품" href="#review" count={37} current />
          <SideNavItem icon={<Megaphone />} label="확인할 알림" href="#alerts" count={2} countUrgent />
        </SideNavGroup>
      </SideNav>
    </div>
  </div>;
}
