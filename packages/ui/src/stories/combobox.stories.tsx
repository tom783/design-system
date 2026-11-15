import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';
import { Combobox, Field, type ComboboxProps, type ComboboxOption } from '../index';

const meta = { title: 'Components/Combobox', component: Combobox, args: { options: [] },
  decorators: [(Story) => <div style={{ maxWidth: 480 }}><Story /></div>],
} satisfies Meta<typeof Combobox>;
export default meta;
type Story = StoryObj<typeof meta>;
const locations: ComboboxOption[] = ['서울 본사', '서산 물류센터', '성남 지점', '부산 지점', '대구 물류센터', '수원 창고']
  .map((label, index) => ({ value: `location-${index}`, label }));
const many: ComboboxOption[] = [...locations,
  ...Array.from({ length: 20 }, (_, index) => ({ value: `warehouse-${index}`, label: `지역 창고 ${index + 1}`, disabled: index === 19 }))];
function Demo(props: Omit<ComboboxProps, 'value' | 'onValueChange'>) {
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
    await expect(button).toHaveAttribute('aria-required', 'true');
    await expect(button).toHaveAttribute('aria-invalid', 'true');
    await expect(button).toHaveAttribute('aria-describedby', `${root.querySelector('[data-slot="field-error"]')!.id} ${root.querySelector('[data-slot="field-description"]')!.id}`);
    await userEvent.click(label);
    await waitFor(() => expect(search()).toHaveFocus());
    await expect(search()).toHaveAttribute('aria-describedby', button.getAttribute('aria-describedby'));
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
