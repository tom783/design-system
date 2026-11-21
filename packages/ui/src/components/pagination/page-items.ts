/** 양 끝과 현재 이웃을 남긴다. 경계에서는 세 번호를 유지해 이동 직후 폭 변화를 줄인다. */
export function pageItems(page: number, count: number): (number | 'ellipsis-start' | 'ellipsis-end')[] {
  const start = Math.max(1, Math.min(page - 1, count - 2));
  const end = Math.min(count, Math.max(page + 1, 3));
  const visible = new Set([1, count]);
  for (let n = start; n <= end; n++) visible.add(n);
  const result: ReturnType<typeof pageItems> = [];
  for (const n of [...visible].sort((a, b) => a - b)) {
    const previous = result.at(-1);
    if (typeof previous === 'number' && n - previous > 1) {
      // 한 번호만 빠지면 생략표보다 그 번호가 더 유용하다.
      result.push(n - previous === 2 ? previous + 1 : previous === 1 ? 'ellipsis-start' : 'ellipsis-end');
    }
    result.push(n);
  }
  return result;
}
