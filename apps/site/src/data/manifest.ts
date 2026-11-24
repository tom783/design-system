// 부품 데이터는 MCP 매니페스트(packages/mcp/manifest.json, `pnpm mcp:build` 생성물)에서만 읽는다.
// AI 가 MCP 로 받는 것과 사람이 사이트에서 보는 것이 같아야 하므로, 복원도 MCP 서버와 같은 함수(catalog.mjs)를 쓴다.
// 목록·이름을 손으로 옮겨 적지 않는다 — 부품이 늘면 사이트도 그대로 늘어난다.
import manifestJson from '@s2life/mcp/manifest.json';
import { restoreComponent, type CatalogDerived, type StoredComponent } from '@s2life/mcp/catalog.mjs';

export interface ManifestComponent extends StoredComponent {
  category?: string;
  purpose: string;
  useWhen?: string[];
  dont?: string[];
  related?: string[];
  keywords?: string[];
  parts?: string[];
}
export interface ManifestToken {
  name: string;
  cssVariable: string;
  category: string;
  purpose: string;
  light: { value: string; ref: string | null };
  dark: { value: string; ref: string | null };
  tailwind: string[];
}
interface Manifest {
  schemaVersion: number;
  derived: CatalogDerived;
  tokens: ManifestToken[];
  components: ManifestComponent[];
  principles: { topic: string; text: string; source: string }[];
}

// JSON 모듈 타입은 항목마다 모양이 달라 합집합이 된다 — 생성기가 지키는 저장 형태로 읽는다.
export const manifest = manifestJson as unknown as Manifest;

export const components = manifest.components.map((entry) => restoreComponent(entry, manifest.derived, manifest.components));
export type Component = (typeof components)[number];

const byName = new Map(components.map((component) => [component.name, component]));
export function findComponent(name: string): Component | undefined {
  return byName.get(name);
}

/** 자기 페이지가 있는 항목 — 부모 없는 공개 이름. 부분(partOf)은 부모 페이지에 함께 싣는다. */
export const pageComponents = components.filter((component) => !component.partOf);

/** 이름이 속한 페이지(부분이면 부모). */
export function pageFor(name: string): Component | undefined {
  const component = byName.get(name);
  if (!component) return undefined;
  return component.partOf ? byName.get(component.partOf) : component;
}

/** 부모의 부분 — 매니페스트의 partOf 와 parts 를 합친다(순서는 매니페스트 순). */
export function partsOf(name: string): Component[] {
  const listed = new Set(byName.get(name)?.parts ?? []);
  return components.filter((component) => component.partOf === name || listed.has(component.name));
}

export interface CategoryGroup {
  category: string;
  components: Component[];
}
/** 부품 목록 묶음. 분류 이름은 매니페스트 값 그대로 쓰고(번역표를 따로 두지 않는다) 알파벳순으로 둔다. */
export function categoryGroups(): CategoryGroup[] {
  const groups = new Map<string, Component[]>();
  for (const component of pageComponents) {
    const category = component.category ?? '(분류 없음)';
    groups.set(category, [...(groups.get(category) ?? []), component]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([category, list]) => ({ category, components: list }));
}

/** kind 가 component 인 공개 이름 수(상수 등 제외) — 첫 화면·목록의 "부품 N개". */
export const componentCount = pageComponents.filter((component) => component.kind === manifest.derived.kindDefault).length;

/** 부모와 부분을 한 줄로 가져오는 import 문 — derived.importTemplate 의 형식을 따른다. */
export function importLine(names: readonly string[]): string {
  return manifest.derived.importTemplate.replace('NAME', names.join(', '));
}
