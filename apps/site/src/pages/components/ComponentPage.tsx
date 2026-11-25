import * as React from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
  Combobox, DataTable, EmptyState, PageHeader, SectionHeader, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Skeleton, StatusChip, Tabs, TabsContent, TabsList, TabsTrigger, createDataTableColumnHelper,
} from '@s2life/ui';
import meta from 'virtual:site-meta';
import { CodeBlock } from '../../blocks/CodeBlock';
import { DesignLink } from '../../blocks/Text';
import { DocLayout, type TocItem } from '../../blocks/Toc';
import { categoryName } from '../../content/categories';
import { findComponent, importLine, manifest, pageFor, partsOf, type Component } from '../../data/manifest';
import { storyFilesFor, type StoryFile } from '../../stories/load';
import { StoryExample, storiesOf, type StoryEntry } from '../../stories/render';

/**
 * 부품 페이지 — 정의 · 실제 미리보기(두 탭 공통) · 가이드/코드 탭 · 오른쪽 목차(오너 결정: A 가이드/코드 탭).
 * 섹션 목록은 데이터 하나(guideSections·codeSections)에서 본문과 목차를 함께 만든다.
 */

function List({ items }: { items: readonly React.ReactNode[] }) {
  return <ul className="site-list">{items.map((item, i) => <li key={i}>{item}</li>)}</ul>;
}

/** `DESIGN.md 11.8` → 그 절로 가는 링크 `DESIGN.md 11.8 여러 단계 폼 — Steps (R43)`. 절 이름·앵커는 DESIGN.md 제목에서 읽는다. */
function RuleSource({ source }: { source: string }) {
  const prefix = manifest.derived.ruleSourcePrefix;
  const number = source.startsWith(prefix) ? source.slice(prefix.length) : null;
  if (number && meta.designSections[number]) return <span className="site-caption"><DesignLink section={number} /></span>;
  return <span className="site-caption">{source}</span>;
}

function ComponentLink({ name }: { name: string }) {
  const page = pageFor(name);
  if (!page) return <code className="site-code">{name}</code>;
  const to = page.name === name ? `/components/${name}` : `/components/${page.name}?tab=code#part-${name}`;
  return <Link className="site-link" to={to}>{name}</Link>;
}

interface Section {
  id: string;
  title: string;
  count?: number;
  description?: React.ReactNode;
  content: React.ReactNode;
}

