/**
 * 목록 툴바 스토리 공통 — 주문 목록의 적용 필터 8개와 조건 패널.
 * 0.5.0 목록 툴바 시안(Figma 187:2)의 칩 문구를 따른다. 데이터는 screens-shell 의 가상 주문이다.
 */
import { Checkbox, type FilterBarFilter } from '../index';
import { NOW, type Order } from './screens-shell';

export interface OrderFilter extends FilterBarFilter { test: (order: Order) => boolean }
const always = () => true;
export const ORDER_FILTERS: OrderFilter[] = [
  { id: 'status', label: '상태: 출고 대기', test: order => order.status === 'ready' },
  { id: 'period', label: '기간: 최근 30일', test: order => order.orderedAt.getTime() >= NOW.getTime() - 30 * 86_400_000 },
  { id: 'payment', label: '결제: 간편결제·카드', test: order => order.payment === '간편결제' || order.payment === '신용카드' },
  // 배송·국가·채널·프로모션은 가상 주문에 없는 속성이다. 칩 넘침·`+N` 검수용이라 행을 거르지 않는다.
  { id: 'delivery', label: '배송: 새벽·도서산간 제외', test: always },
  { id: 'country', label: '국가: 대한민국', test: always },
  { id: 'amount', label: '금액: 10,000원 이상', test: order => order.amount >= 10_000 },
  { id: 'channel', label: '채널: 자사몰·네이버', test: always },
  { id: 'promotion', label: '프로모션: 2026 겨울 장바구니 할인', test: always },
];
export const filtersOf = (ids: readonly string[]) => ORDER_FILTERS.filter(filter => ids.includes(filter.id));

/** 필터 트리거가 여는 조건 패널. 칩 해제·초기화와 같은 상태(id 목록)를 쓴다. */
export function OrderFilterPanel({ ids, onIdsChange }: { ids: readonly string[]; onIdsChange: (ids: string[]) => void }) {
  return <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
    <legend className="mb-2 text-[length:var(--text-body-sm)] font-semibold">적용할 조건</legend>
    {ORDER_FILTERS.map(filter => <label key={filter.id} className="flex items-center gap-2 text-[length:var(--text-body-sm)]">
      <Checkbox checked={ids.includes(filter.id)} onChange={event => onIdsChange(ORDER_FILTERS
        .filter(item => item.id === filter.id ? event.target.checked : ids.includes(item.id)).map(item => item.id))} />
      {filter.label}
    </label>)}
  </fieldset>;
}
