import * as React from 'react';
import { ChevronRight, Ellipsis } from 'lucide-react';
import { Button } from '../button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../dropdown-menu';
import { cn } from '../../lib/cn';

/**
 * 섹션 제목 줄 — 페이지 안, 카드 밖 섹션의 제목·개수·설명·섹션 동작을 한 줄로 둔다
 * (DESIGN.md §24.6 · 디자인 총괄 규칙 표 S-1~S-11 r1 · Figma 203:8~11).
 *
 * 설계 근거
 * - **층 세 단계.** 페이지 머리 PageHeader(h1 34) > 이 부품(h2 20) > 카드 안 CardHeader. 카드 하나만 담는 섹션은
 *   CardHeader 를 쓴다(S-1).
 * - **섹션 전체를 그린다.** `<section aria-labelledby=제목 id>` 안에 머리와 children(내용)을 둔다. 앱이 section·id 를
 *   손으로 잇지 않아도 섹션이 제목 이름의 영역이 되고(S-10), 머리 → 내용 12 를 부품이 갖는다(S-7).
 * - **여백(SD-2 A).** 앞 섹션 끝 → 제목 32, 머리 → 내용 12, 페이지 머리 바로 아래 첫 섹션은 24. 페이지 배치 gap 24
 *   (§24.3) 위에 앞 형제가 있는 섹션만 8 을 더한다 — PageHeader 처럼 바깥 여백을 따로 두지 않아 이중으로 합쳐지지 않는다.
 * - **동작은 머리 오른끝 한 묶음(SD-1 A).** 묶음의 세로 가운데 = 제목 첫 줄(28) 가운데. 설명이 있어도 내려가지 않는다(S-6).
 *   동작 높이(sm 32 · ⋯ 38)는 28 줄 밖으로 위아래 같은 만큼 넘친다 — 제목 위 여백(32·24)이 제목 기준으로 정확하다.
 *   설명이 없으면 넘친 아래만큼 머리 아래에 더해 동작 아래 → 내용도 12 다(Figma 203:11).
 * - **동작은 데이터로 받는다.** 최대 2개(control 포함)를 줄에, 나머지는 ⋯ 메뉴로 옮겨야 해서 React 노드가 아니라
 *   label·href·onSelect 로 받는다. 주요(primary) 버튼 종류는 없다 — 주요 행동은 페이지 머리(S-5).
 * - **좁은 그릇(< 480, SD-3 A).** 다 들어가면 그대로, 넘치면 control(기간 선택) 또는 링크형 1개 + ⋯(38×38) 안에 나머지.
 *   "들어가는가"는 제목 한 줄 폭 + 16 + 동작 폭을 실제로 잰다(웹폰트·창 폭이 바뀌면 다시). 서버 첫 그림은 CSS 컨테이너
 *   쿼리로 접힌 쪽 — 측정 전에도 가로 스크롤이 생기지 않는다.
 * - 접근성 이름은 '{제목} {동작}'(예: '최근 출고 전체 보기'). 여러 섹션에 같은 '전체 보기'가 있어도 구분된다(S-10).
 * - 구분선 없음, 새 토큰 없음(S-8·S-11).
 */
