import * as React from 'react';
import { Button, SectionHeader, createDataTableColumnHelper } from '@s2life/ui';
import { tokens, type TypographyToken } from '../../data/tokens';
import { TokenName } from './TokenName';
import { TokenTable, TokenValue } from './TokenTable';

// 활자 — 견본 글은 그 토큰의 용도 문장을 그 크기로 그린다(사이트가 견본 문구를 지어내지 않는다).
function TypeSample({ token }: { token: TypographyToken }) {
  const name = `--text-${token.token}`;
  return <span className="site-cell-wrap" style={{
    fontSize: `var(${name})`, lineHeight: `var(${name}-lh)`, letterSpacing: `var(${name}-ls)`, fontWeight: `var(${name}-weight)`,
  }}>{token.purpose}</span>;
}
const typeSize = (token: TypographyToken) => `${token.size}px / ${token.lineHeight}px (${token.lineHeightPct}%)`;
const typeHelper = createDataTableColumnHelper<TypographyToken>();
const typeColumns = typeHelper.columns([
  typeHelper.accessor('token', { header: '토큰', cell: (cell) => <TokenName name={`text-${cell.getValue()}`} /> }),
  typeHelper.accessor('size', {
    header: '크기 / 행간',
    cell: (cell) => <span className="tabular">{typeSize(cell.row.original)}</span>,
  }),
  typeHelper.accessor('weight', { header: '굵기 · 자간', cell: (cell) => <span className="tabular">{cell.getValue()} · {cell.row.original.letterSpacing}</span> }),
  typeHelper.accessor('purpose', { header: '견본(용도)', cell: (cell) => <TypeSample token={cell.row.original} /> }),
]);
const typeBlock = (row: TypographyToken) => ({
  name: <TokenName name={`text-${row.token}`} />,
  values: <>
    <TokenValue label="크기 / 행간"><span className="tabular">{typeSize(row)}</span></TokenValue>
    <TokenValue label="굵기 · 자간"><span className="tabular">{row.weight} · {row.letterSpacing}</span></TokenValue>
  </>,
  note: <TypeSample token={row} />,
});

export function TypographyFoundation() {
  return <TokenTable data={tokens.typography} columns={typeColumns} getRowId={(row) => row.token} block={typeBlock} caption="활자 단계 — 크기·행간·굵기·자간" />;
}

// 간격·치수
interface Row { name: string; value: string }
const spacingRows: Row[] = tokens.spacing.map((value) => ({ name: `space-${value}`, value: `${value}px` }));
const sizingRows: Row[] = Object.entries(tokens.sizing).map(([name, value]) => ({ name, value }));
const rowHelper = createDataTableColumnHelper<Row>();
const spaceBar = (row: Row) => <span className="site-space-bar" style={{ width: `var(--${row.name})` }} aria-hidden="true" />;
const spacingColumns = rowHelper.columns([
  rowHelper.accessor('name', { header: '토큰', cell: (cell) => <TokenName name={cell.getValue()} /> }),
  rowHelper.accessor('value', { header: '값', cell: (cell) => <span className="tabular">{cell.getValue()}</span> }),
  rowHelper.display({
    id: 'sample', header: '견본',
    cell: (cell) => spaceBar(cell.row.original),
  }),
]);
const valueColumns = rowHelper.columns([
  rowHelper.accessor('name', { header: '토큰', cell: (cell) => <TokenName name={cell.getValue()} /> }),
  rowHelper.accessor('value', { header: '값', cell: (cell) => <span className="tabular">{cell.getValue()}</span> }),
]);
/** 좁은 폭 덩어리 — 이름 줄 / 값(+견본) 줄. */
const valueBlock = (sample?: (row: Row) => React.ReactNode) => (row: Row) => ({
  name: <TokenName name={row.name} />,
  values: <>
    <TokenValue label="값"><span className="tabular">{row.value}</span></TokenValue>
    {sample?.(row)}
  </>,
});

export function SpacingFoundation() {
  return <div className="site-page">
    <SectionHeader title="간격">
      <TokenTable data={spacingRows} columns={spacingColumns} getRowId={(row) => row.name} block={valueBlock(spaceBar)} caption="간격 토큰" />
    </SectionHeader>
    <SectionHeader title="치수">
      <TokenTable data={sizingRows} columns={valueColumns} getRowId={(row) => row.name} block={valueBlock()} caption="치수 토큰" />
    </SectionHeader>
  </div>;
}

