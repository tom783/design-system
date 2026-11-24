import type { DatePickerProps } from './date-picker';

const onValueChange = () => {};
const single: DatePickerProps = { mode: 'single', time: true, value: new Date(), onValueChange };
const steps: DatePickerProps[] = ([1, 5, 10, 15, 30] as const).map(step => ({ mode: 'single', time: { step }, onValueChange }));
// 옛 이름 onChange 는 0.6.0 에서 뺐다 — onValueChange 를 쓴다(DESIGN.md §6.3). 타입이 막는다.
// @ts-expect-error 단일 날짜의 옛 이름 onChange 는 없다.
const legacy: DatePickerProps = { mode: 'single', value: new Date(), onChange: (value: Date | undefined) => void value };
// @ts-expect-error 기간의 옛 이름 onChange 도 없다.
const legacyRange: DatePickerProps = { onChange: (value: { from?: Date }) => void value?.from };
// 모드별로 값 타입이 좁혀진다 — 기간 알림은 DateRange 를 받는다.
const range: DatePickerProps = { onValueChange: value => void value?.from };
// @ts-expect-error 기간에는 시각을 함께 받을 수 없다.
const rangeTime: DatePickerProps = { mode: 'range', time: true, onValueChange };
// @ts-expect-error mode를 생략하면 기간이므로 시각을 받을 수 없다.
const implicitRangeTime: DatePickerProps = { time: { step: 10 }, onValueChange };
// @ts-expect-error 지원하는 분 간격만 허용한다.
const invalidStep: DatePickerProps = { mode: 'single', time: { step: 20 }, onValueChange };
void [single, steps, legacy, legacyRange, range, rangeTime, implicitRangeTime, invalidStep];
