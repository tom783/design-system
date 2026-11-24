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
const tightColumns = helper.columns([amountColumn, statusColumn]);
/**
 * 표본이 이 폭보다 좁으면 사이드 메뉴(레일)와 수취인 열을 뺀다(시안 390 과 같은 모양). 화면 폭이 아니라 표본 폭으로 정한다 —
 * 두 단 배치(901~1180px)에서도 표본이 좁아진다. 4열 표(열 최소 폭: 글자 80·금액 140 토큰 + 상태 칩) + 레일 64 + 여백의 실측 최소 553px(1440, 맥 Chrome).
 */
const FULL_SAMPLE_MIN = 560;

/**
 * 좁은 표본에서 표가 쓸 수 있는 폭(표본 본문의 내용 폭)이 이보다 좁으면 주문번호도 빼고 결제 금액·상태 2열로 둔다 —
 * 600px 이하에서 표본을 화면 끝까지 펴도 넘칠 때(검수 고침 1). 금액 칸 최소 140px 는 부품 그대로 둔다.
 * 3열 표(주문번호 108 · 금액 140 · 상태 117 + 표 테두리 2)의 실측 367px(390 모바일 에뮬레이션, 맥 Chrome).
 * 390 은 화면 끝까지 펴면 374px 라 3열, 375·360 은 2열이다.
 */
const THREE_COLUMN_MIN = 368;

/** 요소의 내용 폭(안쪽 여백 제외)이 min 보다 좁은가. 요소가 다시 그려져 바뀌어도 따라가도록 요소를 상태로 받는다. */
function useContentNarrowerThan(element: HTMLElement | null, min: number) {
  const [narrower, setNarrower] = React.useState(false);
  React.useLayoutEffect(() => {
    if (!element) return;
    const measure = () => {
      const style = getComputedStyle(element);
      setNarrower(element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) < min);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, min]);
  return narrower;
}

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
 * 600px 이하에선 표본이 화면 끝까지 펴져 390 에서도 3열이 가로 스크롤 없이 들어간다(금액 칸 최소 140px, DESIGN.md 4절 — 그대로).
 * 그보다 좁아 3열이 넘치면 주문번호도 빼고 결제 금액·상태 2열로 둔다(검수 고침 1).
 */
export function OrderSample() {
  const frame = React.useRef<HTMLDivElement>(null);
  const narrow = useCompact(frame);
  // 표본 본문은 좁고 넓음에 따라 다른 자리에 다시 그려진다 — ref 객체 대신 요소를 상태로 받아 새 요소를 잰다.
  const [main, setMain] = React.useState<HTMLDivElement | null>(null);
  const tight = useContentNarrowerThan(main, THREE_COLUMN_MIN);
  const [query, setQuery] = React.useState('');
  const [readyOnly, setReadyOnly] = React.useState(false);
  const rows = React.useMemo(() => {
    const text = query.trim();
    return homeSample.rows.filter((row) => (!readyOnly || row.status === 'ready') && (!text || `${row.id}${row.recipient}`.includes(text)));
  }, [query, readyOnly]);
  const filters: FilterBarFilter[] = readyOnly ? [homeSample.readyFilter] : [];
  const checkboxId = React.useId();

  const body = <div ref={setMain} className="site-home-sample-main">
    <SectionHeader title={homeSample.title}>
      <div className="site-home-sample-stack">
        <FilterBar searchLabel={homeSample.searchLabel} searchPlaceholder={homeSample.searchPlaceholder}
          query={query} onQueryChange={setQuery}
          filters={filters} onFiltersChange={(next) => setReadyOnly(next.length > 0)}
          filterContent={<div className="site-row">
            <Checkbox id={checkboxId} checked={readyOnly} onChange={(event) => setReadyOnly(event.target.checked)} />
            <Label htmlFor={checkboxId}>{homeSample.readyOnly}</Label>
          </div>} />
        <DataTable data={rows} columns={!narrow ? wideColumns : tight ? tightColumns : narrowColumns} getRowId={(row) => row.id}
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
