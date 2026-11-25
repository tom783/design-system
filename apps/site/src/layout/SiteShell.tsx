import * as React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { AppShell, Combobox, SegmentedControl, SideNav, SideNavGroup, SideNavItem, type ComboboxOption } from '@s2life/ui';
import { Blocks, Bot, House, Layers, LayoutTemplate, Lightbulb, Monitor, Moon, Palette, Rocket, Sun } from '@s2life/ui/icons';
import meta from 'virtual:site-meta';
import { manifest, pageComponents, pageFor } from '../data/manifest';
import { foundationSections } from '../pages/foundations/sections';
import { useTheme, type ThemeChoice } from './theme';

/** 메뉴 — 첫 화면과 여섯 갈래. 경로가 이 접두로 시작하면 현재 위치다. */
export const MENU = [
  { to: '/', label: '첫 화면', icon: <House /> },
  { to: '/start', label: '시작하기', icon: <Rocket /> },
  { to: '/concept', label: '디자인 컨셉', icon: <Lightbulb /> },
  { to: '/foundations', label: '파운데이션', icon: <Palette /> },
  { to: '/components', label: '부품', icon: <Blocks /> },
  { to: '/patterns', label: '패턴', icon: <LayoutTemplate /> },
  { to: '/ai', label: 'AI로 쓰기', icon: <Bot /> },
] as const;

function isCurrent(pathname: string, to: string) {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
}

/** 매니페스트 토큰 이름이 어느 파운데이션 절에 있는지 — 토큰 분류(category)로 고른다. */
function foundationFor(category: string) {
  return foundationSections.find((section) => (section.tokenCategories as readonly string[]).includes(category))?.slug ?? 'color';
}

/** 검색 — 부품 이름과 토큰 이름. 데이터는 매니페스트에서, 고르면 그 페이지로 간다. */
function SiteSearch() {
  const navigate = useNavigate();
  const options = React.useMemo<ComboboxOption[]>(() => [
    ...pageComponents.map((component) => ({ value: `component:${component.name}`, label: component.name })),
    ...manifest.components.filter((component) => component.partOf)
      .map((component) => ({ value: `component:${component.name}`, label: `${component.name} (${component.partOf})` })),
    ...manifest.tokens.map((token) => ({ value: `token:${token.category}:${token.name}`, label: token.cssVariable })),
  ], []);
  const [value, setValue] = React.useState('');
  return <Combobox aria-label="부품·토큰 검색" className="site-header-search" options={options} value={value}
    placeholder="부품·토큰 검색" searchPlaceholder="이름으로 찾기" emptyText="맞는 이름이 없다"
    onValueChange={(next: string) => {
      setValue('');
      const [kind, ...rest] = next.split(':');
      if (kind === 'component') {
        const name = rest.join(':');
        const page = pageFor(name);
        if (page) navigate(page.name === name ? `/components/${page.name}` : `/components/${page.name}?tab=code#part-${name}`);
      } else if (kind === 'token') {
        const [category, name] = rest;
        navigate(`/foundations/${foundationFor(category!)}#token-${name}`);
      }
    }} />;
}

export const THEME_OPTIONS = [
  { value: 'system', label: '시스템', icon: <Monitor /> },
  { value: 'light', label: '라이트', icon: <Sun /> },
  { value: 'dark', label: '다크', icon: <Moon /> },
];

/** 상단 바 오른쪽 묶음 — 버전·변경 이력 · 테마. 상단 바는 64px 한 줄이라(AppShell) 좁으면 버전 줄은 숨는다(site.css). */
function SiteHeaderEnd() {
  const [theme, setTheme] = useTheme();
  return <>
    <div className="site-header-meta">
      <span className="tabular" title="세 패키지(tokens·ui·mcp) 공통 버전 — 이 작업 폴더 기준">
        v{meta.version}{meta.sha ? ` · ${meta.sha}${meta.dirty ? ' (수정됨)' : ''}` : ''}
      </span>
      <span className="tabular">{meta.published ? `npm 게시 ${meta.published.version}` : 'npm 게시판 없음'}</span>
      {meta.repository && <a className="site-link" href={`${meta.repository}/blob/main/CHANGELOG.md`} target="_blank" rel="noreferrer">변경 이력</a>}
    </div>
    <SegmentedControl aria-label="테마" size="sm" iconOnly options={THEME_OPTIONS} value={theme}
      onValueChange={(next) => setTheme(next as ThemeChoice)} />
  </>;
}

/** 본문은 AppShell 의 main 이 스크롤한다 — 페이지를 옮기면 맨 위로, 해시가 있으면 그 자리로. */
function useScrollOnNavigate() {
  const { pathname, hash } = useLocation();
  React.useEffect(() => {
    const main = document.querySelector<HTMLElement>('[data-slot="app-shell-main"]');
    if (hash) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target) { target.scrollIntoView(); return; }
    }
    main?.scrollTo(0, 0);
  }, [pathname, hash]);
}

export function SiteShell() {
  const { pathname } = useLocation();
  useScrollOnNavigate();
  return <AppShell narrowNavigation="drawer" contentMaxWidth={1120} header={<SiteSearch />} headerEnd={<SiteHeaderEnd />} sidebar={
    <SideNav brand="@s2life 디자인 시스템" brandIcon={<Layers />}>
      <SideNavGroup label="메뉴">
        {MENU.map((item) => <SideNavItem key={item.to} asChild icon={item.icon} label={item.label} current={isCurrent(pathname, item.to)}>
          <Link to={item.to} />
        </SideNavItem>)}
      </SideNavGroup>
    </SideNav>
  }>
    <Outlet />
  </AppShell>;
}
