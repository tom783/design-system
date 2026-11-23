import * as React from 'react';
import { cn } from '../../lib/cn';

/** 설명 목록의 한 쌍. 순서가 곧 읽는 순서다. */
export interface DescriptionListItem {
  /** 키. 끝에 콜론을 붙이지 않는다. */
  label: React.ReactNode;
  /** 값. 생략·null·false·빈 문자열·빈 배열은 '—'(화면 낭독기는 "없음")로 표시한다. 숫자 0은 값이다. */
  value?: React.ReactNode;
  /** 합계 묶음의 마지막 쌍. 라벨·값 600, 위 구분선 1px과 위 여백 8px. */
  emphasis?: boolean;
}

// 루트는 컨테이너 쿼리 기준(카드 폭)이 되는 div 다. <dl> 은 자기 폭을 스스로 질의할 수 없어 한 겹 감싼다.
// 나머지 props·ref 는 이 div 로 간다(DESIGN.md §6.3 — DOM 을 펼치면 그 요소 타입의 ref).
export interface DescriptionListProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  items: DescriptionListItem[];
  /** 2는 카드 폭 640px(부품 폭 606px) 이상에서만 두 열이다. 열 순서는 위→아래, 왼쪽 열 다음 오른쪽 열이다. */
  columns?: 1 | 2;
  /** end는 값을 끝에 맞추고 고정폭 숫자를 쓴다(금액·수량 합계). 세로형으로 접지 않는다. */
  align?: 'start' | 'end';
  /** 라벨 열 고정 폭(rem). 같은 화면 여러 카드의 라벨 열을 맞출 때만 쓴다. 생략하면 5.5~10rem 안에서 가장 긴 라벨에 맞춘다. */
  labelWidth?: number;
}

// 빈 값을 빈칸·"-"·"N/A"로 섞어 쓰지 않도록 부품이 한 표기로 바꾼다. React 가 아무것도 그리지 않는 값이 기준이다.
function isEmpty(value: React.ReactNode) {
  if (value === undefined || value === null || typeof value === 'boolean') return true;
  if (typeof value === 'string') return value.trim() === '';
  return Array.isArray(value) && value.length === 0;
}

export function DescriptionList({ items, columns = 1, align = 'start', labelWidth, className, style, ref, ...props }: DescriptionListProps) {
  const fixed = typeof labelWidth === 'number' && Number.isFinite(labelWidth) && labelWidth > 0;
  // 두 열은 위→아래로 채운 뒤 오른쪽 열로 넘어간다. 행 수를 알아야 grid-auto-flow: column 이 열을 끊는다.
  const rows = Math.max(1, Math.ceil(items.length / 2));
  return <div {...props} ref={ref} data-slot="description-list" data-columns={columns} data-align={align}
    data-label-width={fixed ? '' : undefined} className={cn('ds-description-list', className)}
    style={fixed ? { ...style, ['--ds-description-list-label' as string]: `${labelWidth}rem` } : style}>
    <dl data-slot="description-list-items" style={columns === 2 ? { ['--ds-description-list-rows' as string]: rows } : undefined}>
      {items.map((item, index) => <div key={index} data-slot="description-list-item" data-emphasis={item.emphasis || undefined}>
        <dt data-slot="description-list-term">{item.label}</dt>
        <dd data-slot="description-list-details">{isEmpty(item.value)
          ? <span data-slot="description-list-empty"><span aria-hidden="true">—</span><span className="sr-only">없음</span></span>
          : item.value}</dd>
      </div>)}
    </dl>
  </div>;
}
