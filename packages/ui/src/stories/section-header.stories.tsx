import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import {
  AppShell, DataTable, PageHeader, SectionHeader, SegmentedControl, SideNav, SideNavGroup, SideNavItem, StatTile, StatusChip,
  createDataTableColumnHelper, type SectionHeaderAction,
} from '../index';
import { ClipboardList, Download, LayoutDashboard, Printer, Warehouse } from '../icons';
import { SectionHeaderExample } from '../../docs/examples/section-header';
import primarySource from '../../docs/examples/section-header.tsx?raw';

/**
 * 섹션 제목 줄 — 디자인 총괄 규칙 표 S-1~S-11 r1(DESIGN.md §24.6, Figma 203:8~11).
 * 추천 조합(SD-1 A 머리 오른끝 한 묶음 · SD-2 A 위 32/아래 12 · SD-3 A 넘치면 링크 1개 + ⋯)을 Figma 203:11 과 같은 물류 데이터로 그린다.
 * 하네스 section-header-render-verify 가 '추천 조합' 두 화면을 1440·1024·768·390 × 라이트·다크로 열어 수치를 단정하고 찍는다.
 * 데이터는 가상의 물류 출고 데이터다(실제 회사·인물 아님).
 */
const meta = { title: 'Components/SectionHeader', component: SectionHeader, tags: ['autodocs'],
  parameters: { manifest: ['SectionHeader'] } } satisfies Meta<typeof SectionHeader>;
export default meta;
type Story = StoryObj;

const done = (root: HTMLElement) => { root.dataset.playComplete = 'true'; };
// 문서 페이지는 스토리를 여럿 쌓는다. 메뉴를 여는 play 가 서로 포커스를 빼앗지 않게 문서에서는 건너뛴다.
const outsideDocs = (play: (root: HTMLElement) => Promise<void>) =>
  async ({ canvasElement, viewMode }: { canvasElement: HTMLElement; viewMode?: string }) => {
    if (viewMode !== 'docs') await play(canvasElement);
    done(canvasElement);
  };

interface Shipment { id: string; due: string; warehouse: string; partner: string; items: number; quantity: number; status: 'waiting' | 'done' | 'confirmed' }
const SHIPMENT_STATUS = {
  waiting: { label: '출고 대기', tone: 'neutral' },
  done: { label: '출고 완료', tone: 'success' },
  confirmed: { label: '출고 확정', tone: 'info' },
} as const;
const shipments: Shipment[] = [
  { id: 'SH-261124-00425', due: '2026-11-24', warehouse: '대구 허브', partner: '별빛문구', items: 4, quantity: 166, status: 'waiting' },
  { id: 'SH-261124-00376', due: '2026-11-24', warehouse: '이천 2센터', partner: '라온전자', items: 4, quantity: 228, status: 'waiting' },
  { id: 'SH-261124-00322', due: '2026-11-24', warehouse: '대구 허브', partner: '바다수산', items: 5, quantity: 347, status: 'done' },
  { id: 'SH-261124-00257', due: '2026-11-24', warehouse: '이천 2센터', partner: '도담가구', items: 4, quantity: 227, status: 'confirmed' },
  { id: 'SH-261124-00232', due: '2026-11-24', warehouse: '대구 허브', partner: '바다수산', items: 5, quantity: 269, status: 'waiting' },
];
const shipmentHelper = createDataTableColumnHelper<Shipment>();
const shipmentColumns = shipmentHelper.columns([
  shipmentHelper.accessor('id', { header: '출고번호', enableSorting: false,
    cell: cell => <a className="tabular text-fg-link underline" href={`#${cell.getValue()}`}>{cell.getValue()}</a> }),
  shipmentHelper.accessor('due', { header: '출고 예정일', enableSorting: false, cell: cell => <span className="tabular">{cell.getValue()}</span> }),
  shipmentHelper.accessor('warehouse', { header: '창고', enableSorting: false }),
  shipmentHelper.accessor('partner', { header: '거래처', enableSorting: false }),
  shipmentHelper.accessor('items', { header: '품목 수', enableSorting: false, cell: cell => <span className="tabular">{cell.getValue()}</span> }),
  shipmentHelper.accessor('quantity', { header: '총수량', enableSorting: false, cell: cell => <span className="tabular">{cell.getValue().toLocaleString('ko-KR')}</span> }),
  shipmentHelper.accessor('status', { header: '상태', enableSorting: false, cell: cell => {
    const status = SHIPMENT_STATUS[cell.getValue()];
    return <StatusChip tone={status.tone}>{status.label}</StatusChip>;
  } }),
]);
interface Item { code: string; name: string; quantity: number }
const items: Item[] = [
  { code: 'PC-1515', name: '노트북 파우치 15인치', quantity: 80 },
  { code: 'WC-1080', name: '웹캠 FHD', quantity: 45 },
  { code: 'DM-0900', name: '데스크 매트', quantity: 102 },
  { code: 'CU-7710', name: '사무용 의자 쿠션', quantity: 60 },
  { code: 'MS-3300', name: '모니터 받침대', quantity: 60 },
];
const itemHelper = createDataTableColumnHelper<Item>();
const itemColumns = itemHelper.columns([
  itemHelper.accessor('code', { header: '상품 코드', enableSorting: false, cell: cell => <span className="tabular">{cell.getValue()}</span> }),
  itemHelper.accessor('name', { header: '품목명', enableSorting: false }),
  itemHelper.accessor('quantity', { header: '수량', enableSorting: false, cell: cell => <span className="tabular">{cell.getValue()}</span> }),
]);

