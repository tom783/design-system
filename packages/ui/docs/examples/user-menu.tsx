import * as React from 'react';
import {
  Avatar, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
  DropdownMenuTrigger, Tooltip,
} from '../../src';
import { ChevronDown } from '../../src/icons';

/**
 * 사용자 메뉴 — 새 부품이 아니라 DropdownMenu + Avatar 조합이다(상단 바 규격 7절 · Figma 211:10254).
 * AppShell `headerEnd` 의 맨 오른쪽에 둔다.
 *
 * - 트리거: 1024 이상 Avatar sm 32 + 이름(최대 160 말줄임) + 화살표 16, 높이 38 · 1024 미만 Avatar 만 44×44(누름 면적 --tap-min).
 *   전체 이름은 툴팁으로 본다(말줄임·아바타만일 때).
 * - 머리: Avatar md 38 + 이름 600 + 조직 이름 caption, 패딩 12, 아래 구분선.
 * - 항목 높이 38. 조직 전환은 하위 메뉴(현재 조직 = 체크 표시 + 굵게 + 선택 바탕 — 색만으로 알리지 않는다).
 * - 로그아웃은 맨 아래, 위 구분선만 — 위험 표시(빨간 글자·휴지통)는 쓰지 않는다. `destructive` 는 삭제용이다.
 * - 폭 240~320. 키보드: 화살표 이동 · Enter 선택 · Esc 로 닫으면 트리거로 초점이 돌아온다(DropdownMenu 기본).
 */
export interface UserMenuExampleProps {
  name: string;
  organization: string;
  organizations?: string[];
  defaultOpen?: boolean;
  onSignOut?: () => void;
}

/** 이름이 다 보이지 않을 때만 툴팁을 켠다 — 말줄임(160 초과)이거나 1024 미만이라 아바타만 보일 때. 다 보이면 같은 말이 두 번 뜬다. */
function useClipped(ref: React.RefObject<HTMLElement | null>) {
  const [clipped, setClipped] = React.useState(false);
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setClipped(element.offsetParent === null || element.scrollWidth > element.clientWidth);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observer.observe(document.documentElement);
    measure();
    return () => observer.disconnect();
  }, [ref]);
  return clipped;
}

/** 항목 높이 38, 1024 미만 44(Figma 223:433 좁은 폭 · 누름 면적 --tap-min). */
const ITEM = 'min-h-[var(--control-h-md)] max-lg:min-h-[var(--tap-min)]';
const ORG = `${ITEM} data-[state=checked]:bg-[var(--bg-selected)] data-[state=checked]:font-semibold`;
/**
 * 640 미만에서는 조직 전환을 하위 메뉴 대신 메뉴 안에 펼친다. 390 에서 메뉴 240 옆에 하위 목록 240 이 어느 쪽에도 들어가지 않아
 * 화면 밖으로 나갔다(Figma 에 좁은 폭 하위 목록 자리가 없다 — 보고서 '규격 밖').
 */
const COMPACT = '(width < 640px)';
function useCompact() {
  return React.useSyncExternalStore(notify => {
    const media = window.matchMedia(COMPACT);
    media.addEventListener('change', notify);
    return () => media.removeEventListener('change', notify);
  }, () => window.matchMedia(COMPACT).matches, () => false);
}

export function UserMenuExample({ name, organization, organizations = [organization], defaultOpen = false, onSignOut }: UserMenuExampleProps) {
  const [current, setCurrent] = React.useState(organization);
  const [open, setOpen] = React.useState(defaultOpen);
  const label = React.useRef<HTMLSpanElement>(null);
  const clipped = useClipped(label);
  const compact = useCompact();
  const orgItems = <DropdownMenuRadioGroup value={current} onValueChange={setCurrent}>
    {organizations.map(item => <DropdownMenuRadioItem key={item} value={item} className={ORG}>{item}</DropdownMenuRadioItem>)}
  </DropdownMenuRadioGroup>;
  return <DropdownMenu open={open} onOpenChange={setOpen}>
    {/* 메뉴가 열려 있으면 끈다 — 말풍선이 메뉴 머리를 덮는다. */}
    <Tooltip content={name} disabled={open || !clipped}>
      <DropdownMenuTrigger asChild>
        {/* 보이는 이름이 접근 이름 앞에 오게 한다(WCAG 2.5.3). 1024 미만에서 이름이 숨어도 같은 이름을 읽는다. */}
        <Button variant="ghost" aria-label={`${name}, 사용자 메뉴`}
          className="px-1 font-normal text-fg max-lg:size-[var(--tap-min)] max-lg:min-w-0 max-lg:px-0">
          <Avatar name={name} size="sm" decorative />
          <span ref={label} className="block max-w-40 truncate max-lg:hidden">{name}</span>
          <ChevronDown aria-hidden="true" className="max-lg:hidden" />
        </Button>
      </DropdownMenuTrigger>
    </Tooltip>
    <DropdownMenuContent align="end" className="min-w-60 max-w-80">
      <DropdownMenuLabel className="flex items-center gap-3 p-2 font-normal">
        <Avatar name={name} size="md" decorative />
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">{name}</span>
          <span className="truncate text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] text-fg-muted">{current}</span>
        </span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem className={ITEM}>내 계정</DropdownMenuItem>
      {organizations.length > 1 && (compact ? <>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] font-medium text-fg-muted">조직 전환</DropdownMenuLabel>
        {orgItems}
        <DropdownMenuSeparator />
      </> : <DropdownMenuSub>
        <DropdownMenuSubTrigger className={ITEM}>조직 전환</DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="min-w-60 max-w-80">{orgItems}</DropdownMenuSubContent>
      </DropdownMenuSub>)}
      <DropdownMenuItem className={ITEM}>조직 설정</DropdownMenuItem>
      <DropdownMenuItem className={ITEM}>알림 설정</DropdownMenuItem>
      <DropdownMenuItem className={ITEM}>도움말</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem className={ITEM} onSelect={onSignOut}>로그아웃</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
