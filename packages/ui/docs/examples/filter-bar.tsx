import * as React from 'react';
import { FilterBar, type FilterBarFilter } from '../../src';

const views = [{ value: 'default', label: '기본 보기' }, { value: 'ready', label: '출고 대기만' }];

export function FilterBarExample() {
  const [view, setView] = React.useState('default');
  const [query, setQuery] = React.useState('');
  const [filters, setFilters] = React.useState<FilterBarFilter[]>([
    { id: 'status', label: '상태: 출고 대기' },
    { id: 'period', label: '기간: 최근 30일' },
    { id: 'payment', label: '결제: 간편결제·카드' },
  ]);
  return <FilterBar views={views} view={view} onViewChange={setView}
    query={query} onQueryChange={setQuery} searchLabel="주문 검색" searchPlaceholder="주문번호·수취인·상품명 검색"
    filters={filters} onFiltersChange={setFilters} />;
}
