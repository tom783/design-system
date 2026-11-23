import * as React from 'react';
import { Field, FormActionBar, Input, toast } from '../../src';

/**
 * 편집 폼 — 줄은 폼의 마지막 자식이다. AppShell 본문 안이면 본문 바닥에 고정되고(sticky) 좌우는 본문 끝까지 닿는다.
 * 버튼 묶음은 폼 열과 같은 최대 폭(기본 48rem)이라 저장 오른끝이 폼 열 오른끝에 맞는다.
 */
export function FormActionBarExample() {
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  return <form noValidate aria-label="상품 수정" className="flex max-w-3xl flex-col gap-6" onInput={() => setDirty(true)}
    onSubmit={event => {
      event.preventDefault();
      setSaving(true);
      window.setTimeout(() => { setSaving(false); setDirty(false); toast.success('변경 사항을 저장했습니다'); }, 1200);
    }}>
    <Field label="상품명" required><Input defaultValue="경량 캠핑 의자" /></Field>
    <FormActionBar dirty={dirty} saving={saving} onCancel={() => toast('수정을 취소했습니다')}
      onDelete={() => toast.success('상품을 삭제했습니다')}
      deleteDescription="상품과 옵션·재고 정보를 삭제합니다. 삭제한 상품은 되돌릴 수 없습니다." />
  </form>;
}
