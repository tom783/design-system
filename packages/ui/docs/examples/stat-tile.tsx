import { StatTile } from '../../src';

export function StatTileExample() {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 16 }}>
    <StatTile label="오늘 주문" value={1284} unit="건" delta={12} deltaLabel="전일 대비" />
    <StatTile label="결제 금액" value={1284000000} unit="원" delta={8.4} deltaLabel="전일 대비" />
    <StatTile label="출고 대기" value={312} unit="건" delta={0} deltaLabel="전일 대비" goodDirection="none" />
    <StatTile label="반품률" value={1.8} unit="%" delta={-0.4} deltaFormat="absolute" deltaUnit="%p" deltaLabel="전일 대비" goodDirection="down" />
  </div>;
}
