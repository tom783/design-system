import * as React from 'react';
import { DataTable, type DataTableProps, type RowData } from '@s2life/ui';
import { useMediaQuery } from '../../blocks/useMediaQuery';

/** 이 폭 이하에서는 표 대신 토큰마다 한 덩어리로 보인다(site.css .site-token 과 같은 경계, 검수 r1). */
export const TOKEN_NARROW = '(max-width: 600px)';

/** 한 덩어리 — 이름 줄 / 값·견본 줄 / 용도 줄. 표의 열과 같은 데이터를 쓴다. */
export interface TokenBlockParts {
  name: React.ReactNode;
  values?: React.ReactNode;
  note?: React.ReactNode;
}

interface TokenTableProps<T extends RowData> {
  data: T[];
  columns: DataTableProps<T>['columns'];
  getRowId: (row: T) => string;
  caption: string;
  block: (row: T) => TokenBlockParts;
}

/** DataTable 의 가로 스크롤 칸 — 이 칸이 넘치면 표가 그릇보다 넓다. */
const SCROLL = '[data-slot="data-table-scroll"]';

/**
 * 표가 그릇 폭에 들어가는지. 표를 한 번 그려 넘치면(scrollWidth > clientWidth) 그때의 필요 폭을 기억하고, 그릇이 그보다 좁은 동안은 덩어리로 그린다.
 * 그릇이 필요 폭 이상으로 넓어지면 다시 표로 — 그래도 넘치면 필요 폭을 다시 잰다. 재는 것은 그리기 전(layout effect)이라 넘친 표가 보이지 않는다.
 */
function useTableFits(box: React.RefObject<HTMLDivElement | null>, skip: boolean) {
  const [need, setNeed] = React.useState<number | null>(null);
  const [width, setWidth] = React.useState<number | null>(null);
  React.useLayoutEffect(() => {
    const target = box.current;
    if (!target) return;
    setWidth(target.clientWidth);
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(target);
    return () => observer.disconnect();
  }, [box]);
  const fits = need === null || width === null || width >= need;
  React.useLayoutEffect(() => {
    if (skip || !fits) return;
    const scroll = box.current?.querySelector<HTMLElement>(SCROLL);
    if (scroll && scroll.scrollWidth > scroll.clientWidth) setNeed(Math.ceil(scroll.scrollWidth + box.current!.clientWidth - scroll.clientWidth));
  });
  return fits;
}

/**
 * 파운데이션 토큰 표. 표가 본문 칸에 들어가면 DataTable, 넘치면 표 안에서 가로로 밀지 않고 토큰마다 이름·값·견본을 한 묶음으로 쌓는다
 * (390 에서 1,158px 표를 356px 에 가로로 밀던 것 · 9a 뒤 601~1279px 에 남았던 표 안 가로 밀기 — 오너 결정 11/25). 600px 이하는 늘 덩어리.
 * 검색이 오는 자리(#token-이름)는 두 모양 모두 이름 칸에 있다.
 */
export function TokenTable<T extends RowData>({ data, columns, getRowId, caption, block }: TokenTableProps<T>) {
  const narrow = useMediaQuery(TOKEN_NARROW);
  const box = React.useRef<HTMLDivElement>(null);
  const fits = useTableFits(box, narrow);
  return <div ref={box} className="site-token-table">
    {narrow || !fits ? <TokenBlocks data={data} getRowId={getRowId} caption={caption} block={block} />
      : <DataTable data={data} columns={columns} getRowId={getRowId} caption={caption} />}
  </div>;
}

function TokenBlocks<T extends RowData>({ data, getRowId, caption, block }: Pick<TokenTableProps<T>, 'data' | 'getRowId' | 'caption' | 'block'>) {
  return <ul className="site-token-list" aria-label={caption}>
    {data.map((row) => {
      const parts = block(row);
      return <li key={getRowId(row)} className="site-token">
        <div>{parts.name}</div>
        {parts.values != null && <div className="site-token-values">{parts.values}</div>}
        {parts.note != null && <div className="site-token-note">{parts.note}</div>}
      </li>;
    })}
  </ul>;
}

/** 덩어리 안 '라벨 값' 한 조각(예: 라이트 ■ #FFFFFF). */
export function TokenValue({ label, children }: { label?: string; children: React.ReactNode }) {
  return <span className="site-token-value">
    {label && <span className="site-token-label">{label}</span>}
    {children}
  </span>;
}
