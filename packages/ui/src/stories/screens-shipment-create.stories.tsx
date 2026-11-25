import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import {
  AppShell, Card, CardBody, CardHeader, CardTitle, FieldList, FormActionBar, PageHeader, SideNav, SideNavGroup, SideNavItem,
  Toaster, toast,
} from '../index';
import { ChartColumn, PackageCheck, Truck } from '../icons';
import { appHeader } from '../../docs/examples/app-header';
import { useShipmentItems, type ItemsState } from './field-list-fixtures';

/**
 * 출고 등록 — 반복 입력 줄(FieldList) 기준 화면. Figma 203:7 추천 조합(디자인 총괄 r1 통과)과 같은 상태·데이터다:
 * 기본 5줄 · 줄 오류 · 칸 오류 2개 · 최소 1줄 · 최대 20줄 · 빈 목록(min 0) · 추가 직후 포커스 + 묶음 오류 둘(LD-2 A: 빈 목록·최대 초과).
 * 검수 매트릭스: 라이트·다크 × 1440·1024·768·390(docs/qa/field-list-render-verify.mjs 가 찍고 잰다).
 * 카드 제목 '품목'이 목록 이름이라 legend 는 숨긴다(L-1). FormActionBar '오류 N개'는 칸·줄 오류 + 묶음 오류 1개를 센다(L-15).
 * 메뉴는 Figma 프레임과 같은 틀이다: 768 은 레일 64(카드 안쪽 638 < 640 → 좁은 폭으로 쌓인다), 390 은 레일 없이 메뉴 서랍
 * (카드 358 · 숫자 칸 약 150 — 레일이 있으면 약 124 라 '1개 이상 입력하세요.'가 두 줄이 된다, §11.3).
 * 상단 바 64 는 Screens/AppHeader 와 같은 묶음(docs/examples/app-header.tsx)이고 물류 화면이라 지금 제품은 물류관리다 — 사이드 brand 도
 * 지금 제품 이름 + 그 아이콘(물류관리 · Truck)으로 전환기 첫째와 같은 값이다(SideNav brand 는 지금 서비스 이름 표시 전용, 0.7.1 C2).
 * 메뉴 항목 '출고 관리'는 brand 와 같은 Truck 을 쓰지 않고 PackageCheck 다 — 한 사이드 메뉴에 같은 아이콘이 두 번 보이지 않게(0.7.1 묶음 검수).
 * 390 서랍 셸은 '메뉴 열기' 줄 아래에 상단 바가 선다(AppShell 순서 그대로).
 */
const meta = { title: 'Screens/ShipmentCreate', parameters: { fullBleed: true } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// 640 미만 창은 메뉴 서랍(Figma 390), 그 위는 레일(Figma 768). 스토리 틀만의 선택이다 — 부품 동작과는 상관없다.
const phone = '(width < 640px)';
const subscribe = (change: () => void) => { const media = window.matchMedia(phone); media.addEventListener('change', change); return () => media.removeEventListener('change', change); };

function ShipmentCreateScreen({ state }: { state: ItemsState }) {
  const { props, errorCount } = useShipmentItems(state);
  const narrow = React.useSyncExternalStore(subscribe, () => window.matchMedia(phone).matches, () => false);
  return <AppShell {...appHeader({ product: 'logistics' })} narrowNavigation={narrow ? 'drawer' : 'rail'} sidebar={
    <SideNav brand="물류관리" brandIcon={<Truck />}>
      <SideNavGroup label="출고">
        <SideNavItem icon={<PackageCheck />} label="출고 관리" href="#shipments" current />
        <SideNavItem icon={<ChartColumn />} label="대시보드" href="#dashboard" />
      </SideNavGroup>
    </SideNav>
  }>
    <Toaster />
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader title="출고 등록" />
      <form noValidate aria-label="출고 등록" className="flex min-w-0 flex-col gap-6"
        onSubmit={event => { event.preventDefault(); toast.success('출고를 등록했습니다'); }}>
        <Card data-screen="items" className="max-w-3xl">
          <CardHeader><CardTitle>품목</CardTitle></CardHeader>
          <CardBody><FieldList {...props} /></CardBody>
        </Card>
        <FormActionBar data-screen="actions" submitLabel="출고 등록" errorCount={errorCount} onCancel={() => toast('등록을 취소했습니다')} />
      </form>
    </div>
  </AppShell>;
}

const ready: Story['play'] = async ({ canvasElement: root }) => {
  await expect(within(root).getByRole('heading', { level: 1 })).toBeInTheDocument();
  root.dataset.playComplete = 'true';
};
export const 기본: Story = { name: '기본 5줄', render: () => <ShipmentCreateScreen state="default" />, play: ready };
export const 줄오류: Story = { name: '줄 오류 1개', render: () => <ShipmentCreateScreen state="rowError" />, play: ready };
export const 칸오류: Story = { name: '칸 오류 2개', render: () => <ShipmentCreateScreen state="cellError" />, play: ready };
export const 최소: Story = { name: '최소 1줄', render: () => <ShipmentCreateScreen state="min" />, play: ready };
export const 최대: Story = { name: '최대 20줄', render: () => <ShipmentCreateScreen state="max" />, play: ready };
export const 빈목록: Story = { name: '빈 목록 · min 0', render: () => <ShipmentCreateScreen state="empty" />, play: ready };
/** 묶음 오류(LD-2 A) — 품목 0개로 제출. 머리 아래 위험 문구 + '오류 1개'를 누르면 추가 버튼으로 간다. */
export const 묶음오류빈목록: Story = { name: '묶음 오류 · 빈 목록', render: () => <ShipmentCreateScreen state="emptyError" />, play: ready };
/** 묶음 오류(LD-2 A) — 가져온 품목이 최대(20)를 넘었다. 추가 비활성 + '최대 20개', 머리 아래 위험 문구. */
export const 묶음오류최대초과: Story = { name: '묶음 오류 · 최대 초과', render: () => <ShipmentCreateScreen state="maxError" />, play: ready };
/** 추가 직후 — 새 빈 줄 첫 칸(품목 6 품목명)에 포커스. */
export const 추가직후포커스: Story = {
  name: '추가 직후 포커스',
  render: () => <ShipmentCreateScreen state="default" />,
  play: async ({ canvasElement: root }) => {
    const c = within(root);
    await userEvent.click(c.getByRole('button', { name: '품목 추가' }));
    await waitFor(() => expect(c.getByRole('textbox', { name: '품목 6 품목명' })).toHaveFocus());
    root.dataset.playComplete = 'true';
  },
};
