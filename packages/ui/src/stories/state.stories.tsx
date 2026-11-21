import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { EmptyState, ErrorState } from '../components/state';
import { DataTable } from '../components/data-table';
import { TrendBand, BulletRow, CompositionArea } from '../components/chart';

const meta = {
  parameters: { manifest: ['EmptyState', 'ErrorState'], },
  tags: ['autodocs'], title: 'Components/State' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const reset = fn();
const retry = fn();
export const 빈상태_기본: Story = {
  render: () => <EmptyState title="표시할 주문이 없습니다" />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent('표시할 주문이 없습니다');
    await expect(within(canvasElement).queryByRole('button')).toBeNull();
    canvasElement.dataset.playComplete = 'true';
  },
};
export const 빈상태_액션: Story = {
  render: () => <EmptyState title="표시할 주문이 없습니다" description="필터를 바꾸거나 기간을 넓혀 보세요." action={{ label: '필터 초기화', onClick: reset }} />,
  play: async ({ canvasElement }) => {
    reset.mockClear();
    await userEvent.click(within(canvasElement).getByRole('button', { name: '필터 초기화' }));
    await expect(reset).toHaveBeenCalledTimes(1);
    canvasElement.dataset.playComplete = 'true';
  },
};
export const 오류_재시도: Story = {
  render: () => <ErrorState title="주문을 불러오지 못했습니다" onRetry={retry} />,
  play: async ({ canvasElement }) => {
    retry.mockClear();
    await expect(within(canvasElement).getByRole('alert')).toHaveTextContent('주문을 불러오지 못했습니다');
    await userEvent.click(within(canvasElement).getByRole('button', { name: '다시 시도' }));
    await expect(retry).toHaveBeenCalledTimes(1);
    canvasElement.dataset.playComplete = 'true';
  },
};
const columns = [{ accessorKey: 'name', header: '주문' }];
export const 표_빈상태: Story = {
  render: () => <DataTable getRowId={() => 'empty'} data={[]} columns={columns} emptyMessage="표시할 주문이 없습니다" emptyAction={{ label: '필터 초기화', onClick: reset }} />,
  play: async ({ canvasElement }) => {
    reset.mockClear();
    const status = within(canvasElement).getByRole('status');
    await expect(status.closest('td')).toHaveAttribute('colspan', '1');
    await expect(status.getBoundingClientRect().height).toBe(192);
    await userEvent.click(within(canvasElement).getByRole('button', { name: '필터 초기화' }));
    await expect(reset).toHaveBeenCalledTimes(1);
    canvasElement.dataset.playComplete = 'true';
  },
};
const points = [{ date: new Date(2026, 10, 8), value: 10 }, { date: new Date(2026, 10, 9), value: 20 }];
const trend = { data: points, x: (d: typeof points[number]) => d.date, y: (d: typeof points[number]) => d.value, summary: '주문이 10건에서 20건으로 증가했습니다.' };
const series = [{ key: 'value', label: '주문', color: 'var(--chart-line)' }] as const;
const metrics = Array.from({ length: 3 }, (_, i) => ({ label: `목표 ${i + 1}`, actual: 10, target: 20, max: 30 }));
const states = ['empty', 'error', 'loading', 'idle'] as const;
export const 차트_높이일치: Story = {
  render: () => <div className="grid gap-4">
    {['trend', 'composition', 'bullet', 'trend-custom', 'composition-custom', 'bullet-one'].map((kind) => <section key={kind} data-chart-kind={kind} className="grid grid-cols-2 gap-4">
      {states.map((state) => <div key={state} data-compare={`${kind}-${state}`}>
        {kind.startsWith('trend') ? <TrendBand {...trend} height={kind.endsWith('custom') ? 280 : undefined} state={state} title="주문 추이" onRetry={retry} />
          : kind.startsWith('composition') ? <CompositionArea data={points} x={trend.x} series={[...series]} summary={trend.summary} height={kind.endsWith('custom') ? 280 : undefined} state={state} title="주문 구성" onRetry={retry} />
            : <BulletRow metrics={kind === 'bullet-one' ? metrics.slice(0, 1) : metrics} skeletonRows={kind === 'bullet-one' ? 1 : 3} summary={trend.summary} state={state} title="목표 대비" onRetry={retry} />}
      </div>)}
    </section>)}
  </div>,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll('svg[role="img"]')).toHaveLength(6));
    for (const group of canvasElement.querySelectorAll('[data-chart-kind]')) {
      const heights = Array.from(group.querySelectorAll('[data-slot="chart-plot"]'), (el) => el.getBoundingClientRect().height);
      await expect(heights).toHaveLength(4);
      await expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(2);
    }
    canvasElement.dataset.playComplete = 'true';
  },
};
export const 차트_재시도: Story = {
  render: () => <div className="grid gap-4">
    <TrendBand {...trend} state="error" onRetry={retry} />
    <CompositionArea data={points} x={trend.x} series={[...series]} summary={trend.summary} state="error" onRetry={retry} />
    <BulletRow metrics={metrics} summary={trend.summary} state="error" onRetry={retry} />
  </div>,
  play: async ({ canvasElement }) => {
    retry.mockClear();
    for (const button of within(canvasElement).getAllByRole('button', { name: '다시 시도' })) await userEvent.click(button);
    await expect(retry).toHaveBeenCalledTimes(3);
    canvasElement.dataset.playComplete = 'true';
  },
};
