import * as React from 'react';
import { Ellipsis, LoaderCircle } from 'lucide-react';
import { Button } from '../button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../dialog';
import { cn } from '../../lib/cn';
import { fieldListErrorTarget } from '../field-list/error-target';

/**
 * 폼 하단 고정 액션 줄 — 등록·편집 폼의 취소·저장(과 편집의 삭제)을 AppShell 본문 바닥에 고정한다
 * (DESIGN.md §19.5 · 디자인 총괄 규칙 표 F-1~F-13 · Figma 198:3939 r2).
 *
 * 설계 근거
 * - **본문 바닥에 늘 같은 자리(FD-1 A).** 저장이 스크롤 위치·폼 길이와 상관없이 같은 곳에 있다. 짧은 폼도 바닥에
 *   붙도록 줄의 조상(세로 flex)을 본문 높이까지 늘리고 줄은 margin-top:auto 로 내려간다(CSS :has, 서버 첫 그림과 같다).
 * - 가로 범위·sticky 오프셋은 AppShell 본문 여백 변수(--app-shell-gutter, 24 · 1024 미만 16)를 쓴다. 고정 24 는
 *   1024 미만에서 줄이 양옆 8px 넘쳐 본문이 가로로 스크롤됐다(1단계 관찰 1).
 * - 줄은 본문 전체 폭, 버튼 묶음은 폼 열과 같은 최대 폭(contentMaxWidth) — 저장 오른끝 = 폼 열 오른끝(관찰 5).
 * - 높이 63 = 세로 여백 12 + 버튼 38 + 윗선 1. 바탕은 일괄 작업 바와 같은 중립 면 bg-sunken + border-subtle(FD-2 B),
 *   그림자 없음(A 정밀 플랫 — 평면 위 sticky 요소).
 * - 순서: [삭제(편집만, danger 글자 ghost)] · · · [상태] [취소] [저장(주요 하나, 오른쪽 끝)]. 삭제와 저장 사이 최소 24px.
 *   DOM 순서 = 보이는 순서라 Tab 도 마지막 입력 → 삭제 → 오류 링크 → 취소 → 저장이다(F-11).
 * - 가림 방지: 줄이 있으면 본문 scroll-padding-bottom 79(63 + 16). Tab·오류 이동으로 스크롤될 때 칸이 줄 위에
 *   보인다 — 1단계 1024·768 에서 포커스 칸이 줄 밑에 완전히 가렸다(관찰 2).
 * - 저장 중: 주요색 그대로 스피너 + '저장 중…'(흐리게 하지 않는다). 버튼을 disabled 로 만들면 포커스가 body 로
 *   떨어지므로 aria-disabled 로 두고, 그동안의 제출(클릭·Enter 암묵 제출)은 줄이 막는다. 취소·삭제는 비활성.
 * - 삭제는 되돌릴 수 없어 확인창(AlertDialog, 기본 포커스 '계속 편집', 확정은 채운 danger)을 거친다(§6.2). 닫히면
 *   연 버튼(삭제 또는 ⋯)으로 포커스가 돌아온다.
 * - 480px 미만: 상태 문구 숨김(오류는 폼 위 요약으로), 삭제는 '더 보기'(⋯ 38×38) 메뉴로, 취소·저장은 같은 폭.
 */
