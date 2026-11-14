import { scaleLinear, scaleTime } from '@visx/scale';
import { AreaStack, Bar, Line } from '@visx/shape';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { ChartFrame, type ChartFrameProps, axisLabel, dateFormat, numericStyle, timeDomain, timeTicks } from './chart-frame';
import { normalizePercentages, nonNegative } from './normalize';

export interface CompositionAreaProps<T> extends Pick<ChartFrameProps, 'state' | 'emptyMessage' | 'errorMessage' | 'onRetry'> {
  data: T[];
  x: (d: T) => Date;
  /** 정의 순서대로 아래부터 쌓는다. 색은 의미 토큰의 CSS 변수를 전달한다. */
  series: { key: keyof T & string; label: string; color: string }[];
  height?: number;
  summary: string;
  title?: string;
  className?: string;
}
interface CompositionPoint { date: Date; values: number[] | null }

export function CompositionArea<T>({ data, x: getX, series, height, summary, title, className, state, emptyMessage, errorMessage, onRetry }: CompositionAreaProps<T>) {
  const keys = series.map((s) => s.key);
  const rows: CompositionPoint[] = data.map((datum) => ({
    date: getX(datum), values: normalizePercentages(keys.map((key) => nonNegative(datum[key]))),
  })).filter((d) => Number.isFinite(+d.date)).sort((a, b) => +a.date - +b.date);
  const last = [...rows].reverse().find((d) => d.values !== null);
  const dates = rows.map((d) => d.date);
  // 미지정 높이는 CSS 토큰으로 해소한다. 스켈레톤은 폭 측정을 기다리지 않아 SSR에서도 DOM을 읽으면 안 된다.
  return <ChartFrame state={state} emptyMessage={emptyMessage} errorMessage={errorMessage} onRetry={onRetry}
    height={height} title={title} summary={summary} className={className} empty={!last || !series.length} legend={series}>
    {(width, h) => {
      const top = 16;
      const bottom = h - 28;
      // 이름과 비율을 직접 읽을 공간을 남기고 나머지 폭으로 시간축을 다시 계산한다.
      const labelWidth = Math.min(width * 0.48, Math.max(110, ...series.map((s) => s.label.length * 13 + 66)));
      const right = Math.max(49, width - labelWidth);
      const x = scaleTime({ domain: timeDomain(dates), range: [44, right] });
      const y = scaleLinear({ domain: [0, 100], range: [bottom, top] });
      let cumulative = 0;
      const labels = series.map((s, index) => {
        const value = last!.values![index]!;
        const center = cumulative + value / 2;
        cumulative += value;
        return { ...s, value, centerY: y(center), labelY: y(center) };
      }).reverse();
      // 작은 비율끼리 붙어 있어도 글자 높이+여백(20px)을 확보하고 연결선으로 원래 위치를 보존한다.
      const gap = Math.min(20, (bottom - top) / Math.max(1, labels.length - 1));
      labels.forEach((label, i) => { label.labelY = Math.max(label.centerY, i ? labels[i - 1]!.labelY + gap : top + 7); });
      for (let i = labels.length - 1; i >= 0; i--) {
        labels[i]!.labelY = Math.min(labels[i]!.labelY, i === labels.length - 1 ? bottom - 7 : labels[i + 1]!.labelY - gap);
      }
      const nameChars = Math.max(1, Math.floor((width - right - 66) / 13));
      return <svg data-slot="composition-area" width={width} height={h} role="img" aria-label={summary} style={{ display: 'block' }}>
        <GridRows scale={y} left={44} width={right - 44} tickValues={[0, 25, 50, 75, 100]} stroke="var(--chart-grid)" />
        <AreaStack<CompositionPoint, keyof T & string> data={rows} keys={keys}
          value={(row, key) => row.values?.[keys.indexOf(key)] ?? 0}
          defined={(point) => point.data.values !== null}
          x={(point) => x(point.data.date)} y0={(point) => y(point[0])} y1={(point) => y(point[1])}>
          {({ stacks, path }) => stacks.map((stack, index) => <path key={stack.key} data-slot="composition-series" d={path(stack) || ''} fill={series[index]!.color} />)}
        </AreaStack>
        {rows.map((row, rowIndex) => {
          if (!row.values || rows[rowIndex - 1]?.values || rows[rowIndex + 1]?.values) return null;
          // 단일 시점은 면적을 갖지 않으므로 얇은 누적 열로 구성비를 보존한다.
          let sum = 0;
          return row.values.map((value, index) => {
            const base = sum;
            sum += value;
            return <Bar key={`${rowIndex}-${index}`} data-slot="composition-single" x={x(row.date) - 2} y={y(sum)} width={4} height={Math.max(0, y(base) - y(sum))} fill={series[index]!.color} />;
          });
        })}
        <AxisLeft scale={y} left={44} tickValues={[0, 25, 50, 75, 100]} stroke="var(--chart-axis)" tickStroke="var(--chart-axis)" tickFormat={(v) => `${Number(v)}%`} tickLabelProps={() => ({ ...axisLabel(), textAnchor: 'end', dy: '0.33em', dx: -4 })} />
        <AxisBottom scale={x} top={bottom} tickValues={timeTicks(dates, right - 44)} stroke="var(--chart-axis)" tickStroke="var(--chart-axis)" tickFormat={(v) => dateFormat(new Date(Number(v)))} tickLabelProps={(v) => ({ ...axisLabel(), textAnchor: +v === +dates[0]! ? 'start' : +v === +dates[dates.length - 1]! ? 'end' : 'middle' })} />
        {labels.map((label) => <g key={label.key} data-slot="composition-label">
          <title>{`${label.label} ${label.value.toFixed(1)}% (${dateFormat(last!.date)})`}</title>
          <Line from={{ x: x(last!.date), y: label.centerY }} to={{ x: right + 8, y: label.labelY }} stroke="var(--chart-axis)" />
          <text x={right + 12} y={label.labelY} dominantBaseline="middle" fill="var(--text-primary)" fontSize={13}>{label.label.length > nameChars ? `${label.label.slice(0, Math.max(1, nameChars - 1))}…` : label.label}</text>
          <text data-slot="composition-value" x={width} y={label.labelY} dominantBaseline="middle" textAnchor="end" fill="var(--text-primary)" fontSize={13} style={numericStyle}>{label.value.toFixed(1)}%</text>
        </g>)}
      </svg>;
    }}
  </ChartFrame>;
}
