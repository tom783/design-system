import type { Meta, StoryObj } from '@storybook/react-vite';
import tokens from '../../../../docs/research/tokens.json';

/**
 * 이 스토리는 생성된 tokens.json 을 직접 읽는다.
 * 토큰을 재생성하면 문서가 자동으로 따라오므로, 문서와 실제 값이 어긋날 수 없다.
 */
const meta = {
  title: 'Foundation/색상',
  parameters: {
    docs: {
      description: {
        component:
          '모든 색은 OKLCH 색공간에서 생성되며, 색상(hue)이 달라도 같은 단계면 같은 지각 명도를 갖는다. ' +
          '명도 래더를 공유하기 때문에 브랜드 색상을 교체해도 대비 설계가 무너지지 않는다.',
      },
    },
  },
} satisfies Meta;
export default meta;

type Primitive = { hex: string; oklch: string; onWhite: number };
const primitives = tokens.primitives as Record<string, Record<string, Primitive>>;
const semantic = tokens.semantic as Record<
  string,
  Record<string, { ref: string; hex: string; purpose: string }>
>;

const SCALE_NOTE: Record<string, string> = {
  brand: '크림슨 H14. 아이덴티티와 주요 액션. 상태 표현에는 쓰지 않는다.',
  danger: 'H34. 브랜드와 색상각 20° 분리. 의미 토큰은 700단계를 참조해 명도까지 벌린다.',
  warning: 'H85. danger 가 H34 로 이동하면서 함께 밀어냈다.',
  success: 'H150. 정상·완료.',
  info: 'H250. 안내와 링크. 링크를 브랜드 레드로 두면 표에서 음수로 읽히므로 분리했다.',
  neutral: 'H30 · C 0.012. 무채색이 아니라 브랜드 온도를 미량 섞은 웜 뉴트럴.',
};

function Ramp({ name }: { name: string }) {
  const steps = Object.entries(primitives[name] ?? {});
  return (
    <section className="flex flex-col gap-2">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-[length:var(--text-title-sm)] font-semibold">{name}</h3>
        <p className="text-fg-muted text-[length:var(--text-caption)]">{SCALE_NOTE[name]}</p>
      </header>
      <div className="border-line-strong flex overflow-hidden rounded-[var(--radius-md)] border">
        {steps.map(([step, v]) => (
          <div key={step} className="min-w-0 flex-1">
            <div className="h-14" style={{ background: v.hex }} />
            <div className="border-line text-fg-muted flex flex-col gap-0.5 border-t p-1.5 text-center font-mono text-[10px] leading-3">
              <b className="text-fg text-[11px]">{step}</b>
              <span className="truncate">{v.hex.replace('#', '')}</span>
              <span className="text-fg-subtle">{v.onWhite.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-fg-subtle text-[length:var(--text-caption)]">
        단계 · HEX · 흰 배경 대비(:1)
      </p>
    </section>
  );
}

export const 원시색상: StoryObj = {
  render: () => (
    <div className="flex max-w-[1100px] flex-col gap-8">
      {Object.keys(primitives).map((n) => (
        <Ramp key={n} name={n} />
      ))}
    </div>
  ),
};

function SemanticTable({ theme }: { theme: 'light' | 'dark' }) {
  const rows = Object.entries(semantic[theme] ?? {});
  return (
    <div className="border-line-strong overflow-x-auto rounded-[var(--radius-md)] border">
      <table className="w-full border-collapse text-[length:var(--text-body-sm)]">
        <thead>
          <tr>
            {['토큰', '참조', '값', '역할'].map((h) => (
              <th
                key={h}
                className="bg-canvas border-line-strong text-fg-muted border-b px-3.5 py-2.5 text-left font-mono text-[10.5px] font-medium tracking-[0.1em] uppercase"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td className="border-line text-fg border-b px-3.5 py-2 font-mono whitespace-nowrap">
                {k}
              </td>
              <td className="border-line text-fg-muted border-b px-3.5 py-2 font-mono whitespace-nowrap">
                {v.ref}
              </td>
              <td className="border-line border-b px-3.5 py-2 whitespace-nowrap">
                <span
                  className="mr-2 inline-block size-3 rounded-[2px] align-[-1px]"
                  style={{ background: v.hex, border: '1px solid rgba(128,122,120,.4)' }}
                />
                <span className="text-fg-muted font-mono">{v.hex}</span>
              </td>
              <td className="border-line text-fg-muted border-b px-3.5 py-2">{v.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const 의미색상_라이트: StoryObj = {
  name: '의미색상 (라이트)',
  render: () => <SemanticTable theme="light" />,
};

export const 의미색상_다크: StoryObj = {
  name: '의미색상 (다크)',
  render: () => <SemanticTable theme="dark" />,
};

export const 검증결과: StoryObj = {
  name: '대비·분리 검증',
  parameters: {
    docs: {
      description: {
        story:
          '토큰을 생성할 때마다 아래 항목이 자동으로 검증된다. 하나라도 실패하면 빌드가 실패한다.',
      },
    },
  },
  render: () => {
    const v = tokens.verification as {
      contrast: { label: string; value: number; min: number; pass: boolean }[];
      separation: { label: string; a: string; b: string; value: number; min: number; pass: boolean }[];
    };
    return (
      <div className="flex max-w-[840px] flex-col gap-6">
        <section className="flex flex-col gap-2">
          <h3 className="text-[length:var(--text-title-sm)] font-semibold">
            명도대비 {v.contrast.length}건
          </h3>
          <p className="text-fg-muted text-[length:var(--text-body-sm)]">
            본문 텍스트 4.5:1(WCAG 2.2 AA), 비텍스트 요소 3:1(WCAG 1.4.11)
          </p>
          <ul className="flex flex-col gap-px">
            {v.contrast.map((c) => (
              <li
                key={c.label}
                className="border-line flex items-baseline justify-between gap-3 border-b py-1.5"
              >
                <span className="text-fg-muted text-[length:var(--text-body-sm)]">{c.label}</span>
                <span className="tabular shrink-0 font-mono text-[length:var(--text-body-sm)]">
                  <b className={c.pass ? 'text-success-ink' : 'text-danger-ink'}>
                    {c.value.toFixed(2)}:1
                  </b>
                  <span className="text-fg-subtle"> / {c.min}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="text-[length:var(--text-title-sm)] font-semibold">의미 분리 (ΔE)</h3>
          <p className="text-fg-muted text-[length:var(--text-body-sm)]">
            OKLab 지각 거리. 5 미만은 사실상 같은 색, 10 이상이면 명확히 다른 색으로 인지된다.
          </p>
          <ul className="flex flex-col gap-px">
            {v.separation.map((s) => (
              <li
                key={s.label}
                className="border-line flex items-center justify-between gap-3 border-b py-1.5"
              >
                <span className="text-fg-muted text-[length:var(--text-body-sm)]">{s.label}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span
                    className="inline-block size-4 rounded-[2px]"
                    style={{ background: s.a, border: '1px solid rgba(128,122,120,.4)' }}
                  />
                  <span
                    className="inline-block size-4 rounded-[2px]"
                    style={{ background: s.b, border: '1px solid rgba(128,122,120,.4)' }}
                  />
                  <span className="tabular font-mono text-[length:var(--text-body-sm)]">
                    <b className={s.pass ? 'text-success-ink' : 'text-danger-ink'}>
                      ΔE {s.value.toFixed(1)}
                    </b>
                    <span className="text-fg-subtle"> / {s.min}</span>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  },
};
