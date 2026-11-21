import { useState } from 'react';
import { Combobox, Field } from '../../src';

const locations = [
  { value: 'seoul', label: '서울 본사' },
  { value: 'busan', label: '부산 지점' },
  { value: 'daegu', label: '대구 물류센터' },
  { value: 'suwon', label: '수원 창고' },
];

export function ComboboxExample() {
  const [value, setValue] = useState<string[]>(['seoul']);
  return <Field label="프로모션 대상 사업장" description="배너를 노출할 사업장을 검색해 선택하세요.">
    <Combobox multiple options={locations} value={value} onValueChange={setValue} />
  </Field>;
}
