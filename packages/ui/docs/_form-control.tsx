'use client';

import * as React from 'react';
import { Button, Field, FormFlow, Input } from '../src';

// 앱이 소유한 컨트롤도 Field의 id·ARIA와 이동 표식을 실제 포커스 요소에 전달한다.
function AppCodeInput(props: React.ComponentPropsWithRef<'input'>) {
  return <input type="text" {...props} style={{
    minWidth: 'var(--field-min-w)', minHeight: 'var(--control-h-md)',
    border: '1px solid var(--border-input)', borderRadius: 'var(--radius-md)',
    paddingInline: 'var(--space-12)', background: 'var(--bg-surface)',
    color: 'var(--text-primary)', ...props.style,
  }} />;
}

export function FormControlRecipe() {
  const [saved, setSaved] = React.useState(0);
  return <FormFlow noValidate onSubmit={() => { setSaved(count => count + 1); }}>
    <Field label="상품 코드" description="코드를 입력하고 Enter로 수취인 칸으로 이동하세요.">
      <AppCodeInput data-form-control="advance" />
    </Field>
    <Field label="수취인"><Input /></Field>
    <Button type="submit" variant="primary">저장</Button>
    <p role="status">저장 {saved}회</p>
  </FormFlow>;
}
