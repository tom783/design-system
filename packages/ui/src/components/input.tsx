import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * 입력 필드
 *
 * 설계 근거
 * - 경계선은 `border-field`(= neutral-600, 흰 배경 대비 4.17:1)를 쓴다.
 *   많은 시스템이 쓰는 연회색(neutral-200)은 1.31:1 로 WCAG 1.4.11(3:1)을
 *   위반한다. "입력할 수 있는 칸"이라는 정보를 경계선이 전달하므로 장식이 아니다.
 * - 높이 38px, 좌우 여백 12px. 값이 길어지면 줄바꿈 대신 가로 스크롤된다
 *   (입력 중 레이아웃이 흔들리면 커서 위치를 잃는다).
 * - 에러는 색만으로 표시하지 않는다. `invalid` 가 켜지면 aria-invalid 와
 *   설명 연결(aria-describedby)이 함께 필요하다 — Field 컴포넌트가 묶어준다.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  /** 숫자·금액 입력. 고정폭 숫자와 우측 정렬을 적용한다. */
  numeric?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, numeric, ...props }, ref) => (
    <input
      ref={ref}
      data-slot="input"
      aria-invalid={invalid || undefined}
      className={cn(
        'h-[var(--control-h-md)] w-full min-w-[var(--field-min-w)] px-3',
        'rounded-[var(--radius-md)] border bg-surface',
        'text-[length:var(--text-body-sm)] text-fg',
        'placeholder:text-fg-subtle',
        'transition-[border-color,box-shadow] duration-[var(--dur-fast)]',
        'disabled:cursor-not-allowed disabled:bg-sunken disabled:text-fg-disabled',
        invalid ? 'border-danger-ink' : 'border-field hover:border-fg-subtle',
        numeric && 'tabular text-right',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
