import { ComboboxExample } from '../../docs/examples/combobox';
import primarySource from '../../docs/examples/combobox.tsx?raw';
import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';
import { Combobox, Field, FormFlow, type ComboboxProps, type ComboboxOption } from '../index';

const meta = {
  tags: ['autodocs'],
  parameters: { manifest: ['Combobox'] }, title: 'Components/Combobox', component: Combobox, args: { options: [] },
  decorators: [(Story) => <div style={{ maxWidth: 480 }}><Story /></div>],
} satisfies Meta<typeof Combobox>;
export default meta;
type Story = StoryObj<{ options: ComboboxOption[] }>;
const locations: ComboboxOption[] = ['서울 본사', '서산 물류센터', '성남 지점', '부산 지점', '대구 물류센터', '수원 창고']
  .map((label, index) => ({ value: `location-${index}`, label }));
const many: ComboboxOption[] = [...locations,
  ...Array.from({ length: 20 }, (_, index) => ({ value: `warehouse-${index}`, label: `지역 창고 ${index + 1}`, disabled: index === 19 }))];
function Demo(props: Omit<Extract<ComboboxProps, { multiple?: false }>, 'value' | 'onValueChange'>) {
  const [value, setValue] = React.useState('');
  return <><Combobox {...props} value={value} onValueChange={setValue} />
    <output data-slot="combobox-demo-value" aria-label="선택 값">{value || '선택 없음'}</output></>;
}
const trigger = (root: HTMLElement) => root.querySelector<HTMLButtonElement>('[data-slot="combobox-trigger"]')!;
const search = () => document.querySelector<HTMLInputElement>('[data-slot="combobox-input"]')!;
async function open(root: HTMLElement) {
  await userEvent.click(trigger(root));
  await waitFor(() => expect(search()).toHaveFocus());
  return search();
}
async function close(root: HTMLElement) {
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(trigger(root)).toHaveAttribute('aria-expanded', 'false'));
  await waitFor(() => expect(trigger(root)).toHaveFocus());
  await waitFor(() => expect(document.querySelector('[data-slot="combobox-content"]')).not.toBeInTheDocument());
  root.dataset.playComplete = 'true';
}
export const 사용법: Story = {
  parameters: { docs: { source: {
    code: primarySource.replace("from '../../src'", "from '@s2life/ui'"),
    language: 'tsx', type: 'code',
  } } },
  render: () => <ComboboxExample />,
};

