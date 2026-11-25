import * as React from 'react';
import { Link } from 'react-router';
import type { Args, StoryContext, StoryFile, StoryMeta, StoryObject } from './load';
import type { StoryFacts, StoryNote } from './roles';
import { MIN_PREVIEW_SCALE, SCREEN_WIDTH, isScreenExample, screenFit, screenSignalOf, type ScreenFit } from './screen';

/**
 * CSF 스토리 하나를 React 부품으로 합친다 — Storybook 런타임 없이 사이트가 쓰는 최소한만.
 * - args: meta.args → story.args 순으로 덮는다.
 * - render: story.render → meta.render → meta.component 에 args 를 그대로.
 * - decorators: 스토리 것이 안쪽, meta 것이 바깥(Storybook 과 같은 순서). 프로젝트 데코레이터(.storybook/preview.tsx 의
 *   테마·여백)는 사이트가 직접 맡는다 — 테마는 사이트 전체 전환, 여백은 예시 틀(site-example-canvas).
 * - viewMode 는 'docs' — Storybook 문서 페이지처럼 여러 예시를 한 페이지에 쌓으므로, 화면 높이를 채우는 스토리가
 *   문서 모드에서 높이를 내려놓는 분기(AGENTS.md "문서 모드까지 새게 하지 마라")를 그대로 탄다.
 * - play·loaders 는 돌리지 않는다. 예시는 처음 렌더 상태만 보여 준다.
 */
export interface StoryEntry {
  id: string;
  exportName: string;
  name: string;
  meta: StoryMeta;
  story: StoryObject;
  Component: React.ComponentType;
  fullBleed: boolean;
  /** meta.tags + story.tags */
  tags: string[];
  /** 소스 신호(vite-plugins/story-notes.ts) — 못 읽었으면 null */
  notes: StoryNote | null;
}

function compose(file: StoryFile, exportName: string, story: StoryObject): StoryEntry {
  const meta = file.module.default;
  const id = `${file.file}#${exportName}`;
  const name = story.name ?? exportName.replace(/_/g, ' ');
  const args: Args = { ...meta.args, ...story.args };
  const parameters = { ...meta.parameters, ...story.parameters };
  const context: StoryContext = {
    id, name, title: meta.title ?? file.file, args,
    argTypes: { ...meta.argTypes, ...story.argTypes }, parameters,
    globals: {}, viewMode: 'docs', loaded: {}, tags: [...(meta.tags ?? []), ...(story.tags ?? [])],
  };
  const render = story.render ?? meta.render ?? ((renderArgs: Args) => {
    const Target = meta.component;
    return Target ? <Target {...renderArgs} /> : null;
  });
  let Current: React.ComponentType = function StoryRender(): React.ReactNode { return <>{render(args, context)}</>; };
  for (const decorator of [...(story.decorators ?? []), ...(meta.decorators ?? [])]) {
    const Inner: React.ComponentType = Current;
    Current = function StoryDecorated(): React.ReactNode { return <>{decorator(Inner, context)}</>; };
  }
  const notes = file.module.__siteStoryNotes?.[exportName] ?? null;
  return { id, exportName, name, meta, story, Component: Current, fullBleed: parameters.fullBleed === true, tags: context.tags, notes };
}

/** 예시 고르기(roles.ts)에 넘기는 신호 — 스토리 객체의 이름·설명·태그 + 소스 신호 + 파일이 선언한 manifest. */
export function factsOf(entry: StoryEntry): StoryFacts {
  const description = (entry.story.parameters?.docs as { description?: { story?: string } } | undefined)?.description?.story ?? null;
  const declared = entry.meta.parameters?.manifest;
  return {
    exportName: entry.exportName,
    name: entry.name,
    description,
    tags: entry.tags,
    uses: entry.notes?.uses ?? null,
    draws: entry.notes?.draws ?? null,
    declared: Array.isArray(declared) ? declared as string[] : null,
    marks: entry.notes?.marks ?? [],
  };
}

const cache = new WeakMap<StoryFile, StoryEntry[]>();
/**
 * 파일의 스토리 목록(원본 순서). 다음은 뺀다.
 * - `globals.theme` 를 정한 스토리: 같은 예시의 다크 판이다. 사이트는 머리띠의 테마 전환으로 보여 준다
 *   (그대로 그리면 이름은 '다크' 인데 사이트 테마로 그려진다).
 * - 태그 `!autodocs`·`!dev`: Storybook 문서·목록에서 숨긴 스토리.
 */
export function storiesOf(file: StoryFile): StoryEntry[] {
  const cached = cache.get(file);
  if (cached) return cached;
  const order = (file.module.__namedExportsOrder
    ?? Object.keys(file.module)).filter((key) => key !== 'default' && !key.startsWith('__'));
  const entries: StoryEntry[] = [];
  for (const exportName of order) {
    const value = file.module[exportName];
    const story: StoryObject | null = typeof value === 'function'
      ? { render: value as StoryObject['render'] }
      : value && typeof value === 'object' ? value as StoryObject : null;
    if (!story) continue;
    if (story.globals && 'theme' in story.globals) continue;
    const tags = story.tags ?? [];
    if (tags.includes('!autodocs') || tags.includes('!dev')) continue;
    entries.push(compose(file, exportName, story));
  }
  cache.set(file, entries);
  return entries;
}

export class StoryBoundary extends React.Component<{ name: string; children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return <p role="alert" className="site-example-error">
        예시 '{this.props.name}' 를 그리지 못했다 — {this.state.error.message}
      </p>;
    }
    return this.props.children;
  }
}

