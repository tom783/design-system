import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Steps } from '../index';
import { StepsExample } from '../../docs/examples/steps';
import { ProductStepsExample } from '../../docs/examples/product-steps';
import primarySource from '../../docs/examples/steps.tsx?raw';
import productSource from '../../docs/examples/product-steps.tsx?raw';

const meta = { title: 'Components/Steps', component: Steps, tags: ['autodocs'],
  parameters: { manifest: ['Steps'] } } satisfies Meta<typeof Steps>;
export default meta;
type Story = StoryObj;
const steps = [{ label: '기본 정보' }, { label: '가격 입력' }, { label: '배송 설정' }, { label: '최종 확인' }];
export const 사용법: Story = {
  parameters: { docs: { source: { code: primarySource.replace("from '../../src'", "from '@s2life/ui'"), language: 'tsx', type: 'code' } } },
  render: () => <StepsExample />,
};
export const 기본: Story = { render: () => <StepsExample /> };
export const 첫단계: Story = { render: () => <Steps steps={steps} current={0} /> };
export const 중간단계: Story = { render: () => <Steps steps={steps} current={2} /> };
export const 마지막단계: Story = { render: () => <Steps steps={steps} current={3} /> };
export const 오류단계: Story = { render: () => <Steps current={1} steps={[
  { label: '기본 정보' }, { label: '가격 입력', status: 'error', description: '판매가를 확인해 주세요.' },
  { label: '배송 설정', status: 'error' }, { label: '최종 확인' },
]} onStepClick={() => {}} /> };
function ClickableSteps() {
  const [current, setCurrent] = useState(2);
  return <div className="space-y-4">
    <button type="button" data-probe="before">이전 작업</button>
    <Steps current={current} steps={steps} onStepClick={setCurrent} />
    <button type="button" data-probe="reset" onClick={() => setCurrent(2)}>3단계로 복원</button>
    <output aria-live="polite">현재 인덱스: {current}</output>
  </div>;
}
export const 완료단계클릭: Story = { render: () => <ClickableSteps /> };
export const 긴라벨: Story = { render: () => <Steps current={1} steps={steps.map(step => ({
  label: `${step.label} 및 국내외 판매 채널의 상세 운영 정책 입력과 검토`,
  description: '각 판매 채널의 필수 항목을 빠짐없이 입력해 주세요.',
}))} /> };
export const 좁은폭: Story = { render: () => <div style={{ width: 320, maxWidth: '100%' }}><StepsExample /></div> };
export const 다크: Story = { globals: { theme: 'dark' }, render: () => <Steps current={2} steps={[
  { label: '기본 정보' }, { label: '가격 입력', status: 'error' }, { label: '배송 설정' }, { label: '최종 확인' },
]} /> };
export const 상품등록: Story = {
  parameters: { docs: { source: { code: productSource.replace("from '../../src'", "from '@s2life/ui'"), language: 'tsx', type: 'code' } } },
  render: () => <ProductStepsExample />,
};
