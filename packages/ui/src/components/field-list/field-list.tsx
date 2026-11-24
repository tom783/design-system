import * as React from 'react';
import { CircleAlert, Plus, Trash2 } from 'lucide-react';
import { Button } from '../button';
import { toast } from '../toast/toast';
import { cn } from '../../lib/cn';

/**
 * 반복 입력 줄 — 같은 칸 묶음(품목명·수량·중량)을 여러 줄 입력받는다(DESIGN.md §11.10 · 디자인 총괄 규칙 표
 * L-1~L-17 · Figma 203:4~7 r1).
 *
 * 설계 근거
 * - **표 형 줄(LD-1 B).** 그릇(이 부품 자신의 폭) 640px 이상은 열 머리를 한 번만 쓰고 줄마다 입력칸만 놓는다 —
 *   줄 피치 46(입력 38 + 간격 8), 열 간격 16(FormRow 와 같음). 도그푸딩 6 에서 AI 가 카드 안에 줄마다 테두리 상자를
 *   만들어 390 에서 품목 5개가 화면 3장이었다. 640 미만은 줄 머리('품목 2' + 삭제) → 첫 칸 전체 폭 → 숫자 칸 둘씩
 *   (LD-3 A), 줄 사이 border-subtle 선·위아래 16. 레이아웃은 CSS 컨테이너 쿼리라 서버 첫 그림과 같다.
 * - **묶음 오류(LD-2 A).** 목록 전체 오류(품목 0개·최대 초과)는 목록 머리 바로 아래 한 줄 — Field 오류와 같은 아이콘 +
 *   위험색 문장, 크기만 body-sm. 새 Alert 모양을 만들지 않는다. fieldset 에 aria-invalid·aria-describedby.
 * - 칸 오류는 Field 와 같은 모양(칸 아래 아이콘 16 + caption). 넓은 폭은 오류가 있는 줄만 아래로 늘어난다(제출 시점
 *   검증이라 아래 줄 밀림을 허용한다 — Field 처럼 줄마다 20px 를 예약하면 오류 없는 목록이 줄당 24px 길어진다).
 * - 입력 이름은 '품목 2 수량'(줄 번호 + 열 이름). 넓은 폭은 레이블을 줄마다 반복하지 않으므로 이름을 부품이 붙인다.
 * - 삭제는 확인창 없이 바로 지우고, 입력이 있던 줄이면 5초 동안 '되돌리기' 토스트를 띄운다(L-7). 지운 항목 객체를
 *   그대로 다시 넣으므로 값은 앱이 소유한다(제어 전용 — value·onValueChange).
 * - 포커스: 추가 → 새 줄 첫 칸. 삭제 → 다음 줄 삭제 → 이전 줄 삭제 → 추가 버튼(L-8·자가 점검).
 */
export interface FieldListColumn<T> {
  /** 열 식별자. 항목에 같은 이름의 값이 있으면 '입력이 있던 줄'(되돌리기 토스트)을 그 값으로 가린다. */
  key: string;
  /** 열 이름 — 넓은 폭 열 머리, 좁은 폭 칸 레이블, 입력 이름('품목 2 수량')에 쓴다. */
  label: string;
  required?: boolean;
  /** 숫자·단위 칸. 넓은 폭 minmax(8rem, 1fr), 좁은 폭은 둘씩 한 줄. 기본은 글자 칸(넓은 폭 2fr, 좁은 폭 전체 폭). */
  numeric?: boolean;
  /** 칸 입력 하나. id·이름·오류 연결(aria-*)·required 는 부품이 붙인다(Field 와 같다). */
  render: (item: T, context: FieldListCellContext<T>) => React.ReactElement<FieldListControlProps>;
  /** 칸 오류 문구. 칸 아래에 Field 오류 모양으로 보이고 입력 테두리가 위험색이 된다. */
  error?: (item: T, index: number) => React.ReactNode;
}

