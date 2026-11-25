import * as React from 'react';
import { useLocation } from 'react-router';
import { SectionHeader, StatusChip, Tabs, TabsContent, TabsList, TabsTrigger, createDataTableColumnHelper } from '@s2life/ui';
import { tokens, type ContrastCheck } from '../../data/tokens';
import { manifest } from '../../data/manifest';
import { TokenName } from './TokenName';
import { TokenTable, TokenValue } from './TokenTable';

// 의미 토큰은 라이트·다크 두 열로 같은 이름을 나란히 둔다. 사이트 테마와 무관하게 두 테마 값을 함께 보여 준다.
interface SemanticRow { name: string; light: { ref: string; hex: string }; dark: { ref: string; hex: string }; purpose: string }
const semanticRows: SemanticRow[] = Object.entries(tokens.semantic.light).map(([name, light]) => ({
  name, light, dark: tokens.semantic.dark[name] ?? light, purpose: light.purpose,
}));
const tokenNames = new Set(manifest.tokens.map((token) => token.name));

function Swatch({ hex, reference }: { hex: string; reference: string }) {
  return <span className="site-swatch-cell">
    {/* 견본 칸의 색은 데이터 값이다 — 토큰을 거치지 않고 그 값 그대로 칠한다. */}
    <span className="site-swatch" style={{ background: hex }} aria-hidden="true" />
    <span className="tabular">{hex}</span>
    {reference !== hex && <span className="site-caption">{reference}</span>}
  </span>;
}

const semanticHelper = createDataTableColumnHelper<SemanticRow>();
const semanticColumns = semanticHelper.columns([
  semanticHelper.accessor('name', { header: '토큰', cell: (cell) => <TokenName name={cell.getValue()} /> }),
  semanticHelper.accessor('light', { header: '라이트', cell: (cell) => <Swatch hex={cell.getValue().hex} reference={cell.getValue().ref} /> }),
  semanticHelper.accessor('dark', { header: '다크', cell: (cell) => <Swatch hex={cell.getValue().hex} reference={cell.getValue().ref} /> }),
  // 용도는 줄을 바꿔 표를 본문 칸 안에 둔다(1440 에서 40px 넘쳐 용도 글이 잘리던 것, 검수 r1).
  semanticHelper.accessor('purpose', { header: '용도', cell: (cell) => <span className="site-cell-wrap">{cell.getValue()}</span> }),
]);
const semanticBlock = (row: SemanticRow) => ({
  name: <TokenName name={row.name} />,
  values: <>
    <TokenValue label="라이트"><Swatch hex={row.light.hex} reference={row.light.ref} /></TokenValue>
    <TokenValue label="다크"><Swatch hex={row.dark.hex} reference={row.dark.ref} /></TokenValue>
  </>,
  note: row.purpose,
});

function Primitives() {
  return <div className="site-stack">
    {Object.entries(tokens.primitives).map(([hue, steps]) => {
      const info = tokens.hues[hue];
      return <SectionHeader key={hue} as="h3" title={hue}
        description={info ? <span className="tabular">H{info.hue} · 최대 채도 {info.maxC}</span> : undefined}>
        <div className="site-ramp">
          {Object.entries(steps).map(([step, value]) => {
            const name = `color-${hue}-${step}`;
            return <div key={step} className="site-ramp-step" id={`token-${name}`}>
              <span className="site-ramp-chip" style={{ background: value.hex }} aria-hidden="true" />
              <span className="tabular">{step} · {value.hex}</span>
              <span className="site-caption tabular">흰 바탕 {value.onWhite}:1</span>
              {tokenNames.has(name) && <code className="site-code">--{name}</code>}
            </div>;
          })}
        </div>
      </SectionHeader>;
    })}
  </div>;
}

const contrastHelper = createDataTableColumnHelper<ContrastCheck & { id: string }>();
const contrastColumns = contrastHelper.columns([
  contrastHelper.accessor('label', { header: '조합' }),
  contrastHelper.accessor('kind', { header: '종류' }),
  contrastHelper.accessor('value', { header: '대비', cell: (cell) => <span className="tabular">{cell.getValue()}:1</span> }),
  contrastHelper.accessor('min', { header: '하한', cell: (cell) => <span className="tabular">{cell.getValue()}:1</span> }),
  contrastHelper.accessor('pass', {
    header: '판정',
    cell: (cell) => cell.getValue() ? <StatusChip tone="success">통과</StatusChip> : <StatusChip tone="danger">미달</StatusChip>,
  }),
]);
const contrastRows = tokens.verification.contrast.map((check, i) => ({ ...check, id: String(i) }));
const contrastBlock = (row: (typeof contrastRows)[number]) => ({
  name: <strong>{row.label}</strong>,
  values: <>
    <TokenValue label="종류">{row.kind}</TokenValue>
    <TokenValue label="대비"><span className="tabular">{row.value}:1</span></TokenValue>
    <TokenValue label="하한"><span className="tabular">{row.min}:1</span></TokenValue>
    {row.pass ? <StatusChip tone="success">통과</StatusChip> : <StatusChip tone="danger">미달</StatusChip>}
  </>,
});

export function ColorFoundation() {
  // 검색에서 원시 색 토큰으로 오면(#token-color-…) 원시 탭을 연다.
  const { hash } = useLocation();
  const [tab, setTab] = React.useState(hash.startsWith('#token-color-') ? 'primitive' : 'semantic');
  React.useEffect(() => { if (hash.startsWith('#token-color-')) setTab('primitive'); else if (hash.startsWith('#token-')) setTab('semantic'); }, [hash]);
  return <Tabs value={tab} onValueChange={setTab}>
    <TabsList>
      <TabsTrigger value="semantic">의미 토큰</TabsTrigger>
      <TabsTrigger value="primitive">원시 색</TabsTrigger>
      <TabsTrigger value="contrast">대비 검증</TabsTrigger>
    </TabsList>
    <TabsContent value="semantic">
      <TokenTable data={semanticRows} columns={semanticColumns} getRowId={(row) => row.name} block={semanticBlock}
        caption="의미 토큰 — 라이트·다크 값과 참조 원시 색" />
    </TabsContent>
    <TabsContent value="primitive"><Primitives /></TabsContent>
    <TabsContent value="contrast">
      <TokenTable data={contrastRows} columns={contrastColumns} getRowId={(row) => row.id} block={contrastBlock}
        caption="생성기가 검사한 대비 조합과 판정" />
    </TabsContent>
  </Tabs>;
}
