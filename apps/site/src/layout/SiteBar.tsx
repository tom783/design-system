import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Input, SegmentedControl, SheetBody, SheetContent,
} from '@s2life/ui';
import { Menu, Monitor, Moon, Search, Sun } from '@s2life/ui/icons';
import meta from 'virtual:site-meta';
import { manifest, pageComponents, pageFor } from '../data/manifest';
import { foundationSections } from '../pages/foundations/sections';
import { useMediaQuery } from '../blocks/useMediaQuery';
import { useTheme, type ThemeChoice } from './theme';

/** 사이트 브랜드 이름 — 상단 바·바닥글이 같은 글자를 쓴다(문서 title 은 index.html, 디자인 총괄 검수 r1). */
export const BRAND = 'S2Life 디자인 시스템';

/** 상단 메뉴 — 첫 화면과 여섯 갈래. 경로가 이 접두로 시작하면 현재 위치다. */
export const MENU = [
  { to: '/', label: '첫 화면' },
  { to: '/start', label: '시작하기' },
  { to: '/concept', label: '디자인 컨셉' },
  { to: '/foundations', label: '파운데이션' },
  { to: '/components', label: '부품' },
  { to: '/patterns', label: '패턴' },
  { to: '/ai', label: 'AI로 쓰기' },
] as const;

export function isCurrent(pathname: string, to: string) {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
}

export const THEME_OPTIONS = [
  { value: 'system', label: '시스템', icon: <Monitor /> },
  { value: 'light', label: '라이트', icon: <Sun /> },
  { value: 'dark', label: '다크', icon: <Moon /> },
];

/** 매니페스트 토큰 이름이 어느 파운데이션 절에 있는지 — 토큰 분류(category)로 고른다. */
function foundationFor(category: string) {
  return foundationSections.find((section) => (section.tokenCategories as readonly string[]).includes(category))?.slug ?? 'color';
}

interface SearchItem { key: string; label: string; kind: string; to: string; text: string }

/** 검색 대상 — 부품·부분·토큰 이름. 데이터는 매니페스트에서, 고르면 그 페이지(부분은 부모 코드 탭의 그 자리, 토큰은 파운데이션의 그 줄)로 간다. */
const SEARCH_ITEMS: SearchItem[] = [
  ...pageComponents.map((component) => ({ key: `c:${component.name}`, label: component.name, kind: '부품', to: `/components/${component.name}` })),
  ...manifest.components.filter((component) => component.partOf).flatMap((component) => {
    const page = pageFor(component.name);
    return page ? [{ key: `p:${component.name}`, label: component.name, kind: `${page.name}의 부분`, to: `/components/${page.name}?tab=code#part-${component.name}` }] : [];
  }),
  ...manifest.tokens.map((token) => ({ key: `t:${token.name}`, label: token.cssVariable, kind: '토큰', to: `/foundations/${foundationFor(token.category)}#token-${token.name}` })),
].map((item) => ({ ...item, text: item.label.toLowerCase() }));
const SEARCH_LIMIT = 30;

/** 이름 일부로 찾는다 — 앞이 맞는 이름 먼저, 그다음 중간에 들어 있는 이름(각각 원래 순서: 부품 → 부분 → 토큰). 토큰은 '--' 없이 써도 된다. */
function searchItems(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts: SearchItem[] = [], contains: SearchItem[] = [];
  for (const item of SEARCH_ITEMS) {
    const name = item.text.replace(/^--/, '');
    if (name.startsWith(q.replace(/^--/, '')) || item.text.startsWith(q)) starts.push(item);
    else if (item.text.includes(q)) contains.push(item);
  }
  return [...starts, ...contains];
}

/**
 * 검색 — 상단 바의 돋보기 단추가 여는 창(디자인 총괄 검수 r1 사이트 틀 A: "검색은 상단 바 아이콘 → 열리는 검색").
 * 입력칸(@s2life/ui Input) + 맞는 이름의 링크 목록. Enter 는 첫 결과로, ↓·↑ 는 입력칸과 결과 사이를 옮긴다.
 * (Combobox 를 창 안에 두면 목록 팝오버가 창 아래에 깔린다 — 팝오버 z-index 가 없어서. 그래서 목록을 창 안에 직접 그린다.)
 */
function SiteSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const list = React.useRef<HTMLUListElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const results = React.useMemo(() => searchItems(query), [query]);
  const shown = results.slice(0, SEARCH_LIMIT);
  React.useEffect(() => { if (!open) setQuery(''); }, [open]);
  const links = () => [...(list.current?.querySelectorAll<HTMLElement>('a') ?? [])];
  const move = (event: React.KeyboardEvent, from: number) => {
    const all = links();
    const next = event.key === 'ArrowDown' ? from + 1 : event.key === 'ArrowUp' ? from - 1 : null;
    if (next === null) return;
    event.preventDefault();
    if (next < 0) input.current?.focus(); else all[Math.min(next, all.length - 1)]?.focus();
  };
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
      <Button iconOnly aria-label="부품·토큰 검색" className="site-bar-search"><Search aria-hidden="true" /></Button>
    </DialogTrigger>
    <DialogContent aria-describedby={undefined} className="site-search" onOpenAutoFocus={(event) => { event.preventDefault(); input.current?.focus(); }}>
      <DialogHeader><DialogTitle>검색</DialogTitle></DialogHeader>
      <div className="site-search-body">
        <Input ref={input} type="search" aria-label="부품·토큰 이름" placeholder="부품·토큰 이름" leadingIcon={<Search aria-hidden="true" />}
          value={query} onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && shown[0]) { event.preventDefault(); setOpen(false); navigate(shown[0].to); }
            else move(event, -1);
          }} />
        <p className="site-caption" role="status">
          {query.trim() ? results.length > SEARCH_LIMIT ? `${results.length}개 중 앞 ${SEARCH_LIMIT}개` : `${results.length}개` : ''}
        </p>
        {shown.length > 0 && <ul ref={list} className="site-search-results" aria-label="검색 결과">
          {shown.map((item, i) => <li key={item.key}>
            <Link className="site-search-result" to={item.to} onClick={() => setOpen(false)} onKeyDown={(event) => move(event, i)}>
              <span className="site-search-name">{item.label}</span>
              <span className="site-caption">{item.kind}</span>
            </Link>
          </li>)}
        </ul>}
      </div>
    </DialogContent>
  </Dialog>;
}

/** 좁은 틀 — site.css 의 @media (max-width: 1023px) 와 같은 경계. 상단 메뉴·테마는 '메뉴' Sheet, 섹션 목록은 '<섹션> 목록' Sheet 로 옮긴다. */
export const FRAME_NARROW = '(max-width: 1023px)';

/**
 * 사이트 상단 바 — 모든 페이지 공통(오너 결정 11/25 사이트 틀 A). 브랜드 · 메뉴 7개 · 검색 · 테마.
 * 1023px 이하는 브랜드 · 검색 · '메뉴' 단추만 두고, 메뉴 7개와 테마 3상태를 오른쪽 Sheet 에 싣는다(가로로 밀어 글자가 잘리지 않게).
 * 1024px 이상은 메뉴 7개가 한 줄에 다 들어간다(실측). 보이고 숨기는 것은 CSS 가, Sheet 를 열 수 있는지는 같은 경계의 useMediaQuery 가 정한다.
 * 바탕은 평면(표면색 + 아래 선). 첫 화면만 맨 위에서 투명·내리면 블러 — 그 효과는 첫 화면 효과 층(home/effects.css)이 stuck 값으로 건다.
 */
