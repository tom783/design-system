/**
 * 부품 분류 — 매니페스트 category 값(영어 키)에 붙이는 한국어 이름과 순서(디자인 총괄 규격, 검수 r1 · 2026-11-25).
 * 매니페스트 값은 그대로 두고 사이트에서만 대응한다. 여기 없는 새 category 는 영어 그대로 맨 뒤(알파벳순)에 둔다 — 빌드는 멈추지 않는다.
 */
export const CATEGORIES = [
  { key: 'layout', name: '배치' },
  { key: 'navigation', name: '이동' },
  { key: 'action', name: '동작' },
  { key: 'form', name: '입력' },
  { key: 'table', name: '표·목록' },
  { key: 'chart', name: '차트' },
  { key: 'status', name: '상태 표시' },
  { key: 'state', name: '빈 상태·오류' },
  { key: 'loading', name: '로딩' },
  { key: 'overlay', name: '떠 있는 창' },
  { key: 'disclosure', name: '접고 펴기' },
  { key: 'media', name: '미디어' },
  { key: 'guide', name: '안내' },
] as const;

const NAMES = new Map<string, string>(CATEGORIES.map((category) => [category.key, category.name]));
const ORDER = new Map<string, number>(CATEGORIES.map((category, index) => [category.key, index]));

/** 화면에 보일 분류 이름 — 한국어 이름, 없으면 매니페스트 값 그대로. */
export function categoryName(key: string): string {
  return NAMES.get(key) ?? key;
}

/** 한국어 이름이 있는 분류인지(제목 옆에 영어 키를 작게 덧붙일지). */
export function hasCategoryName(key: string): boolean {
  return NAMES.has(key);
}

/** 정렬 — 규격 순서, 규격에 없는 분류는 그 뒤에 알파벳순. */
export function compareCategories(a: string, b: string): number {
  const ia = ORDER.get(a) ?? CATEGORIES.length;
  const ib = ORDER.get(b) ?? CATEGORIES.length;
  return ia !== ib ? ia - ib : a.localeCompare(b);
}
