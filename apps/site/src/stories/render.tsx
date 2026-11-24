import * as React from 'react';
import type { Args, StoryContext, StoryFile, StoryMeta, StoryObject } from './load';

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
  return { id, exportName, name, meta, story, Component: Current, fullBleed: parameters.fullBleed === true };
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
  const order = file.module.__namedExportsOrder
    ?? Object.keys(file.module).filter((key) => key !== 'default' && !key.startsWith('__'));
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

class StoryBoundary extends React.Component<{ name: string; children: React.ReactNode }, { error: Error | null }> {
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
function useNearViewport<T extends Element>(eager: boolean) {
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

export function StoryExample({ entry, eager = false, frame }: { entry: StoryEntry; eager?: boolean; frame?: 'screen' }) {
  const [ref, near] = useNearViewport<HTMLDivElement>(eager);
  const description = (entry.story.parameters?.docs as { description?: { story?: string } } | undefined)?.description?.story;
  return <section className="site-example" aria-label={`예시: ${entry.name}`} data-story={entry.id}>
    <div className="site-example-head">
      <span className="site-example-name">{entry.name}</span>
      {description && <span className="site-caption">{description}</span>}
    </div>
    <div ref={ref} className="site-example-canvas" data-full-bleed={entry.fullBleed} data-frame={frame}>
      {near ? <StoryBoundary name={entry.name}><entry.Component /></StoryBoundary> : null}
    </div>
  </section>;
}