export interface FormActionBarProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** 저장(주요) 버튼 글자. type=submit 이다. 기본 '저장', 저장 중에는 '{submitLabel} 중…'. */
  submitLabel?: string;
  /** 줄을 `<form>` 밖에 둘 때 그 form 의 id. 저장 버튼의 form 속성으로 연결한다. */
  form?: string;
  /** 취소 버튼을 눌렀다. 생략하면 취소 버튼이 없다. Esc 로는 부르지 않는다. */
  onCancel?: () => void;
  /** 취소 버튼 글자. 기본 '취소'. */
  cancelLabel?: string;
  /** 저장 중이다. 저장 버튼이 스피너와 '저장 중…'을 보이고 취소·삭제는 비활성, 다시 제출되지 않는다. */
  saving?: boolean;
  /** 저장하지 않은 변경이 있다. 상태 자리에 '저장하지 않은 변경 있음'을 보인다. */
  dirty?: boolean;
  /** 저장에 실패한 칸 수. 반복 입력 줄(FieldList)의 묶음 오류도 1개로 센다. 1 이상이면 상태 자리가 '오류 N개' 링크다.
   * 폼 위 오류 요약은 앱이 그대로 둔다. */
  errorCount?: number;
  /** '오류 N개'를 눌렀다. 생략하면 폼 안 첫 aria-invalid 칸으로 포커스를 옮긴다 — 첫 오류가 FieldList 묶음 오류면
   * 빈 목록은 추가 버튼, 아니면 그 목록의 첫 오류 칸이다. */
  onErrorClick?: () => void;
  /** 편집 화면의 삭제를 확인창에서 확정했다. 주면 왼쪽 끝에 삭제(480px 미만은 더 보기 메뉴)가 생긴다. */
  onDelete?: () => void;
  /** 삭제 버튼·확정 버튼 글자. 기본 '삭제'. 확인창 제목은 '{deleteLabel}하시겠습니까?'. */
  deleteLabel?: string;
  /** 삭제 확인창 본문 — 결과와 되돌릴 방법을 함께 쓴다(§6.2). 기본 '삭제하면 되돌릴 수 없습니다.' */
  deleteDescription?: React.ReactNode;
  /** 버튼 묶음의 최대 폭. 폼 열의 최대 폭과 같게 준다. 기본 48rem(768px). */
  contentMaxWidth?: React.CSSProperties['maxWidth'];
}

const INVALID = '[aria-invalid="true"]:not([disabled])';

