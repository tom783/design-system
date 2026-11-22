import { SegmentedControl } from '../../src';

export function SegmentedControlExample() {
  return <SegmentedControl aria-label="집계 기간 단위" defaultValue="day" options={[
    { value: 'day', label: '일' },
    { value: 'week', label: '주' },
    { value: 'month', label: '월' },
  ]} />;
}
