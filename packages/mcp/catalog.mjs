// 저장 형태의 기본값은 매니페스트에서 읽는다. 도구 응답과 원래 타입 표기를 함께 보존한다.
export function restoreComponent(component, derived, components) {
  const { kind, source, props, extends: bases, slots, ...intent } = component;
  const sourcePath = source ?? components.find(parent => parent.name === component.partOf)?.source;
  if (sourcePath === undefined) throw new Error(`MCP 소스 복원 실패: ${component.name}`);
  return {
    ...intent,
    ...(component.rules ? { rules: component.rules.map(rule => ({
      ...rule,
      source: rule.source.startsWith(derived.ruleSourcePrefix) || derived.ruleSourcePrefixExceptions.includes(rule.source)
        ? rule.source : derived.ruleSourcePrefix + rule.source,
    })) } : {}),
    kind: kind ?? derived.kindDefault,
    source: derived.sourceRoot + sourcePath,
    props: (props ?? []).map(({ name, type, required = derived.requiredDefault, ...details }) => ({
      name,
      type: !required && !derived.optionalTypeSuffixExceptions.includes(type) ? type + derived.optionalTypeSuffix : type,
      required,
      ...details,
    })),
    extends: bases ?? [],
    slots: slots ?? [],
    import: derived.importTemplate.replace('NAME', component.name),
  };
}

// 생성기와 서버가 같은 복원·상속 경로를 사용해야 실제 소비 응답에 예산을 걸 수 있다.
export function listComponents(manifest) {
  return { components: manifest.components.map(entry => {
    const { name, kind, purpose, import: statement, partOf } = restoreComponent(entry, manifest.derived, manifest.components);
    return { name, kind, purpose, import: statement, ...(partOf ? { partOf } : {}) };
  }) };
}
export function getComponent(manifest, entry) {
  const component = restoreComponent(entry, manifest.derived, manifest.components);
  if (!component.partOf) return component;
  const parent = manifest.components.find(c => c.name === component.partOf);
  const { useWhen, dont, rules, category, related } = restoreComponent(parent, manifest.derived, manifest.components);
  return { ...component, useWhen: [...new Set([...(component.useWhen ?? []), ...useWhen])],
    dont: [...new Set([...(component.dont ?? []), ...dont])], rules, category,
    ...(component.related ? { related: [...new Set([...(component.related ?? []), ...(related ?? [])])].filter(name => name !== component.name) } : {}),
    inheritedFrom: parent.name };
}
