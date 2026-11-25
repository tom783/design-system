// 부품 페이지 '실제 미리보기'의 예시 고르기 — 어느 스토리가 사용 모습(대표)이고 어느 것이 시험용(개발 확인용)인가.
// 한 부품만 손으로 고르지 않는다. 스토리 메타(이름·설명·태그)와 소스 신호(vite-plugins/story-notes.ts 의 uses·marks)로
// 모든 부품에 같은 규칙을 쓴다. 런타임(Preview)과 검사(docs/qa/site.test.mjs)가 이 파일 하나를 함께 쓴다 — 의존 없음.

/** vite-plugins/story-notes.ts 가 스토리 모듈에 붙이는 소스 신호(`__siteStoryNotes[내보내기 이름]`). */
export interface StoryNote {
  /** 그리는 길(render·args·같은 파일 도우미·가져온 예시 파일)에 나오는 매니페스트 이름 */
  uses: string[];
  /** 그중 스토리 자신(render·args, render 가 없으면 meta.component)에 바로 나오는 이름 */
  draws: string[];
  /** 소스에서 찾은 시험용 표식 — 사람이 읽는 말 */
  marks: string[];
}

export interface StoryFacts {
  exportName: string;
  /** 보이는 이름(story.name, 없으면 내보내기 이름의 _ → 빈칸) */
  name: string;
  /** parameters.docs.description.story */
  description?: string | null;
  /** meta.tags + story.tags */
  tags: readonly string[];
  /** 그리는 길에 나오는 매니페스트 이름 — 소스 신호를 못 읽었으면 null(관련도를 따지지 않는다) */
  uses: readonly string[] | null;
  /** 그중 스토리 자신에 바로 나오는 이름(도우미·예시 파일을 거치지 않음) */
  draws?: readonly string[] | null;
  /** 스토리 파일 meta 의 parameters.manifest — 이 파일이 다룬다고 선언한 이름 */
  declared?: readonly string[] | null;
  /** 소스 신호의 시험용 표식 */
  marks: readonly string[];
}

/**
 * 시험용 태그. Storybook 의 기본 태그 `dev`·`test` 는 모든 스토리에 암묵으로 붙는 것이라(사이드바 표시·테스트 실행) 뜻이 없다 —
 * 시험 전용을 따로 표시하는 이름만 본다. 지금 스토리에는 하나도 없다(meta 의 'autodocs' 뿐) — 앞으로 붙이면 그대로 걸린다.
 */
export const TEST_TAGS: readonly string[] = ['qa', 'test-only', 'dev-only', 'harness'];
/** 이름 낱말에 이 말이 들어 있으면 시험용 — 검수 매트릭스·재현·엣지·경계값처럼 '무엇을 확인하는가'를 이름으로 단 스토리. */
export const TEST_NAME_WORDS: readonly string[] = ['검수', '재현', '회귀', '하네스', '매트릭스', '엣지', '경계값', '언마운트', '참조병합', '테스트', 'qa', 'test'];
/** 이름 낱말이 이 말로 끝나면 시험용 — '흑백 출력 검증'·'조합 검증'·'치수일치'·'높이일치'. ('검증시점'처럼 기능 이름 앞에 오는 '검증'은 아니다.) */
export const TEST_NAME_ENDINGS: readonly string[] = ['검증', '일치'];
/**
 * 설명이 '~인지 확인한다'(그렇게 되는지 본다)로 자기를 소개하면 시험용 — '…깨지지 않는지 확인합니다', '…같은지 검증합니다', '하네스에서 …'.
 * 그냥 '…을 확인합니다'는 아니다 — 추이밴드·불릿처럼 사용 모습을 그리면서 보이는 수치를 적은 설명이 이렇게 끝난다.
 */
export const TEST_DESCRIPTION = /하네스|재현|회귀|지 (?:확인|검증)(?:합니다|한다)/;

/** 대표 신호 — '사용법'(문서 예시 docs/examples 를 그대로 그리는 스토리) 다음 '기본'·Default. 그 밖은 원본 순서(Storybook 문서의 첫 스토리). */
export const USAGE_NAMES: readonly string[] = ['사용법'];
export const DEFAULT_WORDS: readonly string[] = ['기본', 'default', 'basic', 'primary'];

const words = (value: string) => value.toLowerCase().split(/[\s_—–·\-()[\]/,:.]+/).filter(Boolean);

