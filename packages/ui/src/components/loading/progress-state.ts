/** 잘못된 진행률은 완료로 꾸미지 않고 불확정 상태로 전달한다. */
export function progressValue(value: number | undefined): number | undefined {
  return value === undefined || !Number.isFinite(value) ? undefined : Math.min(1, Math.max(0, value));
}

export function progressEta(seconds: number | undefined): string | undefined {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return undefined;
  return seconds < 10 ? '곧 완료' : `약 ${Math.round(seconds / 10) * 10}초 남음`;
}
