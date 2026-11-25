import type { ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, PageHeader } from '@s2life/ui';
import { tokens } from '../../data/tokens';
import { SectionNavButton } from '../../layout/SectionNav';
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

/**
 * 파운데이션 — 절(색·활자·간격·치수·형태·모션)은 왼쪽 섹션 목록(사이트 틀 A, 좁으면 '파운데이션 목록' Sheet)이 고른다.
 * 페이지 머리는 부품 페이지처럼 빵부스러기(파운데이션) + 절 이름.
 */
export function FoundationsPage() {
  const { section } = useParams();
  const current = foundationSections.find((item) => item.slug === section);
  if (!current) return <Navigate to={`/foundations/${foundationSections[0].slug}`} replace />;
  const View = VIEWS[current.slug];
  return <div className="site-page">
    <PageHeader title={current.label}
      description={<span className="tabular">tokens.json · 생성 {tokens.generatedAt}</span>}
      breadcrumb={<>
        <Breadcrumb><BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink asChild><Link to={`/foundations/${foundationSections[0].slug}`}>파운데이션</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{current.label}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList></Breadcrumb>
        <SectionNavButton />
      </>} />
    <View />
  </div>;
}
