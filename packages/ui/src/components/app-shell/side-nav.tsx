import * as React from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Slot, Slottable } from '../../internal/slot';
import { cn } from '../../lib/cn';
import { Tooltip } from '../guide';
import { ShellRailContext, useAutomaticRail } from './app-shell';

const NavContext = React.createContext(false);

export interface SideNavProps extends React.HTMLAttributes<HTMLElement> {
  brand: React.ReactNode;
  /** 접힌 레일에서도 남는 브랜드 표식. */
  brandIcon: React.ReactNode;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function SideNav({ brand, brandIcon, collapsed, defaultCollapsed = false, onCollapsedChange,
  children, className, 'aria-label': label = '주 메뉴', ...props }: SideNavProps) {
  const shellNarrow = React.useContext(ShellRailContext);
  const standaloneNarrow = useAutomaticRail();
  const narrow = shellNarrow ?? standaloneNarrow;
  const [localCollapsed, setLocalCollapsed] = React.useState(defaultCollapsed);
  const preference = collapsed ?? localCollapsed;
  const rail = narrow || preference;
  const menuId = React.useId();
  const toggle = () => {
    if (collapsed === undefined) setLocalCollapsed(!preference);
    onCollapsedChange?.(!preference);
  };
  return <NavContext.Provider value={rail}>
    <nav {...props} aria-label={label} data-slot="side-nav" data-collapsed={rail}
      className={cn('ds-side-nav', className)}>
      <div data-slot="side-nav-brand" className="ds-side-nav-brand">
        <span className="ds-side-nav-icon" aria-hidden="true">{brandIcon}</span>
        <span className="ds-side-nav-brand-label">{brand}</span>
      </div>
      <div id={menuId} data-slot="side-nav-menu" className="ds-side-nav-menu">{children}</div>
      <Tooltip content={rail ? '메뉴 펼치기' : '메뉴 접기'} disabled={narrow}>
        <button type="button" data-slot="side-nav-toggle" className="ds-side-nav-toggle"
          disabled={narrow} aria-expanded={!rail} aria-controls={menuId}
          aria-label={narrow ? '좁은 화면에서는 아이콘 메뉴를 사용합니다' : rail ? '메뉴 펼치기' : '메뉴 접기'} onClick={toggle}>
          {rail ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
          <span className="ds-side-nav-label">메뉴 접기</span>
        </button>
      </Tooltip>
    </nav>
  </NavContext.Provider>;
}

export interface SideNavGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
}
export function SideNavGroup({ label, children, className, ...props }: SideNavGroupProps) {
  const id = React.useId();
  return <div {...props} role="group" aria-labelledby={id} data-slot="side-nav-group" className={cn('ds-side-nav-group', className)}>
    <div id={id} data-slot="side-nav-group-label" className="ds-side-nav-group-label">{label}</div>
    {children}
  </div>;
}

export interface SideNavItemProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  icon: React.ReactNode;
  label: string;
  badge?: React.ReactNode;
  current?: boolean;
  disabled?: boolean;
  /** Next Link 등 단일 자식 링크에 스타일·이벤트·ref를 합친다. */
  asChild?: boolean;
}
export const SideNavItem = React.forwardRef<HTMLAnchorElement, SideNavItemProps>(function SideNavItem(
  { icon, label, badge, current = false, disabled = false, asChild = false, children, className, ...props }, ref,
) {
  const rail = React.useContext(NavContext);
  const classes = cn('ds-side-nav-item', className);
  const content = <>
    <span className="ds-side-nav-icon" aria-hidden="true">{icon}</span>
    <span data-slot="side-nav-item-label" className="ds-side-nav-label">{label}</span>
    {disabled ? <span className="ds-side-nav-meta">준비 중</span>
      : badge != null && <span data-slot="side-nav-badge" className="ds-side-nav-meta ds-side-nav-badge tabular">{badge}</span>}
  </>;
  // 자식 라우터 링크도 렌더하지 않는다. href·핸들러·탭 순서를 남기면 비활성을 우회할 수 있다.
  if (disabled) return <Tooltip content={`${label} (준비 중)`} disabled={!rail}>
    <span data-slot="side-nav-item" className={classes} role="link" aria-disabled="true"
      aria-label={`${label} (준비 중)`}>{content}</span>
  </Tooltip>;
  const Component = asChild ? Slot : 'a';
  return <Tooltip content={label} disabled={!rail}>
    <Component {...props} ref={ref} data-slot="side-nav-item" className={classes}
      aria-current={current ? 'page' : undefined} aria-label={rail ? label : props['aria-label']}>
      {asChild ? <Slottable child={children}>{() => content}</Slottable> : content}
    </Component>
  </Tooltip>;
});
