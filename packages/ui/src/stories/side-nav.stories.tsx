import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SideNav, SideNavGroup, SideNavItem } from '../index';
import { Building2, ClipboardList, Package, Megaphone } from '../icons';
import { SideNavExample } from '../../docs/examples/side-nav';
import primarySource from '../../docs/examples/side-nav.tsx?raw';

const meta = { title: 'Components/SideNav', component: SideNav, tags: ['autodocs'],
  parameters: { manifest: ['SideNav', 'SideNavGroup', 'SideNavItem'] } } satisfies Meta<typeof SideNav>;
export default meta;
type Story = StoryObj;

function Menu({ collapsed, many = false, controlled = false }: { collapsed?: boolean; many?: boolean; controlled?: boolean }) {
  const [value, setValue] = React.useState(false);
  return <div style={{ height: 480 }}>
    <SideNav brand="커머스 운영" brandIcon={<Building2 />} defaultCollapsed={collapsed}
      {...(controlled ? { collapsed: value, onCollapsedChange: setValue } : {})}>
      <SideNavGroup label="판매 관리">
        <SideNavItem icon={<ClipboardList />} label="주문 목록" href="#orders" current badge={36} />
        <SideNavItem icon={<Package />} label="상품 관리" asChild><a href="#products">상품 관리</a></SideNavItem>
        <SideNavItem icon={<Megaphone />} label="프로모션" disabled asChild><a href="#disabled">프로모션</a></SideNavItem>
        {many && Array.from({ length: 40 }, (_, i) => <SideNavItem key={i} icon={<Package />} label={`사업장 ${i + 1}`} href={`#site-${i}`} />)}
      </SideNavGroup>
    </SideNav>
  </div>;
}
export const 사용법: Story = { parameters: { docs: { source: { code: primarySource
  .replace("from '../../src'", "from '@s2life/ui'").replace("from '../../src/icons'", "from '@s2life/ui/icons'"), language: 'tsx', type: 'code' } } }, render: () => <SideNavExample /> };
export const 펼침: Story = { render: () => <Menu /> };
export const 접힘: Story = { render: () => <Menu collapsed /> };
export const 비활성: Story = { render: () => <Menu /> };
export const 배지: Story = { render: () => <Menu /> };
export const 제어형: Story = { render: () => <Menu controlled /> };
export const 많은항목: Story = { render: () => <Menu many /> };
