export type TourStep = {
  id: string;
  target: string | (() => Element | null);
  title: string;
  body: string;
};

export function resolveStep(
  steps: TourStep[],
  from: number,
  dir: 1 | -1,
  find: (step: TourStep) => Element | null,
  onMissing: 'skip' | 'center',
): { index: number; target: Element | null } | null {
  for (let index = from; index >= 0 && index < steps.length; index += dir) {
    const step = steps[index]!;
    const target = find(step);
    if (!target && import.meta.env?.DEV) {
      console.warn(`[안내] 단계 "${step.id}" 대상 ${String(step.target)}을 찾지 못했습니다 (${onMissing}).`);
    }
    if (target || onMissing === 'center') return { index, target };
  }
  return null;
}
