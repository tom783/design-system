export interface ComponentIntent {
  name: string;
  purpose: string;
  partOf?: string;
  useWhen?: readonly string[];
  dont?: readonly string[];
  rules?: readonly { text: string; source: string }[];
  related?: readonly string[];
  source: string;
}

/** 참조가 사라져도 문서가 정상처럼 보이지 않도록 렌더 전에 중단한다. */
export function resolveIntent(components: readonly ComponentIntent[], name: string, sourceRoot = '') {
  const find = (target: string): ComponentIntent => {
    const entry = components.find(component => component.name === target);
    if (!entry) throw new Error(`문서 Intent: 매니페스트에 '${target}' 컴포넌트가 없습니다.`);
    return { ...entry, source: sourceRoot + entry.source };
  };
  const lineage: ComponentIntent[] = [];
  const seen = new Set<string>();
  let entry = find(name);
  while (true) {
    if (seen.has(entry.name)) throw new Error(`문서 Intent: partOf 순환 참조 '${entry.name}'.`);
    seen.add(entry.name);
    lineage.push(entry);
    if (!entry.partOf) break;
    entry = find(entry.partOf);
  }
  const related = [...new Set(lineage.flatMap(component => component.related ?? []))]
    .filter(target => !seen.has(target)).map(find);
  return { component: lineage[0]!, parents: lineage.slice(1), related };
}

/** 페이지에 부모 자체가 없으면 첫 부품 아래에서만 상속 규칙을 소개한다. */
export function resolvePageIntents(components: readonly ComponentIntent[], names: readonly string[]) {
  const intents = names.map(name => resolveIntent(components, name))
    .filter(({ component }) => !component.partOf || !names.includes(component.partOf));
  const documented = new Set(names);
  return intents.map(intent => ({ ...intent, parents: intent.parents.filter(parent => {
    if (documented.has(parent.name)) return false;
    documented.add(parent.name);
    return true;
  }) }));
}