export function SiteBar({ main, stuck }: { main: React.RefObject<HTMLElement | null>; stuck?: boolean }) {
  const { pathname } = useLocation();
  const [theme, setTheme] = useTheme();
  const narrow = useMediaQuery(FRAME_NARROW);
  const [menuOpen, setMenuOpen] = React.useState(false);
  // 넓어지면 Sheet 를 닫는다 — 메뉴는 다시 상단 바에 있다. 페이지를 옮겨도 닫는다.
  React.useEffect(() => { if (!narrow) setMenuOpen(false); }, [narrow]);
  React.useEffect(() => { setMenuOpen(false); }, [pathname]);
  const themeLabel = React.useId();
  const menuList = React.useRef<HTMLUListElement>(null);
  const current = (to: string) => isCurrent(pathname, to) ? 'page' as const : undefined;
  return <header className="site-bar" data-stuck={stuck}>
    <div className="site-bar-inner">
      <Link className="site-bar-brand" to="/">{BRAND}</Link>
      <nav className="site-bar-nav" aria-label="사이트 메뉴">
        {MENU.map((item) => <Link key={item.to} className="site-bar-link" to={item.to} aria-current={current(item.to)}>{item.label}</Link>)}
      </nav>
      <div className="site-bar-tools">
        <SiteSearch />
        <SegmentedControl className="site-bar-theme" aria-label="테마" size="sm" iconOnly options={THEME_OPTIONS} value={theme}
          onValueChange={(next) => setTheme(next as ThemeChoice)} />
        <div className="site-bar-menu">
          <Dialog open={narrow && menuOpen} onOpenChange={setMenuOpen}>
            <DialogTrigger asChild><Button leadingIcon={<Menu aria-hidden="true" />}>메뉴</Button></DialogTrigger>
            {/* 열면 현재 페이지 링크로 — Dialog 기본은 첫 포커스 후보에서 링크를 빼서 테마 단추로 간다(실측).
                닫으면 '메뉴' 단추로 포커스가 돌아간다(Dialog 기본). 넓어져서 닫힐 때는 단추가 숨으므로 본문으로 보낸다. */}
            <SheetContent size="sm" className="site-bar-sheet" aria-describedby={undefined}
              onOpenAutoFocus={(event) => {
                const target = menuList.current?.querySelector<HTMLElement>('[aria-current="page"]');
                if (target) { event.preventDefault(); target.focus(); }
              }}
              onCloseAutoFocus={(event) => { if (!narrow) { event.preventDefault(); main.current?.focus(); } }}>
              <DialogHeader><DialogTitle>메뉴</DialogTitle></DialogHeader>
              <SheetBody>
                <nav aria-label="사이트 메뉴">
                  <ul ref={menuList} className="site-sheet-list">
                    {MENU.map((item) => <li key={item.to}>
                      <Link className="site-sheet-link" to={item.to} aria-current={current(item.to)}
                        onClick={() => setMenuOpen(false)}>{item.label}</Link>
                    </li>)}
                  </ul>
                </nav>
                <div className="site-sheet-theme">
                  <span id={themeLabel} className="site-sheet-theme-label">테마</span>
                  <SegmentedControl aria-labelledby={themeLabel} fullWidth options={THEME_OPTIONS} value={theme}
                    onValueChange={(next) => setTheme(next as ThemeChoice)} />
                </div>
              </SheetBody>
            </SheetContent>
          </Dialog>
        </div>
      </div>
    </div>
  </header>;
}

/** 바닥글 — 브랜드 · 버전·빌드 커밋 · npm 게시판 · 변경 이력. 전에는 문서 페이지 머리띠에 있던 정보다. */
export function SiteFooter() {
  return <footer className="site-footer">
    <strong>{BRAND}</strong>
    <span className="tabular" title="세 패키지(tokens·ui·mcp) 공통 버전 — 이 작업 폴더 기준">
      v{meta.version}{meta.sha ? ` · ${meta.sha}${meta.dirty ? ' (수정됨)' : ''}` : ''}
    </span>
    <span className="tabular">{meta.published ? `npm 게시 ${meta.published.version}` : 'npm 게시판 없음'}</span>
    {meta.repository && <a className="site-link" href={`${meta.repository}/blob/main/CHANGELOG.md`} target="_blank" rel="noreferrer">변경 이력</a>}
  </footer>;
}

/** 본문으로 건너뛰기 — 상단 바(메뉴 7개·검색·테마)를 지나 본문으로. 첫 Tab 에서만 보인다. */
export function SkipLink({ main }: { main: React.RefObject<HTMLElement | null> }) {
  return <a className="site-skip" href="#site-main" onClick={(event) => { event.preventDefault(); main.current?.focus(); }}>본문으로 건너뛰기</a>;
}
