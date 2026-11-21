import { ClampText } from '../../src';

const description = '재활용 종이로 만든 포장 상자입니다. 완충재를 함께 사용하면 배송 중 상품 손상을 줄일 수 있습니다.\n습기가 적은 실내에 보관하고, 무거운 상품은 상자 바닥을 보강한 뒤 포장해 주세요.\n사업장별 주문 수량과 배송 일정은 담당자에게 문의해 주세요.';

export function ClampTextExample() {
  return <section aria-label="상품 설명">
    <h3>친환경 포장 상자</h3>
    <ClampText lines={2} style={{ whiteSpace: 'pre-line' }}>{description}</ClampText>
  </section>;
}
