import { Steps } from '../../src';

export function StepsExample() {
  return <Steps current={1} steps={[
    { label: '기본 정보', description: '상품명과 분류' },
    { label: '가격 입력', description: '판매가와 재고' },
    { label: '배송 설정' },
    { label: '최종 확인' },
  ]} />;
}
