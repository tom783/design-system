import type { Meta, StoryObj } from '@storybook/react-vite';
import { Plus, Trash2, Download, Filter, ChevronDown } from 'lucide-react';
import { Button } from '../components/button';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    docs: {
      description: {
        component:
          'primary 는 화면당 하나만 쓴다 — 둘 이상이면 위계가 사라진다. ' +
          '데이터 화면의 대부분 버튼은 secondary 여야 한다. ' +
          'danger 는 되돌릴 수 없는 작업에만 쓰고, 반드시 아이콘이나 명시적 동사와 함께 쓴다.',
      },
    },
  },
  args: { children: '주문 등록' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const 기본: Story = { args: { variant: 'primary', leadingIcon: <Plus /> } };

export const 변형: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2.5">
      <Button variant="primary" leadingIcon={<Plus />}>주문 등록</Button>
      <Button variant="secondary" leadingIcon={<Filter />}>필터</Button>
      <Button variant="ghost" leadingIcon={<Download />}>내보내기</Button>
      <Button variant="danger" leadingIcon={<Trash2 />}>반품 확정</Button>
    </div>
  ),
};

export const 크기: Story = {
  parameters: {
    docs: {
      description: {
        story: 'lg(44px)는 터치 최소 타깃 기준이다. 태블릿으로 쓰는 물류 화면은 이 크기를 기본으로 쓴다.',
      },
    },
  },
  render: () => (
    <div className="flex flex-wrap items-center gap-2.5">
      <Button size="sm" variant="primary">32px</Button>
      <Button size="md" variant="primary">38px</Button>
      <Button size="lg" variant="primary">44px 터치</Button>
    </div>
  ),
};

export const 긴라벨: Story = {
  name: '긴 라벨 — 겹침 방지',
  parameters: {
    docs: {
      description: {
        story:
          '라벨이 길어도 줄바꿈되거나 아이콘과 겹치지 않는다. 컨테이너를 넘치면 말줄임으로 처리한다. ' +
          '아래 두 번째 버튼은 폭 180px 컨테이너에 갇혀 있다.',
      },
    },
  },
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <Button variant="primary" leadingIcon={<Plus />} trailingIcon={<ChevronDown />}>
        선택한 312건 일괄 출고 처리
      </Button>
      <div className="border-line-strong flex w-[180px] rounded-[var(--radius-md)] border border-dashed p-2">
        <Button variant="secondary" leadingIcon={<Download />} className="min-w-0">
          전체 주문 내역 엑셀로 내보내기
        </Button>
      </div>
    </div>
  ),
};

export const 상태: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2.5">
      <Button variant="primary">기본</Button>
      <Button variant="primary" disabled>비활성</Button>
      <Button variant="secondary">기본</Button>
      <Button variant="secondary" disabled>비활성</Button>
      <Button variant="primary" iconOnly aria-label="주문 추가" leadingIcon={<Plus />} />
      <Button variant="ghost" iconOnly aria-label="삭제" leadingIcon={<Trash2 />} />
    </div>
  ),
};
