import type { Meta, StoryObj } from '@storybook/react-vite';
import tokens from '../../../../docs/research/tokens.json';

const meta = {
  title: 'Foundation/활자와 간격',
  parameters: {
    docs: {
      description: {
        component:
          '행간은 고정 비율이 아니라 글자 크기에 반비례하는 함수다. 큰 글자는 같은 비율이 ' +
          '물리적으로 더 큰 공백이 되고, 본문은 글줄이 길어 다음 줄을 찾는 눈의 이동이 커지므로 ' +
          '더 넉넉해야 한다. 모든 행간은 4px 베이스라인 그리드에 정렬된다.',
      },
    },
  },
} satisfies Meta;
export default meta;

type T = {
  token: string; size: number; lineHeight: number; lineHeightPct: number;
  letterSpacing: string; weight: number; purpose: string;
};
const type = tokens.typography as T[];

export const 타입스케일: StoryObj = {
  render: () => (
    <div className="flex max-w-[980px] flex-col gap-7">
      {[...type].reverse().map((t) => (
        <div key={t.token} className="flex flex-col gap-1.5">
          <div className="text-fg-subtle flex flex-wrap items-baseline gap-x-3 font-mono text-[11px] tracking-[0.08em] uppercase">
            <span className="text-fg-muted">{t.token}</span>
            <span>{t.size}px</span>
            <span>행간 {t.lineHeight}px ({t.lineHeightPct}%)</span>
            <span>자간 {t.letterSpacing}</span>
            <span>굵기 {t.weight}</span>
          </div>
          <p
            style={{
              fontSize: `${t.size}px`,
              lineHeight: `${t.lineHeight}px`,
              letterSpacing: t.letterSpacing,
              fontWeight: t.weight,
            }}
          >
            주문 1,284건 · 결제금액 48,200만원
          </p>
          <p className="text-fg-muted text-[length:var(--text-caption)]">{t.purpose}</p>
        </div>
      ))}
    </div>
  ),
};

export const 본문가독성: StoryObj = {
  name: '본문 가독성 비교',
  parameters: {
    docs: { description: { story: '행간을 130% 로 고정했을 때와 제안값을 나란히 비교한다.' } },
  },
  render: () => {
    const copy =
      '출고 대기 중인 주문이 312건입니다. 이 중 27건은 반품 요청이 접수된 상태이며, ' +
      '물류 창고의 재고 소진율이 80%를 넘은 품목이 2개 있습니다. 재고를 보충하지 않으면 ' +
      '이번 주 안에 품절될 것으로 예상됩니다.';
    return (
      <div className="grid max-w-[900px] gap-6 md:grid-cols-2">
        {[
          { label: '지침 그대로 · 130% 고정', lh: '19.5px', tone: 'text-warning-ink' },
          { label: '제안 · 본문 160%', lh: '24px', tone: 'text-success-ink' },
        ].map((v) => (
          <div key={v.label} className="flex flex-col gap-2">
            <p className={`font-mono text-[11px] tracking-[0.08em] uppercase ${v.tone}`}>
              {v.label}
            </p>
            <p className="border-line-strong rounded-[var(--radius-md)] border p-4"
               style={{ fontSize: '15px', lineHeight: v.lh }}>
              {copy}
            </p>
          </div>
        ))}
      </div>
    );
  },
};

export const 간격: StoryObj = {
  name: '간격 (4px 그리드)',
  render: () => (
    <div className="flex flex-col gap-2.5">
      {(tokens.spacing as number[]).filter((n) => n > 0).map((n) => (
        <div key={n} className="flex items-center gap-3">
          <span className="text-fg-muted tabular w-16 shrink-0 font-mono text-[length:var(--text-caption)]">
            {n}px
          </span>
          <div className="bg-action h-3.5 rounded-[2px]" style={{ width: `${n}px` }} />
        </div>
      ))}
    </div>
  ),
};

export const 치수: StoryObj = {
  name: '치수 — 값이 길어져도 겹치지 않게',
  parameters: {
    docs: {
      description: {
        story:
          '자연어 "여백을 넉넉하게"를 역산 가능한 수치로 바꾼 값들이다. ' +
          '금액 칸 128px 은 ₩1,248,500,000(13자)을 IBM Plex Mono 14px 고정폭으로 ' +
          '조판한 폭에 좌우 여백 28px 을 더해 산출했다.',
      },
    },
  },
  render: () => (
    <div className="border-line-strong max-w-[520px] overflow-hidden rounded-[var(--radius-md)] border">
      {Object.entries(tokens.sizing as Record<string, string>).map(([k, v], i) => (
        <div
          key={k}
          className={`flex items-baseline justify-between gap-4 px-3.5 py-2 ${i ? 'border-line border-t' : ''}`}
        >
          <span className="text-fg-muted font-mono text-[length:var(--text-body-sm)]">{k}</span>
          <span className="text-fg tabular font-mono text-[length:var(--text-body-sm)] font-medium">{v}</span>
        </div>
      ))}
    </div>
  ),
};
