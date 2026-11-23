import { Button, Card, CardBody, CardHeader, CardTitle, DescriptionList, StatusChip } from '../../src';

export function DescriptionListExample() {
  return <Card style={{ maxWidth: 720 }}>
    <CardHeader><CardTitle>주문 정보</CardTitle></CardHeader>
    <CardBody>
      <DescriptionList items={[
        { label: '주문번호', value: <span className="inline-flex items-center gap-2">
          <a className="tabular" href="#ORD-20481">ORD-20481</a>
          <Button size="sm" variant="ghost" aria-label="주문번호 복사">복사</Button>
        </span> },
        { label: '주문 상태', value: <StatusChip tone="neutral">배송 중</StatusChip> },
        { label: '주문자', value: '박서연' },
        { label: '연락처', value: <span className="tabular">010-4821-3920</span> },
        { label: '배송지', value: '서울특별시 성동구 아차산로17길 48, 12층 1203호 (성수동2가)' },
        { label: '메모' },
      ]} />
    </CardBody>
  </Card>;
}
