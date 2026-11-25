import type * as React from 'react';
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

/**
 * 파운데이션 토큰 표. 넓으면 DataTable, 600px 이하면 표를 가로로 밀지 않고 토큰마다 이름·값·견본을 한 묶음으로 쌓는다
 * (390 에서 1,158px 표를 356px 에 가로로 밀던 것). 검색이 오는 자리(#token-이름)는 두 모양 모두 이름 칸에 있다.
 */
export function TokenTable<T extends RowData>({ data, columns, getRowId, caption, block }: TokenTableProps<T>) {
  const narrow = useMediaQuery(TOKEN_NARROW);
  if (!narrow) return <DataTable data={data} columns={columns} getRowId={getRowId} caption={caption} />;
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
