import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Card, CardBody, CardHeader, CardTitle, DescriptionList, StatusChip, type DescriptionListItem } from '../index';
import { ExternalLink } from '../icons';
import { DescriptionListExample } from '../../docs/examples/description-list';
import primarySource from '../../docs/examples/description-list.tsx?raw';

/**
 * 설명 목록 — 디자인 총괄 규칙 표 0.5.0 (DESIGN.md §16.7). 검수 매트릭스:
 * 라이트·다크 × 가로형·두 열(720)·접힘(600)·세로형(320) × 빈 값·긴 값·칩·링크·합계 강조.
 * 폭은 카드 바깥 폭이다. 부품은 카드 본문(경계 1px + 여백 16px 양쪽) 폭으로 배치를 정한다.
 */
const meta = { title: 'Components/DescriptionList', component: DescriptionList, tags: ['autodocs'],
  parameters: { manifest: ['DescriptionList'] } } satisfies Meta<typeof DescriptionList>;
export default meta;
type Story = StoryObj;

// 측정 예시(Figma 190:2)와 같은 6쌍: 주문번호 링크+복사, 상태 칩, 주문자, 연락처, 긴 주소, 빈 메모.
const orderItems: DescriptionListItem[] = [
  { label: '주문번호', value: <span className="inline-flex items-center gap-2">
    <a className="tabular" href="#ORD-20481">ORD-20481</a>
    <Button size="sm" variant="ghost" aria-label="주문번호 복사">복사</Button>
  </span> },
  { label: '주문 상태', value: <StatusChip tone="neutral">배송 중</StatusChip> },
  { label: '주문자', value: '박서연' },
  { label: '연락처', value: <span className="tabular">010-4821-3920</span> },
  { label: '배송지', value: '서울특별시 성동구 아차산로17길 48, 12층 1203호 (성수동2가)' },
  { label: '메모' },
];
const totalItems: DescriptionListItem[] = [
  { label: '상품 합계', value: '124,000원' },
  { label: '배송비', value: '3,000원' },
  { label: '결제 금액', value: '127,000원', emphasis: true },
];

function Frame({ title, width, children }: { title: string; width: number; children: React.ReactNode }) {
  return <Card data-frame={width} style={{ width, maxWidth: '100%' }}>
    <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
    <CardBody>{children}</CardBody>
  </Card>;
}

export const 사용법: Story = {
  parameters: { docs: { source: { code: primarySource.replace("from '../../src'", "from '@s2life/ui'"), language: 'tsx', type: 'code' } } },
  render: () => <DescriptionListExample />,
};
export const 가로형: Story = { render: () => <Frame title="주문 정보" width={720}><DescriptionList items={orderItems} /></Frame> };
export const 두열: Story = { name: '두 열', render: () => <Frame title="주문 정보" width={720}><DescriptionList columns={2} items={orderItems} /></Frame> };
export const 접힘: Story = { render: () => <Frame title="주문 정보" width={600}><DescriptionList columns={2} items={orderItems} /></Frame> };
export const 세로형: Story = { render: () => <Frame title="주문 정보" width={320}><DescriptionList columns={2} items={orderItems} /></Frame> };
export const 합계: Story = { render: () => <Frame title="결제" width={320}><DescriptionList align="end" items={totalItems} /></Frame> };

/** 같은 화면 카드 세 장의 라벨 열을 labelWidth 로 맞춘다. 생략하면 카드마다 가장 긴 라벨에 맞춰 시작선이 달라진다. */
export const 라벨폭고정: Story = { name: '라벨 폭 고정', render: () => <div className="flex gap-4">
  <Frame title="주문 정보" width={380}><DescriptionList labelWidth={6} items={[{ label: '주문번호', value: 'ORD-20481' }, { label: '판매 채널', value: '자사몰' }]} /></Frame>
  <Frame title="배송" width={380}><DescriptionList labelWidth={6} items={[{ label: '수취인', value: '박서연' }, { label: '배송 요청 사항', value: '부재 시 문 앞' }]} /></Frame>
  <Frame title="결제" width={380}><DescriptionList labelWidth={6} items={[{ label: '결제 수단', value: '간편결제' }, { label: '할부', value: '일시불' }]} /></Frame>
</div> };

/** 10rem 을 넘는 라벨은 라벨이 줄바꿈한다. 숫자 0 은 값이고, 공백만 있는 문자열·null 은 빈 값이다. 외부 링크는 앱이 아이콘을 붙인다. */
export const 경계값: Story = { render: () => <Frame title="정산" width={720}><DescriptionList items={[
  { label: '정산 예정 금액(수수료·부가세·배송비 차감 후)', value: '1,284,000원' },
  { label: '반품 수량', value: 0 },
  { label: '세금계산서', value: '   ' },
  { label: '정산 담당', value: null },
  { label: '정산 규정', value: <a href="https://example.com/settlement" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
    판매자 정산 규정<ExternalLink aria-hidden="true" className="size-3.5" /><span className="sr-only">(새 창)</span></a> },
  { label: '송장번호', value: <span className="tabular whitespace-nowrap">6084-2219-3301-7752</span> },
]} /></Frame> };

/** 검수 매트릭스 한 장 — 가로형 720 · 두 열 720 · 접힘 600 · 세로형 320 · 합계 320. 다크는 아래 스토리. */
function Matrix() {
  return <div data-matrix="" className="flex flex-wrap items-start gap-6">
    <Frame title="가로형 720" width={720}><DescriptionList items={orderItems} /></Frame>
    <Frame title="세로형 320" width={320}><DescriptionList columns={2} items={orderItems} /></Frame>
    <Frame title="합계 320" width={320}><DescriptionList align="end" items={totalItems} /></Frame>
    <Frame title="두 열 720" width={720}><DescriptionList columns={2} items={orderItems} /></Frame>
    <Frame title="접힘 600" width={600}><DescriptionList columns={2} items={orderItems} /></Frame>
  </div>;
}
export const 검수매트릭스: Story = { name: '검수 매트릭스', parameters: { layout: 'fullscreen' }, render: () => <Matrix /> };
export const 다크: Story = { globals: { theme: 'dark' }, parameters: { layout: 'fullscreen' }, render: () => <Matrix /> };
