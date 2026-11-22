import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
  Button, Card, CardBody, CardHeader, CardTitle, Field, FormRow, Input, PageHeader, Select, SelectContent,
  SelectItem, SelectTrigger, SelectValue,
} from '../index';
import { StoreShell } from './screens-shell';

/**
 * 상품 등록 — 폼 밀도 F98 · 같은 줄 입력칸 기준 정렬 (b) (2026-11-22 오너 확정).
 * 필드 피치 98px(레이블 20+4 · 입력 38 · 4 · 오류 예약 20 · 간격 12)는 Field 기본값 그대로다.
 * 같은 줄 두 Field 는 FormRow 로 묶는다 — 한쪽만 설명이 있어도 입력칸 윗선이 같다(DESIGN §11.9).
 * 폼 카드 묶음·하단 고정 액션 줄 부품은 없어 Card 와 sticky 유틸리티로 조립했다.
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

function ProductCreateScreen({ errors = false }: { errors?: boolean }) {
  return <StoreShell current="products">
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        breadcrumb={<Breadcrumb><BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="#products">상품 관리</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="#products">상품 목록</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>상품 등록</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList></Breadcrumb>}
        title="상품 등록" description="필수 항목(*)을 채우고 저장하면 판매 대기 상태로 등록됩니다." />
      <form noValidate aria-label="상품 등록" className="flex min-w-0 flex-col gap-6" onSubmit={event => event.preventDefault()}>
        <div className="flex max-w-3xl min-w-0 flex-col gap-4">
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
          <Section title="가격">
            {/* 한쪽만 설명 ② — 오른쪽 */}
            <FormRow data-screen-row="price">
              <Field label="판매가" required error={errors ? '판매가를 1원 이상으로 입력하세요' : undefined}>
                <Input numeric inputMode="numeric" defaultValue={errors ? '0' : '39,000'} /></Field>
              <Field label="정가" description="할인 전 가격입니다. 비우면 판매가와 같게 표시합니다."><Input numeric inputMode="numeric" defaultValue="49,000" /></Field>
            </FormRow>
            <FormRow data-screen-row="tax">
              <Field label="과세 유형"><SelectField value="과세" options={['과세', '면세', '영세']} /></Field>
              <Field label="공급가"><Input numeric inputMode="numeric" defaultValue="35,455" /></Field>
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
        </div>
        {/* 하단 고정 액션 줄 부품은 없다. AppShell 본문(스크롤 주체)의 24px 여백 바깥까지 채운다. */}
        <div data-screen="actions" className="sticky -bottom-6 z-[5] -mx-6 -mb-6 border-t border-line bg-surface px-6 py-3">
          <div className="flex max-w-3xl justify-end gap-2">
            <Button>취소</Button>
            <Button type="submit" variant="primary">저장</Button>
          </div>
        </div>
      </form>
    </div>
  </StoreShell>;
}

const ready: Story['play'] = async ({ canvasElement: root }) => {
  await expect(within(root).getByRole('heading', { level: 1, name: '상품 등록' })).toBeInTheDocument();
  root.dataset.playComplete = 'true';
};
export const 기본: Story = { render: () => <ProductCreateScreen />, play: ready };
export const 오류2개: Story = { name: '오류 2개', render: () => <ProductCreateScreen errors />, play: ready };
