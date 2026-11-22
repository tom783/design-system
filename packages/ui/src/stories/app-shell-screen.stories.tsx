import type { Meta, StoryObj } from '@storybook/react-vite';
import { AppShell, SideNav, SideNavGroup, SideNavItem, PageHeader, Button } from '../index';
import { Building2, ClipboardList } from '../icons';
import { AppShellExample } from '../../docs/examples/app-shell';

const meta = { title: 'QA/AppShell', parameters: { fullBleed: true } } satisfies Meta;
export default meta;
type Story = StoryObj;
export const 라이트: Story = { globals: { theme: 'light' }, render: () => <AppShellExample /> };
export const 다크: Story = { ...라이트, globals: { theme: 'dark' } };
export const 긴메뉴와본문: Story = { render: () => <AppShell
  header={<span>커머스 운영 센터</span>} contentMaxWidth={960}
  sidebar={<SideNav brand="커머스 운영" brandIcon={<Building2 />}><SideNavGroup label="사업장">
    {Array.from({ length: 50 }, (_, i) => <SideNavItem key={i} icon={<ClipboardList />} label={`사업장 ${i + 1}`} href={`#site-${i}`} current={i === 0} />)}
    <SideNavItem icon={<ClipboardList />} label="정산" disabled asChild><a href="#disabled">정산</a></SideNavItem>
  </SideNavGroup></SideNav>}>
  <div className="flex min-w-0 flex-col gap-6">
  <PageHeader title="주문 목록" description="사업장별 주문을 확인합니다." actions={<Button>내보내기</Button>} />
  <div>
  {Array.from({ length: 40 }, (_, i) => <p key={i} className="py-4">주문 처리 안내 {i + 1}</p>)}
  </div>
  </div>
</AppShell> };
