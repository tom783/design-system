import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../select';
import { cn } from '../../lib/cn';
import { pageItems } from './page-items';

export interface PaginationProps extends Omit<React.ComponentPropsWithoutRef<'nav'>, 'children' | 'onChange'> {
  /** 1부터 시작하는 현재 페이지. */
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  pageSizeOptions?: readonly number[];
  /** 크기를 바꾸면 onPageChange(1)도 호출한다. 앱은 두 값을 함께 조회에 반영한다. */
  onPageSizeChange?: (pageSize: number) => void;
  /** 조회 중 이동과 페이지 크기 변경을 막는다. */
  disabled?: boolean;
}

const format = (value: number) => value.toLocaleString('ko-KR');

export function Pagination({ page, pageSize, totalCount, onPageChange, pageSizeOptions,
  onPageSizeChange, disabled = false, className, ...props }: PaginationProps) {
  const root = React.useRef<HTMLElement>(null);
  const focused = React.useRef<{ node: HTMLButtonElement; page: number } | null>(null);
  // 서버 삭제·필터 변경으로 마지막 페이지가 줄어도 존재하지 않는 범위를 표시하지 않는다.
  const size = Number.isFinite(pageSize) ? Math.max(1, Math.trunc(pageSize)) : 1;
  const total = Number.isFinite(totalCount) ? Math.max(0, Math.trunc(totalCount)) : 0;
  const count = Math.ceil(total / size);
  const current = Math.max(1, Math.min(Number.isFinite(page) ? Math.trunc(page) : 1, count));
  const range = `${format((current - 1) * size + 1)}–${format(Math.min(current * size, total))} / ${format(total)}건`;
  const options = [...new Set(pageSizeOptions?.filter(value => Number.isSafeInteger(value) && value > 0))];

  const restoreFocus = React.useCallback(() => {
    const nav = root.current, previous = focused.current;
    if (!nav || !previous) return;
    if (previous.node.isConnected && previous.node.getClientRects().length) return;
    // 다른 입력으로 이동한 뒤 서버 응답이 와도 포커스를 되찾지 않는다.
    if (document.activeElement !== document.body && document.activeElement !== previous.node) return;
    const buttons = [...nav.querySelectorAll<HTMLButtonElement>('[data-pagination-page]')]
      .filter(button => button.getClientRects().length && button.getAttribute('aria-disabled') !== 'true');
    const nearest = buttons.sort((a, b) => Math.abs(Number(a.dataset.paginationPage) - previous.page)
      - Math.abs(Number(b.dataset.paginationPage) - previous.page))[0];
    const fallback = nav.querySelector<HTMLButtonElement>('[data-slot="pagination-next"][aria-disabled="false"]')
      ?? nav.querySelector<HTMLButtonElement>('[data-slot="pagination-previous"][aria-disabled="false"]');
    focused.current = null;
    // focus capture가 새 버튼을 기록하도록 먼저 비운다. 연속된 건수 감소에서도 복구할 수 있다.
    (nearest ?? fallback ?? nav.querySelector<HTMLElement>('[data-slot="pagination-range"]'))?.focus({ preventScroll: true });
  }, []);
  React.useLayoutEffect(restoreFocus);
  React.useEffect(() => {
    const nav = root.current;
    if (!nav || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(restoreFocus);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [restoreFocus, total > 0]);

  if (total === 0) return null;
  const move = (next: number) => { if (!disabled && next !== current && next >= 1 && next <= count) onPageChange(next); };
  return <nav {...props} ref={root} aria-label={props['aria-label'] ?? '페이지 이동'}
    data-slot="pagination" className={cn('ds-pagination', className)}
    onFocusCapture={event => {
      props.onFocusCapture?.(event);
      const node = event.target;
      if (node instanceof HTMLButtonElement) focused.current = { node, page: Number(node.dataset.paginationPage ?? current) };
    }}
    onBlurCapture={event => {
      props.onBlurCapture?.(event);
      if (event.relatedTarget) focused.current = null;
    }}>
    <div className="ds-pagination-layout">
      <span data-slot="pagination-range" className="ds-pagination-range tabular" role="status" aria-live="polite" aria-atomic="true" tabIndex={-1}>{range}</span>
      {count > 1 && <>
        {options.length > 0 && onPageSizeChange && <Select value={String(size)} disabled={disabled}
          onValueChange={value => { if (!disabled && Number(value) !== size) { onPageSizeChange(Number(value)); onPageChange(1); } }}>
          <SelectTrigger data-slot="pagination-size" className="ds-pagination-size tabular" aria-label="페이지 크기"><SelectValue>{format(size)}개씩</SelectValue></SelectTrigger>
          <SelectContent>{options.map(value => <SelectItem key={value} value={String(value)}>{format(value)}개씩</SelectItem>)}</SelectContent>
        </Select>}
        <div data-slot="pagination-controls" className="ds-pagination-controls">
          {/* native disabled는 경계·로딩 전환 때 포커스를 잃는다. aria-disabled와 이벤트 차단을 함께 쓴다. */}
          <Button data-slot="pagination-previous" variant="ghost" size="sm" iconOnly aria-label="이전 페이지"
            aria-disabled={disabled || current === 1} tabIndex={disabled || current === 1 ? -1 : 0}
            onClick={() => move(current - 1)}><ChevronLeft aria-hidden="true" /></Button>
          <div data-slot="pagination-pages" className="ds-pagination-pages">
            {pageItems(current, count).map(item => typeof item === 'number'
              ? <Button key={item} data-slot="pagination-page" data-pagination-page={item} variant={item === current ? 'secondary' : 'ghost'} size="sm"
                aria-label={`${format(item)}페이지`} aria-current={item === current ? 'page' : undefined}
                aria-disabled={disabled} tabIndex={disabled ? -1 : 0} onClick={() => move(item)}>{format(item)}</Button>
              : <span key={item} data-slot="pagination-ellipsis" aria-hidden="true">…</span>)}
          </div>
          <span data-slot="pagination-position" className="ds-pagination-position tabular" aria-label={`${format(count)}페이지 중 ${format(current)}페이지`}>{format(current)} / {format(count)}</span>
          <Button data-slot="pagination-next" variant="ghost" size="sm" iconOnly aria-label="다음 페이지"
            aria-disabled={disabled || current === count} tabIndex={disabled || current === count ? -1 : 0}
            onClick={() => move(current + 1)}><ChevronRight aria-hidden="true" /></Button>
        </div>
      </>}
    </div>
  </nav>;
}
