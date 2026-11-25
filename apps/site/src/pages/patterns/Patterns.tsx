import * as React from 'react';
import { Link, useParams } from 'react-router';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
  EmptyState, PageHeader, SectionHeader, Skeleton,
} from '@s2life/ui';
import { PATTERN_INTRO, partsUsed, patterns, type Pattern } from '../../content/patterns';
import type { Component } from '../../data/manifest';
import { loadStoryFile, type StoryFile } from '../../stories/load';
import { SectionNavButton } from '../../layout/SectionNav';
import { ScreenStage, StoryExample, storiesOf, useNearViewport, useScreenFit } from '../../stories/render';

/**
 * 패턴 — 부품을 한 화면에 조합한 예시(조립 화면 스토리 screens-*.stories.tsx). 특정 제품 화면의 규칙이 아니라 조합 예시로 소개한다(오너 결정 11/25).
 * 첫 페이지: 2열 카드 — 실제 렌더(축소) · 한국어 이름 · 쓰인 부품 칩. 카드의 링크는 하나(이름)이고 카드 전체가 그 링크다.
 * 상세: 그 스토리 파일의 예시를 모두 실제 크기 틀에 그대로 렌더한다.
 */
function useStoryFile(name: string | undefined) {
  const [file, setFile] = React.useState<StoryFile | null | undefined>(undefined);
  React.useEffect(() => {
    let live = true;
    setFile(undefined);
    if (name) loadStoryFile(name).then((loaded) => { if (live) setFile(loaded); });
    return () => { live = false; };
  }, [name]);
  return file;
}

/**
 * 카드의 축소 렌더 — 화면 스토리의 첫 예시(대표)를 1440px 폭 틀에 실제 부품으로 그린 뒤 transform 으로 줄인다(stories/screen.ts — 부품 페이지
 * 셸 예시와 같은 코드). 그림 칸(16:10)을 빈틈없이 채우는 배율: 폭 기준(칸 폭 / 1440)과 높이 기준(칸 높이 / 화면 높이) 중 큰 쪽 — 화면 높이가
 * 900 보다 낮으면(AppShell 은 창 높이를 채운다) 높이 기준으로 맞추고 오른쪽이 잘린다. 카드는 최소 배율 없이 칸에 맞춘다.
 * 장식이다: 포인터·포커스 차단(inert)·접근성 트리에서 숨김(aria-hidden). 화면에 가까워질 때 그린다.
 */
function PatternThumb({ pattern }: { pattern: Pattern }) {
  const [box, near] = useNearViewport<HTMLDivElement>(false);
  const stage = React.useRef<HTMLDivElement>(null);
  const file = useStoryFile(near ? pattern.file : undefined);
  const entry = file ? storiesOf(file)[0] : undefined;
  const fit = useScreenFit(box, stage, entry);
  return <div ref={box} className="site-pattern-thumb" aria-hidden="true" inert>
    {entry ? <ScreenStage entry={entry} stageRef={stage} scale={fit?.scale ?? 0} /> : <Skeleton variant="block" height="100%" />}
  </div>;
}

function PartChips({ parts, links = false }: { parts: Component[]; links?: boolean }) {
  return <ul className="site-part-list" aria-label="쓰인 부품">
    {parts.map((part) => <li key={part.name}>
      {links ? <Link className="site-part site-part-link" to={`/components/${part.name}`}>{part.name}</Link>
        : <span className="site-part">{part.name}</span>}
    </li>)}
  </ul>;
}

function PatternCard({ pattern }: { pattern: Pattern }) {
  const parts = partsUsed(pattern);
  return <li className="site-pattern-card">
    <PatternThumb pattern={pattern} />
    <div className="site-pattern-body">
      <h2 className="site-pattern-name"><Link className="site-pattern-link" to={`/patterns/${pattern.slug}`}>{pattern.name}</Link></h2>
      <PartChips parts={parts} />
    </div>
  </li>;
}

function PatternList() {
  return <div className="site-page">
    <PageHeader title="패턴" description={PATTERN_INTRO} />
    <ul className="site-pattern-grid" aria-label={`패턴 ${patterns.length}개`}>
      {patterns.map((pattern) => <PatternCard key={pattern.file} pattern={pattern} />)}
    </ul>
  </div>;
}

function PatternDetail({ pattern }: { pattern: Pattern }) {
  const file = useStoryFile(pattern.file);
  const parts = partsUsed(pattern);
  const entries = file ? storiesOf(file) : [];
  return <div className="site-page">
    <PageHeader title={pattern.name} description={PATTERN_INTRO} breadcrumb={<>
      <Breadcrumb><BreadcrumbList>
        <BreadcrumbItem><BreadcrumbLink asChild><Link to="/patterns">패턴</Link></BreadcrumbLink></BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem><BreadcrumbPage>{pattern.name}</BreadcrumbPage></BreadcrumbItem>
      </BreadcrumbList></Breadcrumb>
      <SectionNavButton />
    </>} />
    <SectionHeader title="쓰인 부품" count={parts.length} description={`packages/ui/src/stories/${pattern.file} 와 그 도우미가 가져오는 부품`}>
      <PartChips parts={parts} links />
    </SectionHeader>
    <SectionHeader title="예시" count={file ? entries.length : undefined}>
      {file === undefined ? <Skeleton variant="block" height="var(--space-64)" />
        : file === null ? <EmptyState title="없는 화면" description={`${pattern.file} 가 없다.`} />
        : <div className="site-stack">
          {entries.map((entry, i) => <StoryExample key={entry.id} entry={entry} eager={i === 0} frame="screen" />)}
        </div>}
    </SectionHeader>
  </div>;
}

export function PatternsPage() {
  const { screen } = useParams();
  if (!screen) return <PatternList />;
  const pattern = patterns.find((item) => item.slug === screen);
  if (!pattern) return <EmptyState title="없는 패턴" description={`${screen}.stories.tsx 가 없다.`} />;
  return <PatternDetail pattern={pattern} />;
}