export interface SectionHeaderAction {
  /** 보이는 이름. 접근성 이름은 '{title} {label}' 이다. */
  label: string;
  /** link = 텍스트 링크형('전체 보기 ›', 좁은 폭에서 남는 하나) · button = secondary sm 버튼(기본). */
  kind?: 'link' | 'button';
  /** 이동할 주소. 주면 `<a>` 로 그린다(⋯ 메뉴 안에서도). */
  href?: string;
  /** 눌렀다(⋯ 메뉴에서 골랐다). 앱 라우터로 옮기려면 event.preventDefault() 뒤 이동한다. */
  onSelect?: (event: { preventDefault(): void }) => void;
  /** 버튼형 왼쪽 아이콘(예: Download). 링크형은 › 가 붙는다. */
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SectionHeaderProps extends Omit<React.ComponentProps<'section'>, 'title'> {
  /** 섹션 제목. 섹션의 접근성 이름이고 동작 이름 앞에 붙는다. */
  title: string;
  /** 제목 수준. 기본 h2 — 섹션 안의 섹션이면 h3. 크기는 같다. */
  as?: 'h2' | 'h3';
  /** 제목 옆 개수(숫자만, 괄호·'개' 없이). 고정폭 숫자·보조 글자색. */
  count?: number;
  /** 제목 아래 보조 설명(한두 줄). */
  description?: React.ReactNode;
  /** 값을 바꾸는 컨트롤 하나(기간 SegmentedControl size="sm"). 동작 2개 중 하나로 세고 좁은 폭에서도 접지 않는다. */
  control?: React.ReactNode;
  /** 섹션 동작. control 과 합쳐 2개까지 줄에, 나머지는 ⋯ 메뉴. */
  actions?: readonly SectionHeaderAction[];
}

const MAX_INLINE = 2;

export function SectionHeader({
  title, as: Heading = 'h2', count, description, control, actions = [], children, className, ref, ...props
}: SectionHeaderProps) {
  const titleId = `${React.useId()}-title`;
  const headRef = React.useRef<HTMLDivElement>(null);
  const hasControl = control != null && control !== false;
  // 넓은 줄: control 포함 2개까지, 나머지는 ⋯.
  const inlineCount = Math.max(0, MAX_INLINE - (hasControl ? 1 : 0));
  const fullInline = actions.slice(0, inlineCount);
  const fullMore = actions.slice(inlineCount);
  // 접힌 줄: control 이 있으면 control 만, 없으면 첫 링크형 하나만 남기고 나머지는 ⋯(SD-3 A).
  const keep = hasControl ? -1 : actions.findIndex(action => action.kind === 'link');
  const compactInline = keep >= 0 ? [actions[keep]!] : [];
  const compactMore = actions.filter((_, index) => index !== keep);
  // 줄에 둘 이상 있을 때만 접는다. 하나뿐이면 제목이 줄바꿈한다.
  const hasCompact = (hasControl ? 1 : 0) + fullInline.length >= 2 && compactInline.length < fullInline.length;
  const hasActions = hasControl || actions.length > 0;

  const [fit, setFit] = React.useState<'full' | 'compact'>();
  const measure = React.useCallback(() => {
    const head = headRef.current;
    if (!head || !hasCompact) return;
    const row = head.querySelector<HTMLElement>('[data-slot="section-header-row"]');
    const heading = head.querySelector<HTMLElement>('[data-slot="section-header-title"]');
    const full = head.querySelector<HTMLElement>('[data-slot="section-header-full"]');
    const controlBox = head.querySelector<HTMLElement>('[data-slot="section-header-control"]');
    if (!row || !heading || !full) return;
    // 제목 한 줄 폭: 같은 프레임 안에서 줄바꿈을 끄고 재고 되돌린다(그려지지 않는다).
    const saved = heading.style.cssText;
    heading.style.whiteSpace = 'nowrap';
    heading.style.flex = 'none';
    heading.style.width = 'max-content';
    const titleWidth = heading.getBoundingClientRect().width;
    heading.style.cssText = saved;
    const style = getComputedStyle(row);
    const rowGap = parseFloat(style.columnGap) || 0;
    const actionsGap = parseFloat(getComputedStyle(full).columnGap) || 0;
    const controlWidth = controlBox?.getBoundingClientRect().width ?? 0;
    const fullWidth = full.getBoundingClientRect().width;
    const needed = titleWidth + rowGap + controlWidth + (controlWidth && fullWidth ? actionsGap : 0) + fullWidth;
    // 소수 폭끼리 비교한다(clientWidth 는 정수로 반올림된다).
    const next = needed <= row.getBoundingClientRect().width + 0.5 ? 'full' : 'compact';
    setFit(previous => previous === next ? previous : next);
  }, [hasCompact]);

  React.useLayoutEffect(() => {
    if (!hasCompact) { setFit(undefined); return; }
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    // 그릇 폭(창·사이드 메뉴)과 제목·동작 폭(웹폰트 로드) 어느 쪽이 바뀌어도 다시 잰다.
    const observer = new ResizeObserver(() => measure());
    const head = headRef.current;
    for (const slot of ['section-header-row', 'section-header-title', 'section-header-full']) {
      const element = head?.querySelector(`[data-slot="${slot}"]`);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [hasCompact, measure, title, count]);

  const name = (action: SectionHeaderAction) => `${title} ${action.label}`;

  const renderAction = (action: SectionHeaderAction, index: number) => {
    const select = action.onSelect ? (event: React.MouseEvent) => action.onSelect!(event) : undefined;
    if (action.kind === 'link') {
      const content = <><span>{action.label}</span><ChevronRight aria-hidden="true" /></>;
      return action.href && !action.disabled
        ? <a key={index} href={action.href} aria-label={name(action)} data-slot="section-header-link"
          className="ds-section-header-link" onClick={select}>{content}</a>
        : <button key={index} type="button" aria-label={name(action)} data-slot="section-header-link"
          className="ds-section-header-link" disabled={action.disabled} onClick={select}>{content}</button>;
    }
    return action.href && !action.disabled
      ? <Button key={index} asChild size="sm" leadingIcon={action.icon} data-slot="section-header-button">
        <a href={action.href} aria-label={name(action)} onClick={select}>{action.label}</a>
      </Button>
      : <Button key={index} size="sm" leadingIcon={action.icon} aria-label={name(action)} data-slot="section-header-button"
        disabled={action.disabled} onClick={select}>{action.label}</Button>;
  };

  const renderMore = (items: readonly SectionHeaderAction[]) => items.length > 0 && <DropdownMenu modal={false}>
    <DropdownMenuTrigger asChild>
      {/* 누름 영역 38×38(md 아이콘 버튼) — 좁은 폭 터치 기준(S-9). 평소엔 아이콘만 보인다(ghost). */}
      <Button variant="ghost" iconOnly aria-label={`${title} 더 보기`} data-slot="section-header-more">
        <Ellipsis aria-hidden="true" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" sideOffset={4}>
      {items.map((action, index) => {
        const select = action.onSelect ? (event: Event) => action.onSelect!(event) : undefined;
        return action.href && !action.disabled
          ? <DropdownMenuItem key={index} asChild onSelect={select}>
            <a href={action.href}>{action.kind !== 'link' && action.icon}{action.label}</a>
          </DropdownMenuItem>
          : <DropdownMenuItem key={index} disabled={action.disabled} onSelect={select}>
            {action.kind !== 'link' && action.icon}{action.label}
          </DropdownMenuItem>;
      })}
    </DropdownMenuContent>
  </DropdownMenu>;

  return <section {...props} ref={ref} aria-labelledby={props['aria-labelledby'] ?? titleId}
    data-slot="section-header" className={cn('ds-section-header', className)}>
    <div ref={headRef} data-slot="section-header-head" className="ds-section-header-head"
      data-actions={hasActions || undefined} data-description={description != null || undefined}
      data-more={fullMore.length > 0 ? 'full' : undefined} data-compact={hasCompact || undefined}
      data-fit={hasCompact ? fit : undefined}>
      <div data-slot="section-header-row" className="ds-section-header-row">
        <Heading id={titleId} data-slot="section-header-title" className="ds-section-header-title">
          {title}
          {count !== undefined && <span data-slot="section-header-count" className="ds-section-header-count tabular">
            {Number.isFinite(count) ? count.toLocaleString('ko-KR') : String(count)}
          </span>}
        </Heading>
        {hasActions && <div data-slot="section-header-actions" className="ds-section-header-actions">
          {hasControl && <div data-slot="section-header-control" className="ds-section-header-control">{control}</div>}
          {(fullInline.length > 0 || fullMore.length > 0) && <div data-slot="section-header-full" className="ds-section-header-group ds-section-header-full">
            {fullInline.map(renderAction)}
            {renderMore(fullMore)}
          </div>}
          {hasCompact && <div data-slot="section-header-compact" className="ds-section-header-group ds-section-header-compact">
            {compactInline.map(renderAction)}
            {renderMore(compactMore)}
          </div>}
        </div>}
      </div>
      {description != null && <div data-slot="section-header-description" className="ds-section-header-description">{description}</div>}
    </div>
    {children}
  </section>;
}
