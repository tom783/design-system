import { scaleLinear } from '@visx/scale';
import { Bar, Line } from '@visx/shape';
import { Group } from '@visx/group';
import { ChartFrame, numericStyle } from './chart-frame';
import { isBulletAchieved, nonNegative } from './normalize';

export interface BulletMetric {
  label: string;
  actual: number;
  target: number;
  max: number;
  good?: [number, number];
  unit?: string;
  lowerIsBetter?: boolean;
}
export interface BulletRowProps { metrics: BulletMetric[]; summary: string; title?: string; className?: string }

export function BulletRow({ metrics, summary, title, className }: BulletRowProps) {
  return <ChartFrame title={title} summary={summary} className={className} empty={!metrics.length}
    legend={[{ label: '실적', color: 'var(--chart-line)' }, { label: '정상 범위', color: 'var(--chart-range)' }, { label: '목표 눈금', color: 'var(--chart-target)' }]}>
    {(width) => <svg data-slot="bullet-row" role="img" aria-label={summary} width={width} height={metrics.length * 44} style={{ display: 'block' }}>
      {metrics.map((metric, index) => {
        const achieved = isBulletAchieved(metric.actual, metric.target, metric.lowerIsBetter);
        const status = achieved ? '달성' : '미달';
        const value = `${metric.actual.toLocaleString('ko-KR')}${metric.unit ?? ''}`;
        const valueChars = Math.max(1, Math.floor((width - 72 - Math.min(52, width * 0.2)) / 8));
        const visibleValue = value.length > valueChars ? `${value.slice(0, Math.max(0, valueChars - 1))}…` : value;
        const details = `${metric.label}: 실적 ${value}, 목표 ${metric.target.toLocaleString('ko-KR')}${metric.unit ?? ''}, ${metric.lowerIsBetter ? '낮을수록 좋음, ' : ''}${status}`;
        const max = nonNegative(metric.max) || Math.max(1, nonNegative(metric.actual), nonNegative(metric.target), ...(metric.good ?? []).map(nonNegative));
        const x = scaleLinear({ domain: [0, max], range: [2, Math.max(3, width - 2)], clamp: true });
        const range = metric.good?.map(nonNegative).sort((a, b) => a - b);
        // 44px 안에서 이름·수치는 위, 트랙은 아래에 놓아 좁은 화면도 고정 폭 칼럼이 필요 없다.
        const labelWidth = Math.max(0, width - (visibleValue.length * 8 + 64) - 12);
        const maxChars = Math.floor(labelWidth / 13);
        const label = metric.label.length > maxChars ? `${metric.label.slice(0, Math.max(0, maxChars - 1))}…` : metric.label;
        return <Group key={`${metric.label}-${index}`} top={index * 44} data-slot="bullet-metric">
          <title>{details}</title>
          <text data-slot="bullet-label" x={0} y={13} fill="var(--text-primary)" fontSize={13}><title>{metric.label}</title>{label}</text>
          <text data-slot="bullet-value" x={width - 60} y={13} textAnchor="end" fill="var(--text-primary)" fontSize={13} style={numericStyle}><title>{value}</title>{visibleValue}</text>
          <g transform={`translate(${width - 50}, 2)`} aria-hidden="true" fill="none" stroke={achieved ? 'var(--status-success-fg)' : 'var(--chart-line)'} strokeWidth={1.5}>
            {achieved ? <path d="M1 6 L4 9 L11 1" /> : <path d="M6 0 L12 11 H0 Z M6 3 V6 M6 8 V9" />}
          </g>
          <text data-slot="bullet-status" x={width} y={13} textAnchor="end" fill={achieved ? 'var(--status-success-fg)' : 'var(--text-primary)'} fontSize={13}>{status}</text>
          <Bar data-slot="bullet-track" x={2} y={22} width={Math.max(1, width - 4)} height={18} fill="var(--chart-track)" />
          {range && <Bar data-slot="bullet-range" x={x(range[0]!)} y={22} width={Math.max(0, x(range[1]!) - x(range[0]!))} height={18} fill="var(--chart-range)" />}
          <Bar data-slot="bullet-actual" x={x(0)} y={27} width={Math.max(0, x(nonNegative(metric.actual)) - x(0))} height={8} fill={achieved ? 'var(--status-success-fg)' : 'var(--chart-line)'} />
          <Line data-slot="bullet-target" from={{ x: x(nonNegative(metric.target)), y: 20 }} to={{ x: x(nonNegative(metric.target)), y: 42 }} stroke="var(--chart-target)" strokeWidth={2.5} />
        </Group>;
      })}
    </svg>}
  </ChartFrame>;
}
