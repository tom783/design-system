import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from '../components/input';

const meta = {
  title: 'Components/Input',
  component: Input,
  parameters: {
    docs: {
      description: {
        component:
          '경계선은 neutral-600(흰 배경 대비 4.17:1)을 쓴다. 많은 시스템이 쓰는 연회색(neutral-200)은 ' +
          '1.31:1 로 WCAG 1.4.11(3:1)을 위반한다. "입력할 수 있는 칸"이라는 정보를 경계선이 ' +
          '전달하므로 장식이 아니다.',
      },
    },
  },
  args: { placeholder: '주문번호 · 수취인 검색' },
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const 기본: Story = { render: (a) => <div className="w-80"><Input {...a} /></div> };

export const 경계선대비비교: Story = {
  name: '경계선 대비 비교',
  parameters: {
    docs: {
      description: {
        story: '왼쪽이 흔히 쓰는 연회색(규격 위반), 오른쪽이 우리 토큰이다. 축소해서 보면 차이가 분명하다.',
      },
    },
  },
  render: () => (
    <div className="grid max-w-[720px] gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <p className="text-danger-ink font-mono text-[11px] tracking-[0.08em] uppercase">
          neutral-200 · 1.31:1 · 위반
        </p>
        <input
          placeholder="주문번호 검색"
          className="bg-surface text-fg placeholder:text-fg-subtle h-[38px] w-full rounded-[var(--radius-md)] border px-3 text-[length:var(--text-body-sm)]"
          style={{ borderColor: 'var(--color-neutral-200)' }}
        />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-success-ink font-mono text-[11px] tracking-[0.08em] uppercase">
          border-input · 4.17:1 · 통과
        </p>
        <Input placeholder="주문번호 검색" />
      </div>
    </div>
  ),
};

export const 상태: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-3">
      <Input placeholder="기본" />
      <Input defaultValue="ORD-24119-0841" />
      <Input placeholder="비활성" disabled />
      <div className="flex flex-col gap-1.5">
        <Input defaultValue="ORD-999" invalid aria-describedby="err-1" />
        <p id="err-1" className="text-danger-ink flex items-start gap-1.5 text-[length:var(--text-caption)]">
          <span aria-hidden="true">⚠</span>
          존재하지 않는 주문번호입니다. ORD- 로 시작하는 13자리를 입력하세요.
        </p>
      </div>
    </div>
  ),
};

export const 금액입력: Story = {
  name: '금액 입력 — 고정폭 숫자',
  parameters: {
    docs: {
      description: {
        story: '숫자가 열로 정렬되는 곳에서는 고정폭 숫자를 쓴다. 자릿수가 흔들리면 비교가 불가능해진다.',
      },
    },
  },
  render: () => (
    <div className="flex w-60 flex-col gap-2">
      <Input numeric defaultValue="1,248,500,000" />
      <Input numeric defaultValue="47,600" />
      <Input numeric defaultValue="389,000" />
    </div>
  ),
};
