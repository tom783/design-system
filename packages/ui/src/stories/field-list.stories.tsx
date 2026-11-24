import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Card, CardBody, CardHeader, CardTitle, Field, FieldList, Input, Toaster } from '../index';
import { FieldListExample } from '../../docs/examples/field-list';
import primarySource from '../../docs/examples/field-list.tsx?raw';
import { ShipmentItems, type ItemsState } from './field-list-fixtures';

/**
 * 반복 입력 줄 — 디자인 총괄 규칙 표 L-1~L-17(DESIGN.md §11.10 · Figma 203:4~7 r1).
 * 카드 안 실제 배치와 FormActionBar '오류 N개'까지 네 폭(1440·1024·768·390)으로 보는 것은 Screens/ShipmentCreate 다.
 * 여기서는 카드 폭으로 넓은 폭(그릇 ≥ 640)·좁은 폭(< 640)을 함께 본다.
 */
const meta = { title: 'Components/FieldList', component: FieldList, tags: ['autodocs'],
  parameters: { manifest: ['FieldList'] } } satisfies Meta<typeof FieldList>;
export default meta;
type Story = StoryObj;

let optionSequence = 2;
const done = (root: HTMLElement) => { root.dataset.playComplete = 'true'; };
// 문서 페이지는 스토리를 여럿 쌓는다. 포커스를 옮기는 play 가 서로 포커스를 빼앗지 않게 문서에서는 건너뛴다.
const outsideDocs = (play: (root: HTMLElement) => Promise<void>) =>
  async ({ canvasElement, viewMode }: { canvasElement: HTMLElement; viewMode?: string }) => {
    if (viewMode !== 'docs') await play(canvasElement);
    done(canvasElement);
  };

/** 카드 폭 768(넓은 폭 — 안쪽 734)과 360(좁은 폭 — 안쪽 326). 카드 제목이 목록 이름이라 legend 는 숨긴다(L-1). */
function Cards({ state }: { state: ItemsState }) {
  return <div className="flex flex-col gap-6">
    <Toaster />
    {[768, 360].map(width => <Card key={width} data-frame={width} style={{ width, maxWidth: '100%' }}>
      <CardHeader><CardTitle>품목</CardTitle></CardHeader>
      <CardBody><ShipmentItems state={state} /></CardBody>
    </Card>)}
  </div>;
}

