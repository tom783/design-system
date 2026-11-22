import type { DatePickerProps } from './date-picker';

const onChange = () => {};
const single: DatePickerProps = { mode: 'single', time: true, value: new Date(), onChange };
const steps: DatePickerProps[] = ([1, 5, 10, 15, 30] as const).map(step => ({ mode: 'single', time: { step }, onChange }));
// @ts-expect-error 기간에는 시각을 함께 받을 수 없다.
const rangeTime: DatePickerProps = { mode: 'range', time: true, onChange };
// @ts-expect-error mode를 생략하면 기간이므로 시각을 받을 수 없다.
const implicitRangeTime: DatePickerProps = { time: { step: 10 }, onChange };
// @ts-expect-error 지원하는 분 간격만 허용한다.
const invalidStep: DatePickerProps = { mode: 'single', time: { step: 20 }, onChange };
void [single, steps, rangeTime, implicitRangeTime, invalidStep];
