import type { SegmentedControlProps } from './segmented-control';
const options = [{ value: 'day', label: '일' }];
const named: SegmentedControlProps = { options, 'aria-label': '기간 단위' };
const linked: SegmentedControlProps = { options, 'aria-labelledby': 'period-label' };
// @ts-expect-error 그룹 이름은 필수다.
const unnamed: SegmentedControlProps = { options };
// @ts-expect-error 아이콘 전용이어도 항목 label은 필수다.
const noLabel: SegmentedControlProps = { 'aria-label': '보기', iconOnly: true, options: [{ value: 'table', icon: null }] };
// @ts-expect-error 다중 선택은 제공하지 않는다.
const multiple: SegmentedControlProps = { options, 'aria-label': '보기', value: ['day'] };
// @ts-expect-error 폼 제출용 name은 제공하지 않는다.
const formValue: SegmentedControlProps = { options, 'aria-label': '보기', name: 'view' };
void [named, linked, unnamed, noLabel, multiple, formValue];
