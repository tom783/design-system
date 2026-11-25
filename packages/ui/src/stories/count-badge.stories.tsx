import type { Meta, StoryObj } from '@storybook/react-vite';
import { CountBadge, NotificationCenter, SideNav, SideNavGroup, SideNavItem, Tabs, TabsList, TabsTrigger } from '../index';
import { ClipboardList, Megaphone, ShoppingCart } from '../icons';
import { CountBadgeExample } from '../../docs/examples/count-badge';
import primarySource from '../../docs/examples/count-badge.tsx?raw';

/**
 * 개수 표식(상단 바 규격 3절 · Figma 223:912 일반/급함 · 223:955 숫자 폭). 상태 표 행마다 스토리 하나(P9):
 * 숫자(1~99) · 상한(99+) · 급함 · 숨김(0·실패) · 점(접힌 레일). 벨 위 자리는 Components/NotificationCenter 의 벨 스토리.
 */
const meta = { title: 'Components/CountBadge', component: CountBadge, tags: ['autodocs'],
  parameters: { manifest: ['CountBadge'] } } satisfies Meta<typeof CountBadge>;
export default meta;
type Story = StoryObj;

export const 사용법: Story = {
  parameters: { docs: { source: { code: primarySource.replace("from '../../src'", "from '@s2life/ui'").replace("from '../../src/icons'", "from '@s2life/ui/icons'"), language: 'tsx', type: 'code' } } },
  render: () => <CountBadgeExample />,
};
/** 1~99 는 숫자 그대로. 같은 자릿수는 같은 폭(고정폭 숫자 — "11" 과 "88"). */
export const 숫자: Story = { render: () => <div className="flex items-center gap-4">
  <CountBadge count={1} /><CountBadge count={7} /><CountBadge count={11} /><CountBadge count={88} /><CountBadge count={99} />
</div> };
/** 100 이상은 "99+", 낭독은 "99개 이상". */
export const 상한: Story = { render: () => <div className="flex items-center gap-4">
  <CountBadge count={100} /><CountBadge count={1200} />
</div> };
/**
 * 급함 = 위험 채움 알약(위험 버튼과 같은 채움 · 흰 숫자) + 알약 왼쪽 위험색 점 6 — 색만으로 구분하지 않는다(P5). 낭독에 "급함"이 붙는다.
 * 알약 크기는 일반과 같다(높이 18 · 최소 폭 18 · 좌우 4). 벨·Tabs·SideNav 가 같은 표식을 쓴다(Figma 223:912 · 235:1604).
 */
export const 급함: Story = { render: () => <div className="flex flex-wrap items-start gap-8">
  <div className="flex items-center gap-4">
    <CountBadge count={7} /><CountBadge count={2} urgent /><CountBadge count={37} urgent /><CountBadge count={150} urgent />
  </div>
  <Tabs defaultValue="todo"><TabsList aria-label="알림 분류">
    <TabsTrigger value="todo" count={37} countUrgent>처리 필요</TabsTrigger><TabsTrigger value="all" count={42}>전체</TabsTrigger>
  </TabsList></Tabs>
  <div className="h-72 w-60">
    <SideNav brand="판매관리" brandIcon={<ShoppingCart />}>
      <SideNavGroup label="할 일">
        <SideNavItem icon={<ClipboardList />} label="취소 요청" href="#cancel" count={2} countUrgent />
        <SideNavItem icon={<Megaphone />} label="검토할 상품" href="#review" count={12} />
      </SideNavGroup>
    </SideNav>
  </div>
</div> };
/** 0 과 불러오기 실패(null)는 그리지 않는다 — 실패를 0 으로 보이지 않는다. 벨은 이름만 "알림"이다. */
export const 숨김: Story = { render: () => <div className="flex items-center gap-8">
  <NotificationCenter count={0} />
  <NotificationCenter count={null} />
  <Tabs defaultValue="todo"><TabsList aria-label="알림 분류">
    <TabsTrigger value="todo" count={0}>처리 필요</TabsTrigger><TabsTrigger value="all" count={null}>전체</TabsTrigger>
  </TabsList></Tabs>
</div> };
/**
 * 접힌 레일 — 숫자 대신 아이콘 오른쪽 위 점 8. 항목 이름이 "검토할 상품, 12개"처럼 개수를 읽는다.
 * 급함 점은 위험색 + 바탕색 링 2px(항목 바탕 — 현재 항목이면 선택 바탕)로 일반 점과 모양이 다르다(P5).
 */
export const 점_접힌레일: Story = { render: () => <div className="h-72">
  <SideNav brand="판매관리" brandIcon={<ShoppingCart />} defaultCollapsed>
    <SideNavGroup label="할 일">
      <SideNavItem icon={<ClipboardList />} label="검토할 상품" href="#review" count={12} current />
      <SideNavItem icon={<Megaphone />} label="확인할 알림" href="#alerts" count={2} countUrgent />
    </SideNavGroup>
  </SideNav>
</div> };
export const 다크: Story = { globals: { theme: 'dark' }, render: () => <CountBadgeExample /> };
