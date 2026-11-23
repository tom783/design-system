import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
  Card, CardBody, CardHeader, CardTitle, Field, FormActionBar, FormRow, Input, PageHeader, Select, SelectContent,
  SelectItem, SelectTrigger, SelectValue, Toaster, toast,
} from '../index';
import { CircleAlert } from '../icons';
import { StoreShell } from './screens-shell';

/**
 * 상품 등록·수정 — 폼 밀도 F98 · 같은 줄 입력칸 기준 정렬 (b) (2026-11-22 오너 확정).
 * 필드 피치 98px(레이블 20+4 · 입력 38 · 4 · 오류 예약 20 · 간격 12)는 Field 기본값 그대로다.
 * 같은 줄 두 Field 는 FormRow 로 묶는다 — 한쪽만 설명이 있어도 입력칸 윗선이 같다(DESIGN §11.9).
 * 하단 고정 액션 줄은 FormActionBar(DESIGN §19.5, 규칙 표 F-1~F-13 · Figma 198:3939 r2)다 — 폼의 마지막 자식,
 * 버튼 묶음 폭 = 폼 열 폭(max-w-3xl 768 = 기본 contentMaxWidth). 수정 화면만 왼쪽 끝에 삭제가 있다.
 * 금액 칸(판매가·정가·공급가)의 단위는 설명 줄이 아니라 Input unit="원"(§17.1.1, 2026-11-23 디자인 총괄 요청)이다.
 * 검수 매트릭스: 라이트·다크 × 1440·1024·768·390 × 등록·수정·저장 중·오류 2개·Tab 포커스(마지막 두 줄)·짧은 폼.
 */
