import * as React from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
  Button, Combobox, DataTable, dataTableFeatures, Field, FormActionBar, FormFlow, Input, Label,
  RadioGroup, RadioGroupItem, Switch, Textarea, toast, useComposition,
  type ReturnRecord,
} from '../index';

export interface CreatedOrder {
  id: string; name: string; site: string; qty: string; delivery: string; memo: string; owner: string;
}
const emptyDraft = { name: '', site: '', qty: '1', delivery: 'normal', memo: '', owner: '' };
type Draft = typeof emptyDraft;
const sites = Array.from({ length: 24 }, (_, index) => ({
  value: `site-${index}`, label: index === 0 ? '서울 본사' : `제${index} 사업장`,
}));
const errorFor = (key: keyof Draft, value: string) => {
  if (key === 'name' && !value.trim()) return '상품명을 입력하세요';
  if (key === 'site' && !value) return '사업장을 선택하세요';
  if (key === 'qty' && (!/^\d+$/.test(value) || Number(value) < 1)) return '수량을 1 이상의 정수로 입력하세요';
  return '';
};

/** 단독 등록과 목록 왕복에서 같은 폼을 사용해 키보드·검증 계약이 갈라지지 않게 한다. */
export function OrderCreateScreen({ onSave, onBack, restart = false, notifications, setNotifications }: {
  onSave: (draft: Draft) => void; onBack: () => void; restart?: boolean;
  notifications: boolean; setNotifications: (enabled: boolean) => void;
}) {
  const [draft, setDraft] = React.useState(emptyDraft);
  const [errors, setErrors] = React.useState<Partial<Record<keyof Draft, string>>>({});
  const [discard, setDiscard] = React.useState(false);
  const [actions, setActions] = React.useState(0);
  const [saved, setSaved] = React.useState(0);
  const composition = useComposition();
  const dirty = Object.keys(emptyDraft).some(key => draft[key as keyof Draft] !== emptyDraft[key as keyof Draft]);
  const leaveOrigin = React.useRef<HTMLElement | null>(null);
  const leave = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    leaveOrigin.current = event.currentTarget;
    if (dirty) setDiscard(true); else onBack();
  };
  // 하단 줄의 취소도 Breadcrumb 이탈과 같은 확인을 거친다. 확인창이 닫히면 취소 버튼으로 돌아온다.
  const cancel = () => {
    leaveOrigin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (dirty) setDiscard(true); else onBack();
  };
  const validate = (key: keyof Draft, value: string, trigger: 'change' | 'blur') => {
    // 한글 조합 중에는 검증하지 않는다. 첫 오류는 blur에서 알리고, 이미 난 오류는 change에서 바로 푼다.
    if (!composition.isComposing() && (trigger !== 'change' || Boolean(errors[key]))) {
      setErrors(previous => ({ ...previous, [key]: errorFor(key, value) }));
    }
  };
  const change = (key: keyof Draft, value: string) => {
    setDraft(previous => ({ ...previous, [key]: value })); validate(key, value, 'change');
  };
  const normalId = React.useId(), expressId = React.useId();
  return <section data-probe="create-screen" className="space-y-4">
    <Breadcrumb><BreadcrumbList>
      <BreadcrumbItem><BreadcrumbLink href="#orders" onClick={leave}>주문 관리</BreadcrumbLink></BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem><BreadcrumbLink href="#orders" data-probe="back-to-list" onClick={leave}>주문 목록</BreadcrumbLink></BreadcrumbItem>
      <BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>신규 등록</BreadcrumbPage></BreadcrumbItem>
    </BreadcrumbList></Breadcrumb>
    <header className="space-y-2"><h1 className="text-title font-semibold">주문 등록</h1>
      <p className="text-fg-muted">필수 항목을 입력하고 저장하세요. Enter로 다음 칸, 비고에서는 Tab으로 이동합니다.</p></header>
    <FormFlow noValidate restartOnSubmit={restart} data-probe="order-form" className="max-w-2xl space-y-3 border-t border-line pt-4"
      onCompositionStartCapture={composition.bind.onCompositionStart}
      onCompositionEndCapture={composition.bind.onCompositionEnd}
      onSubmit={() => {
        const nextErrors = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, errorFor(key as keyof Draft, value)]));
        setErrors(nextErrors);
        if (Object.values(nextErrors).some(Boolean)) return false;
        onSave(draft); setSaved(count => count + 1); toast.success('주문을 저장했습니다');
        if (restart) { setDraft(emptyDraft); setErrors({}); }
        return true;
      }}>
      {/* 실제 액션 버튼(§19.2). 하단 줄은 폼의 마지막 자식이라(F-1) 입력 도움말은 첫 칸 앞에 둔다 — 담당자 다음 정지점이 줄이어야
          마지막 칸 Enter 가 저장이다. */}
      <div className="flex flex-wrap items-center gap-2">
        <Button data-probe="action" type="button" onClick={() => setActions(count => count + 1)}>입력 도움말</Button>
        <p role="status" data-probe="action-result" className="text-fg-muted">{actions ? `도움말을 ${actions}회 열었습니다. 사업장을 고른 뒤 주문 수량을 입력하세요.` : '입력 도움말을 열어 작성 순서를 확인할 수 있습니다.'}</p>
      </div>
      <Field label="상품명" required error={errors.name}><Input data-probe="name" value={draft.name}
        onChange={event => change('name', event.target.value)} onBlur={() => validate('name', draft.name, 'blur')} /></Field>
      <Field label="사업장" required error={errors.site}><Combobox options={sites} value={draft.site}
        placeholder="사업장을 선택하세요" aria-label="사업장" onValueChange={value => change('site', value)} /></Field>
      {/* 예상 수량 1–6자리는 기존 최소 폭 120px 안에 들어간다. 폼 전체 폭 끝으로 숫자를 밀지 않는다 (§17.1). */}
      <Field label="수량" required error={errors.qty} style={{ width: 'var(--field-min-w)', maxWidth: '100%' }}><Input data-probe="qty" type="text" inputMode="numeric" numeric value={draft.qty}
        onChange={event => change('qty', event.target.value)} onBlur={() => validate('qty', draft.qty, 'blur')} /></Field>
      <Field label="배송"><RadioGroup value={draft.delivery} onValueChange={value => change('delivery', value)}>
        <div className="flex items-center gap-2"><RadioGroupItem id={normalId} data-probe="normal" value="normal" /><Label htmlFor={normalId}>일반 배송</Label></div>
        <div className="flex items-center gap-2"><RadioGroupItem id={expressId} data-probe="express" value="express" /><Label htmlFor={expressId}>빠른 배송</Label></div>
      </RadioGroup></Field>
      {/* §17.4: 주문 초안에 포함하지 않는다. 이 계정 설정은 저장과 관계없이 즉시 적용한다. */}
      <Field label="알림" description="계정의 알림 받기는 즉시 적용되며 주문을 취소해도 유지됩니다.">
        <Switch data-probe="notifications" checked={notifications} onCheckedChange={setNotifications} />
      </Field>
      <Field label="비고" description="Enter는 줄바꿈, Ctrl/Cmd+Enter는 저장입니다."><Textarea data-probe="memo" value={draft.memo} onChange={event => change('memo', event.target.value)} /></Field>
      <Field label="담당자">{/* 마지막 칸은 계약을 붙이지 않는다. §11.5 의 암묵적 제출이 살아 있어야
          연속 등록이 레코드마다 Enter 한 번으로 끝난다. */}
      <Input data-probe="owner" value={draft.owner} onChange={event => change('owner', event.target.value)} /></Field>
      {restart && <output data-probe="saved-count" aria-label="등록 횟수" className="tabular">등록 {saved}건</output>}
      {/* 저장 줄(§19.5): [상태] [취소] [저장 primary, 오른쪽 끝]. 예전 줄은 주요 버튼이 왼쪽 첫째였다. */}
      <FormActionBar dirty={dirty} onCancel={cancel} />
    </FormFlow>
    <AlertDialog open={discard} onOpenChange={setDiscard}>
      <AlertDialogContent onCloseAutoFocus={event => {
        if (leaveOrigin.current?.isConnected) { event.preventDefault(); leaveOrigin.current.focus(); }
      }}>
        <AlertDialogHeader><AlertDialogTitle>등록을 그만두시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>작성 중인 내용이 사라집니다. 저장하지 않은 주문은 복구할 수 없습니다.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel data-probe="keep-writing">계속 작성</AlertDialogCancel>
          <AlertDialogAction data-probe="discard" variant="danger" onClick={onBack}>작성 취소</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}

