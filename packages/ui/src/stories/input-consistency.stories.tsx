import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Combobox, MultiSelect, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../index';

const meta = { title: 'QA/InputConsistency', parameters: { layout: 'padded' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const options = [{ value: 'a', label: '서울본사' }, { value: 'b', label: '부산지점' }];
function Triggers() {
  const [one, setOne] = React.useState('');
  const [many, setMany] = React.useState<string[]>([]);
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))', gap: 16 }}>
    <div>Select<Select value={one} onValueChange={setOne}><SelectTrigger aria-label="Select"><SelectValue placeholder="사업장 선택" /></SelectTrigger>
      <SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
    <div>Combobox 단일<Combobox options={options} value={one} onValueChange={setOne} placeholder="사업장 선택" aria-label="Combobox 단일" /></div>
    <div>Combobox 다중<Combobox multiple options={options} value={many} onValueChange={setMany} placeholder="사업장 선택" aria-label="Combobox 다중" /></div>
    <div>MultiSelect<MultiSelect options={options} value={many} onValueChange={setMany} placeholder="사업장 선택" aria-label="MultiSelect" /></div>
  </div>;
}
export const 라이트: Story = { globals: { theme: 'light' }, render: () => <Triggers /> };
export const 다크: Story = { globals: { theme: 'dark' }, render: () => <Triggers /> };
