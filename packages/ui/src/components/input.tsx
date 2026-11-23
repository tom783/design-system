import * as React from 'react';
import { Eye, EyeOff, Search, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { splitLayoutClassName } from '../lib/layout-class';

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
 * - 검색·비밀번호·앞 아이콘이 있으면 래퍼(`.ds-input-control`)가 바깥 요소가 된다. 이때 className 의
 *   폭·배치 클래스(w-·min-w-·max-w-·flex-1·basis·grow·shrink·self·m* 등)는 래퍼에, 나머지는 input 에
 *   붙는다. 래퍼가 없을 때와 같은 결과를 내기 위해서다 — `w-80` 이 안쪽에만 붙으면 래퍼(width:100%)가
 *   툴바 한 줄을 차지했다(2026-11-22 화면 시안).
 * - 단위 접미사(unit: 원·개·%·개월)는 값이 아니다(2026-11-23 디자인 총괄 규격, DESIGN §17.1.1).
 *   상자 안 오른쪽 끝 여백 12px 자리에 회색(text-tertiary)으로 그리고, 값은 그 왼쪽 4px 에서 끝난다.
 *   접미사 폭은 글꼴마다 달라 실제로 재서(ResizeObserver) 입력의 끝 여백과 래퍼 최소 폭에 더한다 —
 *   '개월'처럼 긴 접미사도 값과 겹치지 않고, 값이 들어갈 폭(120px 입력과 같은 94px)이 줄지 않는다.
 *   접미사 id 를 aria-describedby 맨 앞에 붙여 낭독기가 "39,000 원"으로 읽게 하고(Field 의 오류·설명 id 와
 *   합친다), 접미사 자체는 aria-hidden·user-select:none 이라 두 번 읽히거나 복사에 섞이지 않는다.
 */
export interface InputProps extends React.ComponentProps<'input'> {
  invalid?: boolean;
  /** 숫자·금액 입력. 고정폭 숫자와 우측 정렬을 적용한다. */
  numeric?: boolean;
  /** 장식용 앞쪽 아이콘. search는 기본 돋보기이며 null로 숨긴다. */
  leadingIcon?: React.ReactNode;
  /**
   * 단위 접미사(원·개·%·개월). 상자 안 오른쪽에 회색으로 표시하며 값·복사·제출에 섞이지 않는다.
   * 낭독기는 aria-describedby로 값 뒤에 읽는다. 금액·수량은 numeric과 함께 쓴다.
   */
  unit?: string;
}

// 측정 전(서버 렌더·첫 그리기) 추정 폭. 한글·% 한 글자가 대략 1em 이다. 측정이 곧 실제 폭으로 바꾼다.
const estimateUnitWidth = (unit: string) => `${Array.from(unit).length}em`;

export function Input({ className, invalid, numeric, leadingIcon, unit, type = 'text', onChange, onWheel, ref, ...props }: InputProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const unitRef = React.useRef<HTMLSpanElement | null>(null);
  const unitId = React.useId();
  const hasUnit = unit != null && unit !== '';
  const [unitWidth, setUnitWidth] = React.useState<number | null>(null);
  const [visible, setVisible] = React.useState(false);
  const [hasValue, setHasValue] = React.useState(() => String(props.defaultValue ?? '').length > 0);
  const setRef = React.useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof ref === 'function') return ref(node);
    if (ref) ref.current = node;
  }, [ref]);
  React.useEffect(() => { setVisible(false); }, [type]);
  React.useEffect(() => {
    const input = inputRef.current;
    const form = input?.form;
    let frame = 0;
    // reset 기본 동작이 값을 돌려놓은 다음 지우기 버튼도 동기화한다.
    const reset = () => { frame = requestAnimationFrame(() => setHasValue(Boolean(input?.value))); };
    form?.addEventListener('reset', reset);
    return () => { form?.removeEventListener('reset', reset); cancelAnimationFrame(frame); };
  }, [props.form, type]);
  // 그리기 전에 한 번 재고(추정 폭이 보이지 않게), 글꼴 로드·접미사 변경으로 폭이 바뀌면 다시 잰다.
  // 첫 값이 열리는 중인 대화상자의 scale 을 받아도 ResizeObserver 의 첫 관찰(변환 없는 배치 폭)이 곧 고친다.
  React.useLayoutEffect(() => {
    const node = unitRef.current;
    if (!node) return;
    setUnitWidth(node.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setUnitWidth(entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasUnit, unit]);
  const password = type === 'password';
  const search = type === 'search';
  const icon = leadingIcon === undefined && search ? <Search /> : leadingIcon;
  const hasIcon = icon != null && icon !== false;
  const clearable = search && !props.disabled && !props.readOnly &&
    (props.value !== undefined ? String(props.value).length > 0 : hasValue);
  const wrapped = password || search || hasIcon || hasUnit;
  // 접미사가 먼저다: 낭독기가 값 바로 뒤에 단위를 읽고("39,000 원") 이어서 Field 의 오류 → 설명을 읽는다.
  const describedBy = hasUnit
    ? [...new Set([unitId, ...(props['aria-describedby']?.split(/\s+/) ?? [])].filter(Boolean))].join(' ')
    : props['aria-describedby'];
  const { outer, inner } = wrapped ? splitLayoutClassName(className) : { outer: undefined, inner: className };
  const input = <input
    {...props}
    type={password && visible ? 'text' : type}
    ref={setRef}
    data-slot="input"
    aria-invalid={invalid || props['aria-invalid'] || undefined}
    aria-describedby={describedBy}
    className={cn(
      // 래퍼 안에서는 최소 폭을 래퍼가 정한다. 소비자의 min-w-* 가 래퍼에 붙어도 안쪽이 버티지 않게 한다.
      'h-[var(--control-h-md)] w-full', wrapped ? 'min-w-0' : 'min-w-[var(--field-min-w)]',
      'rounded-[var(--radius-md)] border bg-surface',
      'text-[length:var(--text-body-sm)] text-fg',
      'placeholder:text-fg-subtle',
      'transition-[border-color,box-shadow] duration-[var(--dur-fast)]',
      'disabled:cursor-not-allowed disabled:bg-sunken disabled:text-fg-disabled',
      invalid ? 'border-danger-ink' : 'border-field hover:border-fg-subtle',
      numeric && 'tabular text-right',
      (password || search) && 'ds-input-with-action',
      hasIcon ? 'ds-input-with-leading' : 'ps-3',
      hasUnit && 'ds-input-with-unit',
      !password && !search && !hasUnit && 'pe-3',
      inner,
    )}
    onChange={event => { setHasValue(Boolean(event.currentTarget.value)); onChange?.(event); }}
    onWheel={event => {
      onWheel?.(event);
      // number의 증감과 페이지 스크롤은 같은 기본 동작이다. 취소하면 스크롤도 막힌다.
      // 명세가 허용한 blur 경로로 증감만 피하고 브라우저의 스크롤 체인을 보존한다.
      if (!event.defaultPrevented && type === 'number' && document.activeElement === event.currentTarget) {
        event.currentTarget.blur();
      }
    }}
  />;
  if (!wrapped) return input;
  return <span data-slot="input-control" className={cn('ds-input-control', hasUnit && 'ds-input-control-with-unit', outer)}
    style={hasUnit ? { '--ds-input-unit-w': unitWidth === null ? estimateUnitWidth(unit) : `${unitWidth}px` } as React.CSSProperties : undefined}>
    {input}
    {/* 입력 뒤의 positioned 형제로 그려 바탕 위에 올린다. 포인터는 입력으로 통과한다. */}
    {hasIcon && <span data-slot="input-leading-icon" className="ds-input-leading-icon" aria-hidden="true">{icon}</span>}
    {/* 단위는 aria-describedby 로만 읽힌다. aria-hidden 은 훑어 읽기에서 두 번 읽히지 않게 한다(참조된 숨은 요소도 설명이 된다). */}
    {hasUnit && <span ref={unitRef} id={unitId} data-slot="input-unit" className="ds-input-unit" aria-hidden="true">{unit}</span>}
    {password && <button type="button" data-slot="input-action" className="ds-input-action"
      disabled={props.disabled} aria-label={visible ? '비밀번호 숨기기' : '비밀번호 표시'} aria-pressed={visible}
      onClick={() => setVisible(current => !current)}>
      {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
    </button>}
    {clearable && <button type="button" data-slot="input-action" className="ds-input-action" aria-label="검색어 지우기"
      onClick={() => {
        const node = inputRef.current;
        if (!node) return;
        // React 값 추적기를 우회하는 네이티브 setter + input 이벤트로 제어/비제어 onChange를 함께 알린다.
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
        setter.call(node, '');
        node.dispatchEvent(new Event('input', { bubbles: true }));
        setHasValue(Boolean(node.value));
        node.focus();
      }}><X aria-hidden="true" /></button>}
  </span>;
}
