/**
 * 반복 입력 줄 스토리 공통 — Figma 203:7 추천 조합과 같은 데이터(출고 품목 '품목명·수량(개)·중량(kg)').
 * 검증은 제출 뒤 상태를 흉내 낸다(validate). 값을 고치면 오류가 바로 풀린다(§11.2 일찍 풀어준다).
 * 데이터는 가상의 사무용품이다(실제 회사·상품 아님).
 */
import * as React from 'react';
import { FieldList, Input, type FieldListProps } from '../index';

export interface ShipmentItem { id: string; name: string; qty: string; weight: string }
export type ItemsState = 'default' | 'rowError' | 'cellError' | 'min' | 'max' | 'empty' | 'emptyError' | 'maxError';

const NAMES = [
  '노트북 파우치 15인치', '웹캠 FHD', '데스크 매트', '사무용 의자 쿠션', '모니터 받침대',
  '무선 키보드', '무선 마우스', 'USB-C 멀티 허브', 'HDMI 케이블 2m', '노트북 거치대',
  '케이블 정리함', '탁상 조명', '북엔드 세트', '서류 트레이', 'A4 복사용지 500매',
  '스테이플러', '화이트보드 마커', '포스트잇 세트', '명함 케이스', '데스크 오거나이저',
];
const QTY = [74, 41, 50, 79, 103, 3, 2, 6, 9, 11, 7, 4, 5, 8, 12, 15, 10, 16, 13, 17];
const WEIGHT = [0.35, 0.18, 0.62, 0.78, 1.8, 0.71, 0.09, 0.2, 0.12, 1.1, 0.4, 0.95, 0.6, 0.55, 2.5, 0.3, 0.08, 0.15, 0.1, 0.65];

let sequence = 0;
export const createShipmentItem = (): ShipmentItem => ({ id: `item-${++sequence}`, name: '', qty: '', weight: '' });
const filled = (index: number): ShipmentItem => ({
  id: `item-${++sequence}`, name: NAMES[index % NAMES.length]!, qty: String(QTY[index % QTY.length]), weight: WEIGHT[index % WEIGHT.length]!.toFixed(2),
});

function initial(state: ItemsState): ShipmentItem[] {
  const take = (count: number) => Array.from({ length: count }, (_, index) => filled(index));
  switch (state) {
    case 'empty': case 'emptyError': return [];
    case 'min': return take(1);
    case 'max': return take(20);
    case 'maxError': return [...take(20), filled(0)].map((item, index) => index === 20 ? { ...item, name: '책상 서랍 정리함' } : item);
    // 세 번째 줄이 첫 줄과 같은 품목 — 칸 하나로 좁힐 수 없는 줄 오류(규칙 표 L-13, 원인 칸 = 품목명).
    case 'rowError': return take(5).map((item, index) => index === 2 ? { ...item, name: NAMES[0]! } : item);
    // 둘째 줄 수량 0, 넷째 줄 중량 빈칸 — 각 칸 아래 오류(Figma 390 칸 오류 2개).
    case 'cellError': return take(5).map((item, index) => index === 1 ? { ...item, qty: '0' } : index === 3 ? { ...item, weight: '' } : item);
    default: return take(5);
  }
}

const MAX = 20;

/** 상태별 FieldList props 와 FormActionBar 의 '오류 N개'(칸 + 줄 + 묶음 1). */
export function useShipmentItems(state: ItemsState) {
  const [items, setItems] = React.useState(() => initial(state));
  const validate = state === 'rowError' || state === 'cellError' || state === 'emptyError' || state === 'maxError';
  const cell = (item: ShipmentItem) => validate ? {
    name: item.name.trim() ? undefined : '품목명을 입력하세요.',
    qty: Number(item.qty) >= 1 ? undefined : '1개 이상 입력하세요.',
    weight: item.weight.trim() ? undefined : '중량을 입력하세요.',
  } : {};
  const seen = new Map<string, number>();
  const duplicate = new Set<string>();
  for (const item of items) {
    const name = item.name.trim();
    if (!name) continue;
    if (seen.has(name)) duplicate.add(item.id); else seen.set(name, 1);
  }
  const listError = !validate ? undefined
    : items.length === 0 ? '품목을 1개 이상 넣어 주세요.'
    : items.length > MAX ? `품목은 최대 ${MAX}개까지 넣을 수 있습니다. ${items.length - MAX}개를 지워 주세요.` : undefined;
  const errorCount = items.reduce((sum, item) => sum + Object.values(cell(item)).filter(Boolean).length
    + (validate && duplicate.has(item.id) ? 1 : 0), 0) + (listError ? 1 : 0);
  const props: FieldListProps<ShipmentItem> = {
    label: '품목', hideLabel: true, value: items, onValueChange: setItems, createItem: createShipmentItem,
    min: state === 'min' ? 1 : 0, max: MAX, error: listError,
    rowError: item => validate && duplicate.has(item.id) ? { message: '같은 품목이 두 번 입력되었습니다.', column: 'name' } : undefined,
    columns: [
      { key: 'name', label: '품목명', required: true,
        render: (item, { update }) => <Input value={item.name} onChange={event => update({ name: event.target.value })} />,
        error: item => cell(item).name },
      { key: 'qty', label: '수량', required: true, numeric: true,
        render: (item, { update }) => <Input numeric inputMode="numeric" unit="개" value={item.qty}
          onChange={event => update({ qty: event.target.value.replace(/\D/g, '') })} />,
        error: item => cell(item).qty },
      { key: 'weight', label: '중량', required: true, numeric: true,
        render: (item, { update }) => <Input numeric inputMode="decimal" unit="kg" value={item.weight}
          onChange={event => update({ weight: event.target.value })} />,
        error: item => cell(item).weight },
    ],
  };
  return { props, errorCount };
}

export function ShipmentItems({ state }: { state: ItemsState }) {
  const { props } = useShipmentItems(state);
  return <FieldList {...props} />;
}
