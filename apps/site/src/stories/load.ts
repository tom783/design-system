// Storybook 스토리(CSF)를 그대로 가져와 부품 페이지·패턴 페이지의 렌더 예시로 쓴다.
// 예시를 사이트용으로 다시 쓰지 않는다 — 스토리가 바뀌면 사이트 예시도 같이 바뀐다.
// 어느 스토리 파일이 어느 부품을 다루는지는 각 meta 의 `parameters.manifest`(Storybook 문서 페이지가 쓰는 같은 선언)로 찾는다.
import type * as React from 'react';

export type Args = Record<string, unknown>;
export interface StoryContext {
  id: string;
  name: string;
  title: string;
  args: Args;
  argTypes: Record<string, unknown>;
  parameters: Record<string, unknown>;
  globals: Record<string, unknown>;
  viewMode: 'docs';
  loaded: Record<string, unknown>;
  tags: string[];
}
export type RenderFn = (args: Args, context: StoryContext) => React.ReactNode;
export type Decorator = (Story: React.ComponentType, context: StoryContext) => React.ReactNode;
export interface StoryObject {
  name?: string;
  args?: Args;
  argTypes?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  globals?: Record<string, unknown>;
  tags?: string[];
  render?: RenderFn;
  decorators?: Decorator[];
}
export interface StoryMeta extends StoryObject {
  title?: string;
  component?: React.ComponentType<Args>;
  parameters?: Record<string, unknown> & { manifest?: unknown };
}
export interface StoryModule {
  default: StoryMeta;
  /** vite.config.ts 의 storyExportOrder() 가 붙인다 — 원본 순서. */
  __namedExportsOrder?: string[];
  [exportName: string]: unknown;
}
export interface StoryFile {
  /** 'button.stories.tsx' */
  file: string;
  module: StoryModule;
}

const loaders = import.meta.glob<StoryModule>('../../../../packages/ui/src/stories/*.stories.tsx');
const fileName = (path: string) => path.slice(path.lastIndexOf('/') + 1);

let all: Promise<{ files: StoryFile[]; failed: { file: string; error: string }[] }> | null = null;
/** 스토리 파일 전부를 한 번만 불러온다. 하나가 실패해도 나머지는 쓴다(실패는 화면에 알린다). */
export function loadStoryFiles() {
  all ??= Promise.allSettled(Object.entries(loaders).map(async ([path, load]) => ({ file: fileName(path), module: await load() })))
    .then((results) => {
      const files: StoryFile[] = [];
      const failed: { file: string; error: string }[] = [];
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') files.push(result.value);
        else failed.push({ file: fileName(Object.keys(loaders)[i]!), error: String(result.reason) });
      });
      return { files, failed };
    });
  return all;
}

/** 이 부품(또는 그 부분)을 `parameters.manifest` 로 선언한 스토리 파일. */
export async function storyFilesFor(names: readonly string[]) {
  const { files, failed } = await loadStoryFiles();
  const declared = (file: StoryFile) => {
    const list = file.module.default.parameters?.manifest;
    return Array.isArray(list) && list.some((name) => names.includes(name as string));
  };
  return { files: files.filter(declared), failed };
}

/** 조립 화면 스토리(`screens-*.stories.tsx`, Storybook 'Screens/…') — 패턴 페이지가 쓴다. */
export const screenFileNames = Object.keys(loaders).map(fileName).filter((name) => name.startsWith('screens-')).sort();

export async function loadStoryFile(name: string): Promise<StoryFile | null> {
  const entry = Object.entries(loaders).find(([path]) => fileName(path) === name);
  if (!entry) return null;
  return { file: name, module: await entry[1]() };
}
