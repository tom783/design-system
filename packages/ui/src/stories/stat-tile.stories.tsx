import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatTile } from '../index';
import { StatTileExample } from '../../docs/examples/stat-tile';
import primarySource from '../../docs/examples/stat-tile.tsx?raw';

const meta = { title: 'Components/StatTile', component: StatTile, tags: ['autodocs'],
  parameters: { manifest: ['StatTile'] } } satisfies Meta<typeof StatTile>;
export default meta;
type Story = StoryObj;
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 16 };

export const 사용법: Story = {
  parameters: { docs: { source: { code: primarySource.replace("from '../../src'", "from '@s2life/ui'"), language: 'tsx', type: 'code' } } },
  render: () => <StatTileExample />,
};
export const 기본: Story = { render: () => <StatTileExample /> };
export const 증감: Story = { render: () => <div style={grid}>
  {(['up', 'down', 'none'] as const).flatMap(goodDirection => [12, -12, 0].map(delta =>
    <StatTile key={`${goodDirection}-${delta}`} label={`${goodDirection} 기준 ${delta}`} value={1284} unit="건" delta={delta} deltaLabel="전일 대비" goodDirection={goodDirection} />))}
</div> };
export const 반품률: Story = { render: () => <StatTile label="반품률" value={1.8} unit="%" delta={-0.4} deltaFormat="absolute" deltaUnit="%p" deltaLabel="전일 대비" goodDirection="down" /> };
export const 긴값: Story = { render: () => <div style={grid}>
  <StatTile label="누적 매출" value={1284000000000} unit="원" delta={1284000} deltaFormat="absolute" deltaUnit="원" deltaLabel="전월 대비" />
  <StatTile label="누적 주문" value={1284000} unit="건" />
  <StatTile label="서식화한 매출" value="1,284,000,000원" compactValue="12.8억원" />
  <StatTile label="통화 서식" value={1284000000} format={{ style: 'currency', currency: 'KRW' }} />
</div> };
export const 좁은폭: Story = { render: () => <div style={{ width: 200, maxWidth: '100%', ...grid }}>
  <StatTile label="오늘 주문" value={1284} unit="건" delta={12} deltaLabel="전일 대비" />
  <StatTile label="큰 매출" value={1284000000000} unit="원" delta={-12} deltaLabel="전일 대비" />
  <StatTile label="만 단위 주문" value={1284000} unit="건" />
  <StatTile label="미축약 최대 주문" value={-9999} unit="건" />
  <StatTile label="아주 긴 원문" value="1,284,000,000원" compactValue="12.8억원" />
</div> };
function States() {
  const [retried, setRetried] = useState(false);
  return <div style={grid}>
    <StatTile label="오늘 주문" state="loading" href="#orders" value={999} delta={8} />
    <StatTile label="결제 금액" state={retried ? 'idle' : 'error'} value={1284000} unit="원" onRetry={() => setRetried(true)} href="#payment" />
    <StatTile label="누적 매출" value={Number.NaN} />
  </div>;
}
export const 로딩오류: Story = { render: () => <States /> };
// 실제 앱 라우터와 같은 단일 자식 링크 계약을 보여준다.
function AppLink(props: React.ComponentProps<'a'>) { return <a {...props} />; }
export const 링크: Story = { render: () => <div style={grid}>
  <StatTile label="오늘 주문" value={1284} unit="건" delta={12} deltaLabel="전일 대비" href="#orders" />
  <StatTile label="오늘 매출" value={1284000} unit="원" asChild><AppLink href="#sales" /></StatTile>
</div> };
export const 다크: Story = { globals: { theme: 'dark' }, render: () => <StatTileExample /> };
