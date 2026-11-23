import * as React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Field, FormRow } from '../components/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/select';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from '../components/input';
import { Mail, LockKeyhole, Banknote } from 'lucide-react';

const meta = {
  tags: ['autodocs'],
  title: 'Components/Input',
  component: Input,
  parameters: { manifest: ['Input'],
    docs: {
      description: {
        component:
          '경계선은 neutral-600(흰 배경 대비 4.17:1)을 쓴다. 많은 시스템이 쓰는 연회색(neutral-200)은 ' +
          '1.31:1 로 WCAG 1.4.11(3:1)을 위반한다. "입력할 수 있는 칸"이라는 정보를 경계선이 ' +
          '전달하므로 장식이 아니다.',
      },
    },
  },
  args: { placeholder: '주문번호 · 수취인 검색' },
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const 기본: Story = { render: (a) => <div className="w-80"><Input {...a} /></div> };

export const 경계선대비비교: Story = {
  name: '경계선 대비 비교',
  parameters: {
    docs: {
      description: {
        story: '왼쪽이 흔히 쓰는 연회색(규격 위반), 오른쪽이 우리 토큰이다. 축소해서 보면 차이가 분명하다.',
      },
    },
  },
  render: () => (
    <div className="grid max-w-[720px] gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <p className="text-danger-ink tabular font-sans text-[11px] tracking-[0.08em] uppercase">
          neutral-200 · 1.31:1 · 위반
        </p>
        <input
          placeholder="주문번호 검색"
          className="bg-surface text-fg placeholder:text-fg-subtle h-[38px] w-full rounded-[var(--radius-md)] border px-3 text-[length:var(--text-body-sm)]"
          style={{ borderColor: 'var(--color-neutral-200)' }}
        />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-success-ink tabular font-sans text-[11px] tracking-[0.08em] uppercase">
          border-input · 4.17:1 · 통과
        </p>
        <Input placeholder="주문번호 검색" />
      </div>
    </div>
  ),
};

export const 상태: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-3">
      <Input placeholder="기본" />
      <Input defaultValue="ORD-24119-0841" />
      <Input placeholder="비활성" disabled />
      <div className="flex flex-col gap-1.5">
        <Input defaultValue="ORD-999" invalid aria-describedby="err-1" />
        <p id="err-1" className="text-danger-ink flex items-start gap-1.5 text-[length:var(--text-caption)]">
          <span aria-hidden="true">⚠</span>
          존재하지 않는 주문번호입니다. ORD- 로 시작하는 13자리를 입력하세요.
        </p>
      </div>
    </div>
  ),
};

export const 금액입력: Story = {
  name: '금액 입력 — 고정폭 숫자',
  parameters: {
    docs: {
      description: {
        story: '숫자가 열로 정렬되는 곳에서는 고정폭 숫자를 쓴다. 자릿수가 흔들리면 비교가 불가능해진다.',
      },
    },
  },
  render: () => (
    <div className="flex w-60 flex-col gap-2">
      <Input type="text" inputMode="numeric" numeric defaultValue="1,248,500,000" />
      <Input type="text" inputMode="numeric" numeric defaultValue="47,600" />
      <Input type="text" inputMode="numeric" numeric defaultValue="389,000" />
    </div>
  ),
};

