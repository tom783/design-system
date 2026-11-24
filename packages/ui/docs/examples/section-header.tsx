import { useState } from 'react';
import { SectionHeader, SegmentedControl, StatTile } from '../../src';
import { Download } from '../../src/icons';

export function SectionHeaderExample() {
  const [period, setPeriod] = useState('today');
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    <SectionHeader title="오늘 핵심 지표"
      control={<SegmentedControl size="sm" aria-label="오늘 핵심 지표 조회 기간" value={period} onValueChange={setPeriod}
        options={[{ value: 'today', label: '오늘' }, { value: 'week', label: '이번 주' }, { value: 'month', label: '이번 달' }]} />}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 16 }}>
        <StatTile label="오늘 출고 건수" value={8} unit="건" delta={33.3} deltaLabel="전일 대비" />
        <StatTile label="출고 대기" value={6} unit="건" delta={6} deltaFormat="absolute" deltaUnit="건" deltaLabel="전일 대비" goodDirection="down" />
      </div>
    </SectionHeader>
    <SectionHeader title="최근 출고" description="출고 예정일이 최근인 다섯 건입니다."
      actions={[
        { kind: 'link', label: '전체 보기', href: '#shipments' },
        { label: 'CSV 내보내기', icon: <Download aria-hidden="true" />, onSelect: () => {} },
      ]}>
      <p>최근 출고 표</p>
    </SectionHeader>
  </div>;
}