const PERIODS = [{ value: 'today', label: '오늘' }, { value: 'week', label: '이번 주' }, { value: 'month', label: '이번 달' }];
const recentActions: SectionHeaderAction[] = [
  { kind: 'link', label: '전체 보기', href: '#shipments' },
  { label: 'CSV 내보내기', icon: <Download aria-hidden="true" />, onSelect: () => {} },
];

function LogisticsShell({ current, children }: { current: 'dashboard' | 'shipments'; children: React.ReactNode }) {
  return <AppShell sidebar={<SideNav brand="바이브 물류" brandIcon={<Warehouse />}>
    <SideNavGroup label="출고">
      <SideNavItem icon={<LayoutDashboard />} label="대시보드" href="#dashboard" current={current === 'dashboard'} />
      <SideNavItem icon={<ClipboardList />} label="출고 관리" href="#shipments" current={current === 'shipments'} />
    </SideNavGroup>
  </SideNav>}>{children}</AppShell>;
}

/** Figma 203:11 대시보드 — 기간 선택(control) 섹션 + 링크·버튼 두 동작 섹션. 페이지 배치 gap 24(§24.3). */
function DashboardScreen() {
  const [period, setPeriod] = React.useState('today');
  return <LogisticsShell current="dashboard">
    <div data-screen="section-dashboard" className="flex min-w-0 flex-col gap-6">
      <PageHeader title="대시보드" description="2026-11-24 기준 출고 현황입니다." />
      <SectionHeader title="오늘 핵심 지표" data-section="metrics"
        control={<SegmentedControl size="sm" aria-label="오늘 핵심 지표 조회 기간" options={PERIODS} value={period} onValueChange={setPeriod} />}>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))' }}>
          <StatTile label="오늘 출고 건수" value={8} unit="건" delta={33.3} deltaLabel="전일 대비" />
          <StatTile label="지연 건수" value={0} unit="건" delta={0} deltaFormat="absolute" deltaUnit="건" deltaLabel="전일 대비" goodDirection="down" />
          <StatTile label="출고 완료율" value={25} unit="%" delta={-75} deltaFormat="absolute" deltaUnit="%p" deltaLabel="전일 대비" />
          <StatTile label="출고 대기" value={6} unit="건" delta={6} deltaFormat="absolute" deltaUnit="건" deltaLabel="전일 대비" goodDirection="down" />
        </div>
      </SectionHeader>
      <SectionHeader title="최근 출고" description="출고 예정일이 최근인 다섯 건입니다." actions={recentActions} data-section="recent">
        <DataTable data={shipments} columns={shipmentColumns} getRowId={row => row.id} pinnedEnd={['status']}
          align={{ items: 'end', quantity: 'end' }} caption="최근 출고 5건" />
      </SectionHeader>
    </div>
  </LogisticsShell>;
}

