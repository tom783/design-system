import { useState } from 'react';
import { Field, MultiSelect } from '../../src';

const locations = [
  { value: 'seoul', label: '서울 본사' },
  { value: 'busan', label: '부산 지점' },
  { value: 'daegu', label: '대구 물류센터' },
];

export function MultiSelectExample() {
  const [value, setValue] = useState<string[]>([]);
  return <Field label="주문 조회 사업장" description="선택한 사업장의 주문을 함께 조회합니다.">
    <MultiSelect options={locations} value={value} onValueChange={setValue} placeholder="전체 사업장" />
  </Field>;
}
