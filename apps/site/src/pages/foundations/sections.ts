/**
 * 파운데이션 절(색·활자·간격·형태·모션)과 그 절이 싣는 토큰 분류.
 * 분류는 매니페스트 tokens[].category 값이다 — 모든 분류가 어느 한 절에 실리는지 docs/qa/site.test.mjs 가 확인한다.
 */
export const foundationSections = [
  { slug: 'color', label: '색', tokenCategories: ['semantic', 'primitive'] },
  { slug: 'typography', label: '활자', tokenCategories: ['typography'] },
  { slug: 'spacing', label: '간격·치수', tokenCategories: ['spacing', 'sizing'] },
  { slug: 'shape', label: '형태', tokenCategories: ['shape'] },
  { slug: 'motion', label: '모션', tokenCategories: ['motion', 'loading'] },
] as const satisfies readonly { slug: string; label: string; tokenCategories: readonly string[] }[];

export type FoundationSlug = (typeof foundationSections)[number]['slug'];