function guideSections(component: Component, parts: Component[]): Section[] {
  const sections: Section[] = [];
  if (component.useWhen?.length) sections.push({ id: 'use', title: '쓰는 때', content: <List items={component.useWhen} /> });
  if (component.dont?.length) sections.push({ id: 'dont', title: '쓰지 말 것', content: <List items={component.dont} /> });
  if (component.rules?.length) {
    sections.push({
      id: 'rules', title: '규칙', count: component.rules.length,
      content: <List items={component.rules.map((rule) => <span className="site-stack-sm"><span>{rule.text}</span><RuleSource source={rule.source} /></span>)} />,
    });
  }
  if (parts.length) {
    sections.push({
      id: 'parts', title: '부분', count: parts.length,
      content: <List items={parts.map((part) => <span><ComponentLink name={part.name} /> — {part.purpose}</span>)} />,
    });
  }
  if (component.related?.length) {
    sections.push({ id: 'related', title: '관련 부품', content: <div className="site-row">{component.related.map((name) => <ComponentLink key={name} name={name} />)}</div> });
  }
  if (component.keywords?.length) {
    sections.push({ id: 'keywords', title: '찾는 말', description: 'MCP which_component 가 맞춰 보는 낱말', content: <p className="site-muted">{component.keywords.join(' · ')}</p> });
  }
  return sections;
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

function codeSections(component: Component, parts: Component[]): Section[] {
  const names = [component.name, ...parts.map((part) => part.name)];
  return [
    { id: 'import', title: '가져오기', content: <CodeBlock label="tsx" code={importLine(names)} /> },
    { id: 'props', title: 'Props', content: <ApiOf component={component} /> },
    ...parts.map((part) => ({ id: `part-${part.name}`, title: part.name, description: part.purpose, content: <ApiOf component={part} /> })),
  ];
}

function Sections({ sections, empty }: { sections: Section[]; empty: React.ReactNode }) {
  if (!sections.length) return <>{empty}</>;
  return <div className="site-page">
    {sections.map((section) => <SectionHeader key={section.id} id={section.id} as="h3" title={section.title} count={section.count} description={section.description}>
      {section.content}
    </SectionHeader>)}
  </div>;
}

function useStoryFiles(names: readonly string[]) {
  const [state, setState] = React.useState<{ files: StoryFile[]; failed: { file: string; error: string }[] } | null>(null);
  const key = names.join(',');
  React.useEffect(() => {
    let live = true;
    setState(null);
    storyFilesFor(names).then((result) => { if (live) setState(result); });
    return () => { live = false; };
    // names 는 key(이름 목록)로 비교한다 — 배열 정체성은 렌더마다 바뀐다.
  }, [key]);
  return state;
}

/** 20개 넘으면 Combobox(Select 쓰지 말 것: 20개 초과) — 입력·표처럼 예시가 많은 부품. */
const SELECT_MAX = 20;

function ExamplePicker({ entries, value, onChange, multiFile }: {
  entries: { file: StoryFile; entry: StoryEntry }[]; value: string; onChange: (id: string) => void; multiFile: boolean;
}) {
  const label = (item: { file: StoryFile; entry: StoryEntry }) => multiFile ? `${item.file.file.replace(/\.stories\.tsx$/, '')} · ${item.entry.name}` : item.entry.name;
  if (entries.length > SELECT_MAX) {
    return <Combobox aria-label="예시" className="site-example-picker" value={value} onValueChange={(next: string) => { if (next) onChange(next); }}
      options={entries.map((item) => ({ value: item.entry.id, label: label(item) }))}
      placeholder="예시 고르기" searchPlaceholder="예시 이름으로 찾기" emptyText="맞는 예시가 없다" />;
  }
  return <Select value={value} onValueChange={onChange}>
    <SelectTrigger aria-label="예시" className="site-example-picker"><SelectValue /></SelectTrigger>
    <SelectContent>{entries.map((item) => <SelectItem key={item.entry.id} value={item.entry.id}>{label(item)}</SelectItem>)}</SelectContent>
  </Select>;
}

/**
 * 실제 미리보기 — 이 부품을 `parameters.manifest` 로 선언한 스토리를 하나씩 그대로 렌더한다(처음 상태만, play 는 돌리지 않는다).
 * 고른 예시는 주소(?example=)에 둔다 — 탭을 바꿔도 같은 미리보기가 남고, 링크로 그 예시를 연다.
 */
function Preview({ names }: { names: readonly string[] }) {
  const state = useStoryFiles(names);
  const [search, setSearch] = useSearchParams();
  const entries = React.useMemo(() => state?.files.flatMap((file) => storiesOf(file).map((entry) => ({ file, entry }))) ?? [], [state]);
  const index = Math.max(0, entries.findIndex((item) => item.entry.id === search.get('example')));
  const current = entries[index];
  const choose = (id: string) => setSearch((prev) => {
    const next = new URLSearchParams(prev);
    if (id === entries[0]?.entry.id) next.delete('example'); else next.set('example', id);
    return next;
  }, { replace: true, preventScrollReset: true });
  return <SectionHeader id="preview" title="실제 미리보기"
    description={current ? <span className="tabular">packages/ui/src/stories/{current.file.file} · 예시 {index + 1}/{entries.length}</span> : undefined}
    control={entries.length > 1 && current
      ? <ExamplePicker entries={entries} value={current.entry.id} onChange={choose} multiFile={(state?.files.length ?? 0) > 1} />
      : undefined}>
    {!state ? <Skeleton variant="block" height="var(--space-64)" /> : <div className="site-stack">
      {state.failed.length > 0 && <p role="alert" className="site-example-error">
        스토리 파일을 불러오지 못했다: {state.failed.map((item) => `${item.file} (${item.error})`).join(', ')}
      </p>}
      {current
        ? <StoryExample key={current.entry.id} entry={current.entry} eager />
        : <p className="site-muted">이 부품을 선언한 스토리가 없다(parameters.manifest).</p>}
    </div>}
  </SectionHeader>;
}

/** npm 게시판에 이 부품이 있는지 — 게시판 태그의 매니페스트로 판정한다(vite.config.ts siteMeta). */
function NpmStatus({ name }: { name: string }) {
  const published = meta.published;
  if (!published) return <StatusChip tone="warning">npm 게시판 없음</StatusChip>;
  if (!published.components) {
    return <span title={`태그 v${published.version} 을 읽지 못했다(얕은 클론 등)`}><StatusChip tone="neutral">npm {published.version} 확인 불가</StatusChip></span>;
  }
  return published.components.includes(name)
    ? <StatusChip tone="neutral">npm {published.version}에 있음</StatusChip>
    : <StatusChip tone="warning">npm {published.version}에 없음 — 아직 게시되지 않음</StatusChip>;
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
  const guide = guideSections(component, parts);
  const code = codeSections(component, parts);
  const toc: TocItem[] = [
    { id: 'preview', label: '실제 미리보기' },
    ...(tab === 'guide' ? guide : code).map((section) => ({ id: section.id, label: section.title })),
  ];
  return <DocLayout toc={toc}>
    <PageHeader title={component.name} description={component.purpose} status={<NpmStatus name={component.name} />} breadcrumb={
      <Breadcrumb><BreadcrumbList>
        <BreadcrumbItem><BreadcrumbLink asChild><Link to="/components">부품</Link></BreadcrumbLink></BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem><BreadcrumbPage>{component.category && categoryName(component.category)}</BreadcrumbPage></BreadcrumbItem>
      </BreadcrumbList></Breadcrumb>
    } />
    <Preview key={component.name} names={[component.name, ...parts.map((part) => part.name)]} />
    <Tabs value={tab} onValueChange={(next) => {
      const params = new URLSearchParams(search);
      if (next === 'code') params.set('tab', 'code'); else params.delete('tab');
      const query = params.toString();
      navigate({ search: query ? `?${query}` : '', hash: '' }, { replace: true, preventScrollReset: true });
    }}>
      <TabsList>
        <TabsTrigger value="guide">가이드</TabsTrigger>
        <TabsTrigger value="code">코드</TabsTrigger>
      </TabsList>
      <TabsContent value="guide">
        <Sections sections={guide} empty={<EmptyState title="가이드 없음" description="매니페스트에 쓰는 때·쓰지 말 것·규칙이 없다." />} />
      </TabsContent>
      <TabsContent value="code"><Sections sections={code} empty={null} /></TabsContent>
    </Tabs>
  </DocLayout>;
}