export function FormActionBar({
  submitLabel = '저장', form, onCancel, cancelLabel = '취소', saving = false, dirty = false, errorCount = 0,
  onErrorClick, onDelete, deleteLabel = '삭제', deleteDescription = '삭제하면 되돌릴 수 없습니다.',
  contentMaxWidth, className, style, ref, ...props
}: FormActionBarProps) {
  const root = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(ref, () => root.current!);
  const [confirm, setConfirm] = React.useState(false);
  // 확인창을 연 버튼(삭제 또는 ⋯). 닫히면 그리로 포커스를 돌린다 — 마우스 클릭이 버튼에 포커스를 주지 않는 브라우저
  // (Safari)에서는 '열 때 포커스가 있던 곳'이 body 라 복귀할 곳이 없었다.
  const opener = React.useRef<HTMLElement | null>(null);
  // 메뉴 항목은 닫히며 사라진다. 메뉴가 ⋯ 로 포커스를 돌려준 뒤에 확인창을 연다.
  const pendingConfirm = React.useRef(false);
  const moreRef = React.useRef<HTMLButtonElement>(null);
  const errors = Math.max(0, Math.trunc(Number.isFinite(errorCount) ? errorCount : 0));

  const owner = React.useCallback((): HTMLFormElement | null => {
    if (form) {
      const element = root.current?.ownerDocument.getElementById(form);
      return element instanceof HTMLFormElement ? element : null;
    }
    return root.current?.closest('form') ?? null;
  }, [form]);

  // 저장 중에는 폼 제출을 받지 않는다. 입력칸 Enter(암묵 제출)·requestSubmit 도 같은 submit 사건을 거친다.
  // 폼 요소 자신에서 막아야 React 의 onSubmit(루트 위임)까지 올라가지 않는다.
  React.useEffect(() => {
    const target = saving ? owner() : null;
    if (!target) return;
    const block = (event: Event) => { event.preventDefault(); event.stopImmediatePropagation(); };
    target.addEventListener('submit', block);
    return () => target.removeEventListener('submit', block);
  }, [saving, owner]);

  const goToFirstError = () => {
    if (onErrorClick) { onErrorClick(); return; }
    const scope = owner() ?? root.current?.ownerDocument;
    const first = scope?.querySelector<HTMLElement>(INVALID);
    // 반복 입력 줄의 묶음 오류는 fieldset 에 걸린다(포커스를 받지 못한다). 빈 목록이면 추가 버튼, 아니면 첫 오류 칸(L-15).
    (first?.matches('[data-slot="field-list"]') ? fieldListErrorTarget(first) : first)?.focus();
  };

  const status = errors > 0 ? null : saving ? null : dirty ? '저장하지 않은 변경 있음' : null;
  const hasDelete = onDelete !== undefined;

  return <div {...props} ref={root} data-slot="form-action-bar" data-saving={saving || undefined}
    className={cn('ds-form-action-bar', className)}
    style={{ ...style, ...(contentMaxWidth !== undefined ? { '--form-action-bar-content-max-width': typeof contentMaxWidth === 'number' ? `${contentMaxWidth}px` : contentMaxWidth } as React.CSSProperties : null) }}>
    <div data-slot="form-action-bar-content" className="ds-form-action-bar-content">
      {hasDelete && <div data-slot="form-action-bar-danger" className="ds-form-action-bar-danger">
        {/* danger 글자 ghost. 글자색은 테마별 글자 토큰(danger-ink) — 채움 빨강은 확인창 확정에서만 쓴다(§6.2). */}
        <span className="ds-form-action-bar-delete-slot">
          <Button variant="ghost" data-slot="form-action-bar-delete" className="text-danger-ink hover:text-danger-ink" disabled={saving}
            onClick={event => { opener.current = event.currentTarget; setConfirm(true); }}>{deleteLabel}</Button>
        </span>
        <span className="ds-form-action-bar-more-slot"><DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button ref={moreRef} variant="ghost" iconOnly aria-label="더 보기" data-slot="form-action-bar-more" disabled={saving}>
              <Ellipsis aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" sideOffset={6}
            onCloseAutoFocus={() => {
              if (!pendingConfirm.current) return;
              pendingConfirm.current = false;
              opener.current = moreRef.current;
              // 메뉴가 트리거로 포커스를 돌려준 다음 프레임에 연다.
              requestAnimationFrame(() => setConfirm(true));
            }}>
            <DropdownMenuItem destructive onSelect={() => { pendingConfirm.current = true; }}>{deleteLabel}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu></span>
      </div>}
      <div data-slot="form-action-bar-actions" className="ds-form-action-bar-actions">
        {/* 늘 DOM 에 있는 live region — 저장 중·변경 있음이 읽힌다. 오류는 폼 위 요약(role=alert)이 알린다. */}
        <span data-slot="form-action-bar-status" role="status" data-empty={status ? undefined : ''} className="ds-form-action-bar-status">
          {status}{saving && <span className="sr-only">{`${submitLabel} 중`}</span>}
        </span>
        {errors > 0 && <button type="button" data-slot="form-action-bar-errors" className="ds-form-action-bar-errors"
          aria-label={`오류 ${errors.toLocaleString('ko-KR')}개, 첫 오류 칸으로 이동`} onClick={goToFirstError}>
          {`오류 ${errors.toLocaleString('ko-KR')}개`}
        </button>}
        {onCancel && <Button data-slot="form-action-bar-cancel" className="ds-form-action-bar-cancel" disabled={saving} onClick={onCancel}>
          {cancelLabel}
        </Button>}
        <Button type="submit" variant="primary" form={form} data-slot="form-action-bar-submit" className="ds-form-action-bar-submit"
          aria-disabled={saving || undefined}
          leadingIcon={saving ? <LoaderCircle aria-hidden="true" className="ds-form-action-bar-spinner" /> : undefined}
          onClick={saving ? event => event.preventDefault() : undefined}>
          {saving ? `${submitLabel} 중…` : submitLabel}
        </Button>
      </div>
    </div>
    {hasDelete && <AlertDialog open={confirm} onOpenChange={setConfirm}>
      <AlertDialogContent onCloseAutoFocus={event => {
        if (opener.current?.isConnected) { event.preventDefault(); opener.current.focus(); }
      }}>
        <AlertDialogHeader>
          <AlertDialogTitle>{`${deleteLabel}하시겠습니까?`}</AlertDialogTitle>
          <AlertDialogDescription>{deleteDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>계속 편집</AlertDialogCancel>
          <AlertDialogAction variant="danger" onClick={onDelete}>{deleteLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>}
  </div>;
}
