import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowUp, ArrowDown, Plus, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from '../components/card';
import { Button } from '../components/button';
import { StatusChip } from '../components/status-chip';
import { Input } from '../components/input';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Card',
  component: Card,
  parameters: { manifest: ['Card', 'CardHeader', 'CardTitle', 'CardBody', 'CardFooter'],
    docs: {
      description: {
        component:
          'A 정밀 플랫은 그림자를 쓰지 않는다. 경계선과 배경 명도 차이로만 면을 분리한다. ' +
          '행이 1,000개로 늘어나도 시각 비용이 선형으로만 증가하는 것이 이 선택의 이유다. ' +
          '그림자는 떠 있는 레이어(팝오버·모달)에만 --shadow-overlay 로 허용한다.',
      },
    },
  },
} satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const 기본: Story = {
  render: () => (
    <Card className="w-[360px]">
      <CardHeader>
        <CardTitle>출고 대기</CardTitle>
        <StatusChip tone="warning">조치 필요</StatusChip>
      </CardHeader>
      <CardBody>
        <p className="text-fg-muted text-[length:var(--text-body-sm)]">
          오늘 중 출고되어야 하는 주문이 312건 남아 있습니다.
        </p>
      </CardBody>
      <CardFooter>
        <span>마지막 동기화 14:28</span>
        <Button size="sm" variant="secondary">전체 보기</Button>
      </CardFooter>
    </Card>
  ),
};

const KPI = [
  { label: '오늘 주문', value: '1,284', unit: '건', delta: '+8.4%', up: true },
  { label: '결제 금액', value: '48,200', unit: '만원', delta: '+12.1%', up: true },
  { label: '출고 대기', value: '312', unit: '건', delta: '+41건', up: false },
  { label: '반품 요청', value: '27', unit: '건', delta: '-5건', up: true },
];

export const KPI타일: Story = {
  name: 'KPI 타일',
  render: () => (
    <div className="grid max-w-[1000px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {KPI.map((k) => (
        <Card key={k.label} className="flex min-w-0 flex-col gap-1.5 p-4">
          <span className="text-fg-muted text-[length:var(--text-caption)] font-medium">
            {k.label}
          </span>
          <span className="tabular flex items-baseline gap-1 text-[length:var(--text-title-lg)] leading-[var(--text-title-lg-lh)] font-semibold tracking-[-0.02em]">
            {k.value}
            <small className="text-fg-muted text-[length:var(--text-body)] font-medium">
              {k.unit}
            </small>
          </span>
          <span
            className={`tabular flex items-center gap-1 font-sans text-[length:var(--text-caption)] font-medium ${
              k.up ? 'text-success-ink' : 'text-danger-ink'
            }`}
          >
            {k.up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
            {k.delta}
          </span>
        </Card>
      ))}
    </div>
  ),
};

const ORDERS = [
  ['ORD-24119-0841', '김서연', '무선 이어버드 프로 외 2건', '248,000', 'info', '결제완료'],
  ['ORD-24119-0837', '박지훈', '스탠딩 데스크 1200', '389,000', 'warning', '상품준비중'],
  ['ORD-24119-0834', '이하늘', '프리미엄 원두 1kg 외 5건', '1,248,500', 'success', '배송중'],
  ['ORD-24119-0822', '최민아', '유기농 단백질 바 24입', '47,600', 'danger', '반품요청'],
] as const;

export const 주문패널: Story = {
  name: '주문 패널 — 조합 검증',
  parameters: {
    docs: {
      description: {
        story:
          '컴포넌트들이 실제 화면에서 함께 쓰일 때 여백·정렬·대비가 유지되는지 확인한다. ' +
          '금액 열은 고정폭 숫자 + 우측 정렬 + 최소 너비 140px 로 자릿수가 달라도 비교가 가능하다.',
      },
    },
  },
  render: () => (
    <Card className="max-w-[900px]">
      <div className="flex flex-wrap items-center gap-2 p-4 pb-0">
        <Button variant="primary" size="sm" leadingIcon={<Plus />}>주문 등록</Button>
        <Button variant="secondary" size="sm" leadingIcon={<Download />}>내보내기</Button>
        <div className="ml-auto w-56">
          <Input placeholder="주문번호 · 수취인 검색" />
        </div>
      </div>
      <div className="overflow-x-auto p-4">
        <table className="w-full border-collapse text-[length:var(--text-body-sm)]">
          <thead>
            <tr>
              {['주문번호', '수취인', '상품', '결제금액', '상태'].map((h, i) => (
                <th
                  key={h}
                  className={`bg-canvas border-line-strong text-fg-muted border-b px-3.5 py-2.5 font-semibold whitespace-nowrap ${
                    i === 3 ? 'text-right' : 'text-left'
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ORDERS.map((o) => (
              <tr key={o[0]} className="hover:bg-hovered">
                <td className="border-line text-fg-muted h-10 border-b px-3.5 font-mono whitespace-nowrap">
                  {o[0]}
                </td>
                <td className="border-line border-b px-3.5 whitespace-nowrap">{o[1]}</td>
                <td className="border-line border-b px-3.5">{o[2]}</td>
                <td className="border-line tabular min-w-32 border-b px-3.5 text-right font-medium whitespace-nowrap">
                  {o[3]}
                </td>
                <td className="border-line border-b px-3.5">
                  <StatusChip tone={o[4]}>{o[5]}</StatusChip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CardFooter>
        <span>1,284건 중 1–4</span>
        <span className="tabular font-sans">페이지 1 / 321</span>
      </CardFooter>
    </Card>
  ),
};