/** 화면에 가까워질 때 그린다 — 예시가 20개 넘는 부품(Input·DataTable)도 첫 화면이 가볍다. */
export function useNearViewport<T extends Element>(eager: boolean) {
  const ref = React.useRef<T>(null);
  const [near, setNear] = React.useState(eager);
  React.useEffect(() => {
    if (near || !ref.current) return;
    if (typeof IntersectionObserver === 'undefined') { setNear(true); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setNear(true); observer.disconnect(); }
    }, { rootMargin: '600px 0px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [near]);
  return [ref, near] as const;
}

/**
 * 화면 틀 배율 — 그림 칸(box) 폭과 그 안 1440 틀(stage)의 실제 높이로 screenFit 을 잰다. 칸·틀 크기가 바뀌면 다시 잰다.
 * 패턴 카드 그림과 부품 페이지 셸 예시가 같이 쓴다.
 */
export function useScreenFit(box: React.RefObject<HTMLElement | null>, stage: React.RefObject<HTMLElement | null>, ready: unknown, minScale = 0) {
  const [fit, setFit] = React.useState<ScreenFit | null>(null);
  React.useLayoutEffect(() => {
    const frame = box.current;
    const content = stage.current;
    if (!frame || !content) return;
    const measure = () => setFit(screenFit(frame.clientWidth, content.offsetHeight, minScale));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(content);
    return () => observer.disconnect();
  }, [box, stage, ready, minScale]);
  return fit;
}

/** 1440 틀 — 실제 부품으로 그리고 transform 으로 줄인다. 포인터·선택 없음(그림 칸이 inert·aria-hidden). */
export function ScreenStage({ entry, stageRef, scale }: { entry: StoryEntry; stageRef: React.RefObject<HTMLDivElement | null>; scale: number }) {
  return <div ref={stageRef} className="site-screen-stage" style={{ width: SCREEN_WIDTH, transform: `scale(${scale})` }}>
    <StoryBoundary name={entry.name}><entry.Component /></StoryBoundary>
  </div>;
}

/** 이 스토리가 화면 전체를 채우는 셸 예시인가(screen.ts isScreenExample — 스토리 위에 meta 를 얕게 덮은 parameters). */
export function isScreenEntry(entry: StoryEntry) {
  return isScreenExample(screenSignalOf({ ...entry.meta.parameters, ...entry.story.parameters }));
}

/** 실제 크기로 보는 길 — 이 셸을 쓰는 패턴 상세 */
export interface RealSizeLink { to: string; label: string }

/**
 * 셸 예시 축소 미리보기 — 1440×900 틀을 칸 폭에 맞춰 줄인다(배율 ≥ 0.5, 칸이 좁으면 0.5 에서 오른쪽을 자른다 — 가로 밀기 없음).
 * 머리에 실제 배율, 그림 아래에 실제 크기로 보는 패턴 링크 하나. 그림 칸은 장식(inert·aria-hidden)이다.
 */
function ScreenExample({ entry, description, role, realSize }: { entry: StoryEntry; description?: string; role?: 'usage' | 'test'; realSize?: RealSizeLink | null }) {
  const box = React.useRef<HTMLDivElement>(null);
  const stage = React.useRef<HTMLDivElement>(null);
  const fit = useScreenFit(box, stage, entry, MIN_PREVIEW_SCALE);
  const percent = fit ? Math.round(fit.scale * 100) : null;
  return <section className="site-example" aria-label={`예시: ${entry.name}`} data-story={entry.id} data-story-role={role} data-screen-scale={fit?.scale}>
    <div className="site-example-head">
      <span className="site-example-name">{entry.name}</span>
      {description && <span className="site-caption">{description}</span>}
      {percent !== null && <span className="site-example-scale tabular">축소 미리보기 · {percent}%{fit?.clamped ? ' · 칸이 좁아 오른쪽 잘림' : ''}</span>}
    </div>
    <div className="site-example-canvas" data-frame="scaled">
      <div ref={box} className="site-example-screen" aria-hidden="true" inert data-clamped={fit?.clamped}
        style={fit?.clamped ? { height: fit.height } : undefined}>
        <ScreenStage entry={entry} stageRef={stage} scale={fit?.scale ?? 0} />
      </div>
    </div>
    {realSize && <div className="site-example-foot"><Link className="site-link" to={realSize.to}>{realSize.label}</Link></div>}
  </section>;
}

/**
 * 예시 하나. frame — 'screen': 패턴 상세의 실제 크기 화면 틀(높이 720) · 'scaled': 셸 예시 축소 미리보기(부품 페이지).
 */
export function StoryExample({ entry, eager = false, frame, role, realSize }: {
  entry: StoryEntry; eager?: boolean; frame?: 'screen' | 'scaled'; role?: 'usage' | 'test'; realSize?: RealSizeLink | null;
}) {
  const [ref, near] = useNearViewport<HTMLDivElement>(eager);
  const description = (entry.story.parameters?.docs as { description?: { story?: string } } | undefined)?.description?.story;
  if (frame === 'scaled') return <ScreenExample entry={entry} description={description} role={role} realSize={realSize} />;
  return <section className="site-example" aria-label={`예시: ${entry.name}`} data-story={entry.id} data-story-role={role}>
    <div className="site-example-head">
      <span className="site-example-name">{entry.name}</span>
      {description && <span className="site-caption">{description}</span>}
    </div>
    <div ref={ref} className="site-example-canvas" data-full-bleed={entry.fullBleed} data-frame={frame}>
      {near ? <StoryBoundary name={entry.name}><entry.Component /></StoryBoundary> : null}
    </div>
  </section>;
}
