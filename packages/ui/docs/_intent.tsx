import type { JSX } from 'react';
import manifest from '../../mcp/manifest.json';
import { resolveIntent, type ComponentIntent } from './_intent-data';
import { DesignLink } from './_page';

const repository = 'https://github.com/tom783/design-system/blob/main/';

function Rules({ entry }: { entry: ComponentIntent }) {
  return <div data-intent-name={entry.name}>
    <h3>{entry.name}</h3>
    <p data-intent-purpose>{entry.purpose}</p>
    {!!entry.useWhen?.length && <><h4>이럴 때 씁니다</h4><ul>{entry.useWhen.map(text => <li key={text}>{text}</li>)}</ul></>}
    {!!entry.dont?.length && <><h4>피할 것</h4><ul>{entry.dont.map(text => <li key={text}>{text}</li>)}</ul></>}
    {!!entry.rules?.length && <><h4>사용 규칙</h4><ul>{entry.rules.map(rule => <li key={rule.text}>
      {rule.text} <DesignLink section={rule.source.replace('DESIGN.md ', '')}>설계 근거</DesignLink>
    </li>)}</ul></>}
  </div>;
}

/** 이름·부모 규칙·관련 컴포넌트는 검증된 매니페스트에서만 가져온다. */
export function Intent({ name }: { name: string }): JSX.Element {
  const { component, parents, related } = resolveIntent(manifest.components, name, manifest.derived.sourceRoot);
  return <section className="intent-block" aria-label={`${name} 사용 의도`} data-intent-block={name}>
    <Rules entry={component} />
    {parents.map(parent => <section key={parent.name} aria-label={`부모 ${parent.name} 규칙`}>
      <p>부품은 부모 {parent.name}의 규칙도 함께 적용합니다.</p><Rules entry={parent} />
    </section>)}
    {!!related.length && <p>함께 보기: {related.map((entry, index) => <span key={entry.name}>
      {index > 0 && ' · '}<a data-intent-related={entry.name} href={`${repository}${entry.source}`} target="_blank" rel="noreferrer">{entry.name} 소스</a>
    </span>)}</p>}
  </section>;
}
