export type ValidationTiming = {
  trigger: 'change' | 'blur' | 'submit';
  hasErrored: boolean;
  isComposing: boolean;
};

/**
 * 첫 오류는 입력을 마친 뒤, 이미 난 오류는 고치는 즉시 해제한다.
 * 내부 판단식의 단위 시험용. 0.6.0 에서 공개 API 에서 뺐다(0.4.0 예고) — 앱은 같은 식
 * `!isComposing && (trigger !== 'change' || hasErrored)` 을 직접 쓴다(DESIGN.md §11.2).
 */
export function shouldValidate({ trigger, hasErrored, isComposing }: ValidationTiming): boolean {
  return !isComposing && (trigger !== 'change' || hasErrored);
}
