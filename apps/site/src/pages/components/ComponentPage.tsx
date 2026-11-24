import * as React from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
  DataTable, EmptyState, PageHeader, SectionHeader, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger,
  createDataTableColumnHelper,
} from '@s2life/ui';
import meta from 'virtual:site-meta';
import { findComponent, importLine, manifest, pageFor, partsOf, type Component } from '../../data/manifest';
import { storyFilesFor, type StoryFile } from '../../stories/load';
import { StoryExample, storiesOf } from '../../stories/render';

function List({ items }: { items: readonly React.ReactNode[] }) {
  return <ul className="site-list">{items.map((item, i) => <li key={i}>{item}</li>)}</ul>;
}

/** `DESIGN.md 11.8` → `DESIGN.md 11.8 여러 단계 폼 — Steps (R43)`. 절 이름은 DESIGN.md 제목에서 읽는다. */
function RuleSource({ source }: { source: string }) {
  const prefix = manifest.derived.ruleSourcePrefix;
  const number = source.startsWith(prefix) ? source.slice(prefix.length) : null;
  const title = number ? meta.designSections[number] : undefined;
  return <span className="site-caption">{source}{title ? ` ${title}` : ''}</span>;
}

function ComponentLink({ name }: { name: string }) {
  const page = pageFor(name);
  if (!page) return <code className="site-code">{name}</code>;
  const to = page.name === name ? `/components/${name}` : `/components/${page.name}?tab=code#part-${name}`;
  return <Link className="site-link" to={to}>{name}</Link>;
}

function Guide({ component, parts }: { component: Component; parts: Component[] }) {
  const sections: React.ReactNode[] = [];
  if (component.useWhen?.length) sections.push(<SectionHeader key="use" as="h3" title="쓰는 때"><List items={component.useWhen} /></SectionHeader>);
  if (component.dont?.length) sections.push(<SectionHeader key="dont" as="h3" title="쓰지 말 것"><List items={component.dont} /></SectionHeader>);
  if (component.rules?.length) {
    sections.push(<SectionHeader key="rules" as="h3" title="규칙" count={component.rules.length}>
      <List items={component.rules.map((rule) => <span className="site-stack-sm"><span>{rule.text}</span><RuleSource source={rule.source} /></span>)} />
    </SectionHeader>);
  }
  if (parts.length) {
    sections.push(<SectionHeader key="parts" as="h3" title="부분" count={parts.length}>
      <List items={parts.map((part) => <span><ComponentLink name={part.name} /> — {part.purpose}</span>)} />
    </SectionHeader>);
  }
  if (component.related?.length) {
    sections.push(<SectionHeader key="related" as="h3" title="관련 부품">
      <div className="site-row">{component.related.map((name) => <ComponentLink key={name} name={name} />)}</div>
    </SectionHeader>);
  }
  if (component.keywords?.length) {
    sections.push(<SectionHeader key="keywords" as="h3" title="찾는 말" description="MCP which_component 가 맞춰 보는 낱말">
      <p className="site-muted">{component.keywords.join(' · ')}</p>
    </SectionHeader>);
  }
  if (!sections.length) return <EmptyState title="가이드 없음" description="매니페스트에 쓰는 때·쓰지 말 것·규칙이 없다." />;
  return <div className="site-page">{sections}</div>;
}

type Prop = Component['props'][number];
const propHelper = createDataTableColumnHelper<Prop>();
const propColumns = propHelper.columns([
  propHelper.accessor('name', { header: '이름', cell: (cell) => <code className="site-code">{cell.getValue()}</code> }),
  propHelper.accessor('type', { header: '타입', cell: (cell) => <code className="site-code">{cell.getValue()}</code> }),
  propHelper.accessor('required', { header: '필수', cell: (cell) => cell.getValue() ? '필수' : '' }),
  propHelper.accessor('doc', { header: '설명', cell: (cell) => cell.getValue() ?? '' }),
]);

