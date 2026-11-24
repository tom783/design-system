import { Link } from 'react-router';
import { Card, PageHeader, SectionHeader } from '@s2life/ui';
import { categoryGroups, componentCount, components, type Component } from '../../data/manifest';

function ComponentCard({ component }: { component: Component }) {
  return <Link to={`/components/${component.name}`} className="site-card-link">
    <Card>
      <div className="site-card-body">
        <span className="site-card-title">{component.name}</span>
        <span className="site-muted">{component.purpose}</span>
      </div>
    </Card>
  </Link>;
}

/** 부품 목록 — 매니페스트 category 로 묶은 카드. 실제 렌더 썸네일은 다음 단계. */
export function ComponentListPage() {
  const groups = categoryGroups();
  return <div className="site-page">
    <PageHeader title="부품" description={<span className="tabular">부품 {componentCount}개 · 부분까지 공개 이름 {components.length}개 — packages/mcp/manifest.json</span>} />
    {groups.map((group) => <SectionHeader key={group.category} title={group.category} count={group.components.length}>
      <div className="site-card-grid">
        {group.components.map((component) => <ComponentCard key={component.name} component={component} />)}
      </div>
    </SectionHeader>)}
  </div>;
}
