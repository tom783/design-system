import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { EmptyState, ErrorState } from '../components/state';
import { DataTable } from '../components/data-table';
import { TrendBand, BulletRow, CompositionArea } from '../components/chart';
import { LockKeyhole, SearchX } from '../icons';

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
// 페이지 크기(상단 바 규격 8절 · Figma 211:10255) — 셸 안 본문 자리를 대신한다. 셸과 함께 본 모습은 Screens/AppHeader.
// 두 상태는 아이콘(자물쇠 · 검색-없음)과 제목이 다르다. 역할은 둘 다 status(alert 아님), 제목은 h1.
const back = fn();
export const 페이지_권한없음: Story = {
  render: () => <EmptyState size="page" graphic={<LockKeyhole />} title="이 화면을 볼 권한이 없습니다"
    description={<><strong>스토어 B</strong>에 접근할 권한이 없습니다.</>}
    action={{ label: '이전 화면으로', onClick: back }} secondaryAction={{ label: '조직 관리자에게 요청 방법', href: '#help-permission' }} />,
  play: async ({ canvasElement }) => {
    back.mockClear();
    const status = within(canvasElement).getByRole('status');
    await expect(within(canvasElement).queryByRole('alert')).toBeNull();
    await expect(within(status).getByRole('heading', { level: 1 })).toHaveTextContent('이 화면을 볼 권한이 없습니다');
    await expect(status.querySelector('strong')).toHaveTextContent('스토어 B');
    await expect(within(status).getByRole('link', { name: '조직 관리자에게 요청 방법' })).toHaveAttribute('href', '#help-permission');
    await userEvent.click(within(status).getByRole('button', { name: '이전 화면으로' }));
    await expect(back).toHaveBeenCalledTimes(1);
    canvasElement.dataset.playComplete = 'true';
  },
};
export const 페이지_찾을수없음: Story = {
  render: () => <EmptyState size="page" graphic={<SearchX />} title="찾을 수 없습니다" description="대상이 삭제되었거나 주소가 변경되었습니다."
    action={{ label: '이전 화면으로', onClick: back }} secondaryAction={{ label: '목록으로', href: '#orders' }} />,
  play: async ({ canvasElement }) => {
    const status = within(canvasElement).getByRole('status');
    await expect(within(status).getByRole('heading', { level: 1 })).toHaveTextContent('찾을 수 없습니다');
    await expect(within(status).getByRole('link', { name: '목록으로' })).toHaveAttribute('href', '#orders');
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