function ApiOf({ component }: { component: Component }) {
  return <div className="site-stack">
    {component.props.length > 0
      ? <DataTable data={component.props} columns={propColumns} getRowId={(row) => row.name} caption={`${component.name} props`} />
      : <p className="site-muted">고유 props 없음</p>}
    {component.extends.length > 0 && <p className="site-caption">상속: {component.extends.map((base) => <code key={base} className="site-code">{base}</code>)}</p>}
    {component.slots.length > 0 && <p className="site-caption">data-slot: {component.slots.join(' · ')}</p>}
  </div>;
}

/** 이 부품을 `parameters.manifest` 로 선언한 스토리를 그대로 렌더한다. */
function Examples({ names }: { names: readonly string[] }) {
  const [state, setState] = React.useState<{ files: StoryFile[]; failed: { file: string; error: string }[] } | null>(null);
  const key = names.join(',');
  React.useEffect(() => {
    let live = true;
    setState(null);
    storyFilesFor(names).then((result) => { if (live) setState(result); });
    return () => { live = false; };
    // names 는 key(이름 목록)로 비교한다 — 배열 정체성은 렌더마다 바뀐다.
  }, [key]);
  if (!state) return <Skeleton variant="block" height="var(--space-64)" />;
  return <div className="site-stack">
    {state.failed.length > 0 && <p role="alert" className="site-example-error">
      스토리 파일을 불러오지 못했다: {state.failed.map((item) => `${item.file} (${item.error})`).join(', ')}
    </p>}
    {state.files.length === 0 && <p className="site-muted">이 부품을 선언한 스토리가 없다(parameters.manifest).</p>}
    {state.files.map((file) => {
      const entries = storiesOf(file);
      return <div key={file.file} className="site-stack">
        <p className="site-caption">packages/ui/src/stories/{file.file} · 예시 {entries.length}개</p>
        {entries.map((entry, i) => <StoryExample key={entry.id} entry={entry} eager={i === 0} />)}
      </div>;
    })}
  </div>;
}

function Code({ component, parts }: { component: Component; parts: Component[] }) {
  const names = [component.name, ...parts.map((part) => part.name)];
  return <div className="site-page">
    <SectionHeader as="h3" title="가져오기">
      <pre className="site-codeblock">{importLine(names)}</pre>
    </SectionHeader>
    <SectionHeader as="h3" title="예시" description="Storybook 스토리를 그대로 렌더한다 — 처음 상태만(play 는 돌리지 않는다).">
      <Examples names={names} />
    </SectionHeader>
    <SectionHeader as="h3" title="Props">
      <ApiOf component={component} />
    </SectionHeader>
    {parts.map((part) => <SectionHeader key={part.name} as="h3" id={`part-${part.name}`} title={part.name} description={part.purpose}>
      <ApiOf component={part} />
    </SectionHeader>)}
  </div>;
}

export function ComponentPage() {
  const { name = '' } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const component = findComponent(name);
  // 탭은 주소에 둔다(?tab=code) — 부분·검색 링크가 코드 탭의 그 자리(#part-이름)로 바로 온다.
  const tab = search.get('tab') === 'code' ? 'code' : 'guide';
  if (!component) return <EmptyState title="없는 부품" description={`매니페스트에 '${name}' 이 없다.`} />;
  if (component.partOf) {
    return <EmptyState title={`${component.name} 은 ${component.partOf} 의 부분이다`} description="부모 페이지의 코드 탭에 함께 싣는다." />;
  }
  const parts = partsOf(component.name);
  return <div className="site-page">
    <PageHeader title={component.name} description={component.purpose} breadcrumb={
      <Breadcrumb><BreadcrumbList>
        <BreadcrumbItem><BreadcrumbLink asChild><Link to="/components">부품</Link></BreadcrumbLink></BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem><BreadcrumbPage>{component.category}</BreadcrumbPage></BreadcrumbItem>
      </BreadcrumbList></Breadcrumb>
    } />
    <Tabs value={tab} onValueChange={(next) => navigate({ search: next === 'code' ? '?tab=code' : '', hash: '' }, { replace: true })}>
      <TabsList>
        <TabsTrigger value="guide">가이드</TabsTrigger>
        <TabsTrigger value="code">코드</TabsTrigger>
      </TabsList>
      <TabsContent value="guide"><Guide component={component} parts={parts} /></TabsContent>
      <TabsContent value="code"><Code component={component} parts={parts} /></TabsContent>
    </Tabs>
  </div>;
}
