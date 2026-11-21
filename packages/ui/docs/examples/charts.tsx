import { TrendBand } from '../../src';

const daily = [980, 1020, 940, 1110, 1180, 1220, 1284].map((orders, index) => ({
  date: new Date(2026, 10, 8 + index), orders, low: orders - 180, high: orders + 220,
}));
const summary = '11월 8일 980건에서 11월 14일 1,284건으로 주문이 증가했습니다.';

export function ChartsExample() {
  return <section aria-label="주문 현황">
    <TrendBand data={daily} x={day => day.date} y={day => day.orders}
      yLow={day => day.low} yHigh={day => day.high} title="7일 주문 추이" summary={summary} />
    <p>{summary}</p>
  </section>;
}