const helper = createColumnHelper<typeof dataTableFeatures, CreatedOrder>();
const columns = helper.columns([
  helper.accessor('id', { header: '주문번호' }), helper.accessor('name', { header: '상품명' }),
  helper.accessor('site', { header: '사업장', cell: cell => sites.find(site => site.value === cell.getValue())?.label ?? cell.getValue() }),
  helper.accessor('qty', { header: '수량', cell: cell => <span className="tabular">{cell.getValue()}</span> }),
  helper.accessor('owner', { header: '담당자' }),
]);
export function CreatedOrdersList({ orders, restored, onCreate, filter, setFilter, scrollRef }: {
  orders: CreatedOrder[]; restored?: ReturnRecord | null; onCreate: () => void;
  filter: string; setFilter: (value: string) => void; scrollRef?: React.Ref<HTMLDivElement>;
}) {
  const root = React.useRef<HTMLDivElement>(null);
  // 저장 직후의 새 행만 현재 필터와 함께 보여준다. 검색 조건을 몰래 지우지 않는다.
  const highlighted = orders.find(order => order.id === restored?.itemKey && order.id.startsWith('ORD-NEW-'));
  const filtered = orders.filter(order => order.name.includes(filter) || order === highlighted);
  React.useLayoutEffect(() => {
    const scroll = root.current?.querySelector('[data-slot="data-table-scroll"]');
    if (scroll && restored) scroll.scrollTop = restored.scrollTop;
  }, [restored]);
  return <section data-probe="order-list" ref={scrollRef} className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-title font-semibold">주문 목록</h1>
      <Button data-probe="new-order" variant="primary" onClick={onCreate}>신규 등록</Button></header>
    <Field label="상품명 검색"><Input data-probe="list-filter" value={filter} onChange={event => setFilter(event.target.value)} /></Field>
    <p role="status" className="tabular">총 {filtered.length}건</p>
    {highlighted && !highlighted.name.includes(filter) && <p className="text-fg-muted">방금 저장한 주문을 검색 조건과 함께 표시합니다.</p>}
    <div ref={root} style={{ '--data-table-viewport-height': '240px' } as React.CSSProperties}>
      <DataTable data={filtered} columns={columns} getRowId={order => order.id} revisitedRowId={restored?.itemKey} virtualize align={{ qty: 'end' }}
        caption="신규 등록 주문과 돌아온 위치를 확인하는 주문 목록" />
    </div>
  </section>;
}
