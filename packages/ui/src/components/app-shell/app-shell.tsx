import * as React from 'react';
import { cn } from '../../lib/cn';
import { Menu } from 'lucide-react';
import { Button } from '../button';
import { Dialog, DialogTrigger, DialogTitle } from '../dialog';
import { SheetContent, SheetBody } from '../sheet';

// CSS도 같은 경계값을 쓴다. 서버에서는 펼침 구조로 렌더하고 CSS가 첫 페인트부터 레일 폭을 보장한다.
const railQuery = '(width < 1024px)';
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(railQuery);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};
const snapshot = () => window.matchMedia(railQuery).matches;
const serverSnapshot = () => false;
export function useAutomaticRail() {
  return React.useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
export const ShellRailContext = React.createContext<boolean | null>(null);

// 서랍 안에서는 레일을 강제하지 않고 항목 선택을 셸의 닫기에 연결한다.
export const ShellDrawerContext = React.createContext<(() => void) | null>(null);

export interface AppShellProps extends React.ComponentProps<'div'> {
  sidebar: React.ReactNode;
  /** 상단 바 왼쪽 묶음(맥락 전환기·전역 검색 등). 상단 바는 64px 한 줄이다 — 넘는 내용은 본문에 둔다. */
  header?: React.ReactNode;
  /** 상단 바 오른쪽 묶음. 앱 항목 → 알림 → 사용자 메뉴 순으로 두고 사용자 메뉴가 맨 오른쪽이다. */
  headerEnd?: React.ReactNode;
  children: React.ReactNode;
  /** 1024px 미만 메뉴: 기본 rail, drawer는 왼쪽 모달 Sheet. */
  narrowNavigation?: 'rail' | 'drawer';
  /** 본문 안쪽 콘텐츠의 최대 폭. 생략하면 넓은 표를 위해 제한하지 않는다. */
  contentMaxWidth?: React.CSSProperties['maxWidth'];
}

export function AppShell({ sidebar, header, headerEnd, children, contentMaxWidth, narrowNavigation = 'rail', className, ...props }: AppShellProps) {
  const mainId = React.useId();
  const main = React.useRef<HTMLElement>(null);
  const narrow = useAutomaticRail();
  const [menuOpen, setMenuOpen] = React.useState(false);
  React.useEffect(() => { if (!narrow || narrowNavigation !== 'drawer') setMenuOpen(false); }, [narrow, narrowNavigation]);
  const drawer = narrowNavigation === 'drawer';
  return <ShellRailContext.Provider value={narrow}>
    <div {...props} data-slot="app-shell" data-narrow-navigation={narrowNavigation} className={cn('ds-app-shell', className)}>
      <a data-slot="app-shell-skip" className="ds-app-shell-skip" href={`#${mainId}`}
        onClick={event => { event.preventDefault(); main.current?.focus(); }}>본문으로 건너뛰기</a>
      <div data-slot="app-shell-sidebar" className="ds-app-shell-sidebar">{!(drawer && narrow) && sidebar}</div>
      <div data-slot="app-shell-body" className="ds-app-shell-body">
        {drawer && <div className="ds-app-shell-menu">
          <Dialog open={narrow && menuOpen} onOpenChange={setMenuOpen}>
            <DialogTrigger asChild><Button leadingIcon={<Menu aria-hidden="true" />}>메뉴 열기</Button></DialogTrigger>
            <SheetContent side="left" size="sm" className="ds-app-shell-drawer" aria-describedby={undefined}
              onCloseAutoFocus={event => { if (!narrow) { event.preventDefault(); main.current?.focus(); } }}>
              <DialogTitle className="sr-only">주 메뉴</DialogTitle>
              <SheetBody><ShellDrawerContext.Provider value={() => setMenuOpen(false)}>
                {narrow && sidebar}
              </ShellDrawerContext.Provider></SheetBody>
            </SheetContent>
          </Dialog>
        </div>}
        {/* 상단 바: 왼쪽 묶음 · 가운데 빈 공간 · 오른쪽 묶음(DESIGN.md §24.7). 둘 다 없으면 지금처럼 그리지 않는다. */}
        {(header != null || headerEnd != null) && <header data-slot="app-shell-header" className="ds-app-shell-header">
          <div data-slot="app-shell-header-start" className="ds-app-shell-header-start">{header}</div>
          {headerEnd != null && <div data-slot="app-shell-header-end" className="ds-app-shell-header-end">{headerEnd}</div>}
        </header>}
        <main ref={main} id={mainId} tabIndex={-1} data-slot="app-shell-main" className="ds-app-shell-main">
          <div data-slot="app-shell-content" className="ds-app-shell-content" style={{ maxWidth: contentMaxWidth }}>{children}</div>
        </main>
      </div>
    </div>
  </ShellRailContext.Provider>;
}
