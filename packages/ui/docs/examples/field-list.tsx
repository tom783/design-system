import * as React from 'react';
import { Card, CardBody, CardHeader, CardTitle, FieldList, FormActionBar, Input, toast } from '../../src';

interface Item { id: string; name: string; qty: string; weight: string }
let sequence = 0;
const createItem = (): Item => ({ id: `item-${++sequence}`, name: '', qty: '', weight: '' });

/**
 * 출고 품목 — 카드 제목이 목록 이름과 같아 legend 를 숨긴다(hideLabel). 칸 오류는 열의 error, 목록 전체 오류는 error 다.
 * FormActionBar 의 '오류 N개'는 칸 오류와 묶음 오류(1개)를 함께 센다. 삭제 되돌리기 토스트를 위해 화면에 Toaster 를 둔다.
 */
export function FieldListExample() {
  const [items, setItems] = React.useState<Item[]>(() => [createItem()]);
  const [submitted, setSubmitted] = React.useState(false);
  const cellErrors = (item: Item) => ({
    name: item.name.trim() ? undefined : '품목명을 입력하세요.',
    qty: Number(item.qty) >= 1 ? undefined : '1개 이상 입력하세요.',
  });
  const listError = submitted && items.length === 0 ? '품목을 1개 이상 넣어 주세요.' : undefined;
  const errorCount = submitted
    ? items.reduce((sum, item) => sum + Object.values(cellErrors(item)).filter(Boolean).length, 0) + (listError ? 1 : 0)
    : 0;
  return <form noValidate aria-label="출고 등록" className="flex max-w-3xl flex-col gap-6" onSubmit={event => {
    event.preventDefault();
    setSubmitted(true);
    if (items.length > 0 && items.every(item => !Object.values(cellErrors(item)).some(Boolean))) toast.success('출고를 등록했습니다');
  }}>
    <Card>
      <CardHeader><CardTitle>품목</CardTitle></CardHeader>
      <CardBody>
        <FieldList label="품목" hideLabel value={items} onValueChange={setItems} createItem={createItem} max={20}
          error={listError}
          columns={[
            { key: 'name', label: '품목명', required: true,
              render: (item, { update }) => <Input value={item.name} onChange={event => update({ name: event.target.value })} />,
              error: item => submitted ? cellErrors(item).name : undefined },
            { key: 'qty', label: '수량', required: true, numeric: true,
              render: (item, { update }) => <Input numeric inputMode="numeric" unit="개" value={item.qty}
                onChange={event => update({ qty: event.target.value.replace(/\D/g, '') })} />,
              error: item => submitted ? cellErrors(item).qty : undefined },
            { key: 'weight', label: '중량', numeric: true,
              render: (item, { update }) => <Input numeric inputMode="decimal" unit="kg" value={item.weight}
                onChange={event => update({ weight: event.target.value })} /> },
          ]} />
      </CardBody>
    </Card>
    <FormActionBar submitLabel="출고 등록" errorCount={errorCount} onCancel={() => toast('등록을 취소했습니다')} />
  </form>;
}
