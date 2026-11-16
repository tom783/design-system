import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, DataTable, createDataTableColumnHelper, Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem, Field, Input, Tooltip, Peek, type ButtonProps } from '@s2life/ui';
import { Check } from '@s2life/ui/icons';
import '@s2life/ui/styles.css';

const typed: ButtonProps = { variant: 'primary' };
// 선언이 any로 빠지면 이 검사가 실패하므로 공개 타입의 실제 해석도 보장한다.
// @ts-expect-error 공개 ButtonProps에는 없는 variant
const invalid: ButtonProps = { variant: 'unknown' };
void invalid;
const helper = createDataTableColumnHelper<{ id: string; name: string }>();
const columns = helper.columns([helper.accessor('name', { header: '상품명' })]);
function App() {
  const [open, setOpen] = useState(false);
  return <main style={{ padding: 32, maxWidth: 800 }}>
    <Button {...typed} id="primary"><Check />패키지 소비</Button>
    <Field label="이름" description="회귀 검사" error="필수 입력입니다"><Input /></Field>
    <Tooltip content="스타일이 있는 툴팁"><Button id="tooltip-trigger">안내</Button></Tooltip>
    <Peek title="상품 요약" open={open} onOpenChange={setOpen} items={[{ label: '상품명', value: '포장 상자' }]}>
      <Button id="peek-trigger">요약</Button>
    </Peek>
    <Select defaultValue="ready"><SelectTrigger aria-label="상태"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="ready">준비</SelectItem><SelectItem value="done">완료</SelectItem></SelectContent>
    </Select>
    <DataTable data={[{ id: '1', name: '포장 상자' }]} columns={columns} getRowId={(row) => row.id} caption="tarball 소비 표" />
  </main>;
}
createRoot(document.getElementById('root')!).render(<App />);
