import * as React from 'react';
import { cn } from '../../lib/cn';

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

export interface AppShellProps extends React.HTMLAttributes<HTMLDivElement> {
  sidebar: React.ReactNode;
  /** 전역 검색·사용자 메뉴 등 앱이 구성하는 선택 상단 영역. */
  header?: React.ReactNode;
  children: React.ReactNode;
  /** 본문 안쪽 콘텐츠의 최대 폭. 생략하면 넓은 표를 위해 제한하지 않는다. */
  contentMaxWidth?: React.CSSProperties['maxWidth'];
}

export function AppShell({ sidebar, header, children, contentMaxWidth, className, ...props }: AppShellProps) {
  const mainId = React.useId();
  const main = React.useRef<HTMLElement>(null);
  const narrow = useAutomaticRail();
  return <ShellRailContext.Provider value={narrow}>
    <div {...props} data-slot="app-shell" className={cn('ds-app-shell', className)}>
      <a data-slot="app-shell-skip" className="ds-app-shell-skip" href={`#${mainId}`}
        onClick={event => { event.preventDefault(); main.current?.focus(); }}>본문으로 건너뛰기</a>
      <div data-slot="app-shell-sidebar" className="ds-app-shell-sidebar">{sidebar}</div>
      <div data-slot="app-shell-body" className="ds-app-shell-body">
        {header != null && <header data-slot="app-shell-header" className="ds-app-shell-header">{header}</header>}
        <main ref={main} id={mainId} tabIndex={-1} data-slot="app-shell-main" className="ds-app-shell-main">
          <div data-slot="app-shell-content" className="ds-app-shell-content" style={{ maxWidth: contentMaxWidth }}>{children}</div>
        </main>
      </div>
    </div>
  </ShellRailContext.Provider>;
}
