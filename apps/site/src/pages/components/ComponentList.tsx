import * as React from 'react';
import { Link } from 'react-router';
import { Button, Card, PageHeader } from '@s2life/ui';
import { categoryGroups, componentCount, components, type CategoryGroup, type Component } from '../../data/manifest';
import { categoryName, hasCategoryName } from '../../content/categories';
import { useMediaQuery } from '../../blocks/useMediaQuery';

const categoryId = (category: string) => `category-${category}`;

/** 이 폭 이하에서는 카드를 두 열 작은 칸으로 압축한다(site.css 같은 경계, 검수 r1 — 390 페이지 높이 7,880 → 4,000px 이하). */
const COMPACT = '(max-width: 600px)';

/**
 * 부품 카드. 좁은 폭에서는 Card 대신 작은 링크 칸 — Card 는 최소 폭(--card-min-w 240px)이 있어 390 에서 두 열이 들어가지 않고,
 * 한 열 카드로는 60개가 4,000px 안에 들지 않는다. 칸은 Card 와 같은 선·모서리·바탕 토큰이고, 설명은 두 줄 말줄임이다
 * (보이는 줄만 자른다 — 글은 DOM 에 다 있어 화면 낭독기는 끝까지 읽는다).
 */
function ComponentCard({ component, compact }: { component: Component; compact: boolean }) {
  const body = <>
    <span className="site-card-title">{component.name}</span>
    <span className="site-muted site-component-purpose">{component.purpose}</span>
  </>;
  if (compact) return <Link to={`/components/${component.name}`} className="site-component-tile">{body}</Link>;
  return <Link to={`/components/${component.name}`} className="site-card-link">
    <Card><div className="site-card-body">{body}</div></Card>
  </Link>;
}

/**
 * 분류 제목 — 한국어 이름(title-sm h2) + 영어 category(caption·tertiary) + 개수. 예 "배치 layout 5".
 * SectionHeader 의 title 은 글자(string)만 받아 영어 키를 제목 줄에 작게 넣을 수 없다 — 같은 크기·개수 모양을 사이트 클래스로 둔다.
 * 영어 키·개수는 inline-block 이라 접근 이름이 '배치 layout 5'로 끊어 읽힌다(인라인 span 은 앞 글자와 붙는다).
 */
function CategorySection({ group, compact }: { group: CategoryGroup; compact: boolean }) {
  const headingId = `${React.useId()}-title`;
  return <section id={categoryId(group.category)} className="site-category" aria-labelledby={headingId}>
    <h2 id={headingId} className="site-category-title">
      {categoryName(group.category)}
      {hasCategoryName(group.category) && <>{' '}<span className="site-category-key">{group.category}</span></>}
      <span className="site-category-count tabular">{group.components.length}</span>
    </h2>
    <div className="site-card-grid site-component-grid">
      {group.components.map((component) => <ComponentCard key={component.name} component={component} compact={compact} />)}
    </div>
  </section>;
}

/** 부품 목록 — 매니페스트 category 로 묶은 카드(상수 제외). 실제 렌더 썸네일은 다음 단계. */
export function ComponentListPage() {
  const groups = categoryGroups();
  const compact = useMediaQuery(COMPACT);
  return <div className="site-page site-component-list">
    <PageHeader title="부품" description={<span className="tabular">부품 {componentCount}개 · 부분까지 공개 이름 {components.length}개 — packages/mcp/manifest.json</span>} />
    {/* 분류 바로가기 — 좁은 폭(600px 이하)에서만 보인다. 넘치면 이 줄만 가로로 민다(링크에 Tab 이 가면 브라우저가 보이게 옮긴다). */}
    <nav className="site-chip-row" aria-label="분류 바로가기">
      {groups.map((group) => <Button key={group.category} asChild size="sm" variant="secondary">
        <Link to={{ hash: categoryId(group.category) }}>{categoryName(group.category)}</Link>
      </Button>)}
    </nav>
    {groups.map((group) => <CategorySection key={group.category} group={group} compact={compact} />)}
  </div>;
}
