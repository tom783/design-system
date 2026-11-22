import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';
import { Field, FormFlow, FormRow, useComposition } from '../components/form';
import { Input } from '../components/input';
import { Button } from '../components/button';

const meta = {
  tags: ['autodocs'], title: 'Components/Form', parameters: { manifest: ['Field', 'FormRow', 'FormFlow', 'Label', 'Checkbox'], layout: 'padded' },
  decorators: [(Story) => <div style={{ maxWidth: 520 }}><Story /></div>],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const done = (root: HTMLElement) => { root.dataset.playComplete = 'true'; };
const fields = (root: HTMLElement) => within(root).getAllByRole('textbox') as HTMLInputElement[];

export const 기본: Story = {
  render: () => <><p id="existing-help">기존 안내</p><Field label="수취인" description="주문서에 인쇄됩니다" error="수취인을 입력하세요" required>
    <Input id="receiver" aria-describedby="existing-help" />
  </Field></>,
  play: async ({ canvasElement: root }) => {
    const input = fields(root)[0]!;
    const error = root.querySelector('[data-slot="field-error"]')!;
    const description = root.querySelector('[data-slot="field-description"]')!;
    await expect(input.id).toBe('receiver');
    await expect(input).toHaveAttribute('aria-describedby', `${error.id} ${description.id} existing-help`);
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toBeRequired();
    await expect(root.querySelector('label')).toHaveAttribute('for', 'receiver');
    const descriptionBottom = description.getBoundingClientRect().bottom;
    const { top: inputTop, bottom: inputBottom } = input.getBoundingClientRect();
    const errorTop = error.getBoundingClientRect().top;
    await expect(descriptionBottom).toBeLessThanOrEqual(inputTop);
    await expect(inputBottom).toBeLessThanOrEqual(errorTop);
    done(root);
  },
};
/** 같은 줄 Field 는 FormRow 로 묶는다. 한쪽만 설명·오류가 있어도 입력칸 윗선이 같다(DESIGN §11.9). */
function SameRow({ errors = false }: { errors?: boolean }) {
  return <div data-probe="form-rows" className="flex flex-col gap-3">
    <FormRow data-probe="row-description">
      <Field label="판매자 상품 코드" description="영문·숫자·하이픈만 씁니다."><Input defaultValue="CAMP-CH-01" /></Field>
      <Field label="바코드"><Input inputMode="numeric" defaultValue="8801234567893" /></Field>
    </FormRow>
    <FormRow data-probe="row-plain">
      <Field label="재고 수량" required error={errors ? '재고 수량을 입력하세요' : undefined}><Input numeric inputMode="numeric" defaultValue={errors ? '' : '120'} /></Field>
      <Field label="1인 최대 구매 수량"><Input numeric inputMode="numeric" defaultValue="5" /></Field>
    </FormRow>
    <Field data-probe="single" label="상품명"><Input defaultValue="경량 캠핑 의자" /></Field>
  </div>;
}
export const 같은줄정렬: Story = {
  name: '같은 줄 정렬 — FormRow',
  render: () => <SameRow />,
  play: async ({ canvasElement: root }) => {
    const top = (probe: string) => [...root.querySelectorAll(`[data-probe="${probe}"] input`)].map(input => input.getBoundingClientRect().top);
    const [left, right] = top('row-description');
    await expect(Math.abs(left! - right!)).toBeLessThan(.5);
    // 설명이 없는 줄은 Field 하나와 같은 높이다 — 빈 설명 행이 자리를 차지하지 않는다.
    const height = (probe: string) => root.querySelector(`[data-probe="${probe}"]`)!.getBoundingClientRect().height;
    await expect(Math.abs(height('row-plain') - height('single'))).toBeLessThan(.5);
    done(root);
  },
};
export const 같은줄정렬_오류: Story = { name: '같은 줄 정렬 — 오류', render: () => <SameRow errors />, play: ({ canvasElement: root }) => done(root) };
function LayoutDemo() {
  const [error, setError] = React.useState(false);
  return <div data-testid="layout"><Field label="수취인" error={error ? '수취인을 입력하세요' : undefined}><Input /></Field>
    <Field label="연락처"><Input /></Field><Button onClick={() => setError(!error)}>오류 전환</Button></div>;
}
export const 오류_레이아웃: Story = {
  name: '오류-레이아웃', render: () => <LayoutDemo />,
  play: async ({ canvasElement: root }) => {
    const canvas = within(root);
    const top = fields(root)[1]!.getBoundingClientRect().top;
    const layout = canvas.getByTestId('layout');
    const height = layout.getBoundingClientRect().height;
    const reserved = [...root.querySelectorAll('[data-slot="field-error"]')].reduce((sum, el) => sum + el.getBoundingClientRect().height, 0);
    root.dataset.reservedHeight = String(reserved);
    const slots = [...root.querySelectorAll<HTMLElement>('[data-slot="field-error"]')];
    slots.forEach(slot => { slot.style.display = 'none'; });
    root.dataset.reservationIncrease = String(height - layout.getBoundingClientRect().height);
    slots.forEach(slot => { slot.style.removeProperty('display'); });
    root.dataset.formHeight = String(height);
    await userEvent.click(canvas.getByRole('button'));
    await expect(fields(root)[1]!.getBoundingClientRect().top).toBe(top);
    await expect(layout.getBoundingClientRect().height).toBe(height);
    await userEvent.click(canvas.getByRole('button'));
    await expect(fields(root)[1]!.getBoundingClientRect().top).toBe(top);
    done(root);
  },
};
function ValidationDemo() {
  const [value, setValue] = React.useState('');
  const [error, setError] = React.useState('');
  const hasErrored = React.useRef(false);
  const composition = useComposition();
  // 검증 내용은 소비 앱의 예시다. 패키지는 검증 시점만 제공한다.
  const validate = (trigger: 'change' | 'blur', next: string) => {
    // 한글 조합 중에는 검증하지 않는다. 첫 오류는 blur에서 알리고, 이미 난 오류는 change에서 바로 푼다.
    if (composition.isComposing() || (trigger === 'change' && !hasErrored.current)) return;
    const message = next.length < 3 ? '세 글자 이상 입력하세요' : '';
    if (message) hasErrored.current = true;
    setError(message);
  };
  return <><Field label="수취인" error={error}><Input {...composition.bind} value={value}
    onChange={event => { setValue(event.target.value); validate('change', event.target.value); }}
    onBlur={() => validate('blur', value)} /></Field><Button>다음 작업</Button></>;
}
export const 검증시점: Story = {
  render: () => <ValidationDemo />,
  play: async ({ canvasElement: root }) => {
    const input = fields(root)[0]!;
    const error = root.querySelector('[data-slot="field-error"]')!;
    await userEvent.click(input);
    await userEvent.keyboard('a');
    await expect(error).toBeEmptyDOMElement();
    await expect(input).not.toHaveAttribute('aria-invalid', 'true');
    await userEvent.tab();
    await expect(error).toHaveTextContent('세 글자 이상');
    await expect(within(root).getByRole('button')).toHaveFocus();
    await userEvent.type(input, 'bc');
    await expect(error).toBeEmptyDOMElement();
    await expect(input).not.toHaveAttribute('aria-invalid', 'true');
    done(root);
  },
};
function FlowDemo({ textarea = false, disabled = false, restart = false, ordered = false }: { textarea?: boolean; disabled?: boolean; restart?: boolean; ordered?: boolean }) {
  const [count, setCount] = React.useState(0);
  return <FormFlow restartOnSubmit={restart} style={{ display: 'grid', gap: 'var(--space-8)' }}
    onSubmit={async () => { await Promise.resolve(); setCount(n => n + 1); }}>
    <Field label="송장번호"><Input tabIndex={ordered ? 2 : undefined} /></Field>
    {disabled && <>
      <Field label="비활성"><Input disabled /></Field>
      <div hidden><Input aria-label="숨김" /></div>
      <Input aria-label="음수 순서" tabIndex={-1} />
      <fieldset disabled><Input aria-label="비활성 그룹" /></fieldset>
    </>}
    <Field label="수취인"><Input readOnly={disabled} tabIndex={ordered ? 1 : undefined} /></Field>
    {textarea && <Field label="메모"><textarea aria-label="메모" /></Field>}
    <Button type="submit">등록</Button><output aria-label="등록 횟수">{count}</output>
  </FormFlow>;
}
export const Enter_이동: Story = {
  name: 'Enter-이동', render: () => <FlowDemo />,
  play: async ({ canvasElement: root }) => {
    const [first, second] = fields(root);
    first!.focus(); await userEvent.keyboard('{Enter}'); await expect(second).toHaveFocus();
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}'); await expect(first).toHaveFocus();
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}'); await expect(first).toHaveFocus();
    await userEvent.keyboard('{Enter}{Enter}');
    await waitFor(() => expect(within(root).getByLabelText('등록 횟수')).toHaveTextContent('1'));
    done(root);
  },
};
export const Enter_textarea: Story = {
  name: 'Enter-textarea', render: () => <FlowDemo textarea />,
  play: async ({ canvasElement: root }) => {
    const textarea = within(root).getByLabelText('메모');
    await userEvent.type(textarea, '첫 줄{Enter}둘째 줄');
    await expect(textarea).toHaveValue('첫 줄\n둘째 줄'); await expect(textarea).toHaveFocus();
    await expect(within(root).getByLabelText('등록 횟수')).toHaveTextContent('0');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    await waitFor(() => expect(within(root).getByLabelText('등록 횟수')).toHaveTextContent('1'));
    done(root);
  },
};
export const Enter_비활성건너뜀: Story = {
  name: 'Enter-비활성건너뜀', render: () => <FlowDemo disabled />,
  play: async ({ canvasElement: root }) => {
    const first = within(root).getByLabelText('송장번호');
    const second = within(root).getByLabelText('수취인');
    first.focus(); await userEvent.tab(); await expect(second).toHaveFocus();
    first.focus(); await userEvent.keyboard('{Enter}'); await expect(second).toHaveFocus();
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}'); await expect(first).toHaveFocus();
    done(root);
  },
};
function AutoAdvanceDemo() {
  const composition = useComposition();
  const next = React.useRef<HTMLInputElement>(null);
  const advance = (value: string) => { if (!composition.isComposing() && [...value].length >= 3) next.current?.focus(); };
  return <><Field label="앞 세 글자"><Input {...composition.bind}
    onChange={event => advance(event.target.value)}
    onCompositionEnd={event => { composition.bind.onCompositionEnd(); advance(event.currentTarget.value); }} /></Field>
    <Field label="나머지"><Input ref={next} /></Field></>;
}
export const 한글_자동이동: Story = {
  name: '한글-자동이동', render: () => <AutoAdvanceDemo />,
  play: async ({ canvasElement: root }) => {
    const [first, next] = fields(root);
    first!.focus();
    first!.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    // 실제 IME 대신 조합 중 자모별 input을 발생시켜 이동 가드 자체를 검증한다.
    for (const value of ['ㅎ', '하', '한', '한글', '한글ㅇ', '한글이', '한글입']) {
      await fireEvent.input(first!, { target: { value }, isComposing: true });
      await expect(first).toHaveFocus();
    }
    await expect(first).toHaveValue('한글입'); await expect(next).toHaveValue('');
    first!.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '입' }));
    await expect(next).toHaveFocus(); await userEvent.type(next!, '력');
    await expect(first).toHaveValue('한글입'); await expect(next).toHaveValue('력'); done(root);
  },
};
export const 한글_Enter: Story = {
  name: '한글-Enter', render: () => <FlowDemo />,
  play: async ({ canvasElement: root }) => {
    const [first, second] = fields(root);
    first!.focus();
    first!.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    first!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, isComposing: true }));
    await expect(first).toHaveFocus();
    await expect(within(root).getByLabelText('등록 횟수')).toHaveTextContent('0');
    first!.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    await userEvent.keyboard('{Enter}'); await expect(second).toHaveFocus(); done(root);
  },
};
export const 연속등록: Story = {
  render: () => <FlowDemo restart />,
  play: async ({ canvasElement: root }) => {
    const [first, second] = fields(root);
    for (let n = 1; n <= 2; n++) {
      second!.focus(); await userEvent.keyboard('{Enter}');
      await waitFor(() => expect(within(root).getByLabelText('등록 횟수')).toHaveTextContent(String(n)));
      await waitFor(() => expect(first).toHaveFocus());
    }
    done(root);
  },
};
export const 양수_Tab순서: Story = {
  render: () => <FlowDemo ordered />,
  play: async ({ canvasElement: root }) => {
    const [first, second] = fields(root);
    second!.focus(); await userEvent.tab(); await expect(first).toHaveFocus();
    second!.focus(); await userEvent.keyboard('{Enter}'); await expect(first).toHaveFocus(); done(root);
  },
};
function SubmitValidationDemo() {
  const [error, setError] = React.useState('');
  const [reject, setReject] = React.useState(false);
  return <FormFlow restartOnSubmit onSubmit={() => { setError('수취인을 확인하세요'); return false; }}>
    <Field label="송장번호"><Input /></Field>
    <Field label="수취인" error={error}><Input /></Field>
    <Button type="submit">등록</Button>
    <Button type="button" onClick={() => setReject(!reject)}>네이티브 버튼</Button>
    <select aria-label="배송 방식"><option>택배</option><option>방문</option></select>
    <output aria-label="버튼 횟수">{reject ? 1 : 0}</output>
  </FormFlow>;
}
export const 제출오류와_네이티브동작: Story = {
  render: () => <SubmitValidationDemo />,
  play: async ({ canvasElement: root }) => {
    const canvas = within(root);
    const nativeButton = canvas.getByRole('button', { name: '네이티브 버튼' });
    nativeButton.focus(); await userEvent.keyboard('{Enter}');
    await expect(canvas.getByLabelText('버튼 횟수')).toHaveTextContent('1');
    await expect(nativeButton).toHaveFocus();
    const select = canvas.getByRole('combobox');
    select.focus();
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    select.dispatchEvent(event);
    await expect(event.defaultPrevented).toBe(false); await expect(select).toHaveFocus();
    await userEvent.click(canvas.getByRole('button', { name: /^등록$/ }));
    await waitFor(() => expect(canvas.getByLabelText('수취인')).toHaveFocus());
    await expect(canvas.getByLabelText('수취인')).toHaveAttribute('aria-invalid', 'true');
    done(root);
  },
};
