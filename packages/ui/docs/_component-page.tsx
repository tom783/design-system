import { Primary, Stories, Title, useOf } from '@storybook/addon-docs/blocks';
import manifest from '../../mcp/manifest.json';
import { Intent } from './_intent';
import { ManifestProps } from './_manifest-props';
import { resolveManifestComponent } from './_manifest-data';
import { resolvePageIntents } from './_intent-data';

const components = manifest.components.map(component => resolveManifestComponent(manifest.components, manifest.derived, component.name));

/** 페이지 이름에서 추측하지 않고 각 CSF meta가 선언한 공개 API만 문서화한다. */
export function ComponentDocumentation() {
  const { preparedMeta } = useOf('meta', ['meta']);
  const names: unknown = preparedMeta.parameters.manifest;
  if (!Array.isArray(names) || names.length === 0 || names.some(name => typeof name !== 'string')) {
    throw new Error(`문서: ${preparedMeta.title}의 parameters.manifest 이름 목록이 필요합니다.`);
  }
  const intents = resolvePageIntents(components, names);
  return <div data-doc-page={preparedMeta.title}>
    <Title />
    {intents.map(intent => <Intent key={intent.component.name} name={intent.component.name} resolved={intent} />)}
    <section data-doc-primary><Primary /></section>
    {names.map(name => <ManifestProps key={name} name={name} />)}
    <Stories includePrimary={false} />
  </div>;
}