/** Figma 203:11 출고 상세 — 동작 없는 섹션 머리에 제목 + 개수만. */
function DetailScreen() {
  return <LogisticsShell current="shipments">
    <div data-screen="section-detail" className="flex min-w-0 flex-col gap-6">
      <PageHeader title="출고 상세" description="SH-261124-00322 · 바다수산" />
      <SectionHeader title="품목" count={items.length} data-section="items">
        <DataTable data={items} columns={itemColumns} getRowId={row => row.code} align={{ quantity: 'end' }} caption="출고 품목 5개" />
      </SectionHeader>
    </div>
  </LogisticsShell>;
}

export const 사용법: Story = {
  parameters: { docs: { source: { code: primarySource.replace("from '../../src'", "from '@s2life/ui'").replace("from '../../src/icons'", "from '@s2life/ui/icons'"), language: 'tsx', type: 'code' } } },
  render: () => <SectionHeaderExample />,
};

/** 동작 0 — 제목 + 개수(숫자만, 같은 크기·보조 글자색·고정폭 숫자). */
export const 동작없음: Story = {
  name: '동작 0 · 개수',
  render: () => <SectionHeader title="품목" count={5}><p>품목 표</p></SectionHeader>,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const heading = c.getByRole('heading', { level: 2, name: '품목 5' });
    await expect(c.getByRole('region', { name: '품목 5' })).toHaveAttribute('aria-labelledby', heading.id);
    await expect(canvasElement.querySelector('[data-slot="section-header-actions"]')).toBeNull();
    done(canvasElement);
  },
};
/** 동작 1 — 텍스트 링크형. 이름은 '{제목} {동작}'. */
export const 동작하나: Story = {
  name: '동작 1 · 링크',
  render: () => <SectionHeader title="최근 출고" actions={[{ kind: 'link', label: '전체 보기', href: '#shipments' }]}><p>최근 출고 표</p></SectionHeader>,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('link', { name: '최근 출고 전체 보기' })).toHaveAttribute('href', '#shipments');
    done(canvasElement);
  },
};
/** 동작 2 — 링크 + 버튼이 머리 오른끝 한 묶음(SD-1 A). 설명이 있어도 묶음은 제목 줄 가운데다. */
export const 동작둘: Story = {
  name: '동작 2 · 설명',
  render: () => <SectionHeader title="최근 출고" description="출고 예정일이 최근인 다섯 건입니다." actions={recentActions}><p>최근 출고 표</p></SectionHeader>,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('link', { name: '최근 출고 전체 보기' })).toBeVisible();
    await expect(c.getByRole('button', { name: '최근 출고 CSV 내보내기' })).toBeVisible();
    await expect(c.queryByRole('button', { name: '최근 출고 더 보기' })).toBeNull();
    done(canvasElement);
  },
};
/** 넘침 — 동작이 셋이면 둘까지 줄에, 나머지는 ⋯ 메뉴(S-5). h3 — 섹션 안의 섹션. */
export const 넘침: Story = {
  name: '넘침 · ⋯ 메뉴',
  render: () => <SectionHeader as="h3" title="최근 출고" actions={[...recentActions,
    { label: '인쇄', icon: <Printer aria-hidden="true" />, onSelect: () => {} }]}><p>최근 출고 표</p></SectionHeader>,
  play: outsideDocs(async root => {
    const c = within(root);
    await expect(c.getByRole('heading', { level: 3, name: '최근 출고' })).toBeInTheDocument();
    await userEvent.click(c.getByRole('button', { name: '최근 출고 더 보기' }));
    const menu = await within(root.ownerDocument.body).findByRole('menu');
    await expect(within(menu).getByRole('menuitem', { name: '인쇄' })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(c.getByRole('button', { name: '최근 출고 더 보기' })).toHaveFocus());
  }),
};
/** 좁은 그릇(294 = 390 화면의 본문) — 다 들어가지 않으면 링크형 1개 + ⋯ 안에 나머지(SD-3 A). 기간 선택은 들어가면 그대로. */
export const 좁은폭: Story = {
  name: '좁은 폭 294',
  render: () => <div style={{ width: 294 }} className="flex flex-col gap-6">
    <SectionHeader title="오늘 핵심 지표" data-section="metrics"
      control={<SegmentedControl size="sm" aria-label="오늘 핵심 지표 조회 기간" options={PERIODS} defaultValue="today" />}><p>지표</p></SectionHeader>
    <SectionHeader title="최근 출고" description="출고 예정일이 최근인 다섯 건입니다." actions={recentActions} data-section="recent"><p>최근 출고 표</p></SectionHeader>
  </div>,
  play: outsideDocs(async root => {
    const c = within(root);
    await waitFor(() => expect(c.getByRole('button', { name: '최근 출고 더 보기' })).toBeVisible());
    await expect(c.getByRole('link', { name: '최근 출고 전체 보기' })).toBeVisible();
    await expect(c.queryByRole('button', { name: '최근 출고 CSV 내보내기' })).toBeNull();
    await expect(c.getByRole('radiogroup', { name: '오늘 핵심 지표 조회 기간' })).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: '최근 출고 더 보기' }));
    const menu = await within(root.ownerDocument.body).findByRole('menu');
    await expect(within(menu).getByRole('menuitem', { name: 'CSV 내보내기' })).toBeVisible();
    await userEvent.keyboard('{Escape}');
  }),
};