// 형태 — 모서리·선·포커스·그림자
const shapeRows: Row[] = Object.entries(tokens.shape).map(([name, value]) => ({ name, value }));
function ShapeSample({ name }: { name: string }) {
  if (name.startsWith('radius-')) return <span className="site-shape-box" style={{ borderRadius: `var(--${name})` }} aria-hidden="true" />;
  if (name === 'border-width') return <span className="site-shape-box" style={{ borderWidth: `var(--${name})` }} aria-hidden="true" />;
  if (name === 'focus-width' || name === 'focus-offset') {
    return <span className="site-shape-box" aria-hidden="true" style={{
      borderRadius: 'var(--radius-md)',
      outline: 'var(--focus-width) solid var(--border-focus)', outlineOffset: 'var(--focus-offset)',
    }} />;
  }
  // shadow-overlay-dark 는 다크 테마에서 --shadow-overlay 의 값이다(별도 변수로 쓰지 않는다). 현재 테마의 --shadow-overlay 로 보여 준다.
  if (name.startsWith('shadow-')) {
    const variable = name === 'shadow-overlay-dark' ? 'shadow-overlay' : name;
    return <span className="site-shape-box" style={{ borderRadius: 'var(--radius-lg)', boxShadow: `var(--${variable})` }} aria-hidden="true" />;
  }
  return null;
}
const shapeColumns = rowHelper.columns([
  rowHelper.accessor('name', { header: '토큰', cell: (cell) => <TokenName name={cell.getValue()} /> }),
  rowHelper.accessor('value', { header: '값', cell: (cell) => <span className="tabular">{cell.getValue()}</span> }),
  rowHelper.display({ id: 'sample', header: '견본', cell: (cell) => <ShapeSample name={cell.row.original.name} /> }),
]);

export function ShapeFoundation() {
  return <TokenTable data={shapeRows} columns={shapeColumns} getRowId={(row) => row.name} block={valueBlock((row) => <ShapeSample name={row.name} />)}
    caption="형태 토큰 — 모서리·선·포커스·그림자" />;
}

// 모션 — 재생을 누르면 점이 그 시간·곡선으로 움직인다. 시간 줄은 ease-standard, 곡선 줄은 dur-slow 로 맞춘다.
const motionRows: Row[] = Object.entries(tokens.motion).map(([name, value]) => ({ name, value }));
const loadingRows: Row[] = Object.entries(tokens.loading).map(([name, value]) => ({ name, value }));
const PlayContext = React.createContext(false);
function MotionSample({ name }: { name: string }) {
  const on = React.useContext(PlayContext);
  const duration = name.startsWith('dur-') ? `var(--${name})` : 'var(--dur-slow)';
  const easing = name.startsWith('ease-') ? `var(--${name})` : 'var(--ease-standard)';
  return <span className="site-motion-track" data-on={on} aria-hidden="true">
    <span className="site-motion-dot" style={{ transitionDuration: duration, transitionTimingFunction: easing }} />
  </span>;
}
const motionColumns = rowHelper.columns([
  rowHelper.accessor('name', { header: '토큰', cell: (cell) => <TokenName name={cell.getValue()} /> }),
  rowHelper.accessor('value', { header: '값', cell: (cell) => <span className="tabular">{cell.getValue()}</span> }),
  rowHelper.display({ id: 'sample', header: '견본', cell: (cell) => <MotionSample name={cell.row.original.name} /> }),
]);

export function MotionFoundation() {
  const [on, setOn] = React.useState(false);
  return <div className="site-page">
    <SectionHeader title="시간과 곡선" control={<Button size="sm" onClick={() => setOn((value) => !value)}>{on ? '되돌리기' : '재생'}</Button>}>
      <PlayContext.Provider value={on}>
        <TokenTable data={motionRows} columns={motionColumns} getRowId={(row) => row.name} block={valueBlock((row) => <MotionSample name={row.name} />)}
          caption="모션 토큰 — 시간·곡선" />
      </PlayContext.Provider>
    </SectionHeader>
    <SectionHeader title="대기 시간">
      <TokenTable data={loadingRows} columns={valueColumns} getRowId={(row) => row.name} block={valueBlock()} caption="로딩·안내 대기 시간 토큰" />
    </SectionHeader>
  </div>;
}
