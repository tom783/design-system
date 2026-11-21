import { restoreComponent, type CatalogDerived, type StoredComponent } from '../../mcp/catalog.mjs';

/** 알 수 없는 이름은 빈 표로 숨기지 않고 JSX를 만들기 전에 실패한다. */
export function resolveManifestComponent<C extends StoredComponent>(components: readonly C[], derived: CatalogDerived, name: string) {
  const component = components.find(entry => entry.name === name);
  if (!component) throw new Error(`문서 ManifestProps: 매니페스트에 '${name}' 컴포넌트가 없습니다.`);
  return restoreComponent(component, derived, components);
}
