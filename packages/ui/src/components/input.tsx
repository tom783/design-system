import * as React from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
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
  ({ className, invalid, numeric, type = 'text', onChange, onWheel, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
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
    const password = type === 'password';
    const search = type === 'search';
    const clearable = search && !props.disabled && !props.readOnly &&
      (props.value !== undefined ? String(props.value).length > 0 : hasValue);
    const input = <input
      {...props}
      type={password && visible ? 'text' : type}
      ref={setRef}
      data-slot="input"
      aria-invalid={invalid || props['aria-invalid'] || undefined}
      className={cn(
        'h-[var(--control-h-md)] w-full min-w-[var(--field-min-w)]',
        'rounded-[var(--radius-md)] border bg-surface',
        'text-[length:var(--text-body-sm)] text-fg',
        'placeholder:text-fg-subtle',
        'transition-[border-color,box-shadow] duration-[var(--dur-fast)]',
        'disabled:cursor-not-allowed disabled:bg-sunken disabled:text-fg-disabled',
        invalid ? 'border-danger-ink' : 'border-field hover:border-fg-subtle',
        numeric && 'tabular text-right',
        (password || search) ? 'ds-input-with-action ps-3' : 'px-3',
        className,
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
    if (!password && !search) return input;
    return <span data-slot="input-control" className="ds-input-control">
      {input}
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
  },
);
Input.displayName = 'Input';
