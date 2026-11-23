/**
 * 칩 줄 한 줄에 몇 개를 보일지 정한다(DESIGN.md §4.2). 개수는 고정이 아니라 실제 폭이 정한다 —
 * 시안의 1440 3개 · 1024 2개 · 768 1개는 그 시점 글자 길이의 예시다.
 *
 * 줄에 놓이는 것: 보이는 칩 k개 → (숨은 칩이 있으면) `+N` → (칩이 하나라도 있으면) 초기화.
 * `+N` 폭은 지금 전체 개수로 잰 값을 쓴다. 숨은 개수로 재면 칩 하나를 지울 때마다 `+10`→`+9`
 * 처럼 폭이 바뀌어 보이는 개수가 흔들린다. 전체 개수 폭이 언제나 그 이상이라 넘치지 않는다.
 */
export interface ChipFitInput {
  /** 줄이 쓸 수 있는 폭(px). */
  available: number;
  /** 칩 폭(px), 앞에서부터. */
  chips: readonly number[];
  /** 항목 사이 간격(px). */
  gap: number;
  /** `+N` 버튼 폭(px). */
  more: number;
  /** 초기화 버튼 폭(px). */
  reset: number;
}

/** 들어가는 칩 개수(0 이상 chips.length 이하). 하나도 안 들어가면 0 — 전부 `+N` 으로 간다. */
export function fitChipCount({ available, chips, gap, more, reset }: ChipFitInput): number {
  const total = chips.length;
  if (total === 0) return 0;
  // 반올림 오차(소수 px 폭 합)로 마지막 칩이 빠지지 않게 0.5px 여유를 둔다.
  const room = available + 0.5;
  let used = 0;
  for (let k = total; k >= 0; k--) {
    used = 0;
    for (let i = 0; i < k; i++) used += chips[i]!;
    const items = k + (k < total ? 1 : 0) + 1;
    const width = used + (k < total ? more : 0) + reset + gap * (items - 1);
    if (width <= room) return k;
  }
  return 0;
}