// number는 범용 타입 전달 검증용이다. 금액·수량은 위처럼 text + inputMode=numeric을 쓴다.
export const 숫자휠가드: Story = {
  // 스크롤 여유 높이는 휠 검증용이다. 문서 미리보기에서는 빈 공간이라 끈다.
  render: (_, { viewMode }) => <div style={{ minHeight: viewMode === 'docs' ? undefined : '180vh', maxWidth: 400 }}>
    <Field label="네이티브 숫자 타입 테스트" description="금액·수량에는 사용하지 않습니다. 휠 시 포커스를 해제하여 값 변경과 스크롤 차단을 피합니다.">
      <Input type="number" defaultValue="10" />
    </Field>
  </div>,
  play: async ({ canvasElement: root }) => {
    await expect(within(root).getByRole('spinbutton')).toHaveValue(10);
    root.dataset.playComplete = 'true';
  },
};
export const 비밀번호: Story = {
  render: () => <div className="max-w-sm"><Field label="비밀번호"><Input type="password" defaultValue="safe-password" /></Field></div>,
  play: async ({ canvasElement: root }) => {
    const canvas = within(root), input = canvas.getByLabelText('비밀번호');
    await userEvent.click(canvas.getByRole('button', { name: '비밀번호 표시' }));
    await expect(input).toHaveAttribute('type', 'text');
    await expect(canvas.getByRole('button', { name: '비밀번호 숨기기' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(canvas.getByRole('button', { name: '비밀번호 숨기기' }));
    await expect(input).toHaveAttribute('type', 'password');
    await expect(canvas.getByRole('button', { name: '비밀번호 표시' })).toHaveAttribute('aria-pressed', 'false');
    root.dataset.playComplete = 'true';
  },
};
function SearchDemo() {
  const [query, setQuery] = React.useState('배송');
  return <div className="grid max-w-sm gap-3">
    <Field label="제어 검색"><Input type="search" value={query} onChange={event => setQuery(event.target.value)} /></Field>
    <output aria-label="검색 상태">{query || '검색어 없음'}</output>
    <form><Field label="비제어 검색"><Input type="search" defaultValue="주문" /></Field>
      <button type="reset">검색 초기화</button>
    </form>
  </div>;
}
export const 검색: Story = {
  render: () => <SearchDemo />,
  play: async ({ canvasElement: root }) => {
    const canvas = within(root);
    for (const label of ['제어 검색', '비제어 검색']) {
      const input = canvas.getByLabelText(label);
      const clear = input.parentElement!.querySelector<HTMLButtonElement>('[aria-label="검색어 지우기"]')!;
      await userEvent.click(clear);
      await expect(input).toHaveValue('');
      await waitFor(() => expect(input).toHaveFocus());
      await expect(input.parentElement!.querySelector('[aria-label="검색어 지우기"]')).toBeNull();
      if (label === '제어 검색') await expect(canvas.getByLabelText('검색 상태')).toHaveTextContent('검색어 없음');
      await userEvent.type(input, label === '제어 검색' ? '배송' : '주문');
    }
    root.dataset.playComplete = 'true';
  },
};
export const 이메일: Story = {
  render: () => <div className="max-w-sm"><Field label="담당자 이메일" description="예: name@example.com"><Input type="email" /></Field></div>,
  play: async ({ canvasElement: root }) => {
    await expect(within(root).getByLabelText('담당자 이메일')).toHaveAttribute('type', 'email');
    root.dataset.playComplete = 'true';
  },
};
export const 전화번호: Story = {
  render: () => <div className="max-w-sm"><Field label="연락처" description="예: 010-1234-5678"><Input type="tel" /></Field></div>,
  play: async ({ canvasElement: root }) => {
    await expect(within(root).getByLabelText('연락처')).toHaveAttribute('type', 'tel');
    root.dataset.playComplete = 'true';
  },
};
export const 날짜비권장: Story = {
  name: '날짜 — 권장하지 않음',
  render: () => <div className="max-w-sm"><Field label="네이티브 날짜" description="권장하지 않음: 브라우저 치수·UTC 변환·영어 검증 메시지. DatePicker를 사용하세요.">
    <Input type="date" defaultValue="2026-11-15" />
  </Field></div>,
  play: async ({ canvasElement: root }) => {
    const input = within(root).getByLabelText('네이티브 날짜');
    await expect(input).toHaveAttribute('type', 'date');
    await expect(input).toHaveValue('2026-11-15');
    root.dataset.playComplete = 'true';
  },
};
export const 주소: Story = {
  render: () => <div className="max-w-sm"><Field label="쇼핑몰 주소"><Input type="url" /></Field></div>,
  play: async ({ canvasElement: root }) => {
    await expect(within(root).getByLabelText('쇼핑몰 주소')).toHaveAttribute('type', 'url');
    root.dataset.playComplete = 'true';
  },
};

export const 검색기본아이콘: Story = {
  name: '검색 — 기본 돋보기',
  render: () => <div className="w-80"><Field label="게시글 검색" description="제목으로 검색합니다."><Input id="article-search" type="search" placeholder="제목 검색" /></Field></div>,
};
export const 앞쪽아이콘: Story = {
  name: '앞쪽 아이콘',
  render: () => <div className="w-80"><Field label="이메일"><Input type="email" leadingIcon={<Mail />} placeholder="name@example.com" /></Field></div>,
};
export const 아이콘과지우기: Story = {
  name: '아이콘 + 지우기·비밀번호 보기',
  render: () => <div className="grid w-80 gap-3">
    <Field label="담당자 검색"><Input type="search" leadingIcon={<Mail />} defaultValue="담당자" /></Field>
    <Field label="아이콘 없는 검색"><Input type="search" leadingIcon={null} defaultValue="주문" /></Field>
    <Field label="보안 입력"><Input type="password" leadingIcon={<LockKeyhole />} defaultValue="safe-password" /></Field>
  </div>,
};
export const 아이콘비활성: Story = {
  name: '검색 아이콘 — 비활성',
  render: () => <div className="w-80"><Field label="게시글 검색"><Input type="search" defaultValue="검색할 수 없음" disabled /></Field></div>,
};
export const 검색툴바폭: Story = {
  name: '검색 — 툴바 한 줄 폭',
  parameters: { docs: { description: { story: '검색·비밀번호·앞 아이콘 Input 은 래퍼가 바깥 요소다. className 의 폭·배치 클래스(w-80·flex-1 등)는 래퍼에, 나머지는 input 에 붙는다. 그래서 감싸는 div 없이 `className="w-80"` 만으로 필터와 한 줄에 놓인다.' } } },
  render: () => <div data-probe="search-toolbar" className="flex flex-wrap items-center gap-2">
    <Input type="search" aria-label="주문 검색" placeholder="주문번호·수취인·상품명 검색" className="w-80 tabular" />
    <Select defaultValue="all"><SelectTrigger aria-label="주문 상태" className="w-auto min-w-40"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="all">전체 상태</SelectItem><SelectItem value="ready">출고 대기</SelectItem></SelectContent></Select>
    <Select defaultValue="30d"><SelectTrigger aria-label="주문 기간" className="w-auto min-w-40"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="7d">최근 7일</SelectItem><SelectItem value="30d">최근 30일</SelectItem></SelectContent></Select>
  </div>,
};

// ── 단위 접미사 — unit (목표 49 4a · 2026-11-23 디자인 총괄 규격, DESIGN §17.1.1) ──
// 검수 매트릭스: 라이트·다크 × 기본·포커스·비활성·오류 × 짧은/긴 접미사('원'·'개월'). 포커스 줄은 Tab 으로
// 들어가야 링이 보인다 — 하네스(input-unit-render-verify)가 키보드로 포커스해 칸마다 찍는다.
const UNIT_STATES = [
  { key: 'default', label: '기본' }, { key: 'focus', label: '포커스' },
  { key: 'disabled', label: '비활성' }, { key: 'error', label: '오류' },
] as const;
const UNIT_CASES = [
  { unit: '원', label: '판매가', value: '39,000', error: '판매가를 1원 이상으로 입력하세요' },
  { unit: '개월', label: '약정 기간', value: '12', error: '약정 기간은 1~36 사이로 입력하세요' },
] as const;
function UnitMatrix() {
  return <div data-probe="unit-matrix" className="grid w-[528px] grid-cols-2 gap-x-6">
    {UNIT_STATES.flatMap(state => UNIT_CASES.map(item =>
      <Field key={`${state.key}-${item.unit}`} data-probe={`unit-field-${state.key}-${item.unit}`} label={`${item.label} · ${state.label}`}
        error={state.key === 'error' ? item.error : undefined}>
        <Input numeric inputMode="numeric" unit={item.unit} defaultValue={item.value} disabled={state.key === 'disabled'}
          data-probe={`unit-${state.key}-${item.unit}`} />
      </Field>))}
  </div>;
}
const unitReady: Story['play'] = async ({ canvasElement: root }) => {
  // 접미사는 값이 아니다 — 값에 섞이지 않고, 낭독기 설명의 맨 앞(값 바로 뒤)에 온다.
  const input = within(root).getByLabelText('판매가 · 오류');
  await expect(input).toHaveValue('39,000');
  await expect(input).toHaveAccessibleDescription(/^원 판매가를 1원 이상으로 입력하세요$/);
  root.dataset.playComplete = 'true';
};
export const 단위접미사: Story = {
  name: '단위 접미사 — 검수 매트릭스',
  parameters: { docs: { description: { story: '`unit`은 상자 안 오른쪽 12px에 값과 같은 14px로 그린다. 숫자 값은 접미사 왼쪽 4px에서 끝난다. 색은 기본·포커스·오류 모두 text-tertiary, 비활성만 text-disabled다 — 오류는 경계·아이콘·문장이 맡는다. 접미사는 값·복사·제출에 섞이지 않고 낭독기는 aria-describedby로 "39,000 원"처럼 값 뒤에 읽는다.' } } },
  render: () => <UnitMatrix />,
  play: unitReady,
};
export const 단위접미사다크: Story = {
  name: '단위 접미사 — 검수 매트릭스(다크)',
  globals: { theme: 'dark' },
  render: () => <UnitMatrix />,
  play: unitReady,
};
export const 단위접미사폭: Story = {
  name: '단위 접미사 — 최소 폭·긴 값·앞 아이콘',
  parameters: { docs: { description: { story: '최소 폭은 120px에 접미사 폭과 간격 4px를 더한다 — 값이 들어갈 폭이 접미사 없는 입력과 같다. 긴 값은 접미사 밑으로 들어가지 않고 칸 안에서 가로 스크롤된다. leadingIcon과 함께 쓸 수 있다.' } } },
  render: () => <div className="grid gap-3">
    <div data-probe="unit-min" className="flex flex-wrap items-start gap-3">
      <Input aria-label="최소 폭 접미사 없음" numeric inputMode="numeric" defaultValue="39,000" className="w-0" data-probe="unit-min-none" />
      <Input aria-label="최소 폭 원" numeric inputMode="numeric" unit="원" defaultValue="39,000" className="w-0" data-probe="unit-min-원" />
      <Input aria-label="최소 폭 개월" numeric inputMode="numeric" unit="개월" defaultValue="12" className="w-0" data-probe="unit-min-개월" />
      <Input aria-label="최소 폭 퍼센트" numeric inputMode="numeric" unit="%" defaultValue="15" className="w-0" data-probe="unit-min-%" />
    </div>
    <div className="grid w-48 gap-3">
      <Input aria-label="긴 값 원" numeric inputMode="numeric" unit="원" defaultValue="12,345,678,901,234,567,890" data-probe="unit-long-원" />
      <Input aria-label="긴 값 개월" numeric inputMode="numeric" unit="개월" defaultValue="123,456,789,012,345,678" data-probe="unit-long-개월" />
      <Input aria-label="앞 아이콘과 원" numeric inputMode="numeric" unit="원" leadingIcon={<Banknote />} defaultValue="49,000" data-probe="unit-icon-원" />
      <Input aria-label="빈 값 원" numeric inputMode="numeric" unit="원" placeholder="0" data-probe="unit-empty-원" />
      <div className="grid gap-1">
        <Input aria-label="할인율" numeric inputMode="numeric" unit="%" defaultValue="15" aria-describedby="unit-own-help" data-probe="unit-described-%" />
        <p id="unit-own-help" className="text-fg-muted text-[length:var(--text-caption)]">최대 90까지 입력합니다.</p>
      </div>
    </div>
  </div>,
};
export const 단위접미사같은줄: Story = {
  name: '단위 접미사 — FormRow 같은 줄',
  parameters: { docs: { description: { story: '같은 줄 두 칸에서 접미사가 있어도 입력칸 윗선·높이가 같다. 한쪽에만 설명·오류가 있어도 움직이지 않는다(§11.9).' } } },
  render: () => <div className="grid max-w-2xl gap-0">
    <FormRow data-probe="unit-row-price">
      <Field label="판매가" required><Input numeric inputMode="numeric" unit="원" defaultValue="39,000" /></Field>
      <Field label="정가" description="할인 전 가격입니다. 비우면 판매가와 같게 표시합니다.">
        <Input numeric inputMode="numeric" unit="원" defaultValue="49,000" /></Field>
    </FormRow>
    <FormRow data-probe="unit-row-term">
      <Field label="재고 수량" error="재고 수량을 1개 이상으로 입력하세요"><Input numeric inputMode="numeric" unit="개" defaultValue="0" /></Field>
      <Field label="약정 기간"><Input numeric inputMode="numeric" unit="개월" defaultValue="12" /></Field>
    </FormRow>
    <FormRow data-probe="unit-row-mixed">
      <Field label="할인율"><Input numeric inputMode="numeric" unit="%" defaultValue="15" /></Field>
      <Field label="공급가"><Input numeric inputMode="numeric" defaultValue="35,455" /></Field>
    </FormRow>
  </div>,
};