const meta = { title: 'Screens/ProductCreate', parameters: { fullBleed: true } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// Field 가 복제해 넣는 id·aria-describedby·aria-invalid·required 를 Select 로 그대로 넘긴다(§11.4).
function SelectField({ placeholder, value, options, ...wiring }: { placeholder?: string; value?: string; options: string[] }
  & Omit<React.ComponentProps<typeof Select>, 'children' | 'defaultValue'>) {
  return <Select {...wiring} defaultValue={value}>
    <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
    <SelectContent>{options.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
  </Select>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader>
    <CardBody><div className="flex flex-col gap-3">{children}</div></CardBody></Card>;
}

type Mode = 'create' | 'edit';
interface ScreenProps { mode?: Mode; errors?: boolean; saving?: boolean; dirty?: boolean; short?: boolean }

function ProductCreateScreen({ mode = 'create', errors = false, saving: initialSaving = false, dirty: initialDirty = false, short = false }: ScreenProps) {
  const [dirty, setDirty] = React.useState(initialDirty);
  const [saving, setSaving] = React.useState(initialSaving);
  const title = mode === 'edit' ? '상품 수정' : '상품 등록';
  return <StoreShell current="products">
    <Toaster />
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        breadcrumb={<Breadcrumb><BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="#products">상품 관리</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="#products">상품 목록</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{title}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList></Breadcrumb>}
        title={title} description="필수 항목(*)을 채우고 저장하면 판매 대기 상태로 등록됩니다." />
      {/* 하단 줄은 폼의 마지막 자식이다(F-1). 페이지 루트·폼이 세로 flex 라 짧은 폼에서도 줄이 본문 바닥에 붙는다(FD-1 A). */}
      <form noValidate aria-label={title} className="flex min-w-0 flex-col gap-6"
        onInput={() => setDirty(true)}
        onSubmit={event => {
          event.preventDefault();
          setSaving(true);
          // 저장 결과는 토스트로 알린다(F-8). 실제 앱은 서버 응답 뒤 페이지를 옮긴다.
          window.setTimeout(() => { setSaving(false); setDirty(false); toast.success(`${title === '상품 수정' ? '변경 사항을' : '상품을'} 저장했습니다`); }, 1200);
        }}>
        <div className="flex max-w-3xl min-w-0 flex-col gap-4">
          {/* 폼 위 오류 요약(F-7) — 좁은 폭에서는 줄의 '오류 N개'가 숨으므로 오류는 여기서만 보인다(F-10). */}
          {errors && <div role="alert" data-screen="error-summary" className="flex gap-2 rounded-[var(--radius-md)] bg-danger-tint p-4 text-danger-ink">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <div className="text-[length:var(--text-body-sm)] leading-[var(--text-body-sm-lh)]">
              <p className="font-semibold">오류 2개</p><p>상품명과 판매가를 확인하세요.</p>
            </div>
          </div>}
          <Section title="기본 정보">
            <Field label="상품명" required error={errors ? '상품명을 입력하세요' : undefined}>
              <Input placeholder="예: 스테인리스 텀블러 500ml" defaultValue={errors ? '' : '경량 캠핑 의자'} /></Field>
            <FormRow data-screen-row="category">
              <Field label="카테고리" required><SelectField placeholder="카테고리 선택" value="캠핑·아웃도어" options={['캠핑·아웃도어', '주방용품', '생활잡화', '패션']} /></Field>
              <Field label="브랜드"><Input defaultValue="자체 제작" /></Field>
            </FormRow>
            {/* 한쪽만 설명 ① — 왼쪽 */}
            <FormRow data-screen-row="code">
              <Field label="판매자 상품 코드" description="영문·숫자·하이픈만 씁니다. 비우면 자동으로 만듭니다."><Input defaultValue="CAMP-CH-01" /></Field>
              <Field label="바코드"><Input inputMode="numeric" defaultValue="8801234567893" /></Field>
            </FormRow>
          </Section>
          {!short && <>
            <Section title="가격">
              {/* 한쪽만 설명 ② — 오른쪽 */}
              <FormRow data-screen-row="price">
                <Field label="판매가" required error={errors ? '판매가를 1원 이상으로 입력하세요' : undefined}>
                  <Input numeric inputMode="numeric" unit="원" defaultValue={errors ? '0' : '39,000'} /></Field>
                <Field label="정가" description="할인 전 가격입니다. 비우면 판매가와 같게 표시합니다."><Input numeric inputMode="numeric" unit="원" defaultValue="49,000" /></Field>
              </FormRow>
              <FormRow data-screen-row="tax">
                <Field label="과세 유형"><SelectField value="과세" options={['과세', '면세', '영세']} /></Field>
                <Field label="공급가"><Input numeric inputMode="numeric" unit="원" defaultValue="35,455" /></Field>
              </FormRow>
            </Section>
            <Section title="재고·배송">
              <FormRow data-screen-row="stock">
                <Field label="재고 수량" required><Input numeric inputMode="numeric" defaultValue="120" /></Field>
                <Field label="1인 최대 구매 수량"><Input numeric inputMode="numeric" defaultValue="5" /></Field>
              </FormRow>
              <FormRow data-screen-row="shipping">
                <Field label="배송비 유형"><SelectField value="조건부 무료 배송" options={['무료 배송', '조건부 무료 배송', '유료 배송']} /></Field>
                <Field label="출고 소요일"><SelectField value="결제 후 1일 이내" options={['결제 후 1일 이내', '결제 후 3일 이내', '주문 제작']} /></Field>
              </FormRow>
            </Section>
          </>}
        </div>
        <FormActionBar data-screen="actions" saving={saving} dirty={dirty} errorCount={errors ? 2 : 0}
          onCancel={() => toast('작성을 취소했습니다')}
          {...(mode === 'edit' ? {
            onDelete: () => toast.success('상품을 삭제했습니다'),
            deleteDescription: '경량 캠핑 의자 상품과 옵션·재고 정보를 삭제합니다. 판매 중인 주문은 그대로 남고, 삭제한 상품은 되돌릴 수 없습니다.',
          } : {})} />
      </form>
    </div>
  </StoreShell>;
}

const ready: Story['play'] = async ({ canvasElement: root }) => {
  await expect(within(root).getByRole('heading', { level: 1 })).toBeInTheDocument();
  root.dataset.playComplete = 'true';
};
export const 기본: Story = { name: '등록', render: () => <ProductCreateScreen />, play: ready };
export const 수정: Story = { render: () => <ProductCreateScreen mode="edit" dirty />, play: ready };
export const 저장중: Story = { name: '저장 중', render: () => <ProductCreateScreen mode="edit" dirty saving />, play: ready };
/** 저장에 실패한 상태 — 폼 위 요약 + 줄의 '오류 2개' 링크. 링크를 누르면 첫 오류 칸(상품명)으로 포커스가 간다. */
export const 오류2개: Story = {
  name: '오류 2개',
  render: () => <ProductCreateScreen errors dirty />,
  play: async ({ canvasElement: root }) => {
    const c = within(root);
    const link = c.queryByRole('button', { name: /^오류 2개/ });
    // 480px 미만은 링크가 숨는다(F-10) — 폼 위 요약만 남는다.
    if (link && link.offsetParent !== null) {
      await userEvent.click(link);
      await waitFor(() => expect(c.getByRole('textbox', { name: /상품명/ })).toHaveFocus());
      (document.activeElement as HTMLElement | null)?.blur();
    }
    root.dataset.playComplete = 'true';
  },
};
/** 입력이 한 화면에 들어오는 폼 — 줄은 폼 바로 아래가 아니라 본문 바닥에 붙는다(FD-1 A). */
export const 짧은폼: Story = { name: '짧은 폼', render: () => <ProductCreateScreen short />, play: ready };
