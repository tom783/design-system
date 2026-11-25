import * as React from 'react';
import { Outlet, useLocation } from 'react-router';
import { SiteBar, SiteFooter, SkipLink } from './SiteBar';
import { SectionNav, hasSectionNav } from './SectionNav';

/**
 * 문서가 스크롤한다(전에는 AppShell 의 본문 칸) — 페이지를 옮기면 맨 위로, 해시가 있으면 그 자리로.
 * 상단 바에 가리지 않게 하는 여백은 site.css 의 html scroll-padding 이 맡는다.
 */
function useScrollOnNavigate() {
  const { pathname, hash } = useLocation();
  React.useEffect(() => {
    if (hash) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target) { target.scrollIntoView(); return; }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
}

/**
 * 사이트 틀 A(오너 결정 11/25) — 첫 화면과 같은 상단 바를 모든 페이지에. 문서 페이지 왼쪽은 그 섹션 안 목록만(부품·파운데이션·패턴),
 * 목록이 없는 섹션(시작하기·디자인 컨셉·AI로 쓰기)은 왼쪽 열 없이 본문 + 오른쪽 목차. 바닥글에 버전·변경 이력.
 * 상단 바는 평면 — 블러·번짐 효과는 첫 화면에만 있다(home/effects.css).
 */
export function SiteShell() {
  const { pathname } = useLocation();
  const main = React.useRef<HTMLElement>(null);
  useScrollOnNavigate();
  const nav = hasSectionNav(pathname);
  return <div className="site-shell">
    <SkipLink main={main} />
    <SiteBar main={main} />
    <div className="site-frame" data-nav={nav}>
      {nav && <SectionNav />}
      <main ref={main} id="site-main" tabIndex={-1} className="site-main">
        <Outlet />
      </main>
    </div>
    <SiteFooter />
  </div>;
}
