import * as React from 'react';
import { cn } from '../../lib/cn';

export type FormRowProps = React.ComponentProps<'div'>;

/**
 * 같은 줄에 놓인 Field 들을 **입력칸 기준**으로 맞춘다.
 *
 * Field 는 레이블 → 설명 → 입력 → 오류를 세로로 쌓는다. 같은 줄 두 Field 중 한쪽만 설명이
 * 있으면 그쪽 입력칸이 설명(20) + 간격(4) = 24px 내려가 어긋난다(2026-11-22 등록 화면 시안 실측).
 * FormRow 는 네 행(레이블·설명·입력·오류)을 줄 전체가 함께 쓰게 한다(CSS subgrid).
 * 한쪽에만 설명이 있으면 다른 쪽에 같은 높이의 빈 행이 예약되고, 둘 다 없으면 그 행은 0 이라
 * 필드 피치 98px(레이블 20+4 · 입력 38 · 4 · 오류 20 · 간격 12)는 그대로다.
 *
 * 행 배정은 Field 자식의 DOM 순서가 아니라 data-slot 으로 한다. 레이블·설명·오류가 아닌 자식
 * (입력과 Select 가 폼 안에서 덧붙이는 숨은 native select 등)은 모두 입력 행에 겹쳐 둔다.
 * 컨테이너 폭 480px 미만에서는 한 열로 접고 Field 를 평소처럼 쌓는다 — 공유 행이 없으므로
 * 빈 설명 행도 남지 않는다. 직접 자식은 Field 이거나 Field 와 같은 높이 규칙을 따르는 요소다.
 */
export function FormRow({ className, children, ref, ...props }: FormRowProps) {
  // 컨테이너 쿼리는 자기 자신을 잴 수 없어 바깥(컨테이너)과 안쪽(격자)을 나눈다.
  return <div {...props} ref={ref} data-slot="form-row" className={cn('ds-form-row', className)}>
    <div data-slot="form-row-grid" className="ds-form-row-grid">{children}</div>
  </div>;
}
