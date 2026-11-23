import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { FilterBar, type FilterBarFilter } from '../index';
import { ORDER_FILTERS, OrderFilterPanel, filtersOf } from './order-filters';
import { FilterBarExample } from '../../docs/examples/filter-bar';
import primarySource from '../../docs/examples/filter-bar.tsx?raw';

/**
 * 필터 바 — 0.5.0 목록 툴바 규격(디자인 총괄 확정, Figma 174:2). 검수 매트릭스의 칩 0·3·8개·`+N` 팝오버·
 * 보기 변경됨·좁은 폭을 한 스토리씩 둔다. 화면 조립(선택 전/후)은 Screens/OrderList 에 있다.
 */
const meta = { title: 'Components/FilterBar', component: FilterBar, tags: ['autodocs'],
  parameters: { manifest: ['FilterBar'] } } satisfies Meta<typeof FilterBar>;
export default meta;
type Story = StoryObj;

const views = [{ value: 'default', label: '기본 보기' }, { value: 'ready', label: '출고 대기만' }, { value: 'vip', label: 'VIP 주문' }];
const label = ({ id, label }: FilterBarFilter) => ({ id, label });

function Demo({ count = 3, viewChanged = false, panel = false, width }: { count?: number; viewChanged?: boolean; panel?: boolean; width?: number }) {
  const [view, setView] = React.useState('default');
  const [query, setQuery] = React.useState('');
  const [ids, setIds] = React.useState(() => ORDER_FILTERS.slice(0, count).map(filter => filter.id));
  const filters = filtersOf(ids).map(label);
  const [saved, setSaved] = React.useState(0);
  return <div style={{ width, maxWidth: '100%' }} className="flex flex-col gap-3">
    <FilterBar views={views} view={view} onViewChange={setView} viewChanged={viewChanged && saved === 0} onSaveView={() => setSaved(value => value + 1)}
      query={query} onQueryChange={setQuery} searchLabel="주문 검색" searchPlaceholder="주문번호·수취인·상품명 검색"
      filters={filters} onFiltersChange={next => setIds(next.map(filter => filter.id))}
      filterContent={panel ? <OrderFilterPanel ids={ids} onIdsChange={setIds} /> : undefined} />
    <output data-probe="filter-state" className="text-[length:var(--text-caption)] text-fg-subtle">
      적용 {filters.length}개{query ? ` · 검색 "${query}"` : ''}{saved ? ' · 보기 저장됨' : ''}
    </output>
  </div>;
}

const done = (root: HTMLElement) => { root.dataset.playComplete = 'true'; };

export const 사용법: Story = {
  parameters: { docs: { source: { code: primarySource.replace("from '../../src'", "from '@s2life/ui'"), language: 'tsx', type: 'code' } } },
  render: () => <FilterBarExample />,
};
export const 칩없음: Story = {
  name: '칩 0개',
  render: () => <Demo count={0} />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('적용된 필터 없음')).toBeInTheDocument();
    await expect(within(canvasElement).queryByRole('button', { name: '필터 초기화' })).toBeNull();
    done(canvasElement);
  },
};
export const 칩3개: Story = { name: '칩 3개', render: () => <Demo count={3} />, play: ({ canvasElement }) => done(canvasElement) };
export const 칩8개: Story = {
  name: '칩 8개 — 넘치면 +N',
  // 넘침은 바 폭이 정한다. 960px 바에서 8개는 한 줄에 다 들어가지 않는다.
  render: () => <Demo count={8} width={960} />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('[data-slot="filter-bar-more"]')).not.toBeNull());
    done(canvasElement);
  },
};
export const 숨은필터열림: Story = {
  name: '+N 팝오버 열림',
  render: () => <Demo count={8} width={960} />,
  play: async ({ canvasElement }) => {
    const more = await waitFor(() => { const el = canvasElement.querySelector<HTMLElement>('[data-slot="filter-bar-more"]'); if (!el) throw new Error('+N 없음'); return el; });
    await userEvent.click(more);
    await expect(await within(document.body).findByRole('dialog', { name: /숨은 필터 \d+개/ })).toBeInTheDocument();
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    done(canvasElement);
  },
};
export const 보기변경됨: Story = {
  name: '보기 변경됨',
  render: () => <Demo count={3} viewChanged />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('변경됨')).toBeInTheDocument();
    await expect(canvas.getByRole('combobox', { name: '저장된 보기' })).toHaveAccessibleDescription('변경됨');
    done(canvasElement);
  },
};
export const 필터패널: Story = {
  name: '필터 트리거 패널',
  render: () => <Demo count={2} panel />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '필터 2개 적용' }));
    const panel = await within(document.body).findByRole('dialog', { name: '필터' });
    await userEvent.click(within(panel).getByRole('checkbox', { name: '국가: 대한민국' }));
    await expect(within(canvasElement).getByRole('button', { name: '국가: 대한민국 필터 해제' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    done(canvasElement);
  },
};
export const 좁은폭: Story = {
  name: '좁은 폭 — 검색이 둘째 줄',
  render: () => <Demo count={8} viewChanged width={672} />,
  play: ({ canvasElement }) => done(canvasElement),
};
export const 다크: Story = { globals: { theme: 'dark' }, render: () => <Demo count={8} viewChanged width={960} />, play: ({ canvasElement }) => done(canvasElement) };
