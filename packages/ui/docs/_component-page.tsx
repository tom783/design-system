import { Primary, Stories, Title, useOf } from '@storybook/addon-docs/blocks';
import manifest from '../../mcp/manifest.json';
import { Intent } from './_intent';
import { ManifestProps } from './_manifest-props';
import { resolveManifestComponent } from './_manifest-data';

/** 페이지 이름에서 추측하지 않고 각 CSF meta가 선언한 공개 API만 문서화한다. */
export function ComponentDocumentation() {
  const { preparedMeta } = useOf('meta', ['meta']);
  const names: unknown = preparedMeta.parameters.manifest;
  if (!Array.isArray(names) || names.length === 0 || names.some(name => typeof name !== 'string')) {
    throw new Error(`문서: ${preparedMeta.title}의 parameters.manifest 이름 목록이 필요합니다.`);
  }
  const components = names.map(name => resolveManifestComponent(manifest.components, manifest.derived, name));
  // 홀로 소개하는 부품에는 부모 규칙이 필요하지만, 같은 페이지에 있는 부모는 한 번만 소개한다.
  const topLevel = components.filter(component => !component.partOf || !names.includes(component.partOf));
  return <div data-doc-page={preparedMeta.title}>
    <Title />
    {topLevel.map(component => <Intent key={component.name} name={component.name} />)}
    <section data-doc-primary><Primary /></section>
    {names.map(name => <ManifestProps key={name} name={name} />)}
    <Stories includePrimary={false} />
  </div>;
}
