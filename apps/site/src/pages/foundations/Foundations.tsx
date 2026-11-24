import type { ReactNode } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { PageHeader, SegmentedControl } from '@s2life/ui';
import { tokens } from '../../data/tokens';
import { foundationSections, type FoundationSlug } from './sections';
import { ColorFoundation } from './Color';
import { MotionFoundation, ShapeFoundation, SpacingFoundation, TypographyFoundation } from './Scales';

const VIEWS: Record<FoundationSlug, () => ReactNode> = {
  color: ColorFoundation,
  typography: TypographyFoundation,
  spacing: SpacingFoundation,
  shape: ShapeFoundation,
  motion: MotionFoundation,
};

export function FoundationsPage() {
  const { section } = useParams();
  const navigate = useNavigate();
  const current = foundationSections.find((item) => item.slug === section);
  if (!current) return <Navigate to={`/foundations/${foundationSections[0].slug}`} replace />;
  const View = VIEWS[current.slug];
  return <div className="site-page">
    <PageHeader title="파운데이션"
      description={<span className="tabular">tokens.json · 생성 {tokens.generatedAt}</span>} />
    <SegmentedControl aria-label="파운데이션 절" value={current.slug}
      options={foundationSections.map((item) => ({ value: item.slug, label: item.label }))}
      onValueChange={(slug) => navigate(`/foundations/${slug}`)} />
    <View />
  </div>;
}
