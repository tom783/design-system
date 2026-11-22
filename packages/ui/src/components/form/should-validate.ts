export type ValidationTiming = {
  trigger: 'change' | 'blur' | 'submit';
  hasErrored: boolean;
  isComposing: boolean;
};

/**
 * 첫 오류는 입력을 마친 뒤, 이미 난 오류는 고치는 즉시 해제한다.
 * @deprecated 다음 마이너에서 공개 API에서 뺀다. 같은 판단은 `!isComposing && (trigger !== 'change' || hasErrored)`다.
 */
export function shouldValidate({ trigger, hasErrored, isComposing }: ValidationTiming): boolean {
  return !isComposing && (trigger !== 'change' || hasErrored);
}
