// 공개 API 규약(DESIGN.md §6.3)의 ref 항목을 타입으로 고정한다. 실행하지 않는다 — pnpm typecheck 가 검사한다.
// ref 는 prop 으로 받고(React 19), DOM 에 나머지 props 를 펼치는 부품은 그 요소 타입의 ref 를 받는다.
import * as React from 'react';
import { Button } from './button';
import { Input } from './input';
import { Checkbox } from './checkbox';
import { Card, CardTitle } from './card';
import { StatusChip } from './status-chip';
import { Textarea } from './textarea';
import { Field, FormRow } from './form';
import { AppShell, PageHeader, SideNav, SideNavGroup, SideNavItem } from './app-shell';
import { Pagination } from './pagination';
import { StatTile } from './stat-tile/stat-tile';
import { DescriptionList } from './description-list';
import { SelectTrigger, SelectItem } from './select';
import { DropdownMenuItem, DropdownMenuShortcut } from './dropdown-menu';
import { FilterBar } from './filter-bar';
import { BulkActionBar } from './bulk-action-bar';
import { FormActionBar } from './form-action-bar';
import { FieldList } from './field-list';
import { SectionHeader } from './section-header';

const button = React.createRef<HTMLButtonElement>();
const input = React.createRef<HTMLInputElement>();
const textarea = React.createRef<HTMLTextAreaElement>();
const div = React.createRef<HTMLDivElement>();
const heading = React.createRef<HTMLHeadingElement>();
const span = React.createRef<HTMLSpanElement>();
const element = React.createRef<HTMLElement>();
const anchor = React.createRef<HTMLAnchorElement>();
const fieldset = React.createRef<HTMLFieldSetElement>();

void [
  <Button ref={button}>저장</Button>,
  <Input ref={input} />,
  <Checkbox ref={input} />,
  <Textarea ref={textarea} />,
  <Card ref={div} />,
  <CardTitle ref={heading}>제목</CardTitle>,
  <StatusChip ref={span} tone="success">완료</StatusChip>,
  <Field ref={div} label="이름"><Input /></Field>,
  <FormRow ref={div} />,
  <AppShell ref={div} sidebar={null}>본문</AppShell>,
  <PageHeader ref={element} title="주문" />,
  <SideNav ref={element} brand="S2" brandIcon="S" />,
  <SideNavGroup ref={div} label="판매" />,
  <SideNavItem ref={anchor} icon={null} label="주문" href="/orders" />,
  <Pagination ref={element} page={1} pageSize={20} totalCount={100} onPageChange={() => {}} />,
  <StatTile ref={element} label="매출" value={1} />,
  <DescriptionList ref={div} items={[{ label: '주문번호', value: 'ORD-1' }]} />,
  <SelectTrigger ref={button} />,
  <SelectItem ref={div} value="a">가</SelectItem>,
  <DropdownMenuItem ref={div}>복사</DropdownMenuItem>,
  <FilterBar ref={div} />,
  <BulkActionBar ref={div} selectedCount={0} />,
  <FormActionBar ref={div} />,
  <FieldList ref={fieldset} label="품목" value={[{ name: '' }]} onValueChange={() => {}} createItem={() => ({ name: '' })}
    columns={[{ key: 'name', label: '품목명', render: item => <Input value={item.name} readOnly /> }]} />,
  <SectionHeader ref={element} title="최근 출고" />,
  <DropdownMenuShortcut ref={span}>⌘C</DropdownMenuShortcut>,
];

// 요소 타입이 다른 ref 는 막는다 — 타입이 실제 DOM 을 말한다.
// @ts-expect-error Button 의 ref 는 HTMLButtonElement 다.
void <Button ref={input}>저장</Button>;
// @ts-expect-error CardTitle 은 h3 를 그린다.
void <CardTitle ref={button}>제목</CardTitle>;

// forwardRef 였을 때처럼 ComponentRef 로 요소 타입을 꺼낼 수 있다.
const buttonElement: React.ComponentRef<typeof Button> = document.createElement('button');
const inputElement: React.ComponentRef<typeof Input> = document.createElement('input');
void [buttonElement, inputElement];
