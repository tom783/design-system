import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { Slot, Slottable } from '../internal/slot';

/**
 * 버튼
 *
 * 설계 근거
 * - 색만으로 역할을 구분하지 않는다. `danger` 는 반드시 아이콘이나 명시적 동사
 *   ("삭제", "반품 확정")와 함께 쓴다. 브랜드 레드와 에러 레드는 ΔE 10.5 로
 *   분리되어 있지만, 색각 이상 사용자와 모노크롬 출력에서는 그 차이가 사라진다.
 * - `whitespace-nowrap` + `min-w-*` 조합으로 라벨이 길어져도 줄바꿈되거나
 *   아이콘과 겹치지 않는다. 라벨이 컨테이너를 넘치면 말줄임으로 처리한다.
 * - 높이는 토큰에서 가져온다. `lg` 44px 는 터치 최소 타깃 기준이며,
 *   태블릿으로 쓰는 물류 화면에서는 이 크기를 기본으로 쓴다.
 * - 기본 `type` 은 'button' 이다. HTML 기본값은 'submit' 이라, 폼 안에 놓인
 *   필터·내보내기 버튼이 의도치 않게 폼을 제출한다. 제출 버튼은 type="submit" 을 명시한다.
 * - 누르는 느낌은 1px 아래로 내려가는 것으로만 표현한다. 데이터 입력이 반복되는
 *   화면에서 과한 모션은 피로를 만든다. 지속시간은 --dur-fast(140ms).
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-semibold select-none cursor-pointer',
    'rounded-[var(--radius-md)] border',
    'transition-[background-color,border-color,color,transform]',
    'duration-[var(--dur-fast)] ease-[var(--ease-standard)]',
    'active:translate-y-px',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0',
    '[&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        // 주요 액션. 화면당 하나만 쓴다 — 둘 이상이면 위계가 사라진다.
        primary: 'bg-action border-action-edge text-fg-on-brand hover:bg-action-hover',
        // 기본 액션. 데이터 화면의 대부분 버튼은 이것이어야 한다.
        secondary: 'bg-surface border-line-strong text-fg hover:bg-hovered',
        // 보조 액션. 테이블 행 내부처럼 밀도가 높은 곳.
        ghost: 'bg-transparent border-transparent text-fg-muted hover:bg-hovered hover:text-fg',
        // 파괴적 액션. 되돌릴 수 없는 작업에만.
        danger: 'bg-action-danger border-action-danger-edge text-fg-on-brand hover:bg-action-danger-hover',
      },
      size: {
        // text-[length:...] 로 명시해야 한다. text-[var(--x)] 는 Tailwind 가
        // font-size 인지 color 인지 판별할 수 없어 color 로 컴파일되고,
        // tailwind-merge 도 색상으로 간주해 text-fg-on-brand 를 지워버린다.
        sm: 'h-[var(--control-h-sm)] min-w-12 px-3 text-[length:var(--text-caption)]',
        md: 'h-[var(--control-h-md)] min-w-16 px-3.5 text-[length:var(--text-body-sm)]',
        lg: 'h-[var(--control-h-lg)] min-w-20 px-5 text-[length:var(--text-body)]',
      },
      /** 아이콘만 있는 버튼. 반드시 aria-label 을 함께 준다. */
      iconOnly: { true: 'px-0 min-w-0 aspect-square', false: '' },
    },
    defaultVariants: { variant: 'secondary', size: 'md', iconOnly: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** 단일 자식 링크 등에 스타일·이벤트·ref를 합친다. */
  asChild?: boolean;
  /** 라벨 왼쪽 아이콘. 동작을 설명하는 것만 쓴다. */
  leadingIcon?: React.ReactNode;
  /** 라벨 오른쪽 아이콘. 방향·열림 상태 표시에만 쓴다. */
  trailingIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, iconOnly, asChild = false, leadingIcon, trailingIcon, children, type = 'button', ...props },
    ref,
  ) => {
    const Component = asChild ? Slot : 'button';
    return <Component
      ref={ref}
      type={asChild ? undefined : type}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, iconOnly }), className)}
      {...props}
    >
      {leadingIcon}
      {/* Slot 대상은 링크 자체로 유지하고, 아이콘과 말줄임 라벨은 그 안에 배치한다. */}
      {asChild
        ? <Slottable child={children}>{label => <span className="truncate">{label}</span>}</Slottable>
        : children ? <span className="truncate">{children}</span> : null}
      {trailingIcon}
    </Component>;
  },
);
Button.displayName = 'Button';

export { buttonVariants };
