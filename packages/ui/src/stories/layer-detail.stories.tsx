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
  AlertDialogDescription, AlertDialogCancel, MediaViewer, SheetContent, SheetBody,
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

// 0.7.1 A-3: Dialog·Sheet 안에서 여는 떠 있는 층(목록·메뉴·달력)이 창 **위**에 그려지는지. 모달 내용·막은 z-index 50 이고,
// Radix popper 감싸개는 내용의 z-index 를 물려받는다 — 내용에 z-index 가 없으면 감싸개가 auto 라 창 아래로 깔린다(ds-site 9b 실측).
// 목록은 30개라 스크롤도 생긴다(창 안 목록을 휠로 굴릴 수 있는지).
const many = Array.from({ length: 30 }, (_, i) => ({ value: `w${i}`, label: `창고 ${String(i + 1).padStart(2, '0')}` }));
function Floaters() {
  const [combo, setCombo] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);
  const [multi, setMulti] = React.useState<string[]>([]);
  const [day, setDay] = React.useState<Date | undefined>();
  return <div data-probe="floaters" style={{ display: 'grid', gap: 'var(--space-8)', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
    <Select defaultValue="a"><SelectTrigger data-probe="m-select" aria-label="모달 선택"><SelectValue /></SelectTrigger>
      <SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
    <Combobox data-probe="m-combo" options={many} value={combo} onValueChange={setCombo} aria-label="모달 검색 선택" placeholder="창고 선택" />
    <Combobox multiple options={many} value={tags} onValueChange={setTags} aria-label="모달 다중 검색" placeholder="창고 여러 개" />
    <MultiSelect options={many} value={multi} onValueChange={setMulti} aria-label="모달 다중 선택" placeholder="창고 여러 개" />
    <DropdownMenu><DropdownMenuTrigger asChild><Button data-probe="m-menu">행 액션</Button></DropdownMenuTrigger>
      <DropdownMenuContent><DropdownMenuItem>저장</DropdownMenuItem><DropdownMenuItem>복사</DropdownMenuItem><DropdownMenuItem destructive>삭제</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
    <DatePicker mode="single" value={day} onValueChange={setDay} today={new Date(2026, 10, 21)} defaultMonth={new Date(2026, 10, 1)} />
    <output data-probe="m-values" style={{ gridColumn: '1 / -1' }}>{[combo, tags.join(','), multi.join(','), day?.getDate()].join(' | ')}</output>
  </div>;
}
function InModal() {
  return <div style={{ display: 'flex', gap: 'var(--space-8)', padding: 'var(--space-24)' }}>
    <Dialog><DialogTrigger asChild><Button data-probe="open-dialog">창 열기</Button></DialogTrigger>
      <DialogContent><DialogHeader><DialogTitle>출고 정보</DialogTitle><DialogDescription>창 안의 목록·메뉴·달력이 창 위에 뜬다.</DialogDescription></DialogHeader>
        <Floaters /><DialogClose asChild><Button>닫기</Button></DialogClose></DialogContent></Dialog>
    <Dialog><DialogTrigger asChild><Button data-probe="open-sheet">패널 열기</Button></DialogTrigger>
      <SheetContent><DialogHeader><DialogTitle>출고 정보</DialogTitle><DialogDescription>패널 안의 목록·메뉴·달력이 패널 위에 뜬다.</DialogDescription></DialogHeader>
        <SheetBody><Floaters /></SheetBody></SheetContent></Dialog>
  </div>;
}
export const 모달안떠있는층: Story = { render: () => <InModal />, play: ({ canvasElement }) => { canvasElement.dataset.playComplete = 'true'; } };
