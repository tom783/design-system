// 화면 틀 축소 — 화면 전체를 채우는 셸 예시를 1440×900 틀에 실제 부품으로 그린 뒤 칸 폭에 맞춰 줄인다.
// 패턴 카드 그림(pages/patterns)과 부품 페이지 '실제 미리보기'의 셸 예시가 같이 쓴다. 판별·배율 계산은 여기 한 곳이고,
// 런타임(render.tsx)과 검사(docs/qa/site.test.mjs)가 함께 쓴다 — 의존 없음.

/** 실제 화면 틀 — 화면 스토리를 검토한 기준 1440×900(screens-shell.tsx '1440×900 기준'), 16:10. */
export const SCREEN_WIDTH = 1440;
export const SCREEN_HEIGHT = 900;
/** 부품 페이지 셸 예시의 최소 배율(디자인 총괄 결정 11/25) — 이보다 작으면 글자를 읽을 수 없다. 패턴 카드는 0(칸에 맞춤). */
export const MIN_PREVIEW_SCALE = 0.5;

/** 스토리 매개변수 중 셸 판별에 쓰는 두 값 — 런타임은 parameters 에서, 검사는 소스(vite-plugins/story-notes.ts)에서 읽는다. */
export interface ScreenSignal {
  /** parameters.fullBleed — 예시 틀 여백 없이 가장자리까지 그린다 */
  fullBleed: boolean;
  /** parameters.docs.story.inline — false 면 Storybook 문서가 자기 창(iframe)에 그린다. 적지 않았으면 null */
  docsInline: boolean | null;
}

/**
 * 화면 전체를 채우는 셸 예시인가(AppShell 처럼 창 높이 100dvh 를 쓰는 화면).
 * 판별은 스토리가 스스로 밝힌 두 표식이다 — 부품 이름을 손으로 나열하지 않는다.
 * 1. `docs.story.inline: false` — 저장소 규칙(AGENTS.md '화면 채우기(vh·dvh)를 문서 모드까지 새게 하지 마라')대로 창 높이를
 *    채우는 스토리는 Storybook 문서에서 자기 창(iframe)에 그린다(주석 '화면 높이(AppShell 100dvh)는 iframe 안에서만 채워…').
 * 2. `fullBleed: true` — 화면 전체가 주제라 예시 틀 여백 없이 가장자리까지 그린다.
 *    자기 창만 쓰는 Dialog·Sheet·Guide 는 겹침 창을 여는 단추가 주제라 여백 있는 틀이다(fullBleed 아님) → 셸이 아니다.
 * 검사(site.test)가 이 판별이 'CSS 에서 루트 높이가 100dvh 인 부품을 그리는 스토리'와 같은지 맞춰 본다.
 */
export function isScreenExample(signal: ScreenSignal) {
  return signal.fullBleed && signal.docsInline === false;
}

/** parameters(스토리 위에 meta 를 얕게 덮은 것 — render.tsx compose 와 같은 합치기)에서 판별 신호를 읽는다. */
export function screenSignalOf(parameters: Record<string, unknown> | undefined): ScreenSignal {
  const story = (parameters?.docs as { story?: { inline?: unknown } } | undefined)?.story;
  return { fullBleed: parameters?.fullBleed === true, docsInline: typeof story?.inline === 'boolean' ? story.inline : null };
}

export interface ScreenFit {
  /** transform 배율 */
  scale: number;
  /** 그림 칸 높이 — 틀(16:10) 높이 × 배율. 칸 폭에 맞춘 배율이면 칸 폭 × 10/16 과 같다 */
  height: number;
  /** 칸 폭에 맞추면 최소 배율보다 작아 최소 배율로 올렸다(칸이 좁다) */
  clamped: boolean;
  /** 틀의 오른쪽이 칸 밖으로 나가 잘린다(가로 밀기는 없다 — 칸은 overflow hidden) */
  clipped: boolean;
}

/**
 * 그림 칸(폭 boxWidth)에 1440 틀을 넣는 배율.
 * - 폭 기준(칸 폭 / 1440). minScale 보다 작으면 minScale 로 올리고 틀 폭은 줄이지 않는다 — 오른쪽이 잘린다.
 * - 칸 높이 = 틀 높이(900) × 그 배율 — 칸이 넓으면 16:10, 좁아 올렸으면 틀 전체 높이(최소 배율 0.5 면 450)를 보인다.
 * - 화면 실제 높이(contentHeight — AppShell 은 창 높이를 채운다)가 900 보다 낮으면 칸을 빈틈없이 채우도록 높이 기준으로 올린다
 *   (패턴 카드 9b 와 같은 규칙 — 낮은 창에서는 오른쪽이 조금 잘린다).
 */
export function screenFit(boxWidth: number, contentHeight: number, minScale = 0): ScreenFit {
  const byWidth = boxWidth / SCREEN_WIDTH;
  const base = Math.max(byWidth, minScale);
  const height = SCREEN_HEIGHT * base;
  const scale = Math.max(base, contentHeight > 0 ? height / contentHeight : 0);
  return { scale, height, clamped: base > byWidth, clipped: SCREEN_WIDTH * scale > boxWidth + 0.5 };
}
