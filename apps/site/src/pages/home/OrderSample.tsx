import * as React from 'react';
import { Link } from 'react-router';
import {
  Checkbox, DataTable, FilterBar, Label, SectionHeader, SideNav, SideNavGroup, SideNavItem, StatusChip,
  createDataTableColumnHelper, type FilterBarFilter,
} from '@s2life/ui';
import { Package, Table2 } from '@s2life/ui/icons';
import { findComponent } from '../../data/manifest';
import { homeSample, type SampleOrder } from '../../content/home';

/** 첫 화면이 부르는 부품 이름은 매니페스트에 있어야 한다 — 없으면 렌더가 멈춘다(지어낸 부품을 싣지 않는다). */
export function componentName(name: string) {
  if (!findComponent(name)) throw new Error(`첫 화면이 매니페스트에 없는 부품 '${name}' 을 가리킨다`);
  return name;
}

const won = (value: number) => `${value.toLocaleString('ko-KR')}원`;

const helper = createDataTableColumnHelper<SampleOrder>();
const idColumn = helper.accessor('id', { header: homeSample.columns.id, cell: (cell) => <span className="tabular site-home-order-id">{cell.getValue()}</span> });
const recipientColumn = helper.accessor('recipient', { header: homeSample.columns.recipient });
const amountColumn = helper.accessor('amount', { header: homeSample.columns.amount, cell: (cell) => <span className="tabular">{won(cell.getValue())}</span> });
const statusColumn = helper.accessor('status', {
  header: homeSample.columns.status,
  cell: (cell) => {
    const status = homeSample.status[cell.getValue()];
    return <StatusChip tone={status.tone}>{status.label}</StatusChip>;
  },
});
const wideColumns = helper.columns([idColumn, recipientColumn, amountColumn, statusColumn]);
const narrowColumns = helper.columns([idColumn, amountColumn, statusColumn]);
/**
 * 표본이 이 폭보다 좁으면 사이드 메뉴(레일)와 수취인 열을 뺀다(시안 390 과 같은 모양). 화면 폭이 아니라 표본 폭으로 정한다 —
 * 두 단 배치(901~1180px)에서도 표본이 좁아진다. 4열 표(열 최소 폭: 글자 80·금액 140 토큰 + 상태 칩) + 레일 64 + 여백의 실측 최소 553px(1440, 맥 Chrome).
 */
const FULL_SAMPLE_MIN = 560;

function useCompact(ref: React.RefObject<HTMLElement | null>) {
  const [compact, setCompact] = React.useState(false);
  React.useLayoutEffect(() => {
    const target = ref.current;
    if (!target) return;
    const measure = () => setCompact(target.getBoundingClientRect().width < FULL_SAMPLE_MIN);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    return () => observer.disconnect();
  }, [ref]);
  return compact;
}

/**
 * 첫 화면의 실물 표본 — @s2life/ui 부품 그대로(평면). 효과(번짐·격자)는 이 뒤 배경 층에만 있다.
 * 검색·필터·정렬은 실제로 동작한다. 좁으면 사이드 메뉴와 수취인 열을 빼고 본문만 둔다(시안 390).
 * 그래도 넘치면(390 — 금액 칸 최소 140px, DESIGN.md 4절) 표는 부품 그대로 가로로 밀리고 상태 열이 오른쪽에 고정된다.
 */
export function OrderSample() {
  const frame = React.useRef<HTMLDivElement>(null);
  const narrow = useCompact(frame);
  const [query, setQuery] = React.useState('');
  const [readyOnly, setReadyOnly] = React.useState(false);
  const rows = React.useMemo(() => {
    const text = query.trim();
    return homeSample.rows.filter((row) => (!readyOnly || row.status === 'ready') && (!text || `${row.id}${row.recipient}`.includes(text)));
  }, [query, readyOnly]);
  const filters: FilterBarFilter[] = readyOnly ? [homeSample.readyFilter] : [];
  const checkboxId = React.useId();

  const body = <div className="site-home-sample-main">
    <SectionHeader title={homeSample.title}>
      <div className="site-home-sample-stack">
        <FilterBar searchLabel={homeSample.searchLabel} searchPlaceholder={homeSample.searchPlaceholder}
          query={query} onQueryChange={setQuery}
          filters={filters} onFiltersChange={(next) => setReadyOnly(next.length > 0)}
          filterContent={<div className="site-row">
            <Checkbox id={checkboxId} checked={readyOnly} onChange={(event) => setReadyOnly(event.target.checked)} />
            <Label htmlFor={checkboxId}>{homeSample.readyOnly}</Label>
          </div>} />
        <DataTable data={rows} columns={narrow ? narrowColumns : wideColumns} getRowId={(row) => row.id}
          pinnedEnd={['status']} align={{ amount: 'end' }} caption={homeSample.title} />
      </div>
    </SectionHeader>
  </div>;

  return <div ref={frame} className="site-home-sample" data-compact={narrow}>
    <div className="site-home-sample-head">
      <span className="site-home-sample-app"><Table2 aria-hidden="true" />{homeSample.app}</span>
      <span className="site-home-sample-parts">
        {homeSample.partLinks.map((name, i) => <React.Fragment key={name}>
          {i > 0 && ' · '}
          <Link className="site-link" to={`/components/${componentName(name)}`}>{name}</Link>
        </React.Fragment>)}
        {homeSample.partLinksSuffix}
      </span>
    </div>
    {narrow ? body : <div className="site-home-sample-body">
      <SideNav aria-label="예시 메뉴" brand={homeSample.app} brandIcon={<Package />} defaultCollapsed>
        <SideNavGroup label={homeSample.menuGroup}>
          <SideNavItem icon={<Table2 />} label={homeSample.title} current href="#order-demo" />
          <SideNavItem icon={<Package />} label={homeSample.otherMenu} disabled />
        </SideNavGroup>
      </SideNav>
      {body}
    </div>}
  </div>;
}
