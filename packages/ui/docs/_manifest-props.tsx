import manifest from '../../mcp/manifest.json';
import { resolveManifestComponent } from './_manifest-data';

/** MCP 응답과 같은 복원 함수로 선택 prop의 undefined·필수 여부·JSDoc을 표시한다. */
export function ManifestProps({ name }: { name: string }) {
  const component = resolveManifestComponent(manifest.components, manifest.derived, name);
  return <section data-manifest-props={name} aria-label={`${name} 속성`}>
    <h3>{name} 속성</h3>
    {component.partOf && <p>{component.purpose}</p>}
    {component.props.length > 0 && <div className="manifest-props-scroll"><table>
      <thead><tr><th scope="col">이름</th><th scope="col">타입</th><th scope="col">필수</th><th scope="col">설명</th></tr></thead>
      <tbody>{component.props.map(prop => <tr key={prop.name} data-prop={prop.name}>
        <th scope="row"><code>{prop.name}</code></th><td><code>{prop.type}</code></td>
        <td>{prop.required ? '필수' : '선택'}</td><td>{prop.doc ?? '—'}</td>
      </tr>)}</tbody>
    </table></div>}
    {!!component.extends?.length && <p>이 외에 {component.extends.map((base, index) => <span key={base}>
      {index > 0 && ', '}<code>{base}</code>
    </span>)}를 받는다.</p>}
  </section>;
}
