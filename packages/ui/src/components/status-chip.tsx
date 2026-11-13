import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { CircleCheck, CircleAlert, Info, Minus, TriangleAlert } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * 상태 칩
 *
 * 설계 근거
 * - **톤마다 모양이 다른 아이콘을 쓴다.** 모든 톤에 같은 원형 점을 쓰면 톤 사이의
 *   차이는 결국 색뿐이고, 색각 이상 사용자(남성 약 8%)와 흑백 인쇄에서 구별이
 *   사라진다. 삼각형(경고) · 원+체크(완료) · 원+느낌표(에러)처럼 실루엣이 달라야
 *   비로소 색이 아닌 신호가 된다. WCAG 1.4.1 이 요구하는 것은 "색이 유일한
 *   수단이 아닐 것"이고, 여기서는 **라벨 텍스트와 아이콘 모양** 둘이 그 역할을 한다.
 * - 글자/배경은 틴트(50단계) + 진한 글자(700단계)로 전부 4.5:1 이상이다.
 * - 라벨이 길어질 수 있으므로("상품준비중(부분출고 2/5)") 말줄임 + title 속성으로
 *   전체 값을 남긴다. 고정 너비를 주지 않는다.
 * - 아이콘은 `aria-hidden` 이다. 의미는 라벨 텍스트가 전달하므로 스크린리더에
 *   중복 낭독될 필요가 없다.
 */
const chipVariants = cva(
  [
    'inline-flex max-w-full items-center gap-1.5 whitespace-nowrap',
    'rounded-[var(--radius-full)] px-2.5 py-0.5',
    'text-[length:var(--text-caption)] font-semibold leading-5',
  ],
  {
    variants: {
      tone: {
        neutral: 'bg-sunken text-fg-muted',
        info: 'bg-info-tint text-info-ink',
        warning: 'bg-warning-tint text-warning-ink',
        success: 'bg-success-tint text-success-ink',
        danger: 'bg-danger-tint text-danger-ink',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

type Tone = NonNullable<VariantProps<typeof chipVariants>['tone']>;

/** 톤별 기본 아이콘. 색이 아니라 실루엣으로 구별되도록 서로 다른 모양을 골랐다. */
const TONE_ICON: Record<Tone, React.ComponentType<{ className?: string }>> = {
  neutral: Minus,
  info: Info,
  warning: TriangleAlert,
  success: CircleCheck,
  danger: CircleAlert,
};

export interface StatusChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof chipVariants> {
  /** 톤 기본 아이콘을 다른 것으로 바꿀 때만 쓴다. */
  icon?: React.ReactNode;
  /**
   * 아이콘을 숨긴다. 같은 열의 모든 셀이 이미 상태 열임이 명확하고
   * 라벨 텍스트만으로 충분할 때에 한해 쓴다. 색만 남는 상태가 되므로 기본값은 false.
   */
  hideIcon?: boolean;
}

export function StatusChip({
  className,
  tone,
  icon,
  hideIcon = false,
  children,
  ...props
}: StatusChipProps) {
  const label = typeof children === 'string' ? children : undefined;
  const Icon = TONE_ICON[tone ?? 'neutral'];
  return (
    <span
      data-slot="status-chip"
      data-tone={tone ?? 'neutral'}
      title={label}
      className={cn(chipVariants({ tone }), className)}
      {...props}
    >
      {hideIcon ? null : (icon ?? <Icon className="size-3.5 shrink-0" aria-hidden="true" />)}
      <span className="truncate">{children}</span>
    </span>
  );
}

export { chipVariants };
