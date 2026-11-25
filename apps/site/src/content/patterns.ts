import screens from 'virtual:site-screens';
import { compareCategories } from './categories';
import { listedComponents, pageFor, type Component } from '../data/manifest';

/**
 * 패턴 — 조립 화면 스토리(packages/ui/src/stories/screens-*.stories.tsx)에 붙이는 한국어 이름과 순서(디자인 총괄 검수 r1 패턴 카드).
 * 스토리 파일은 그대로 두고 사이트에서만 대응한다. 여기 없는 새 screens-* 파일은 파일 이름 그대로 맨 뒤에 둔다 — 빌드는 멈추지 않는다.
 * 쓰인 부품은 여기 적지 않는다 — vite-plugins/screens.ts 가 스토리의 import 에서 읽는다.
 */
export const PATTERN_NAMES = [
  { file: 'screens-order-list.stories.tsx', name: '주문 목록' },
  { file: 'screens-order-detail.stories.tsx', name: '주문 상세' },
  { file: 'screens-product-create.stories.tsx', name: '상품 등록' },
  { file: 'screens-shipment-create.stories.tsx', name: '출고 등록' },
  { file: 'screens-dashboard.stories.tsx', name: '대시보드' },
] as const;

/** 패턴 페이지 머리 설명 — 특정 제품 화면의 규칙이 아니라 부품 조합 예시로 소개한다(오너 결정 11/25). */
export const PATTERN_INTRO = '부품을 한 화면에 조합한 예시다. 특정 제품 화면의 규칙이 아니라, 부품이 함께 놓였을 때 어떻게 보이고 맞물리는지 보여 준다.';


export interface Pattern {
  /** 'screens-order-list.stories.tsx' */
  file: string;
  /** 주소 — 'screens-order-list' */
  slug: string;
  name: string;
  /** 스토리와 그 도우미가 `../index` 에서 가져오는 이름(부품·부분·함수 섞임) */
  imports: string[];
}

const ORDER = new Map<string, number>(PATTERN_NAMES.map((item, index) => [item.file, index]));
const NAMES = new Map<string, string>(PATTERN_NAMES.map((item) => [item.file, item.name]));

/** 조립 화면 스토리 전부 — 이름표 순서, 이름표에 없는 파일은 뒤에 파일 이름순. */
export const patterns: Pattern[] = Object.keys(screens)
  .sort((a, b) => (ORDER.get(a) ?? PATTERN_NAMES.length) - (ORDER.get(b) ?? PATTERN_NAMES.length) || a.localeCompare(b))
  .map((file) => {
    const slug = file.replace(/\.stories\.tsx$/, '');
    return { file, slug, name: NAMES.get(file) ?? slug, imports: screens[file]! };
  });

const listed = new Set(listedComponents.map((component) => component.name));
const manifestOrder = new Map(listedComponents.map((component, index) => [component.name, index]));

/**
 * 쓰인 부품 — 스토리와 그 도우미가 가져오는 이름(vite-plugins/screens.ts)을 매니페스트로 정리한다:
 * 부분은 부모 부품으로(AlertDialogAction → AlertDialog), 부품(kind = component)만, 겹치면 한 번. 순서는 부품 목록과 같다(분류 순서 → 매니페스트 순).
 */
export function partsUsed(pattern: Pattern): Component[] {
  const pages = new Map<string, Component>();
  for (const name of pattern.imports) {
    const page = pageFor(name);
    if (page && listed.has(page.name)) pages.set(page.name, page);
  }
  return [...pages.values()].sort((a, b) =>
    compareCategories(a.category ?? '', b.category ?? '') || manifestOrder.get(a.name)! - manifestOrder.get(b.name)!);
}

/**
 * 부품 페이지 셸 예시의 '실제 크기로 보기' 패턴 — 예시가 그리는 부품(스토리 소스 신호 uses, 부분은 부모로)과
 * 가장 많이 겹치는 패턴. 같으면 패턴 순서(이름표 순 — 주문 목록이 첫째). 겹치는 부품이 없으면 null.
 * 패턴은 모두 화면 셸(AppShell) 위의 조립 화면이라 셸 부품만 겹쳐도 후보다.
 */
export function patternFor(uses: readonly string[]): Pattern | null {
  const drawn = new Set(uses.map((name) => pageFor(name)?.name).filter((name): name is string => !!name));
  let best: Pattern | null = null;
  let bestScore = 0;
  for (const pattern of patterns) {
    const score = partsUsed(pattern).filter((part) => drawn.has(part.name)).length;
    if (score > bestScore) { best = pattern; bestScore = score; }
  }
  return best;
}
