import { useState } from 'react';
import { DatePicker, Field } from '../../src';

export function ScheduledPublishExample() {
  const [publishAt, setPublishAt] = useState<Date>();
  return <Field label="예약 발행일시" description="브라우저의 지역 시간으로 입력하세요.">
    <DatePicker mode="single" time value={publishAt} onValueChange={setPublishAt} />
  </Field>;
}
