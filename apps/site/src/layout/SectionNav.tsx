import * as React from 'react';
import { Link, useLocation } from 'react-router';
import { Button, Dialog, DialogHeader, DialogTitle, DialogTrigger, SheetBody, SheetContent } from '@s2life/ui';
import { Blocks, LayoutTemplate, Palette, type LucideIcon } from '@s2life/ui/icons';
import { categoryGroups } from '../data/manifest';
import { categoryName } from '../content/categories';
import { patterns } from '../content/patterns';
import { foundationSections } from '../pages/foundations/sections';
import { useMediaQuery } from '../blocks/useMediaQuery';
import { FRAME_NARROW } from './SiteBar';

/**
 * 섹션 안 목록 — 문서 페이지 왼쪽(오너 결정 11/25 사이트 틀 A · 디자인 총괄 확정 '부품 페이지 A'와 같은 모양).
 * 상단 바가 섹션(부품·파운데이션·패턴…)을 고르고, 왼쪽은 그 섹션 안의 목록만 싣는다. 목록이 없는 섹션(시작하기 등 한 페이지)은 왼쪽이 없다.
 * 1023px 이하는 왼쪽 열 대신 빵부스러기 아래 '<섹션> 목록' 단추가 같은 목록을 왼쪽 Sheet 로 연다(확정안 390 — '부품 목록' Sheet).
 * 목록 항목은 데이터에서 만든다 — 부품은 매니페스트(분류 순서는 content/categories.ts), 파운데이션은 절 정의, 패턴은 content/patterns.ts.
 */
interface NavItem { to: string; label: string }
interface NavGroup { label?: string; items: NavItem[] }
/** overview: 섹션 첫 페이지(목록·카드)로 가는 항목 이름 — 파운데이션은 첫 페이지가 따로 없다(색으로 간다). */
interface Section { root: string; title: string; Icon: LucideIcon; overview?: string; groups: NavGroup[] }

function sectionFor(pathname: string): Section | null {
  if (pathname === '/components' || pathname.startsWith('/components/')) {
    return {
      root: '/components', title: '부품 목록', Icon: Blocks, overview: '전체 부품',
      groups: categoryGroups().map((group) => ({
        label: categoryName(group.category),
        items: group.components.map((component) => ({ to: `/components/${component.name}`, label: component.name })),
      })),
    };
  }
  if (pathname.startsWith('/foundations')) {
    return {
      root: '/foundations', title: '파운데이션', Icon: Palette,
      groups: [{ items: foundationSections.map((section) => ({ to: `/foundations/${section.slug}`, label: section.label })) }],
    };
  }
  if (pathname === '/patterns' || pathname.startsWith('/patterns/')) {
    return {
      root: '/patterns', title: '패턴', Icon: LayoutTemplate, overview: '전체 패턴',
      groups: [{ items: patterns.map((pattern) => ({ to: `/patterns/${pattern.slug}`, label: pattern.name })) }],
    };
  }
  return null;
}

function SectionList({ section, onPick, list }: { section: Section; onPick?: () => void; list?: React.Ref<HTMLDivElement> }) {
  const { pathname } = useLocation();
  const id = React.useId();
  return <div ref={list} className="site-section-groups">
    {section.overview && <ul className="site-section-items">
      <li><Link className="site-section-link" to={section.root} aria-current={pathname === section.root ? 'page' : undefined} onClick={onPick}>{section.overview}</Link></li>
    </ul>}
    {section.groups.map((group, i) => {
      const labelId = `${id}-group-${i}`;
      return <div key={group.label ?? i} className="site-section-group" role={group.label ? 'group' : undefined}
        aria-labelledby={group.label ? labelId : undefined}>
        {group.label && <p id={labelId} className="site-section-label">{group.label}</p>}
        <ul className="site-section-items">
          {group.items.map((item) => <li key={item.to}>
            <Link className="site-section-link" to={item.to} aria-current={pathname === item.to ? 'page' : undefined} onClick={onPick}>{item.label}</Link>
          </li>)}
        </ul>
      </div>;
    })}
  </div>;
}

/** 넓은 화면(1024px 이상)의 왼쪽 열. 지금 페이지 항목이 목록 칸 안에 보이게 처음에 옮긴다(부품 60개 — 아래쪽 부품에서 와도). */
export function SectionNav() {
  const { pathname } = useLocation();
  const section = sectionFor(pathname);
  const box = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    const nav = box.current;
    const item = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !item) return;
    // 목록 칸(sticky)이 위치 기준이라 offsetTop 이 칸 안 위치다.
    const top = item.offsetTop;
    if (top < nav.scrollTop || top + item.offsetHeight > nav.scrollTop + nav.clientHeight) nav.scrollTop = top - nav.clientHeight / 3;
  }, [pathname]);
  if (!section) return null;
  return <aside className="site-section-aside">
    <nav ref={box} className="site-section-nav" aria-label={section.title}>
      <p className="site-section-head"><span className="site-section-icon"><section.Icon aria-hidden="true" /></span>{section.title}</p>
      <SectionList section={section} />
    </nav>
  </aside>;
}

/**
 * 좁은 화면(1023px 이하) — '<섹션> 목록' 단추 → 왼쪽 Sheet. 확정 '부품 페이지 A' 390 처럼 빵부스러기 바로 아래에 둔다
 * (부품·파운데이션·패턴 상세 페이지가 PageHeader breadcrumb 자리에 함께 넣는다). 섹션 첫 페이지(부품 목록·패턴 카드)는 그 자체가 목록이라 두지 않는다.
 */
export function SectionNavButton() {
  const { pathname } = useLocation();
  const section = sectionFor(pathname);
  const narrow = useMediaQuery(FRAME_NARROW);
  const [open, setOpen] = React.useState(false);
  const list = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { if (!narrow) setOpen(false); }, [narrow]);
  React.useEffect(() => { setOpen(false); }, [pathname]);
  if (!section || pathname === section.root) return null;
  const label = section.title.endsWith('목록') ? section.title : `${section.title} 목록`;
  return <div className="site-section-button">
    <Dialog open={narrow && open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" leadingIcon={<section.Icon aria-hidden="true" />}>{label}</Button></DialogTrigger>
      <SheetContent side="left" size="sm" aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          const target = list.current?.querySelector<HTMLElement>('[aria-current="page"]');
          if (target) { event.preventDefault(); target.focus(); target.scrollIntoView({ block: 'center' }); }
        }}>
        <DialogHeader><DialogTitle>{label}</DialogTitle></DialogHeader>
        <SheetBody>
          <nav aria-label={label}>
            <SectionList section={section} list={list} onPick={() => setOpen(false)} />
          </nav>
        </SheetBody>
      </SheetContent>
    </Dialog>
  </div>;
}

/** 이 경로에 섹션 목록(왼쪽 열)이 있는지 — 셸이 본문 칸 배치를 고른다. */
export function hasSectionNav(pathname: string) {
  return sectionFor(pathname) !== null;
}