export const 기본: Story = {
  render: () => <Demo options={many} aria-label="사업장" placeholder="사업장 선택" />,
  play: async ({ canvasElement: root }) => {
    await open(root);
    await expect(within(document.body).getAllByRole('option')).toHaveLength(26);
    await expect(within(document.body).getByRole('option', { name: '지역 창고 20' })).toHaveAttribute('aria-disabled', 'true');
    await close(root);
  },
};
export const 비활성: Story = {
  render: () => <Demo options={many} aria-label="사업장" disabled />,
  play: async ({ canvasElement: root }) => {
    await expect(trigger(root)).toBeDisabled();
    await userEvent.click(trigger(root));
    await expect(trigger(root)).toHaveAttribute('aria-expanded', 'false');
    root.dataset.playComplete = 'true';
  },
};
export const 오류: Story = {
  render: () => <Field label="사업장" error="사업장을 선택하세요"><Combobox options={many} invalid /></Field>,
  play: async ({ canvasElement: root }) => {
    await expect(trigger(root)).toHaveAttribute('aria-invalid', 'true');
    await open(root); await expect(search()).toHaveAttribute('aria-invalid', 'true'); await close(root);
  },
};
export const 필드: Story = {
  render: function FieldDemo() {
    const [value, setValue] = React.useState('');
    return <><Field label="출고 사업장" description="출고를 담당하는 사업장을 검색하세요" error={value ? undefined : '출고 사업장을 선택하세요'} required>
      <Combobox options={many} value={value} onValueChange={setValue} placeholder="출고 사업장 선택" />
    </Field><output data-slot="combobox-demo-value">{value || '선택 없음'}</output></>;
  },
  play: async ({ canvasElement: root }) => {
    const button = trigger(root), label = root.querySelector('label')!;
    await expect(button.id).toBe(label.htmlFor);
    // button 역할은 aria-required 를 받지 않는다(axe aria-allowed-attr). 필수는 라벨의 '필수 입력'이 이름에 싣고,
    // 열린 뒤 검색 입력(role=combobox)이 aria-required 를 갖는다(DESIGN.md §18).
    await expect(button).not.toHaveAttribute('aria-required');
    await expect(button).toHaveAccessibleName(/^출고 사업장\s*필수 입력$/);
    await expect(button).toHaveAttribute('aria-invalid', 'true');
    await expect(button).toHaveAttribute('aria-describedby', `${root.querySelector('[data-slot="field-error"]')!.id} ${root.querySelector('[data-slot="field-description"]')!.id}`);
    await userEvent.click(label);
    await waitFor(() => expect(search()).toHaveFocus());
    await expect(search()).toHaveAttribute('aria-describedby', button.getAttribute('aria-describedby'));
    await expect(search()).toHaveAttribute('aria-required', 'true');
    await close(root);
  },
};
export const 한글조합: Story = {
  render: () => <Demo options={locations} aria-label="사업장" placeholder="사업장 선택" />,
  play: async ({ canvasElement: root }) => {
    const input = await open(root);
    fireEvent.compositionStart(input);
    for (const value of ['ㅅ', '서', '설', '서울']) {
      fireEvent.compositionUpdate(input, { data: value });
      fireEvent.input(input, { target: { value }, isComposing: true, inputType: 'insertCompositionText' });
      await waitFor(() => expect(input).toHaveValue(value));
      await expect(document.querySelectorAll('[data-slot="combobox-option"]').length).toBeGreaterThan(0);
      await expect(document.querySelector('[data-slot="combobox-empty"]')).not.toBeInTheDocument();
    }
    await userEvent.keyboard('{Enter}');
    await expect(within(root).getByLabelText('선택 값')).toHaveTextContent('선택 없음');
    await expect(trigger(root)).toHaveAttribute('aria-expanded', 'true');
    fireEvent.compositionEnd(input, { data: '서울' });
    await waitFor(() => expect(document.querySelectorAll('[data-slot="combobox-option"]')).toHaveLength(1));
    await close(root);
  },
};
export const 초성검색: Story = {
  render: () => <Demo options={locations} aria-label="사업장" searchPlaceholder="초성으로도 검색하세요 (예: ㅅㅇ)" />,
  play: async ({ canvasElement: root }) => {
    // ㅅㅇ 는 서울(ㅅ·ㅇ)과 수원(ㅅ·ㅇ) 둘 다 맞는다. 하나로 좁히려면 더 치면 된다.
    await open(root); await userEvent.type(search(), 'ㅅㅇ');
    await waitFor(() => expect(within(document.body).getAllByRole('option')).toHaveLength(2));
    for (const name of ['서울 본사', '수원 창고'])
      await expect(within(document.body).getByRole('option', { name })).toBeVisible();
    await userEvent.clear(search()); await userEvent.type(search(), 'ㅅㅅ');
    await waitFor(() => expect(within(document.body).getAllByRole('option')).toHaveLength(1));
    await expect(within(document.body).getByRole('option', { name: '서산 물류센터' })).toBeVisible();
    await close(root);
  },
};
export const 맞춤검색: Story = {
  render: () => <Demo options={locations} aria-label="사업장 코드" filter={(query, option) => option.value.includes(query)} />,
  play: async ({ canvasElement: root }) => {
    await open(root); await userEvent.type(search(), 'location-3');
    await waitFor(() => expect(within(document.body).getAllByRole('option')).toHaveLength(1));
    await expect(within(document.body).getByRole('option', { name: '부산 지점' })).toBeVisible();
    await close(root);
  },
};

// 320px 툴바에서 4글자 사업장 라벨로 줄바꿈 수치와 긴 값의 별도 말줄임을 검증한다.
const multiOptions: ComboboxOption[] = ['서울본사', '부산지점', '대구창고', '수원창고', '성남지점', '서산물류',
  '울산지점', '인천창고', '광주지점', '대전창고', '청주지점', '제주창고', '아주 긴 이름을 가진 사업장 전체 라벨 보존 확인용 서울특별시 강남구 제2물류센터']
  .map((label, index) => ({ value: `multi-${index}`, label }));
function MultipleDemo({ initial = 0, ime = false }: { initial?: number; ime?: boolean }) {
  const [value, setValue] = React.useState(multiOptions.slice(0, initial).map(option => option.value));
  return <FormFlow style={{ width: 320 }} onSubmit={event => event.preventDefault()}>
    <button type="button" data-probe="before-chips">이전 입력</button>
    <Field label="대상 사업장" description="여러 사업장을 검색해 선택하세요" required>
      <Combobox multiple options={ime ? [...multiOptions, ...locations] : multiOptions} value={value} onValueChange={setValue} />
    </Field>
    <button type="button" data-probe="after-chips">다음 입력</button>
    <output data-slot="combobox-demo-value">{JSON.stringify(value)}</output>
    <div aria-label="검증용 선택 개수">
      {[0, 1, 2, 3, 4, 5, 8, 12].map(count => <button type="button" key={count} data-count={count}
        onClick={() => setValue(multiOptions.slice(0, count).map(option => option.value))}>{count}개</button>)}
    </div>
  </FormFlow>;
}
const multipleDone: NonNullable<Story['play']> = async ({ canvasElement }) => { canvasElement.dataset.playComplete = 'true'; };
export const 다중선택: Story = { render: () => <MultipleDemo />, play: multipleDone };
export const 다중선택_많음: Story = { name: '다중선택-많음', render: () => <MultipleDemo initial={8} />, play: multipleDone };
export const 다중선택_한글조합: Story = {
  name: '다중선택-한글조합', render: () => <MultipleDemo initial={1} ime />, play: multipleDone,
};
