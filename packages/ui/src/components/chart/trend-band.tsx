import { scaleLinear, scaleTime } from '@visx/scale';
import { AreaClosed, LinePath } from '@visx/shape';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { curveMonotoneX } from '@visx/curve';
import { ChartFrame, axisLabel, dateFormat, numericStyle, timeDomain, timeTicks } from './chart-frame';
import { resolveYDomain } from './resolve-y-domain';

export interface TrendBandProps<T> {
  data: T[];
  x: (d: T) => Date;
  y: (d: T) => number;
  /** 두 경계가 모두 있을 때만 분포 밴드를 그린다. */
  yLow?: (d: T) => number;
  yHigh?: (d: T) => number;
  /** y축 기준. 'auto'(기본) = 데이터 범위로 프레이밍, 'zero' = 0 포함, 또는 직접 지정 */
  yDomain?: 'auto' | 'zero' | [number, number];
  height?: number;
  valueFormat?: (value: number) => string;
  /** 차트가 말하는 결론 한 문장. */
  summary: string;
  title?: string;
  className?: string;
}

export function TrendBand<T>({ data, x: getX, y: getY, yLow, yHigh, yDomain = 'auto', height = 220, valueFormat = (v) => v.toLocaleString('ko-KR'), summary, title, className }: TrendBandProps<T>) {
  const hasBand = Boolean(yLow && yHigh);
  const points = data.map((datum) => {
    const value = getY(datum);
    const low = yLow && yHigh ? yLow(datum) : value;
    const high = yLow && yHigh ? yHigh(datum) : value;
    return { date: getX(datum), value, low: Math.min(low, high), high: Math.max(low, high) };
  }).filter((d) => Number.isFinite(+d.date) && [d.value, d.low, d.high].every(Number.isFinite)).sort((a, b) => +a.date - +b.date);
  const dates = points.map((d) => d.date);
  const [low, high] = resolveYDomain(points, yDomain);
  return <ChartFrame title={title} summary={summary} className={className} empty={!points.length}
    legend={[{ label: '추이', color: 'var(--chart-line)' }, ...(hasBand ? [{ label: '분포 범위', color: 'var(--chart-band)' }] : [])]}>
    {(width) => {
      const h = Math.max(100, height);
      // 축 값의 길이에 맞춰 여백을 확보하되 작은 화면의 플롯을 남긴다.
      const left = Math.min(width * 0.4, Math.max(44, Math.max(valueFormat(low).length, valueFormat(high).length) * 8 + 12));
      const right = Math.max(left + 1, width - 8);
      const bottom = h - 28;
      const x = scaleTime({ domain: timeDomain(dates), range: [left, right] });
      const y = scaleLinear({ domain: [low, high], range: [bottom, 24] });
      const last = points[points.length - 1]!;
      return <svg data-slot="trend-band" width={width} height={h} role="img" aria-label={summary} style={{ display: 'block' }}>
        <GridRows scale={y} left={left} width={right - left} numTicks={4} stroke="var(--chart-grid)" />
        <AxisLeft scale={y} left={left} numTicks={4} stroke="var(--chart-axis)" tickStroke="var(--chart-axis)" tickFormat={(v) => valueFormat(Number(v))} tickLabelProps={() => ({ ...axisLabel(), textAnchor: 'end', dy: '0.33em', dx: -4 })} />
        <AxisBottom scale={x} top={bottom} tickValues={timeTicks(dates, right - left)} stroke="var(--chart-axis)" tickStroke="var(--chart-axis)" tickFormat={(v) => dateFormat(new Date(Number(v)))} tickLabelProps={(v) => ({ ...axisLabel(), textAnchor: +v === +dates[0]! ? 'start' : +v === +dates[dates.length - 1]! ? 'end' : 'middle' })} />
        {hasBand && points.length > 1 && <AreaClosed data={points} x={(d) => x(d.date)} y={(d) => y(d.high)} y0={(d) => y(d.low)} yScale={y} curve={curveMonotoneX} fill="var(--chart-band)" fillOpacity={0.55} data-slot="trend-band-area" />}
        {points.length > 1 && <LinePath data={points} x={(d) => x(d.date)} y={(d) => y(d.value)} curve={curveMonotoneX} stroke="var(--chart-line)" strokeWidth={2} strokeLinejoin="round" data-slot="trend-band-line" />}
        <circle data-slot="trend-band-point" cx={x(last.date)} cy={y(last.value)} r={4} fill="var(--chart-point)" />
        <text data-slot="trend-band-value" x={x(last.date)} y={y(last.value) - 10} textAnchor={points.length === 1 ? 'middle' : 'end'} fill="var(--text-primary)" fontSize={13} style={numericStyle}>{valueFormat(last.value)}</text>
      </svg>;
    }}
  </ChartFrame>;
}
