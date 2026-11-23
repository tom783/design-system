import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Save } from 'lucide-react';
import {
  Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Combobox, MultiSelect,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DatePicker, type DateRange,
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose,
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogCancel, MediaViewer,
} from '../index';
import { Popover, PopoverTrigger, PopoverContent } from '../components/date-picker/popover';

const meta = { title: 'QA/LayerDetails', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const options = [{ value: 'a', label: '서울본사' }, { value: 'b', label: '부산지점' }, { value: 'c', label: '수원창고' }];
const description = '이 주문을 삭제하면 관련 출고 내역도 함께 삭제됩니다. 삭제한 주문은 되돌릴 수 없습니다.';
function Layers() {
  const [combo, setCombo] = React.useState('a');
  const [many, setMany] = React.useState(['a']);
  const [range, setRange] = React.useState<DateRange | undefined>({ from: new Date(2026, 10, 10), to: new Date(2026, 10, 15) });
  const [media, setMedia] = React.useState(false);
  return <div style={{ display: 'grid', gap: 'var(--space-8)', justifyItems: 'end', marginRight: 'calc(-1 * var(--space-24))' }}>
    <div style={{ width: 240 }}><Select defaultValue="a"><SelectTrigger data-probe="select"><SelectValue /></SelectTrigger>
      <SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
    <div style={{ width: 240 }}><Combobox data-probe="combo" options={options} value={combo} onValueChange={setCombo} /></div>
    <div style={{ width: 240 }}><Combobox multiple options={options} value={many} onValueChange={setMany} aria-label="다중 검색" /></div>
    <div style={{ width: 240 }}><MultiSelect options={options} value={many} onValueChange={setMany} /></div>
    <DropdownMenu><DropdownMenuTrigger asChild><Button data-probe="menu">행 액션</Button></DropdownMenuTrigger>
      <DropdownMenuContent><DropdownMenuGroup><DropdownMenuItem>저장</DropdownMenuItem></DropdownMenuGroup>
        <DropdownMenuItem destructive>삭제</DropdownMenuItem>
        <DropdownMenuCheckboxItem checked>확인</DropdownMenuCheckboxItem>
        <DropdownMenuRadioGroup value="a"><DropdownMenuRadioItem value="a">기본</DropdownMenuRadioItem></DropdownMenuRadioGroup>
        <DropdownMenuSub><DropdownMenuSubTrigger>더 보기</DropdownMenuSubTrigger><DropdownMenuSubContent>
          <DropdownMenuItem><Save aria-hidden="true" />보관</DropdownMenuItem><DropdownMenuItem>복사</DropdownMenuItem>
        </DropdownMenuSubContent></DropdownMenuSub>
      </DropdownMenuContent></DropdownMenu>
    <DropdownMenu><DropdownMenuTrigger asChild><Button data-probe="plain-menu">글자 메뉴</Button></DropdownMenuTrigger>
      <DropdownMenuContent><DropdownMenuItem>저장</DropdownMenuItem><DropdownMenuItem>복사</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
    <DatePicker value={range} onValueChange={setRange} today={new Date(2026, 10, 21)} defaultMonth={new Date(2026, 10, 1)} />
    <Popover><PopoverTrigger asChild><Button data-probe="popover">팝오버</Button></PopoverTrigger><PopoverContent>주문 정보</PopoverContent></Popover>
    {[true, false].map(showClose => <Dialog key={String(showClose)}><DialogTrigger asChild><Button data-probe={showClose ? 'dialog' : 'dialog-no-close'}>상세 {showClose ? '닫기 있음' : '닫기 없음'}</Button></DialogTrigger>
      <DialogContent showClose={showClose}><DialogHeader><DialogTitle>주문 상세</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
        <DialogClose asChild><Button>취소</Button></DialogClose></DialogContent></Dialog>)}
    <AlertDialog><AlertDialogTrigger asChild><Button data-probe="alert">삭제 확인</Button></AlertDialogTrigger>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>주문을 삭제할까요?</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogCancel>취소</AlertDialogCancel></AlertDialogContent></AlertDialog>
    <Button data-probe="media" onClick={() => setMedia(true)}>사진 열기</Button>
    <MediaViewer open={media} onOpenChange={setMedia} title="상품 사진" media={{ type: 'image', src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32"/%3E', alt: '검증용 상품' }} />
  </div>;
}
export const 열린레이어: Story = { render: () => <Layers />, play: ({ canvasElement }) => { canvasElement.dataset.playComplete = 'true'; } };
