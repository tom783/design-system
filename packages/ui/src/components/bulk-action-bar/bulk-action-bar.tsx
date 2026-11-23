import * as React from 'react';
import { Button } from '../button';
import { cn } from '../../lib/cn';

/**
 * 일괄 작업 바 — 행을 선택하면 목록 툴바 자리를 대체한다(DESIGN.md §4.2, 0.5.0 목록 툴바 규격 · Figma 189:2).
 *
 * 설계 근거
 * - **대체이지 추가가 아니다.** 선택이 1건 이상이면 children(필터 바)을 같은 자리에서 숨기고(보이지 않고·조작
 *   불가 — inert) 바가 그 자리를 같은 높이로 덮는다. 두 층을 한 격자 칸에 겹쳐 높이가 큰 쪽을 따르므로 표가
 *   시작하는 자리가 움직이지 않는다. 필터 바는 언마운트하지 않는다 — 입력 중이던 검색어 같은 비제어 상태가 남는다.
 * - 선택 중에는 필터를 바꿀 수 없다. 조건이 바뀌면 보이지 않는 행이 선택에서 빠지는데(§4), 그걸 바 위에서
 *   알아차리기 어렵다. 선택 해제하면 필터 바가 같은 자리로 돌아온다.
 * - 바는 sticky — 표를 내려도 표 위(스크롤 영역 윗변)에 붙어 있다. 그래서 표와 **같은 부모**에 둔다.
 * - 바탕은 중립 면(bg-sunken + border-subtle). 선택 행이 이미 선택 틴트라 바까지 분홍·크림슨이면 화면 전체가
 *   오류처럼 읽힌다(r1 F3). 'N건 선택'만 굵게 강조한다.
 * - 순서: N건 선택 → 선택 해제 → 안전 액션(secondary) → 구분선 → 위험 액션(danger) 하나, 맨 끝.
 * - 'N건 선택'은 **항상 DOM 에 있는** live region 이다. 선택될 때 새로 끼워 넣은 live region 은 읽히지 않을 수
 *   있다. 선택이 없을 때도 시각적으로 숨긴 채 남는다.
 * - 선택 값은 DataTable 하나가 소유한다(selectedIds·onSelectedIdsChange, 제어형). 바는 그 길이를 받아 보여주고
 *   선택 해제를 onClear 사건으로 알린다(§6.3 규칙 2). 같은 값의 제어 쌍을 두 부품에 두면 원본이 모호해진다.
 */
export interface BulkActionBarProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** 선택한 행 수. 0 이면 바가 숨고 children 이 보인다. */
  selectedCount: number;
  /** 선택 해제 버튼을 눌렀다. 앱이 표의 selectedIds 를 비운다. */
  onClear?: () => void;
  /** 안전한 일괄 액션 — Button secondary sm 2~3개. */
  actions?: React.ReactNode;
  /** 되돌릴 수 없는 액션 하나 — Button danger sm. 구분선 뒤 맨 끝에 놓인다. 확인 단계(AlertDialog)는 앱이 연다. */
  dangerAction?: React.ReactNode;
  /** 선택이 없을 때 이 자리에 보이는 목록 툴바(FilterBar). */
  children?: React.ReactNode;
}

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export function BulkActionBar({ selectedCount, onClear, actions, dangerAction, children, className, ...props }: BulkActionBarProps) {
  const count = Math.max(0, Math.trunc(Number.isFinite(selectedCount) ? selectedCount : 0));
  const active = count > 0;
  const replacedRef = React.useRef<HTMLDivElement>(null);
  const focusInside = React.useRef(false);
  const wasActive = React.useRef(active);

  // 선택이 풀리며 바의 버튼이 사라지면 포커스가 body 로 떨어진다. 바 안에 포커스가 있었다면 돌아온 툴바의
  // 첫 조작 요소로 옮긴다(선택 해제 버튼뿐 아니라 위험 액션 처리 뒤 앱이 선택을 비운 경우도 같다).
  React.useLayoutEffect(() => {
    const deactivated = wasActive.current && !active;
    wasActive.current = active;
    if (!deactivated || !focusInside.current) return;
    focusInside.current = false;
    const current = document.activeElement;
    if (current && current !== document.body && current.isConnected) return;
    replacedRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, [active]);

  const label = `${count.toLocaleString('ko-KR')}건 선택`;
  return <div {...props} data-slot="bulk-action-bar" data-active={active || undefined} className={cn('ds-bulk-action-bar', className)}>
    {children !== undefined && <div ref={replacedRef} data-slot="bulk-action-bar-replaced" className="ds-bulk-action-bar-replaced" inert={active}>
      {children}
    </div>}
    <div data-slot="bulk-action-bar-panel" className="ds-bulk-action-bar-panel"
      role={active ? 'group' : undefined} aria-label={active ? '선택한 항목 일괄 작업' : undefined}
      onFocus={() => { focusInside.current = true; }}
      onBlur={event => {
        const panel = event.currentTarget, target = event.target;
        if (event.relatedTarget) { if (!panel.contains(event.relatedTarget)) focusInside.current = false; return; }
        // relatedTarget 이 없으면 바깥 빈 곳을 눌렀거나 버튼이 사라진 것이다. 사라진 경우(연결 끊김)는 위 효과가 처리한다.
        requestAnimationFrame(() => { if (target.isConnected && !panel.contains(document.activeElement)) focusInside.current = false; });
      }}>
      <div data-slot="bulk-action-bar-summary" className="ds-bulk-action-bar-summary">
        <span data-slot="bulk-action-bar-count" role="status" aria-live="polite" aria-atomic="true" className="ds-bulk-action-bar-count tabular">
          {active ? label : ''}
        </span>
        {active && <Button variant="ghost" size="sm" data-slot="bulk-action-bar-clear" onClick={onClear}>선택 해제</Button>}
      </div>
      {active && (actions || dangerAction) && <div data-slot="bulk-action-bar-actions" className="ds-bulk-action-bar-actions">
        {actions}
        {dangerAction && <>
          {actions && <span data-slot="bulk-action-bar-divider" className="ds-bulk-action-bar-divider" aria-hidden="true" />}
          {dangerAction}
        </>}
      </div>}
    </div>
  </div>;
}