export const 사용법: Story = {
  parameters: { docs: { source: { code: primarySource.replace("from '../../src'", "from '@s2life/ui'"), language: 'tsx', type: 'code' } } },
  render: () => <><Toaster /><FieldListExample /></>,
};
/** 기본 5줄 — 넓은 폭은 열 머리 한 번 + 줄 피치 46, 좁은 폭은 줄 머리 + 첫 칸 전체 폭 + 숫자 칸 둘씩. */
export const 기본: Story = { render: () => <Cards state="default" />, play: ({ canvasElement }) => { done(canvasElement); } };
/** 줄 오류 — 세 번째 줄이 첫 줄과 같은 품목. 줄 아래 한 줄, 원인 칸(품목명) 테두리만 위험색. */
export const 줄오류: Story = { name: '줄 오류', render: () => <Cards state="rowError" />, play: ({ canvasElement }) => { done(canvasElement); } };
/** 칸 오류 2개 — Field 오류 모양 그대로. 넓은 폭은 오류가 있는 줄만 아래로 늘어난다. */
export const 칸오류: Story = { name: '칸 오류', render: () => <Cards state="cellError" />, play: ({ canvasElement }) => { done(canvasElement); } };
/** 최소 1줄 — 삭제는 비활성이지만 자리를 지킨다. */
export const 최소: Story = {
  render: () => <Cards state="min" />,
  play: async ({ canvasElement }) => {
    for (const button of within(canvasElement).getAllByRole('button', { name: '품목 1 삭제' })) await expect(button).toBeDisabled();
    done(canvasElement);
  },
};
/** 최대 20줄 — 추가 비활성 + 옆 '최대 20개'. */
export const 최대: Story = {
  render: () => <Cards state="max" />,
  play: async ({ canvasElement }) => {
    for (const button of within(canvasElement).getAllByRole('button', { name: '품목 추가' })) await expect(button).toBeDisabled();
    await expect(within(canvasElement).getAllByText('최대 20개')).toHaveLength(2);
    done(canvasElement);
  },
};
/** 빈 목록(min 0) — 줄 자리에 한 줄 문구 + 추가 버튼. 상자·일러스트 없음. */
export const 빈목록: Story = { name: '빈 목록', render: () => <Cards state="empty" />, play: ({ canvasElement }) => { done(canvasElement); } };
/** 묶음 오류 — 목록 머리 바로 아래 한 줄(아이콘 + body-sm 위험색, role=alert). fieldset 에 aria-invalid. */
export const 묶음오류: Story = {
  name: '묶음 오류',
  render: () => <Cards state="emptyError" />,
  play: async ({ canvasElement }) => {
    const groups = within(canvasElement).getAllByRole('group', { name: '품목' });
    for (const group of groups) await expect(group).toHaveAttribute('aria-invalid', 'true');
    await expect(within(canvasElement).getAllByRole('alert')[0]).toHaveTextContent('품목을 1개 이상 넣어 주세요.');
    done(canvasElement);
  },
};
/** 추가 직후 — 새 빈 줄이 끝에 붙고 그 줄 첫 칸(품목명)에 포커스가 간다. */
export const 추가직후포커스: Story = {
  name: '추가 직후 포커스',
  render: () => <Cards state="default" />,
  play: outsideDocs(async root => {
    const card = root.querySelector<HTMLElement>('[data-frame="768"]')!;
    await userEvent.click(within(card).getByRole('button', { name: '품목 추가' }));
    await waitFor(() => expect(within(card).getByRole('textbox', { name: '품목 6 품목명' })).toHaveFocus());
  }),
};
/** 목록 이름을 보이는 자리 — 카드 제목이 다른 말이면 legend 가 Field 레이블처럼 보인다. 칸 4개(L-2 상한). */
export const 레이블보임: Story = {
  name: '레이블 보임 · 4칸',
  render: function Render() {
    const [options, setOptions] = React.useState(() => [
      { id: 'o1', color: '블랙', size: 'M', stock: '120', price: '0' },
      { id: 'o2', color: '네이비', size: 'L', stock: '64', price: '2000' },
    ]);
    return <Card style={{ width: 768, maxWidth: '100%' }}>
      <CardHeader><CardTitle>판매 정보</CardTitle></CardHeader>
      <CardBody><div className="flex flex-col gap-3">
        <Field label="판매가" required><Input numeric inputMode="numeric" unit="원" defaultValue="39,000" /></Field>
        <FieldList label="옵션" value={options} onValueChange={setOptions} min={1} max={50}
          createItem={() => ({ id: `o${++optionSequence}`, color: '', size: '', stock: '', price: '' })}
          columns={[
            { key: 'color', label: '색상', required: true, render: (item, { update }) => <Input value={item.color} onChange={e => update({ color: e.target.value })} /> },
            { key: 'size', label: '사이즈', required: true, render: (item, { update }) => <Input value={item.size} onChange={e => update({ size: e.target.value })} /> },
            { key: 'stock', label: '재고', numeric: true, render: (item, { update }) => <Input numeric inputMode="numeric" unit="개" value={item.stock} onChange={e => update({ stock: e.target.value.replace(/\D/g, '') })} /> },
            { key: 'price', label: '추가 금액', numeric: true, render: (item, { update }) => <Input numeric inputMode="numeric" unit="원" value={item.price} onChange={e => update({ price: e.target.value.replace(/\D/g, '') })} /> },
          ]} />
      </div></CardBody>
    </Card>;
  },
  play: ({ canvasElement }) => { done(canvasElement); },
};
