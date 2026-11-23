import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { BulkActionBar, Button, FilterBar } from '../index';
import { BulkActionBarExample } from '../../docs/examples/bulk-action-bar';
import primarySource from '../../docs/examples/bulk-action-bar.tsx?raw';
import { ORDER_FILTERS } from './order-filters';

/**
 * 일괄 작업 바 — 선택하면 필터 바 자리를 같은 높이로 대체한다(0.5.0 목록 툴바 규격, Figma 189:2).
 * 표와 함께 쓰는 조립(sticky·선택 행)은 Screens/OrderList 에 있다.
 */
const meta = { title: 'Components/BulkActionBar', component: BulkActionBar, tags: ['autodocs'],
  parameters: { manifest: ['BulkActionBar'] } } satisfies Meta<typeof BulkActionBar>;
export default meta;
type Story = StoryObj;

function Demo({ initial = 3, width, danger = true }: { initial?: number; width?: number; danger?: boolean }) {
  const [count, setCount] = React.useState(initial);
  return <div style={{ width, maxWidth: '100%' }} className="flex flex-col gap-3">
    <BulkActionBar selectedCount={count} onClear={() => setCount(0)}
      actions={<><Button size="sm">송장 출력</Button><Button size="sm">출고 처리</Button></>}
      dangerAction={danger ? <Button size="sm" variant="danger">주문 취소</Button> : undefined}>
      <FilterBar views={[{ value: 'default', label: '기본 보기' }]} searchLabel="주문 검색" searchPlaceholder="주문번호·수취인·상품명 검색"
        defaultFilters={ORDER_FILTERS.slice(0, 3).map(({ id, label }) => ({ id, label }))} />
    </BulkActionBar>
    <Button size="sm" data-probe="select-more" onClick={() => setCount(value => value + 1)}>행 하나 더 선택(시험용)</Button>
  </div>;
}
const done = (root: HTMLElement) => { root.dataset.playComplete = 'true'; };

export const 사용법: Story = {
  parameters: { docs: { source: { code: primarySource.replace("from '../../src'", "from '@s2life/ui'"), language: 'tsx', type: 'code' } } },
  render: () => <BulkActionBarExample />,
};
export const 선택전: Story = {
  name: '선택 전 — 필터 바',
  render: () => <Demo initial={0} />,
  play: async ({ canvasElement }) => {
    const status = canvasElement.querySelector('[data-slot="bulk-action-bar-count"]');
    await expect(status).toHaveAttribute('role', 'status');
    await expect(status).toHaveTextContent(/^$/);
    done(canvasElement);
  },
};
export const 선택후: Story = {
  name: '선택 후 — 바가 대체',
  render: () => <Demo initial={3} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent('3건 선택');
    await expect(canvasElement.querySelector('[data-slot="bulk-action-bar-replaced"]')).toHaveAttribute('inert');
    await userEvent.click(canvas.getByRole('button', { name: '선택 해제' }));
    // 바가 사라지면 돌아온 필터 바의 첫 조작 요소가 포커스를 받는다.
    await waitFor(() => expect(document.activeElement).toBe(canvas.getByRole('combobox', { name: '저장된 보기' })));
    await userEvent.click(canvas.getByRole('button', { name: '행 하나 더 선택(시험용)' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('1건 선택');
    for (let i = 0; i < 2; i++) await userEvent.click(canvas.getByRole('button', { name: '행 하나 더 선택(시험용)' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('3건 선택');
    done(canvasElement);
  },
};
export const 위험액션없음: Story = { name: '위험 액션 없음', render: () => <Demo danger={false} />, play: ({ canvasElement }) => done(canvasElement) };
export const 좁은폭: Story = { name: '좁은 폭 — 액션이 둘째 줄', render: () => <Demo width={672} />, play: ({ canvasElement }) => done(canvasElement) };
export const 다크: Story = { globals: { theme: 'dark' }, render: () => <Demo />, play: ({ canvasElement }) => done(canvasElement) };
