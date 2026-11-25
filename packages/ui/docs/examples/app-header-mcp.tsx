import * as React from 'react';
import {
  AppShell, Avatar, Button, ContextSwitcher, ContextSwitcherGroup, DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger, NotificationCenter,
  type ContextSwitcherItem, type NotificationItem,
} from '../../src';

/**
 * MCP 조립 항목 `app-header` 의 조합 예시 원문(목표 75 3단계 · DESIGN.md §24.7).
 *
 * `pnpm mcp:build` 가 아래 두 표시 줄(mcp-example 시작·끝 주석) 사이 줄을 그대로 읽어 `get_component('app-header').example` 로 싣는다.
 * 예시를 문자열로 손에 들고 있지 않고 이 파일에 두는 이유: `pnpm typecheck` 가 이 파일을 검사하므로 예시의 부품 이름·props 가
 * 실제 공개 API 와 어긋나면(지침 초안의 NotificationBell·UserMenu·Spacer·mode 처럼) 타입 오류로 막힌다.
 * 스토리·사이트는 이 파일을 쓰지 않는다 — 실제로 그리는 상단 바 예시는 `app-header.tsx`(+ `user-menu.tsx` 전체 조합)다.
 */
export function AppHeaderMcpExample({ products, stores, allStores, product, store, switchStore, notifications, markAllRead, user, signOut,
  organizations, nav, page }: {
  products: ContextSwitcherItem[];
  stores: ContextSwitcherItem[];
  allStores: ContextSwitcherItem;
  product: string;
  store: string;
  switchStore: (value: string) => Promise<unknown>;
  notifications: NotificationItem[];
  markAllRead: () => void;
  user: string;
  signOut: () => void;
  organizations: React.ReactNode;
  nav: React.ReactNode;
  page: React.ReactNode;
}) {
  const unread = notifications.filter(item => !item.read);
  return (
    // mcp-example:start
    <AppShell sidebar={nav}
      header={<ContextSwitcherGroup>
        <ContextSwitcher kind="제품" items={products} value={product} />
        <ContextSwitcher kind="스토어" items={stores} allItem={allStores} value={store} onValueChange={switchStore} searchThreshold={8} />
      </ContextSwitcherGroup>}
      headerEnd={<>
        <NotificationCenter count={unread.length} urgent={unread.some(item => item.urgent)} items={notifications}
          onMarkAllRead={markAllRead} settingsHref="/settings/notifications" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" aria-label={`${user}, 사용자 메뉴`}><Avatar name={user} size="sm" decorative />{user}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>내 계정</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>조직 전환</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>{organizations}</DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut}>로그아웃</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </>}>
      {page}
    </AppShell>
    // mcp-example:end
  );
}