export interface FieldListCellContext<T> {
  /** 0 부터. 화면의 줄 번호는 index + 1 이다. */
  index: number;
  /** 이 줄 항목에 값을 합쳐 onValueChange 를 부른다. 한 이벤트에서 여러 번 불러도 앞의 변경을 잃지 않는다. */
  update: (patch: Partial<T>) => void;
}

/** 칸 하나로 좁힐 수 없는 줄 전체 오류(예: 같은 품목이 두 번). column 을 주면 그 칸 테두리도 위험색이 된다. */
export interface FieldListRowError {
  message: React.ReactNode;
  column?: string;
}

type FieldListControlProps = React.AriaAttributes & { id?: string; required?: boolean };

export interface FieldListProps<T> extends Omit<React.ComponentProps<'fieldset'>, 'children' | 'defaultValue'> {
  /** 목록 이름(legend). 예: '품목'. */
  label: React.ReactNode;
  /** 섹션·카드 제목이 같은 말이면 legend 를 시각적으로 숨긴다(낭독기에는 남는다). 같은 말을 두 번 쓰지 않는다. */
  hideLabel?: boolean;
  /** 줄 이름 — '품목 2', '품목 2 삭제', '품목 추가'. 기본은 label(글자일 때). */
  itemLabel?: string;
  /** 1~4칸. 5칸 이상이거나 칸마다 설명이 필요하면 목록 + 옆 패널(Sheet) 편집을 쓴다. */
  columns: FieldListColumn<T>[];
  value: T[];
  onValueChange: (value: T[]) => void;
  /** '추가'가 끝에 붙일 빈 항목. min 보다 적게 시작하면 이것으로 채운다. */
  createItem: () => T;
  /** 줄의 고유 키. 생략하면 항목의 id, 없으면 부품이 추가·삭제를 따라 붙인 키를 쓴다. */
  getKey?: (item: T, index: number) => React.Key;
  /** 최소 줄 수(기본 0). 닿으면 삭제가 비활성이다(숨기지 않는다). 1 이상이면 빈 줄 min 개로 시작한다. */
  min?: number;
  /** 최대 줄 수(기본 없음). 닿으면 추가가 비활성이고 옆에 '최대 N개'가 보인다. */
  max?: number;
  /** 묶음 오류 — 목록 전체에 걸린 오류(예: '품목을 1개 이상 넣어 주세요'). 목록 머리 아래 한 줄. */
  error?: React.ReactNode;
  /** 줄 오류. 문구, 또는 원인 칸을 함께 주는 { message, column }. */
  rowError?: (item: T, index: number) => React.ReactNode | FieldListRowError;
  /** 추가 버튼 글자. 기본 '{itemLabel} 추가'. */
  addLabel?: string;
  /** 빈 목록 문구. 기본 '{itemLabel}이(가) 없습니다'. */
  emptyText?: React.ReactNode;
}

const UNDO_MS = 5000;
const blank = (value: unknown) => value == null || value === '' || (Array.isArray(value) && value.length === 0);
const FILLABLE = 'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]), textarea';
const FOCUSABLE = ':is(input, textarea, select, button, [tabindex]):not([disabled]):not([type="hidden"]):not([aria-hidden="true"]):not([tabindex="-1"])';

/** 받침이 있으면 '이', 없으면 '가'. 한글이 아니면 '이(가)'. */
function subjectParticle(word: string) {
  const code = word.trim().codePointAt(word.trim().length - 1) ?? 0;
  if (code < 0xac00 || code > 0xd7a3) return '이(가)';
  return (code - 0xac00) % 28 === 0 ? '가' : '이';
}

function isRowError(value: unknown): value is FieldListRowError {
  return typeof value === 'object' && value !== null && !React.isValidElement(value) && 'message' in value;
}

type FocusRequest = { key: React.Key; target: 'first' | 'delete' } | { target: 'add' };

