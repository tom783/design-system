import { SideNav, SideNavGroup, SideNavItem } from '../../src';
import { Building2, ClipboardList, Package, Megaphone } from '../../src/icons';

export function SideNavExample() {
  return <div style={{ height: 480 }}>
    <SideNav brand="커머스 운영" brandIcon={<Building2 />}>
      <SideNavGroup label="판매 관리">
        <SideNavItem icon={<ClipboardList />} label="주문 목록" current badge={36} asChild>
          <a href="#orders">주문 목록</a>
        </SideNavItem>
        <SideNavItem icon={<Package />} label="상품 관리" href="#products" />
        <SideNavItem icon={<Megaphone />} label="프로모션" disabled />
      </SideNavGroup>
    </SideNav>
  </div>;
}