/** 추천 조합 · 대시보드 — 하네스가 네 폭 × 두 테마로 연다. */
export const 추천조합대시보드: Story = {
  name: '추천 조합 · 대시보드',
  // 화면 높이(AppShell 100dvh)는 iframe 안에서만 채워 문서 본문 높이가 뷰포트에 종속되지 않게 한다.
  parameters: { fullBleed: true, docs: { story: { inline: false, iframeHeight: 640 } } },
  render: () => <DashboardScreen />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('region', { name: '오늘 핵심 지표' })).toBeInTheDocument();
    await expect(c.getByRole('region', { name: '최근 출고' })).toBeInTheDocument();
    done(canvasElement);
  },
};
/** 추천 조합 · 출고 상세 — 동작 없는 머리(제목 + 개수). */
export const 추천조합상세: Story = {
  name: '추천 조합 · 출고 상세',
  // 화면 높이(AppShell 100dvh)는 iframe 안에서만 채워 문서 본문 높이가 뷰포트에 종속되지 않게 한다.
  parameters: { fullBleed: true, docs: { story: { inline: false, iframeHeight: 640 } } },
  render: () => <DetailScreen />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('region', { name: '품목 5' })).toBeInTheDocument();
    done(canvasElement);
  },
};
/** 다크 — 같은 규칙(S-11). */
export const 추천조합다크: Story = {
  name: '추천 조합 · 대시보드 다크',
  globals: { theme: 'dark' },
  // 화면 높이(AppShell 100dvh)는 iframe 안에서만 채워 문서 본문 높이가 뷰포트에 종속되지 않게 한다.
  parameters: { fullBleed: true, docs: { story: { inline: false, iframeHeight: 640 } } },
  render: () => <DashboardScreen />,
  play: async ({ canvasElement }) => { done(canvasElement); },
};