export function FieldList<T>({
  label, hideLabel = false, itemLabel, columns, value, onValueChange, createItem, getKey, min = 0, max,
  error, rowError, addLabel, emptyText, className, style, id, 'aria-describedby': describedBy, ref, ...props
}: FieldListProps<T>) {
  const baseId = React.useId();
  const noun = itemLabel ?? (typeof label === 'string' ? label : '항목');
  const errorId = `${baseId}-error`;
  const maxId = `${baseId}-max`;
  const hasError = !blank(error) && error !== false;
  const limit = max ?? Number.POSITIVE_INFINITY;
  const atMin = value.length <= min;
  const atMax = value.length >= limit;

  // 한 이벤트에서 update 를 여러 번 불러도 앞의 변경을 잃지 않도록 마지막으로 알린 값을 따로 든다.
  const latest = React.useRef(value);
  latest.current = value;
  const commit = (next: T[]) => { latest.current = next; onValueChange(next); };

  // 줄 키 — 항목의 id 가 없을 때 추가·삭제·되돌리기를 따라 키를 옮긴다. 입력하는 동안(update) 길이가 같아 키가 그대로라
  // 포커스·조합 중인 한글이 끊기지 않는다. 앱이 길이를 바꾼 값을 직접 넣으면 앞에서부터 재사용한다.
  const sequence = React.useRef(0);
  const ownKeys = React.useRef<React.Key[]>([]);
  const pendingKeys = React.useRef<React.Key[] | null>(null);
  const keys = React.useMemo<React.Key[]>(() => {
    const explicit = value.map((item, index) => getKey ? getKey(item, index)
      : (typeof item === 'object' && item !== null && 'id' in item ? (item as { id?: unknown }).id : undefined));
    if (explicit.every(key => typeof key === 'string' || typeof key === 'number') && new Set(explicit).size === explicit.length) {
      pendingKeys.current = null;
      return explicit as React.Key[];
    }
    const pending = pendingKeys.current;
    let next = pending && pending.length === value.length ? pending : ownKeys.current;
    if (next.length !== value.length) next = value.map((_, index) => ownKeys.current[index] ?? `r${++sequence.current}`);
    pendingKeys.current = null;
    ownKeys.current = next;
    return next;
  }, [value, getKey]);

  const rowNodes = React.useRef(new Map<React.Key, HTMLElement>());
  const addRef = React.useRef<HTMLButtonElement>(null);
  const focusRequest = React.useRef<FocusRequest | null>(null);
  const mounted = React.useRef(false);

  // L-10: min ≥ 1 이면 빈 줄 min 개로 시작한다(빈 상태가 보이지 않는다). 처음 한 번만 채운다.
  React.useEffect(() => {
    mounted.current = true;
    if (latest.current.length < min) {
      commit([...latest.current, ...Array.from({ length: min - latest.current.length }, () => createItem())]);
    }
    return () => { mounted.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 시작 상태만 맞춘다
  }, []);

  // 추가·삭제·되돌리기 뒤 포커스. 새 값이 그려진 다음에 옮긴다.
  React.useEffect(() => {
    const request = focusRequest.current;
    if (!request) return;
    focusRequest.current = null;
    if (request.target === 'add') { addRef.current?.focus(); return; }
    const row = rowNodes.current.get(request.key);
    const target = request.target === 'delete'
      ? row?.querySelector<HTMLElement>('[data-slot="field-list-delete"]:not([disabled])')
      : row?.querySelector<HTMLElement>(`[data-slot="field-list-cell"] ${FOCUSABLE}`);
    (target ?? addRef.current)?.focus();
  });

  const hasInput = (item: T, row: HTMLElement | undefined) => {
    if (typeof item !== 'object' || item === null) return !blank(item);
    const record = item as Record<string, unknown>;
    if (columns.some(column => column.key in record)) return columns.some(column => !blank(record[column.key]));
    // 항목 모양이 열 key 와 다르면(앱이 중첩해 보관) 줄의 입력칸 값으로 판단한다.
    return [...(row?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(FILLABLE) ?? [])].some(input => input.value !== '');
  };

  const add = () => {
    if (atMax || props.disabled) return;
    const item = createItem();
    const key = getKey ? getKey(item, latest.current.length) : `r${++sequence.current}`;
    pendingKeys.current = [...keys, key];
    focusRequest.current = { key: getKey ? key : (typeof item === 'object' && item !== null && 'id' in item ? (item as { id: React.Key }).id : key), target: 'first' };
    commit([...latest.current, item]);
  };

  const restore = (item: T, key: React.Key, index: number) => {
    if (!mounted.current) return;
    const current = latest.current;
    if (current.length >= limit) return;
    const at = Math.min(index, current.length);
    pendingKeys.current = [...ownKeys.current.slice(0, at), key, ...ownKeys.current.slice(at)];
    focusRequest.current = { key, target: 'first' };
    commit([...current.slice(0, at), item, ...current.slice(at)]);
  };

  const remove = (index: number) => {
    const current = latest.current;
    if (current.length <= min) return;
    const item = current[index] as T;
    const key = keys[index]!;
    const rowName = `${noun} ${index + 1}`;
    const filled = hasInput(item, rowNodes.current.get(key));
    const remaining = keys.filter((_, i) => i !== index);
    // 다음 줄 삭제 → 이전 줄 삭제 → 추가 버튼. 남은 줄 수가 min 이면 삭제가 모두 비활성이라 추가 버튼으로 간다.
    const canDelete = remaining.length > min;
    focusRequest.current = canDelete && index < remaining.length ? { key: remaining[index]!, target: 'delete' }
      : canDelete && index > 0 ? { key: remaining[index - 1]!, target: 'delete' }
      : { target: 'add' };
    pendingKeys.current = remaining;
    commit(current.filter((_, i) => i !== index));
    if (filled) toast(`${rowName} 삭제됨`, { duration: UNDO_MS, action: { label: '되돌리기', onClick: () => restore(item, key, index) } });
  };

  const template = [...columns.map(column => column.numeric ? 'minmax(8rem, 1fr)' : 'minmax(0, 2fr)'), 'var(--control-h-md)'].join(' ');
  const fieldsetDescribedBy = [...new Set([hasError ? errorId : '', ...(describedBy?.split(/\s+/) ?? [])].filter(Boolean))].join(' ') || undefined;

  return <fieldset {...props} ref={ref} id={id} data-slot="field-list" className={cn('ds-field-list', className)}
    aria-invalid={hasError ? true : props['aria-invalid']} aria-describedby={fieldsetDescribedBy}
    style={{ ...style, '--field-list-columns': template } as React.CSSProperties}>
    <legend data-slot="field-list-legend" className={cn('ds-field-list-legend', hideLabel && 'sr-only')}>{label}</legend>
    <div data-slot="field-list-body" className="ds-field-list-body">
      {/* 늘 DOM 에 있는 알림 자리 — 제출로 묶음 오류가 생기면 바로 읽힌다. 비어 있으면 높이 0. */}
      <div data-slot="field-list-error" id={errorId} role="alert" className="ds-field-list-error">
        {hasError && <><CircleAlert aria-hidden="true" /><span>{error}</span></>}
      </div>
      {value.length > 0 && <div data-slot="field-list-head" className="ds-field-list-head" aria-hidden="true">
        {columns.map(column => <span key={column.key} data-slot="field-list-column">
          {column.label}{column.required && <span data-slot="field-list-required"> *</span>}
        </span>)}
      </div>}
      {value.length > 0 ? <div data-slot="field-list-rows" className="ds-field-list-rows">
        {value.map((item, index) => {
          const key = keys[index]!;
          const rowName = `${noun} ${index + 1}`;
          const safe = String(key).replace(/[^\w-]/g, '_');
          const rowLabelId = `${baseId}-${safe}-label`;
          const rowErrorId = `${baseId}-${safe}-error`;
          const rawRowError = rowError?.(item, index);
          const rowMessage = isRowError(rawRowError) ? rawRowError.message : rawRowError;
          const rowCause = isRowError(rawRowError) ? rawRowError.column : undefined;
          const hasRowError = !blank(rowMessage) && rowMessage !== false;
          // 원인 칸이 없으면 줄 오류는 첫 칸이 읽는다.
          const describedColumn = hasRowError ? rowCause ?? columns[0]?.key : undefined;
          const context: FieldListCellContext<T> = {
            index,
            update: patch => commit(latest.current.map((entry, i) => i === index ? { ...entry, ...patch } : entry)),
          };
          return <div key={key} data-slot="field-list-row" className="ds-field-list-row" role="group" aria-labelledby={rowLabelId}
            data-invalid={hasRowError || undefined}
            ref={node => { if (node) rowNodes.current.set(key, node); else rowNodes.current.delete(key); }}>
            <div data-slot="field-list-row-grid" className="ds-field-list-row-grid">
              <div data-slot="field-list-row-head" className="ds-field-list-row-head">
                <span data-slot="field-list-row-label" id={rowLabelId} className="ds-field-list-row-label">{rowName}</span>
                <Button variant="ghost" iconOnly data-slot="field-list-delete" className="ds-field-list-delete"
                  aria-label={`${rowName} 삭제`} disabled={atMin} onClick={() => remove(index)}>
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
              {columns.map((column, columnIndex) => {
                const child = React.Children.only(column.render(item, context));
                const controlId = child.props.id ?? `${baseId}-${safe}-${columnIndex}`;
                const cellErrorId = `${controlId}-error`;
                const cellError = column.error?.(item, index);
                const hasCellError = !blank(cellError) && cellError !== false;
                const causes = hasRowError && rowCause === column.key;
                const described = [...new Set([
                  hasCellError ? cellErrorId : '', describedColumn === column.key ? rowErrorId : '',
                  ...(child.props['aria-describedby']?.split(/\s+/) ?? []),
                ].filter(Boolean))].join(' ') || undefined;
                const required = Boolean(column.required || child.props.required);
                return <div key={column.key} data-slot="field-list-cell" className="ds-field-list-cell" data-numeric={column.numeric || undefined}>
                  <label data-slot="field-list-cell-label" htmlFor={controlId} className="ds-field-list-cell-label">
                    {column.label}{required && <span data-slot="field-list-required" aria-hidden="true"> *</span>}
                  </label>
                  {React.cloneElement(child, {
                    id: controlId,
                    required: required || undefined,
                    'aria-label': child.props['aria-label'] ?? `${rowName} ${column.label}`,
                    'aria-describedby': described,
                    'aria-invalid': hasCellError || causes ? true : child.props['aria-invalid'],
                  })}
                  <div data-slot="field-list-cell-error" id={cellErrorId} className="ds-field-list-message" aria-live="polite" aria-atomic="true">
                    {hasCellError && <><CircleAlert aria-hidden="true" /><span>{cellError}</span></>}
                  </div>
                </div>;
              })}
            </div>
            <div data-slot="field-list-row-error" id={rowErrorId} className="ds-field-list-message ds-field-list-row-error" aria-live="polite" aria-atomic="true">
              {hasRowError && <><CircleAlert aria-hidden="true" /><span>{rowMessage}</span></>}
            </div>
          </div>;
        })}
      </div> : <p data-slot="field-list-empty" className="ds-field-list-empty">{emptyText ?? `${noun}${subjectParticle(noun)} 없습니다`}</p>}
      <div data-slot="field-list-footer" className="ds-field-list-footer">
        <Button ref={addRef} variant="secondary" data-slot="field-list-add" leadingIcon={<Plus aria-hidden="true" />}
          disabled={atMax} aria-describedby={atMax && max !== undefined ? maxId : undefined} onClick={add}>
          {addLabel ?? `${noun} 추가`}
        </Button>
        {atMax && max !== undefined && <span data-slot="field-list-max" id={maxId} className="ds-field-list-max">
          {`최대 ${max.toLocaleString('ko-KR')}개`}
        </span>}
      </div>
    </div>
  </fieldset>;
}
