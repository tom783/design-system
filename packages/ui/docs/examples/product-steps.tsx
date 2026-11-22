import { useEffect, useId, useRef, useState } from 'react';
import { Button, Field, FormFlow, Input, Steps, useComposition } from '../../src';

const stages = [
  { label: '기본 정보', fields: [{ key: 'name', label: '상품명' }, { key: 'category', label: '상품 분류' }] },
  { label: '가격 입력', fields: [{ key: 'price', label: '판매가' }, { key: 'stock', label: '재고 수량' }] },
  { label: '배송 설정', fields: [{ key: 'shipping', label: '출고지' }] },
];

export function ProductStepsExample() {
  const [current, setCurrent] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const previous = useRef(current);
  const id = useId();
  const composition = useComposition();
  const hasErrored = useRef(new Set<string>());
  const goTo = (index: number) => { setSaved(false); setCurrent(index); };
  const validate = (key: string, label: string, value: string, trigger: 'change' | 'blur') => {
    // 한글 조합 중에는 검증하지 않는다. 첫 오류는 blur에서 알리고, 이미 난 오류는 change에서 바로 푼다.
    if (composition.isComposing() || (trigger === 'change' && !hasErrored.current.has(key))) return;
    const message = value.trim() ? '' : `${label}을 입력해 주세요.`;
    if (message) hasErrored.current.add(key);
    setErrors(previous => ({ ...previous, [key]: message }));
  };
  // 초기 렌더에서는 포커스를 빼앗지 않고, 실제 단계가 바뀐 뒤 새 제목을 읽게 한다.
  useEffect(() => {
    if (previous.current !== current) title.current?.focus();
    previous.current = current;
  }, [current]);
  const stage = stages[current]!;
  return <div className="space-y-6">
    <Steps current={current} onStepClick={goTo} steps={stages.map(stage => ({
      label: stage.label,
      status: stage.fields.some(field => errors[field.key]) ? 'error' : undefined,
    }))} />
    <h2 ref={title} tabIndex={-1} id={id} className="text-[length:var(--text-title-sm)] font-semibold">
      {current + 1}단계 {stage.label}
    </h2>
    {/* 활성 단계마다 독립 폼을 렌더한다. 초안·검증·이동은 앱이 소유한다. */}
    <FormFlow key={current} aria-labelledby={id} noValidate className="space-y-4" onSubmit={() => {
      const nextErrors = Object.fromEntries(stage.fields.map(field => [field.key,
        values[field.key]?.trim() ? '' : `${field.label}을 입력해 주세요.`,
      ]));
      for (const [key, message] of Object.entries(nextErrors)) if (message) hasErrored.current.add(key);
      setErrors(previous => ({ ...previous, ...nextErrors }));
      if (Object.values(nextErrors).some(Boolean)) return false;
      if (current < stages.length - 1) goTo(current + 1);
      else setSaved(true);
    }}>
      {stage.fields.map(field => <Field key={field.key} label={field.label} required error={errors[field.key]}>
        <Input {...composition.bind} value={values[field.key] ?? ''} onChange={event => {
          const value = event.target.value;
          setValues(previous => ({ ...previous, [field.key]: value }));
          setSaved(false);
          validate(field.key, field.label, value, 'change');
        }} onBlur={event => validate(field.key, field.label, event.target.value, 'blur')}
          onCompositionEnd={event => {
            composition.bind.onCompositionEnd();
            validate(field.key, field.label, event.currentTarget.value, 'change');
          }} />
      </Field>)}
      <div className="flex flex-wrap gap-2">
        {current > 0 && <Button type="button" onClick={() => goTo(current - 1)}>이전</Button>}
        <Button type="submit" variant="primary" disabled={saved}>{current === stages.length - 1 ? '상품 등록' : '다음'}</Button>
      </div>
      <p role="status">{saved ? '상품 등록을 완료했습니다.' : ''}</p>
    </FormFlow>
  </div>;
}
