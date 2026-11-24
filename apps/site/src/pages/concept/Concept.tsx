import { DataTable, DescriptionList, PageHeader, SectionHeader, createDataTableColumnHelper } from '@s2life/ui';
import { DocLayout, type TocItem } from '../../blocks/Toc';
import { Rich, Sources } from '../../blocks/Text';
import { boundary, character, conceptHead, decisions, principles, type BoundaryRow, type DecisionRow } from '../../content/concept';

// 행이 몇 개 안 되는 표라 정렬을 달지 않는다(DataTable 쓰지 말 것: 5행 이하 표에 정렬).
const boundaryHelper = createDataTableColumnHelper<BoundaryRow>();
const boundaryColumns = boundaryHelper.columns([
  boundaryHelper.accessor('decides', { header: boundary.headers.decides, enableSorting: false, cell: (cell) => <Rich text={cell.getValue()} /> }),
  boundaryHelper.accessor('leaves', { header: boundary.headers.leaves, enableSorting: false, cell: (cell) => <Rich text={cell.getValue()} /> }),
]);

/** 정한다 / 정하지 않는다 표 — 컨셉 페이지와 시작하기가 함께 쓴다. */
export function BoundaryTable() {
  return <div className="site-stack">
    <DataTable data={boundary.rows} columns={boundaryColumns} getRowId={(row) => row.decides} caption={boundary.title} />
    <p><Rich text={boundary.note} /></p>
    <Sources items={boundary.sources} />
  </div>;
}

const decisionHelper = createDataTableColumnHelper<DecisionRow>();
const decisionColumns = decisionHelper.columns([
  decisionHelper.accessor('topic', { header: decisions.headers.topic, enableSorting: false }),
  decisionHelper.accessor('chosen', { header: decisions.headers.chosen, enableSorting: false, cell: (cell) => <Rich text={cell.getValue()} /> }),
  decisionHelper.accessor('rejected', { header: decisions.headers.rejected, enableSorting: false, cell: (cell) => <Rich text={cell.getValue()} /> }),
]);

const principleTitle = (index: number) => `${index + 1}. ${principles[index]!.name}`;

const TOC: TocItem[] = [
  { id: 'character', label: character.title },
  { id: 'principles', label: `원칙 ${principles.length}` },
  ...principles.map((principle, i) => ({ id: `principle-${principle.id}`, label: principleTitle(i), depth: 3 as const })),
  { id: 'boundary', label: boundary.title },
  { id: 'decisions', label: '결정 기록' },
];

export function ConceptPage() {
  return <DocLayout toc={TOC}>
    <PageHeader title={conceptHead.title} description={conceptHead.summary} />
    <p className="site-lead">{conceptHead.description}</p>
    <SectionHeader id="character" title={character.title}>
      <div className="site-stack-sm">
        <p><Rich text={character.body} /></p>
        <Sources items={character.sources} />
      </div>
    </SectionHeader>
    <SectionHeader id="principles" title="원칙" count={principles.length}>
      <div className="site-page">
        {principles.map((principle, i) => <SectionHeader key={principle.id} id={`principle-${principle.id}`} as="h3" title={principleTitle(i)}>
          <div className="site-stack-sm">
            <DescriptionList labelWidth={6} items={[
              { label: '한다', value: <Rich text={principle.do} /> },
              { label: '하지 않는다', value: <Rich text={principle.dont} /> },
              { label: '왜', value: <Rich text={principle.why} /> },
            ]} />
            <Sources items={principle.sources} />
          </div>
        </SectionHeader>)}
      </div>
    </SectionHeader>
    <SectionHeader id="boundary" title={boundary.title}>
      <BoundaryTable />
    </SectionHeader>
    <SectionHeader id="decisions" title={decisions.title}>
      <DataTable data={decisions.rows} columns={decisionColumns} getRowId={(row) => row.topic} caption="결정 기록 — 고른 것과 버린 것" />
    </SectionHeader>
  </DocLayout>;
}