/** 시험용으로 본 이유(비면 사용 예시). */
export function testReasons(facts: StoryFacts): string[] {
  const reasons: string[] = [];
  const tag = facts.tags.find((value) => TEST_TAGS.includes(value.toLowerCase()));
  if (tag) reasons.push(`태그 '${tag}'`);
  const nameWords = [...new Set([...words(facts.name), ...words(facts.exportName)])];
  const hit = nameWords.find((word) => TEST_NAME_WORDS.some((test) => word.includes(test)) || TEST_NAME_ENDINGS.some((ending) => word.endsWith(ending)));
  if (hit) reasons.push(`이름 '${hit}'`);
  const description = facts.description?.match(TEST_DESCRIPTION);
  if (description) reasons.push(`설명 '${description[0]}'`);
  reasons.push(...facts.marks);
  return reasons;
}

/** 0 = '사용법' · 1 = '기본'·Default 낱말 · 2 = 그 밖 */
export function usageSignal(facts: StoryFacts) {
  if (USAGE_NAMES.includes(facts.exportName) || USAGE_NAMES.includes(facts.name)) return 0;
  const nameWords = [...words(facts.name), ...words(facts.exportName)];
  return nameWords.some((word) => DEFAULT_WORDS.includes(word)) ? 1 : 2;
}

/** 0 = 이 부품을 그린다 · 1 = 이 부품의 부분만 · 2 = 같은 파일의 다른 부품(차트·로딩·안내처럼 한 파일이 여러 부품을 다룰 때) */
export function relevance(facts: StoryFacts, page: { name: string; parts: readonly string[] }) {
  if (!facts.uses) return 0;
  if (facts.uses.includes(page.name)) return 0;
  return facts.uses.some((name) => page.parts.includes(name)) ? 1 : 2;
}

/**
 * 대표를 고르는 순서(작을수록 앞):
 * 1. 이 부품을 manifest 로 선언한 스토리 파일(부분만 선언한 파일은 뒤 — Dialog 페이지에서 sheet.stories 보다 dialog.stories)
 * 2. 관련도(이 부품을 그리는가)
 * 3. 대표 신호('사용법' → '기본'·Default → 그 밖)
 * 4. 한 파일이 여러 부품 페이지를 다룰 때(로딩·차트·안내·폼) — 이 부품을 스토리 자신이 바로 그리는가
 *    (ProgressTrack 페이지에서 Skeleton·TaskProgress 까지 섞인 '대기시간 계층' 데모보다 '진행률'). 한 부품 파일에서는 따지지 않는다 —
 *    도우미로 감싼 사용 모습(Switch '켜짐꺼짐')이 바로 그린 변형보다 대표다.
 * 5. 원본 순서(Storybook 문서의 첫 스토리가 대표)
 */
export function rankOf(facts: StoryFacts, page: { name: string; parts: readonly string[] }, index: number): number[] {
  const declares = !facts.declared || facts.declared.includes(page.name) ? 0 : 1;
  const shared = facts.declared?.some((name) => name !== page.name && !page.parts.includes(name)) ?? false;
  const draws = !shared || !facts.draws || facts.draws.includes(page.name) ? 0 : 1;
  return [declares, relevance(facts, page), usageSignal(facts), draws, index];
}
const compare = (a: number[], b: number[]) => {
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return a[i]! - b[i]!;
  return 0;
};

export interface Arranged<T> {
  /** 선택 목록 순서: 대표 → 나머지 사용 예시(관련도·원본 순) → 개발 확인용(원본 순) */
  ordered: T[];
  usage: T[];
  test: T[];
  /** 기본으로 보일 예시(= ordered[0]). 사용 예시가 하나도 없으면 null 이고 첫 시험용을 보인다. */
  primary: T | null;
}

/**
 * 부품 페이지 예시 목록을 나눈다. 대표 = 사용 예시 중 rankOf 가 가장 앞선 것.
 * 관련도가 대표 신호보다 먼저다 — Tour 페이지에서 같은 파일의 '툴팁_기본' 보다 Tour 를 그리는 첫 스토리가 대표다.
 */
export function arrange<T>(items: readonly T[], factsOf: (item: T) => StoryFacts, page: { name: string; parts: readonly string[] }): Arranged<T> {
  const rows = items.map((item, index) => {
    const facts = factsOf(item);
    const rank = rankOf(facts, page, index);
    return { item, index, test: testReasons(facts).length > 0, rank };
  });
  const usageRows = rows.filter((row) => !row.test);
  const testRows = rows.filter((row) => row.test);
  const best = [...usageRows].sort((a, b) => compare(a.rank, b.rank))[0];
  // 나머지 사용 예시: 선언한 파일·관련도까지만 묶고 그 안은 원본 순서(대표 신호로 다시 섞지 않는다).
  const rest = usageRows.filter((row) => row !== best).sort((a, b) => compare([a.rank[0]!, a.rank[1]!, a.index], [b.rank[0]!, b.rank[1]!, b.index]));
  const usage = [...(best ? [best] : []), ...rest].map((row) => row.item);
  const test = testRows.map((row) => row.item);
  return { ordered: [...usage, ...test], usage, test, primary: best?.item ?? null };
}
