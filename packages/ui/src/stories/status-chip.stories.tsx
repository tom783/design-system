import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusChip } from '../components/status-chip';

const meta = {
  title: 'Components/StatusChip',
  component: StatusChip,
  parameters: {
    docs: {
      description: {
        component:
          '톤마다 모양이 다른 아이콘을 쓴다. 모든 톤에 같은 원형 점을 쓰면 톤 사이의 차이는 ' +
          '결국 색뿐이고, 색각 이상 사용자(남성 약 8%)와 흑백 인쇄에서 구별이 사라진다. ' +
          '삼각형(경고) · 원+체크(완료) · 원+느낌표(에러)처럼 실루엣이 달라야 색이 아닌 신호가 된다. ' +
          'WCAG 1.4.1 이 요구하는 것은 색이 유일한 수단이 아닐 것이며, 여기서는 라벨 텍스트와 ' +
          '아이콘 모양 둘이 그 역할을 한다.',
      },
    },
  },
  args: { children: '결제완료', tone: 'info' },
} satisfies Meta<typeof StatusChip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const 기본: Story = {};

export const 주문상태: Story = {
  name: '주문 상태 전체',
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusChip tone="info">결제완료</StatusChip>
      <StatusChip tone="warning">상품준비중</StatusChip>
      <StatusChip tone="success">배송중</StatusChip>
      <StatusChip tone="danger">반품요청</StatusChip>
      <StatusChip tone="neutral">미결제</StatusChip>
    </div>
  ),
};

export const 긴라벨: Story = {
  name: '긴 라벨 — 말줄임',
  parameters: {
    docs: {
      description: {
        story: '고정 너비를 주지 않는다. 컨테이너를 넘치면 말줄임하고 title 속성에 전체 값을 남긴다.',
      },
    },
  },
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <StatusChip tone="warning">상품준비중(부분출고 2/5)</StatusChip>
      <div className="border-line-strong w-[140px] rounded-[var(--radius-md)] border border-dashed p-2">
        <StatusChip tone="warning">상품준비중(부분출고 2/5)</StatusChip>
      </div>
    </div>
  ),
};

export const 흑백검증: Story = {
  name: '흑백 출력 검증',
  parameters: {
    docs: {
      description: {
        story:
          '색을 모두 제거해도 아이콘 실루엣과 라벨 텍스트로 상태가 구별되는지 확인한다. ' +
          '아래 두 번째 줄이 흑백 변환 결과다. 보고서를 흑백 인쇄하는 사용자가 실제로 있다.',
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <StatusChip tone="info">결제완료</StatusChip>
        <StatusChip tone="warning">상품준비중</StatusChip>
        <StatusChip tone="success">배송중</StatusChip>
        <StatusChip tone="danger">반품요청</StatusChip>
      </div>
      <div className="flex flex-wrap gap-2" style={{ filter: 'grayscale(1)' }}>
        <StatusChip tone="info">결제완료</StatusChip>
        <StatusChip tone="warning">상품준비중</StatusChip>
        <StatusChip tone="success">배송중</StatusChip>
        <StatusChip tone="danger">반품요청</StatusChip>
      </div>
    </div>
  ),
};
